import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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

function sanitizeConditionals(rawConditionals) {
  return rawConditionals
    .filter((c) => c && typeof c.name === 'string' && c.name.trim() && Array.isArray(c.valuesByStack))
    .map((c) => {
      let suspicious = false;

      const appliesToAbility = VALID_ABILITY_TARGETS.has(c.appliesToAbility) ? c.appliesToAbility : 'ALL';
      if (appliesToAbility !== c.appliesToAbility) suspicious = true;

      const statType = VALID_STAT_TYPES.has(c.statType) ? c.statType : 'OTHER';
      if (statType !== c.statType) suspicious = true;

      const valuesByStack = c.valuesByStack.map((v) => {
        if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > PERCENT_SANITY_CEILING) {
          suspicious = true;
          return 0;
        }
        return v;
      });

      const requestedMaxStacks = Number(c.maxStacks);
      const maxStacks = Number.isFinite(requestedMaxStacks)
        ? Math.max(1, Math.min(requestedMaxStacks, valuesByStack.length))
        : valuesByStack.length;
      if (maxStacks !== requestedMaxStacks) suspicious = true;

      return {
        name: c.name.trim(),
        appliesToAbility,
        statType,
        trigger: typeof c.trigger === 'string' ? c.trigger : '',
        valuesByStack,
        maxStacks,
        suspicious,
      };
    });
}

async function callGroqJson({ systemPrompt, userPrompt }) {
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
      reasoning_effort: 'low',
      reasoning_format: 'hidden',
      response_format: { type: 'json_object' },
    }),
  });

  if (!groqResponse.ok) {
    const errBody = await groqResponse.text();
    console.log('Groq responded with status:', groqResponse.status, errBody);
    return { error: 'Failed to fetch from Groq', status: groqResponse.status };
  }

  const groqData = await groqResponse.json();
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

app.post('/api/interpret-skill', async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== 'string') {
    res.status(400).json({ error: 'Missing "description" string in request body' });
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

    res.json({ damageType: parsed.damageType, scalingStat: parsed.scalingStat });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to interpret skill' });
  }
});

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

  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
    return;
  }

  const abilitiesText = abilities
    .map((a) => `[${a.type}] ${a.description}`)
    .join('\n\n');

  const systemPrompt = `You are extracting structured conditional damage bonuses from Honkai: Star Rail ability descriptions. Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting, no code fences:
{"conditionals": [{"name": string, "appliesToAbility": string, "statType": string, "trigger": string, "valuesByStack": number[], "maxStacks": number}]}
If no qualifying conditional effects are found, respond with {"conditionals": []}.`;

  const userPrompt = `Character: "${characterName}"

Ability descriptions:
${abilitiesText}

Find any effects where the character's DMG (or a specific ability's DMG) increases conditionally — for example, stacking bonuses from repeated casts, threshold-based bonuses (e.g. "when HP is above/below X%"), or state-based bonuses. Ignore effects that are just flat, always-on stat increases with no condition (e.g. a trace that always gives +20% CRIT DMG with no trigger, or a summon effect that unconditionally debuffs enemies) — only extract effects with an actual trigger or stacking condition.

For each conditional effect found, determine:
- appliesToAbility: which ability type it affects — must be exactly one of "BASIC", "SKILL", "ULT", "FUA", "DOT", or "ALL" if it affects all of the character's damage. Use "ALL" for Talent/passive-sourced DMG Boosts that aren't scoped to one specific attack type — do not invent other category names.
- statType: what it boosts — one of "DMG_PERCENT", "CRIT_RATE", "CRIT_DMG", "ATK_PERCENT", "DEF_PEN", "RES_PEN", "VULNERABILITY", or "OTHER" if none of these fit
- trigger: a short plain-English description of the condition
- valuesByStack: an array of the bonus values in percent (e.g. 20 means +20%, not 0.2 and not 2000), indexed by stack count starting at 1 (e.g. [100, 200] means 1 stack = 100%, 2 stacks = 200%). If it's not stack-based but a single on/off condition, use a single-element array. The array length must exactly equal maxStacks. If the effect scales continuously (e.g. "+X% DMG per 1% Max HP lost, up to Y%") rather than in discrete stacks, represent only the minimum and maximum bound as a 2-element array with maxStacks 2, and say so in the trigger text — do not invent intermediate stack values.
- maxStacks: the highest stack count reachable, or 1 if not stack-based. Must equal valuesByStack.length.`;

  try {
    const result = await callGroqJson({ systemPrompt, userPrompt });

    if (result.error) {
      res.status(result.status || 502).json(result);
      return;
    }

    const parsed = result.parsed;

    if (!Array.isArray(parsed.conditionals)) {
      res.status(502).json({ error: 'Model returned an unexpected shape', raw: parsed });
      return;
    }

    res.json({ conditionals: sanitizeConditionals(parsed.conditionals) });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to extract conditionals' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});