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

  const prompt = `You are extracting structured data from a Honkai: Star Rail skill description.

Skill description: "${description}"

First, determine the damage type this skill deals: STANDARD or ELATION. ELATION applies only if the description explicitly says the skill deals Elation DMG (associated with the Path of Elation, Aha, Punchline, Certified Banger, or Merrymake). If there's no mention of Elation DMG, it's STANDARD.

Second, if the damage type is STANDARD, determine which single stat the skill's damage or effect primarily scales from: ATK, DEF, or HP. If it scales from more than one, pick the one that contributes the most to its primary effect. If the skill doesn't scale from any of these three, respond with NONE. If the damage type is ELATION, respond with NONE for scalingStat, since Elation DMG doesn't scale from ATK, DEF, or HP.

Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting:
{"damageType": "STANDARD" | "ELATION", "scalingStat": "ATK" | "DEF" | "HP" | "NONE"}`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    if (!groqResponse.ok) {
      const errBody = await groqResponse.text();
      console.log('Groq responded with status:', groqResponse.status, errBody);
      res.status(groqResponse.status).json({ error: 'Failed to fetch from Groq' });
      return;
    }

    const groqData = await groqResponse.json();
    const rawContent = groqData.choices?.[0]?.message?.content || '';

    // Strip markdown code fences in case the model wraps its JSON in them
    // despite being asked not to.
    const cleaned = rawContent.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.log('Could not parse Groq response as JSON:', rawContent);
      res.status(502).json({ error: 'Model returned unparseable response' });
      return;
    }

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

  const prompt = `You are extracting structured conditional damage bonuses from Honkai: Star Rail ability descriptions for the character "${characterName}".

Ability descriptions:
${abilitiesText}

Find any effects where the character's DMG (or a specific ability's DMG) increases conditionally — for example, stacking bonuses from repeated casts, threshold-based bonuses (e.g. "when HP is above/below X%"), or state-based bonuses. Ignore effects that are just flat, always-on stat increases with no condition (e.g. a trace that always gives +20% CRIT DMG with no trigger) — only extract effects with an actual trigger or stacking condition.

For each conditional effect found, determine:
- appliesToAbility: which ability type it affects — one of "BASIC", "SKILL", "ULT", "FUA", "DOT", or "ALL" if it affects all of the character's damage
- statType: what it boosts — one of "DMG_PERCENT", "CRIT_RATE", "CRIT_DMG", "ATK_PERCENT", "DEF_PEN", "RES_PEN", "VULNERABILITY", or "OTHER" if none of these fit
- trigger: a short plain-English description of the condition
- valuesByStack: an array of the bonus values in percent, indexed by stack count starting at 1 (e.g. [100, 200] means 1 stack = 100%, 2 stacks = 200%). If it's not stack-based but a single on/off condition, use a single-element array.
- maxStacks: the highest stack count reachable, or 1 if not stack-based

Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting, no code fences:
{"conditionals": [{"name": string, "appliesToAbility": string, "statType": string, "trigger": string, "valuesByStack": number[], "maxStacks": number}]}

If no qualifying conditional effects are found, respond with {"conditionals": []}.`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });

    if (!groqResponse.ok) {
      const errBody = await groqResponse.text();
      console.log('Groq responded with status:', groqResponse.status, errBody);
      res.status(groqResponse.status).json({ error: 'Failed to fetch from Groq' });
      return;
    }

    const groqData = await groqResponse.json();
    const rawContent = groqData.choices?.[0]?.message?.content || '';
    const cleaned = rawContent.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.log('Could not parse Groq response as JSON:', rawContent);
      res.status(502).json({ error: 'Model returned unparseable response' });
      return;
    }

    if (!Array.isArray(parsed.conditionals)) {
      res.status(502).json({ error: 'Model returned an unexpected shape', raw: parsed });
      return;
    }

    res.json({ conditionals: parsed.conditionals });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to extract conditionals' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});