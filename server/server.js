import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Extracted conditionals only change when a character's actual kit text
// changes (a novaflare/rework, or a StarRailRes data update) — the ability
// descriptions themselves are the only real input to the Groq call, so
// hashing them gives a cache key that self-invalidates automatically
// whenever kit text changes, with no manual "please forget this
// character" step needed. Keyed on KIT-ONLY abilities (Basic ATK, Skill,
// Ultimate, Talent, etc.) — Light Cone Passive and Relic Set entries are
// deliberately excluded from this hash and live in their own equipment
// cache instead, so swapping a character's gear can never force an
// unnecessary re-extraction of their unchanged kit. This is a flat JSON
// file, not a real database — fine for a single-user local tool, but
// would need swapping for something like SQLite/Redis if this ever serves
// multiple people at once (concurrent writes to the same file can clobber
// each other).
const CONDITIONALS_CACHE_PATH = path.join(__dirname, 'conditionals-cache.json');

function loadConditionalsCache() {
  try {
    return JSON.parse(fs.readFileSync(CONDITIONALS_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveConditionalsCache(cache) {
  try {
    fs.writeFileSync(CONDITIONALS_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.log('Failed to write conditionals cache:', err.message);
  }
}

function hashConditionalsInput(characterName, kitAbilities) {
  const hash = crypto.createHash('sha256');
  hash.update(characterName);
  kitAbilities.forEach((a) => {
    hash.update('\u0000' + a.type + '\u0000' + a.description);
  });
  return hash.digest('hex');
}

// Light Cone Passives and Relic Set bonuses are equipment, not kit — the
// exact same set or LC can be worn by any character, and its conditional
// effects don't change based on who's wearing it (only whether the wearer
// meets the trigger, which is applied later when the calculator resolves
// stacks, not at extraction time). Caching these keyed on the equipment's
// own text (rather than folded into each character's kit hash) means the
// first character who's scanned wearing a given set/LC pays the Groq cost,
// and every character after that — on any future character, not just this
// one — gets it for free.
const EQUIPMENT_CACHE_PATH = path.join(__dirname, 'equipment-conditionals-cache.json');
const SHAREABLE_EQUIPMENT_TYPES = ['Light Cone Passive'];

function isShareableEquipment(abilityType) {
  return SHAREABLE_EQUIPMENT_TYPES.includes(abilityType) || abilityType.startsWith('Relic Set');
}

function loadEquipmentCache() {
  try {
    return JSON.parse(fs.readFileSync(EQUIPMENT_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveEquipmentCache(cache) {
  try {
    fs.writeFileSync(EQUIPMENT_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.log('Failed to write equipment cache:', err.message);
  }
}

function hashEquipmentText(type, description) {
  const hash = crypto.createHash('sha256');
  hash.update(type + '\u0000' + description);
  return hash.digest('hex');
}

// This account's Groq tier caps requests at a fixed tokens-per-minute
// budget, and Groq reserves the FULL max_tokens value against that budget
// up front — not just what the model actually ends up using. A fixed
// max_tokens that happened to fit a short prompt will 413 on a character
// with a longer kit (more abilities, longer descriptions), so max_tokens
// is sized dynamically per-request instead: estimate the prompt's token
// count and leave only as much completion budget as remains under the
// cap. ~3.5 chars/token deliberately overestimates (real English text is
// closer to ~4) so this errs toward requesting less than the true prompt
// size, not more — requesting too little just costs a truncated
// completion, requesting too much is a hard 413.
const GROQ_TPM_LIMIT = 8000;
const GROQ_TPM_SAFETY_MARGIN = 500;

function estimateTokenCount(text) {
  return Math.ceil((text || '').length / 3.5);
}

function extractJsonObject(rawContent) {
  const cleaned = rawContent.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall through to the brace-matching fallback below.
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null;
  }

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

// The model doesn't always stick exactly to the requested enums/shape, and
// this is DMG-affecting data — a bad appliesToAbility value should never
// silently vanish (it'd look like "detection just didn't work"), and a bad
// valuesByStack magnitude should never silently multiply someone's damage
// by 1000x. Normalize known-fixable issues, zero out and flag anything
// that can't be trusted, rather than passing the model's output straight
// through.
const VALID_ABILITY_TARGETS = new Set(['BASIC', 'SKILL', 'ULT', 'FUA', 'DOT', 'ALL']);
const VALID_STAT_TYPES = new Set([
  'DMG_PERCENT',
  'CRIT_RATE',
  'CRIT_DMG',
  'ATK_PERCENT',
  'DEF_PEN',
  'RES_PEN',
  'VULNERABILITY',
  'OTHER',
]);
const PERCENT_SANITY_CEILING = 500;

function coercePercentNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const num = Number(v.replace('%', '').trim());
    if (Number.isFinite(num)) return num;
  }
  return null;
}

// The model sometimes writes the correct numbers into its free-text
// trigger description while mangling the structured valuesByStack array
// (e.g. concatenating "25, 50, 75" into a single 255075, or dropping most
// digits into something like "05.614" for what should be [39.2, 47.6]).
// Percentages mentioned directly in the trigger text are a decent recovery
// source when the structured array clearly doesn't hold up.
function extractPercentNumbersFromText(text) {
  if (typeof text !== 'string') return [];
  const matches = text.match(/\d+(?:\.\d+)?\s*%/g) || [];
  return matches.map((m) => Number(m.replace('%', '').trim())).filter((n) => Number.isFinite(n));
}

function sanitizeConditionals(rawConditionals) {
  return rawConditionals
    .filter((c) => c && typeof c.name === 'string' && c.name.trim() && Array.isArray(c.valuesByStack))
    .map((c) => {
      let suspicious = false;
      let suspiciousNote = '';

      const appliesToAbility = VALID_ABILITY_TARGETS.has(c.appliesToAbility) ? c.appliesToAbility : 'ALL';
      if (appliesToAbility !== c.appliesToAbility) suspicious = true;

      const statType = VALID_STAT_TYPES.has(c.statType) ? c.statType : 'OTHER';
      if (statType !== c.statType) suspicious = true;

      let valuesByStack = c.valuesByStack.map((v) => {
        const num = coercePercentNumber(v);
        if (num === null || Math.abs(num) > PERCENT_SANITY_CEILING) return null;
        return num;
      });

      const triggerNumbers = extractPercentNumbersFromText(c.trigger);
      const hasInvalidEntry = valuesByStack.some((v) => v === null);
      // If the trigger text names more distinct percentages than the
      // structured array has entries, the array is almost certainly
      // incomplete/mangled rather than genuinely single-valued.
      const structuredLooksIncomplete = triggerNumbers.length > 1 && triggerNumbers.length !== valuesByStack.length;

      if ((hasInvalidEntry || structuredLooksIncomplete) && triggerNumbers.length > 0) {
        valuesByStack = triggerNumbers;
        suspicious = true;
        suspiciousNote = 'structured values from the model looked wrong — recovered from the trigger text instead, verify manually';
      } else if (hasInvalidEntry) {
        valuesByStack = valuesByStack.map((v) => v ?? 0);
        suspicious = true;
        suspiciousNote = 'a value looked implausible and was zeroed out';
      }

      const requestedMaxStacks = Number(c.maxStacks);
      let maxStacks = Number.isFinite(requestedMaxStacks) ? Math.max(1, requestedMaxStacks) : valuesByStack.length;

      if (valuesByStack.length === 1 && maxStacks > 1) {
        // The model described a stacking effect but gave one "per stack"
        // number instead of the full cumulative array the prompt asked
        // for (e.g. "25% per stack, up to 3 stacks" -> [25] / maxStacks 3
        // instead of [25, 50, 75]). Extrapolate linearly rather than
        // silently discarding the stacks it clearly described.
        const perStack = valuesByStack[0];
        valuesByStack = Array.from({ length: maxStacks }, (_, i) => perStack * (i + 1));
        suspicious = true;
        suspiciousNote = suspiciousNote || 'auto-expanded from a single per-stack value — verify the real per-stack numbers';
      } else if (valuesByStack.length !== maxStacks) {
        maxStacks = Math.min(maxStacks, valuesByStack.length);
        suspicious = true;
        suspiciousNote = suspiciousNote || 'stack count was trimmed to match the values actually returned';
      }

      const trigger = typeof c.trigger === 'string' ? c.trigger : '';

      return {
        name: c.name.trim(),
        appliesToAbility,
        statType,
        trigger,
        valuesByStack,
        maxStacks,
        suspicious,
        suspiciousNote,
      };
    });
}

async function callGroqJson({ systemPrompt, userPrompt, reasoningEffort = 'low', maxTokens = 2048 }) {
  const promptTokenEstimate = estimateTokenCount(systemPrompt) + estimateTokenCount(userPrompt);
  const availableBudget = GROQ_TPM_LIMIT - GROQ_TPM_SAFETY_MARGIN - promptTokenEstimate;
  const effectiveMaxTokens = Math.max(512, Math.min(maxTokens, availableBudget));

  if (effectiveMaxTokens < maxTokens) {
    console.log(
      `Trimming max_tokens from ${maxTokens} to ${effectiveMaxTokens} to stay under the ${GROQ_TPM_LIMIT} TPM limit (prompt ~${promptTokenEstimate} tokens)`
    );
  }

  async function requestCompletion(useJsonObjectMode) {
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: effectiveMaxTokens,
        reasoning_effort: reasoningEffort,
        reasoning_format: 'hidden',
        ...(useJsonObjectMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
  }

  let groqResponse = await requestCompletion(true);

  // Groq's strict json_object validation can reject an otherwise-fine
  // generation (e.g. an empty completion when the token budget runs out
  // on hidden reasoning before writing the answer). Retry once without
  // enforced JSON mode — extractJsonObject()'s brace-matching fallback
  // still catches most malformed-but-present output.
  if (groqResponse.status === 400) {
    console.log('Groq rejected json_object mode, retrying without it...');
    groqResponse = await requestCompletion(false);
  }

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text();
    console.log('Groq responded with status:', groqResponse.status, errBody);

    if (groqResponse.status === 429 || groqResponse.status === 413) {
      let retryAfterSeconds = null;

      const headerValue = groqResponse.headers.get('retry-after');
      if (headerValue && Number.isFinite(Number(headerValue))) {
        retryAfterSeconds = Number(headerValue);
      }
      if (retryAfterSeconds === null) {
        const match = errBody.match(/try again in ([\d.]+)s/i);
        if (match) retryAfterSeconds = Number(match[1]);
      }

      return {
        error:
          groqResponse.status === 413
            ? 'This request was still too large for the current token-per-minute limit even after trimming — try again in a minute, or split this character into fewer abilities per call.'
            : retryAfterSeconds !== null
              ? `Token limit exceeded — please wait ${Math.ceil(retryAfterSeconds)}s and try again.`
              : 'Token limit exceeded — please wait a bit and try again.',
        status: groqResponse.status,
        retryAfterSeconds,
      };
    }

    return { error: 'Failed to fetch from Groq', status: groqResponse.status };
  }

  const groqData = await groqResponse.json();
  if (groqData.usage) {
    console.log(
      `Groq usage — prompt: ${groqData.usage.prompt_tokens}, completion: ${groqData.usage.completion_tokens}, total: ${groqData.usage.total_tokens}`
    );
  }

  const rawContent = groqData.choices?.[0]?.message?.content || '';
  const parsed = extractJsonObject(rawContent);

  if (parsed === null) {
    console.log('Could not parse Groq response as JSON:', rawContent);
    return {
      error: 'Model returned unparseable response',
      rawContentSnippet: rawContent.slice(0, 500),
    };
  }

  return { parsed };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// TPM is a rolling per-minute budget, not a per-request cap — Groq
// reserves tokens against it the moment each call goes out, so firing
// several calls back-to-back (as the per-ability extraction loop does)
// can legitimately exhaust the budget partway through even though each
// individual call is small. Groq's 429 response already tells us exactly
// how long to wait before the budget frees back up, so honor that instead
// of just dropping the ability's result.
async function callGroqJsonWithRetry(args, maxRetries = 2) {
  let lastResult;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await callGroqJson(args);

    if (lastResult.status !== 429 || attempt === maxRetries) {
      return lastResult;
    }

    const waitSeconds = lastResult.retryAfterSeconds ?? 10;
    console.log(`Rate limited, waiting ${waitSeconds.toFixed(1)}s before retry ${attempt + 1}/${maxRetries}...`);
    await sleep(Math.ceil(waitSeconds * 1000) + 500);
  }
  return lastResult;
}

app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.get('/api/hsr/:uid', async (req, res) => {
  const { uid } = req.params;

  const enkaResponse = await fetch(`https://enka.network/api/hsr/uid/${uid}/`, {
    headers: {
      'User-Agent': 'HSR-Planner/1.0',
    },
  });

  if (!enkaResponse.ok) {
    console.log('enka.network responded with status:', enkaResponse.status);
    res.status(enkaResponse.status).json({
      error: 'Failed to fetch from enka.network',
      status: enkaResponse.status,
    });
    return;
  }

  const data = await enkaResponse.json();
  res.json(data);
});

// Scaling stat / damage type classification is a pure function of the
// skill's own description text — same skill text always means the same
// correct answer, and the text only changes on a novaflare/rework. Unlike
// the conditionals endpoints, this one already takes just a single
// description string with no character/equipment split to worry about,
// so one flat cache keyed on hash(description) covers it.
const SKILL_INTERPRETATION_CACHE_PATH = path.join(__dirname, 'skill-interpretation-cache.json');

function loadSkillInterpretationCache() {
  try {
    return JSON.parse(fs.readFileSync(SKILL_INTERPRETATION_CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSkillInterpretationCache(cache) {
  try {
    fs.writeFileSync(SKILL_INTERPRETATION_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.log('Failed to write skill interpretation cache:', err.message);
  }
}

function hashSkillDescription(description) {
  return crypto.createHash('sha256').update(description).digest('hex');
}

app.post('/api/interpret-skill', async (req, res) => {
  const { description, forceRefresh } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'Missing "description" string in request body' });
    return;
  }

  const cacheKey = hashSkillDescription(description);
  const skillCache = loadSkillInterpretationCache();

  if (!forceRefresh && skillCache[cacheKey]) {
    console.log(`Skill interpretation cache hit (${cacheKey.slice(0, 8)})`);
    res.json({ ...skillCache[cacheKey].result, cached: true });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
    return;
  }

  const systemPrompt = `You are extracting structured data from Honkai: Star Rail skill descriptions. Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting:
{"damageType": "STANDARD" | "ELATION", "scalingStat": "ATK" | "DEF" | "HP" | "NONE"}`;

  const userPrompt = `Skill description: "${description}"

First, determine the damage type this skill deals: STANDARD or ELATION. ELATION applies only if the description explicitly says the skill deals Elation DMG (associated with the Path of Elation, Aha, Punchline, Certified Banger, or Merrymake). If there's no mention of Elation DMG, it's STANDARD.

Second, if the damage type is STANDARD, determine which single stat the skill's damage or effect primarily scales from: ATK, DEF, or HP. If it scales from more than one, pick the one that contributes the most to its primary effect. If the skill doesn't scale from any of these three, respond with NONE. If the damage type is ELATION, respond with NONE for scalingStat, since Elation DMG doesn't scale from ATK, DEF, or HP.`;

  try {
    const result = await callGroqJson({ systemPrompt, userPrompt });

    if (result.error) {
      res.status(result.status || 502).json(result);
      return;
    }

    const parsed = result.parsed;
    const validDamageTypes = ['STANDARD', 'ELATION'];
    const validStats = ['ATK', 'DEF', 'HP', 'NONE'];

    if (!validDamageTypes.includes(parsed.damageType)) {
      res.status(502).json({ error: 'Model returned an unexpected damageType', raw: parsed });
      return;
    }

    if (!validStats.includes(parsed.scalingStat)) {
      res.status(502).json({ error: 'Model returned an unexpected value', raw: parsed });
      return;
    }

    const skillResult = { damageType: parsed.damageType, scalingStat: parsed.scalingStat };
    skillCache[cacheKey] = { result: skillResult, extractedAt: new Date().toISOString() };
    saveSkillInterpretationCache(skillCache);

    res.json({ ...skillResult, cached: false });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to interpret skill' });
  }
});

const CONDITIONAL_SYSTEM_PROMPT = `You are extracting structured conditional damage bonuses from a single Honkai: Star Rail ability description. Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting, no code fences:
{"conditionals": [{"name": string, "appliesToAbility": string, "statType": string, "trigger": string, "valuesByStack": number[], "maxStacks": number}]}
If no qualifying conditional effects are found in this ability, respond with {"conditionals": []}.`;

const CONDITIONAL_EXTRACTION_RULES = `Find any effects where the character's DMG (or a specific ability's DMG) increases conditionally — for example, stacking bonuses from repeated casts, threshold-based bonuses (e.g. "when HP is above/below X%"), or state-based bonuses. If an effect is worded as buffing "all allies," "the team," or similar, still extract it as applying to this character — the wearer/character being analyzed is a member of their own ally list and receives effects worded that way, even though the text doesn't say "the wearer" directly. Do not skip an effect just because it's phrased as team-wide support rather than self-targeted.

Also find unconditional effects that reduce an ENEMY's RES, DEF, or otherwise make them take more damage (e.g. "decreases all enemies' All-Type RES by 25%", a summon that unconditionally shreds DEF) — always extract these even though they have no trigger, since enemy-side debuffs are never reflected in the character's own fetched stats and this is the only place they can be captured. Use a trigger description like "always active while [source] is deployed" for these.

Ignore effects that are flat, always-on increases to the CHARACTER's own stats with no condition (e.g. a trace that always gives +20% CRIT DMG with no trigger) — these are self-buffs already reflected in the character's fetched base stats, so re-extracting them would double-count. This self-buff exclusion does NOT apply to enemy-facing debuffs (RES/DEF reduction, vulnerability) — extract those regardless of whether they have a trigger, per the paragraph above. If this ability is a [Relic Set (4pc)] entry, it often bundles a flat baseline together with a genuinely conditional bonus in the same sentence (e.g. "+8% CRIT Rate. When SPD is below 95 at the start of an action, additionally increases CRIT Rate by 12%") — only extract the conditional portion (the +12% tied to the SPD trigger), not the flat +8% baseline, since that baseline is already applied elsewhere and re-extracting it would double-count it.

Some effects list multiple mutually-exclusive threshold tiers using slash-separated values, e.g. "if SPD is less than 110/95, increases CRIT Rate by 20%/32%" (a weaker bonus at an easier threshold, a stronger bonus at a stricter threshold — only one applies at a time, not both). Represent these using valuesByStack the same way as ordinary stacks: valuesByStack: [20, 32], maxStacks: 2, with the trigger text explaining what each tier requires (e.g. "Tier 1: SPD < 110 -> +20% CRIT Rate. Tier 2 (stricter): SPD < 95 -> +32% CRIT Rate"). Do not skip this kind of effect just because it isn't literally "stacking" — picking a single tier value is exactly how this calculator already applies a selected value, so tiers fit the same structure.

For each conditional effect found, determine:
- appliesToAbility: which ability type it affects — must be exactly one of "BASIC", "SKILL", "ULT", "FUA", "DOT", or "ALL" if it affects all of the character's damage. Use "ALL" for Talent/passive-sourced DMG Boosts that aren't scoped to one specific attack type — do not invent other category names.
- statType: what it boosts — one of "DMG_PERCENT", "CRIT_RATE", "CRIT_DMG", "ATK_PERCENT", "DEF_PEN", "RES_PEN", "VULNERABILITY", or "OTHER" if none of these fit
- trigger: a short plain-English description of the condition
- valuesByStack: an array of the bonus values in percent (e.g. 20 means +20%, not 0.2 and not 2000), indexed by stack count starting at 1 (e.g. [100, 200] means 1 stack = 100%, 2 stacks = 200%). If it's not stack-based but a single on/off condition, use a single-element array. The array length must exactly equal maxStacks. IMPORTANT: descriptions phrased as "+X% per stack, up to N stacks" are still cumulative and must be expanded to the full N-element array (e.g. "25% per stack, up to 3 stacks" -> valuesByStack: [25, 50, 75], maxStacks: 3) — never respond with just the single per-stack number. If the effect scales continuously (e.g. "+X% DMG per 1% Max HP lost, up to Y%") rather than in discrete stacks, represent only the minimum and maximum bound as a 2-element array with maxStacks 2, and say so in the trigger text — do not invent intermediate stack values.
- maxStacks: the highest stack count reachable, or 1 if not stack-based. Must equal valuesByStack.length.`;

// Runs one ability's text through Groq and returns its raw (unsanitized)
// conditionals. Shared by both the kit loop and the equipment loop so the
// pacing/retry/parsing logic only exists in one place. `characterName` is
// omitted from the prompt for equipment abilities — see the shareable-
// equipment comment further down for why.
async function extractOneAbility(ability, characterName) {
  const conditionalUserPrompt = characterName
    ? `Character: "${characterName}"

Ability: [${ability.type}] ${ability.description}

${CONDITIONAL_EXTRACTION_RULES}`
    : `Ability: [${ability.type}] ${ability.description}

${CONDITIONAL_EXTRACTION_RULES}`;

  const result = await callGroqJsonWithRetry({
    systemPrompt: CONDITIONAL_SYSTEM_PROMPT,
    userPrompt: conditionalUserPrompt,
    reasoningEffort: 'low',
    maxTokens: 1536,
  });

  if (result.error) {
    console.log(`Extraction failed for [${ability.type}]${characterName ? ' on ' + characterName : ''}: ${result.error}`);
    return { conditionals: null, failed: true };
  }

  const parsed = result.parsed;
  if (!Array.isArray(parsed?.conditionals)) {
    console.log(`Unexpected shape for [${ability.type}]:`, parsed);
    return { conditionals: null, failed: true };
  }

  if (parsed.conditionals.length > 0) {
    console.log(`[${ability.type}] extracted ${parsed.conditionals.length}:`, JSON.stringify(parsed.conditionals, null, 2));
  }

  return { conditionals: parsed.conditionals, failed: false };
}

// Takes a character's resolved ability descriptions (Basic ATK, Skill,
// Ultimate, Talent, etc. with their numeric placeholders already filled
// in) and asks Groq to draft the conditional/stacking bonuses buried in
// the text — the same kind of thing that had to be manually found on a
// wiki page and hand-transcribed into a characters/<name>.js kit file.
//
// This is a draft, not a source of truth. Values should be checked
// against the current in-game tooltip before being trusted, same as
// scaling stat detection has a manual override for exactly this reason.
app.post('/api/extract-conditionals', async (req, res) => {
  const { characterName, abilities, forceRefresh } = req.body;

  if (!characterName || typeof characterName !== 'string') {
    res.status(400).json({ error: 'Missing "characterName" string in request body' });
    return;
  }

  if (!Array.isArray(abilities) || abilities.length === 0) {
    res.status(400).json({ error: 'Missing non-empty "abilities" array in request body' });
    return;
  }

  const invalidAbility = abilities.find(
    (a) => !a || typeof a.type !== 'string' || typeof a.description !== 'string'
  );
  if (invalidAbility) {
    res.status(400).json({ error: 'Each ability needs a "type" string and "description" string' });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
    return;
  }

  console.log(
    `Received ${abilities.length} ability/abilities for ${characterName}:`,
    abilities.map((a) => `[${a.type}] ${a.description.slice(0, 400)}${a.description.length > 400 ? '...' : ''}`)
  );

  // Kit and equipment are now two fully independent caches, not one hash
  // covering everything the character happened to be wearing at scan
  // time. A character's own Basic ATK/Skill/Ultimate/Talent text doesn't
  // change when you swap their relics — so bundling equipment into the
  // same cache key meant swapping gear silently forced a full, wasteful
  // re-extraction of the unchanged kit too. Splitting them means a relic
  // swap only ever costs (at most) a fresh equipment lookup, and the kit
  // stays a cache hit regardless of what's currently equipped.
  const kitAbilities = abilities.filter((a) => !isShareableEquipment(a.type));
  const equipmentAbilities = abilities.filter((a) => isShareableEquipment(a.type));

  try {
    const kitCache = loadConditionalsCache();
    const kitCacheKey = hashConditionalsInput(characterName, kitAbilities);

    let callsAttempted = 0;
    let callsFailed = 0;

    let characterConditionals;
    let kitFromCache = false;

    if (!forceRefresh && kitCache[kitCacheKey]) {
      characterConditionals = kitCache[kitCacheKey].conditionals;
      kitFromCache = true;
      console.log(
        `Kit cache hit for ${characterName} (${kitCacheKey.slice(0, 8)}) — reused ${characterConditionals.length} conditional(s), skipped Groq for ${kitAbilities.length} kit ability/abilities`
      );
    } else {
      const kitRaw = [];
      for (let i = 0; i < kitAbilities.length; i++) {
        if (i > 0) await sleep(600);
        callsAttempted += 1;
        const { conditionals, failed } = await extractOneAbility(kitAbilities[i], characterName);
        if (failed) {
          callsFailed += 1;
          continue;
        }
        kitRaw.push(...conditionals);
      }
      characterConditionals = sanitizeConditionals(kitRaw);
      kitCache[kitCacheKey] = { characterName, conditionals: characterConditionals, extractedAt: new Date().toISOString() };
      saveConditionalsCache(kitCache);
    }

    const equipmentCache = loadEquipmentCache();
    let equipmentCacheDirty = false;
    const equipmentConditionals = [];

    for (let i = 0; i < equipmentAbilities.length; i++) {
      const ability = equipmentAbilities[i];
      const equipmentKey = hashEquipmentText(ability.type, ability.description);

      // forceRefresh bypasses BOTH caches — "Re-detect" should mean
      // "regenerate everything from scratch," not "regenerate the kit but
      // still trust whatever this piece of gear was cached as before."
      // Since the equipment cache is shared, a forced re-extraction here
      // also benefits every other character that references this same
      // set/LC going forward.
      if (!forceRefresh && equipmentCache[equipmentKey]) {
        const cachedConditionals = equipmentCache[equipmentKey].conditionals;
        console.log(
          `Equipment cache hit for [${ability.type}] (${equipmentKey.slice(0, 8)}) — reused ${cachedConditionals.length} conditional(s), skipped Groq call`
        );
        equipmentConditionals.push(...cachedConditionals);
        continue;
      }

      if (!kitFromCache || i > 0) await sleep(600);
      callsAttempted += 1;
      const { conditionals, failed } = await extractOneAbility(ability, null);
      if (failed) {
        callsFailed += 1;
        continue;
      }

      const sanitizedEquipment = sanitizeConditionals(conditionals);
      equipmentCache[equipmentKey] = {
        sourceType: ability.type,
        conditionals: sanitizedEquipment,
        extractedAt: new Date().toISOString(),
      };
      equipmentCacheDirty = true;
      equipmentConditionals.push(...sanitizedEquipment);
    }

    if (equipmentCacheDirty) {
      saveEquipmentCache(equipmentCache);
    }

    const combined = [...characterConditionals, ...equipmentConditionals];

    if (callsAttempted > 0 && callsFailed === callsAttempted && combined.length === 0) {
      res.status(502).json({
        error: 'Every ability call failed — Groq may be rate-limited or unavailable. Nothing was cached; try again.',
      });
      return;
    }

    if (callsFailed > 0) {
      console.log(`${callsFailed}/${callsAttempted} fresh ability calls failed for ${characterName} — results below may be partial.`);
    }

    console.log(`Returning ${combined.length} total conditional(s) for ${characterName} (kit ${kitFromCache ? 'cached' : 'fresh'}, ${equipmentAbilities.length} equipment piece(s))`);

    const flaggedSuspicious = combined.filter((c) => c.suspicious);
    if (flaggedSuspicious.length > 0) {
      console.log('Sanitizer flagged as suspicious:', flaggedSuspicious.map((c) => `${c.name} (${c.suspiciousNote})`));
    }

    res.json({
      conditionals: combined,
      cached: callsAttempted === 0,
      extractedAt: kitFromCache ? kitCache[kitCacheKey].extractedAt : new Date().toISOString(),
    });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to extract conditionals' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});