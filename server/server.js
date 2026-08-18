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

Which single stat does this skill's damage or effect primarily scale from: ATK, DEF, or HP? If it scales from more than one, pick the one that contributes the most to its primary effect. If the skill doesn't scale from any of these three, respond with NONE.

Respond with ONLY a JSON object in this exact shape, no other text, no markdown formatting:
{"scalingStat": "ATK" | "DEF" | "HP" | "NONE"}`;

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

    const validStats = ['ATK', 'DEF', 'HP', 'NONE'];
    if (!validStats.includes(parsed.scalingStat)) {
      res.status(502).json({ error: 'Model returned an unexpected value', raw: parsed });
      return;
    }

    res.json({ scalingStat: parsed.scalingStat });
  } catch (err) {
    console.log('Error calling Groq:', err);
    res.status(500).json({ error: 'Failed to interpret skill' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});