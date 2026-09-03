import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '8mb' }));

// Kit and equipment conditionals now come exclusively from
// server/characters/*.js and server/equipment/*.js — see
// findCharacterOverride/findEquipmentOverride below. There is no fallback
// to Groq or to the old conditionals-cache.json/equipment-conditionals-
// cache.json files anymore; if an ability or item isn't hand-authored, the
// API responds that it isn't supported yet rather than guessing. The old
// cache JSON files are left on disk untouched (in case they're useful
// reference while authoring new characters) but nothing in this file reads
// or writes them anymore.
const SHAREABLE_EQUIPMENT_TYPES = ['Light Cone Passive'];

function isShareableEquipment(abilityType) {
  return SHAREABLE_EQUIPMENT_TYPES.includes(abilityType) || abilityType.startsWith('Relic Set');
}

// Hand-authored kit/equipment files (server/characters/*.js,
// server/equipment/*.js) replace Groq extraction entirely for whatever
// they cover — see those folders for the actual data. Files are matched by
// their exported characterName/itemName, not by filename, so renaming a
// file doesn't silently break the lookup. Re-scanned on every request
// rather than cached in memory, since this is a small local dev tool and
// picking up edits to a kit file without restarting the server is worth
// more than the cost of re-reading a handful of files each time.
const CHARACTERS_DIR = path.join(__dirname, 'characters');
const EQUIPMENT_DIR = path.join(__dirname, 'equipment');

async function importAllModules(dir) {
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  } catch {
    return [];
  }
  return Promise.all(
    files.map((f) => import(pathToFileURL(path.join(dir, f)).href))
  );
}

async function findCharacterOverride(characterName) {
  if (!characterName) return null;
  const modules = await importAllModules(CHARACTERS_DIR);
  return modules.find((m) => m.characterName === characterName) || null;
}

async function findEquipmentOverride(itemName) {
  if (!itemName) return null;
  const modules = await importAllModules(EQUIPMENT_DIR);
  return modules.find((m) => m.itemName === itemName) || null;
}

// Maps this app's ability.type strings to the tier key equipment files use.
const EQUIPMENT_TIER_KEY = {
  'Light Cone Passive': 'passive',
  'Relic Set (2pc)': '2pc',
  'Relic Set (4pc)': '4pc',
};

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

const GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';

// A fixed, deliberately generous per-image token estimate for TPM
// budgeting. Groq doesn't report a simple char-based cost for image
// tokens the way it does for text, so this errs high (same "estimate
// high, request low" bias as estimateTokenCount above) rather than
// risking a 413 on the actual request.
const GROQ_IMAGE_TOKEN_ESTIMATE = 1500;

async function callGroqJson({
  systemPrompt,
  userPrompt,
  imageDataUrl = null,
  model = GROQ_TEXT_MODEL,
  reasoningEffort = 'low',
  maxTokens = 2048,
}) {
  const promptTokenEstimate =
    estimateTokenCount(systemPrompt) + estimateTokenCount(userPrompt) + (imageDataUrl ? GROQ_IMAGE_TOKEN_ESTIMATE : 0);
  const availableBudget = GROQ_TPM_LIMIT - GROQ_TPM_SAFETY_MARGIN - promptTokenEstimate;
  const effectiveMaxTokens = Math.max(512, Math.min(maxTokens, availableBudget));

  if (effectiveMaxTokens < maxTokens) {
    console.log(
      `Trimming max_tokens from ${maxTokens} to ${effectiveMaxTokens} to stay under the ${GROQ_TPM_LIMIT} TPM limit (prompt ~${promptTokenEstimate} tokens)`
    );
  }

  const userContent = imageDataUrl
    ? [
        { type: 'text', text: userPrompt },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    : userPrompt;

  async function requestCompletion(useJsonObjectMode) {
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0,
        max_tokens: effectiveMaxTokens,
        // reasoning_effort/reasoning_format are gpt-oss (Harmony format)
        // specific — omit them for other models rather than risk a
        // rejected request over an unrecognized field.
        ...(model === GROQ_TEXT_MODEL ? { reasoning_effort: reasoningEffort, reasoning_format: 'hidden' } : {}),
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

  return { parsed, totalTokens: groqData.usage?.total_tokens ?? null };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reactive retry (waiting out a 429's retry-after) already exists below,
// but it's after-the-fact — by the time a 429 comes back, a round trip is
// already wasted and however many seconds Groq says to wait are added on
// top. Pacing proactively BEFORE each call, based on the ACTUAL token cost
// of the call just made (not a guessed constant), means a long per-ability
// extraction loop is far less likely to trip the limit at all. This reuses
// GROQ_TPM_LIMIT/GROQ_TPM_SAFETY_MARGIN (the same budget used for
// max_tokens trimming above) so there's one place to update if the
// account's tier — and therefore its TPM budget — ever changes.
function pacingDelayMs(lastCallTotalTokens) {
  const effectiveBudget = GROQ_TPM_LIMIT - GROQ_TPM_SAFETY_MARGIN;
  // If usage wasn't reported for some reason, fall back to a conservative
  // estimate rather than skipping the pace entirely.
  const tokens = lastCallTotalTokens || GROQ_TPM_LIMIT * 0.4;
  return Math.ceil((tokens / effectiveBudget) * 60000);
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

// Lets the frontend check whether a character has been hand-authored at
// all, and if so, fetch their full override (abilities + conditionals +
// rotation) in one call rather than probing per-ability.
app.get('/api/character-kit', async (req, res) => {
  const { characterName } = req.query;
  if (!characterName || typeof characterName !== 'string') {
    res.status(400).json({ error: 'Missing "characterName" query parameter' });
    return;
  }

  const override = await findCharacterOverride(characterName);
  if (!override) {
    res.json({ found: false });
    return;
  }

  res.json({
    found: true,
    abilities: override.abilities || {},
    conditionals: override.conditionals || [],
    cosmeticAbilityAliases: override.cosmeticAbilityAliases || [],
    rotation: override.rotation || null,
  });
});

app.post('/api/interpret-skill', async (req, res) => {
  const { description, characterName, abilityName } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'Missing "description" string in request body' });
    return;
  }

  // Hand-authored ability data is the ONLY source now — no Groq fallback.
  // If this ability isn't declared in a server/characters/ file, damage
  // interpretation isn't supported for it, full stop.
  if (characterName && abilityName) {
    const override = await findCharacterOverride(characterName);
    const abilityData = override?.abilities?.[abilityName];
    if (abilityData) {
      console.log(`Hand-authored ability hit: ${characterName} — ${abilityName}`);
      res.json({
        damageType: abilityData.dealsNoDirectDamage ? null : abilityData.damageType,
        scalingStat: abilityData.dealsNoDirectDamage ? 'NONE' : abilityData.scalingStat,
        damageSourceName: abilityData.damageSourceName,
        dealsNoDirectDamage: !!abilityData.dealsNoDirectDamage,
        cached: true,
        source: 'hand-authored',
      });
      return;
    }
  }

  res.status(404).json({
    supported: false,
    error: characterName
      ? `"${abilityName || 'this ability'}" isn't hand-authored yet for ${characterName} — no AI fallback.`
      : 'This ability isn\'t hand-authored yet — no AI fallback.',
  });
});

// Kit and equipment conditionals now come exclusively from hand-authored
// server/characters/*.js and server/equipment/*.js files — no Groq
// fallback. If a character's kit isn't authored, or a piece of equipped
// gear has no matching file, that's reported back explicitly as
// unsupported rather than silently returning nothing or guessing.
app.post('/api/extract-conditionals', async (req, res) => {
  const { characterName, abilities } = req.body;

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

  console.log(
    `Received ${abilities.length} ability/abilities for ${characterName}:`,
    abilities.map(
      (a) =>
        `[${a.type}] "${a.name || '(no name)'}": ${a.description.slice(0, 400)}${a.description.length > 400 ? '...' : ''}`
    )
  );

  const equipmentAbilities = abilities.filter((a) => isShareableEquipment(a.type));

  const characterOverride = await findCharacterOverride(characterName);
  const kitSupported = !!characterOverride;
  const characterConditionals = characterOverride?.conditionals || [];

  if (kitSupported) {
    console.log(`Hand-authored kit hit for ${characterName} — ${characterConditionals.length} conditional(s)`);
  } else {
    console.log(`${characterName} has no hand-authored kit file — kit conditionals not supported yet`);
  }

  const equipmentConditionals = [];
  const unsupportedEquipment = [];

  for (const ability of equipmentAbilities) {
    const tierKey = EQUIPMENT_TIER_KEY[ability.type];
    const equipmentOverride = tierKey ? await findEquipmentOverride(ability.name) : null;
    const overrideConditionals = equipmentOverride?.conditionalsByTier?.[tierKey];

    if (overrideConditionals) {
      console.log(`Hand-authored equipment hit for [${ability.type}] ${ability.name} — ${overrideConditionals.length} conditional(s)`);
      equipmentConditionals.push(...overrideConditionals);
    } else {
      console.log(`No hand-authored file for [${ability.type}] ${ability.name} — not supported yet`);
      unsupportedEquipment.push({ type: ability.type, name: ability.name });
    }
  }

  const combined = [...characterConditionals, ...equipmentConditionals];

  res.json({
    conditionals: combined,
    kitSupported,
    unsupportedEquipment,
    cached: true,
    extractedAt: new Date().toISOString(),
  });
});

// Groq's hard cap for a base64-encoded image in a single request.
const GROQ_BASE64_IMAGE_LIMIT = 4 * 1024 * 1024;

// Replaces the old client-side Tesseract OCR flow. The client sends the
// closed lists of set names/stat labels that are actually valid for this
// relic slot (it already owns that StarRailRes-derived data) so the model
// is picking from a known set rather than free-generating a name, which
// keeps hallucination risk down. Everything the model returns is
// re-validated against those same lists below before being sent back —
// a value outside what was offered is treated as "not detected" rather
// than trusted.
app.post('/api/analyze-relic-image', async (req, res) => {
  const { image, slotType, validSetNames, mainStatLabels, substatLabels } = req.body;

  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    res.status(400).json({ error: 'Missing or invalid "image" data URL in request body' });
    return;
  }
  if (image.length > GROQ_BASE64_IMAGE_LIMIT) {
    res.status(413).json({ error: 'That screenshot is too large — try a tighter crop of just the relic stat panel.' });
    return;
  }
  if (!Number.isInteger(slotType) || slotType < 1 || slotType > 6) {
    res.status(400).json({ error: 'Missing or invalid "slotType" (expected 1-6)' });
    return;
  }
  if (!Array.isArray(validSetNames) || validSetNames.length === 0) {
    res.status(400).json({ error: 'Missing non-empty "validSetNames" array' });
    return;
  }
  if (!Array.isArray(mainStatLabels) || mainStatLabels.length === 0) {
    res.status(400).json({ error: 'Missing non-empty "mainStatLabels" array' });
    return;
  }
  if (!Array.isArray(substatLabels) || substatLabels.length === 0) {
    res.status(400).json({ error: 'Missing non-empty "substatLabels" array' });
    return;
  }

  const systemPrompt =
    'You read Honkai: Star Rail relic screenshots and report exactly what is printed on the panel. Never guess, infer, or include a value that is not visibly present. Respond with JSON only, no markdown fences, no commentary.';

  const userPrompt = `This image is a screenshot of a single Honkai: Star Rail relic or planar ornament's stat panel.

Identify the relic SET NAME. It must be exactly one of this list, or null if none match confidently:
${validSetNames.map((n) => `- ${n}`).join('\n')}

Identify the MAIN STAT. Its label must be exactly one of this list, or null if unreadable:
${mainStatLabels.map((n) => `- ${n}`).join('\n')}

Identify only the SUBSTATS actually visible on the panel (there may be up to 4). Each label must be exactly one of this list:
${substatLabels.map((n) => `- ${n}`).join('\n')}

Respond with ONLY this JSON shape:
{"setName": "<exact string from the set list, or null>", "mainStat": {"label": "<exact string from the main stat list>", "value": <number>} or null, "substats": [{"label": "<exact string from the substat list>", "value": <number>}]}

Substat and main stat values are exactly as printed on the panel (e.g. "12.4%" -> 12.4, "+42" -> 42) — do not divide percentages by 100.`;

  const result = await callGroqJsonWithRetry({
    systemPrompt,
    userPrompt,
    imageDataUrl: image,
    model: GROQ_VISION_MODEL,
    maxTokens: 1024,
  });

  if (result.error) {
    console.log('Relic image analysis failed:', result.error);
    res.status(result.status || 500).json({ error: result.error });
    return;
  }

  const parsed = result.parsed || {};
  const setName = validSetNames.includes(parsed.setName) ? parsed.setName : null;

  let mainStat = null;
  if (
    parsed.mainStat &&
    mainStatLabels.includes(parsed.mainStat.label) &&
    Number.isFinite(Number(parsed.mainStat.value))
  ) {
    mainStat = { label: parsed.mainStat.label, value: Number(parsed.mainStat.value) };
  }

  const substats = Array.isArray(parsed.substats)
    ? parsed.substats
        .filter((s) => s && substatLabels.includes(s.label) && Number.isFinite(Number(s.value)))
        .map((s) => ({ label: s.label, value: Number(s.value) }))
        .slice(0, 4)
    : [];

  res.json({ setName, mainStat, substats });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});