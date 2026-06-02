import express from 'express';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dir = dirname(fileURLToPath(import.meta.url));
const app   = express();
app.use(express.json());
app.use(express.static(__dir));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment');
  process.exit(1);
}

app.post('/api/explain', async (req, res) => {
  const { word, mode } = req.body;

  if (!word || typeof word !== 'string' || word.length > 200) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const prompt = `You are an expert in Israeli Hebrew slang — both Ashkenazi Yiddish-influenced expressions and Mizrahi Arabic-influenced street slang.

The user asked about a ${mode === 'מזרחי' ? 'Mizrahi' : 'Ashkenazi'} Hebrew slang expression: "${word}"

Write ONE clear, witty sentence in Hebrew that explains what this expression actually means and when people use it.
Be specific and accurate — explain the real meaning, not just vague words.
Write only the explanation sentence, nothing else, no quotes, no bullet points.`;

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 400 },
        }),
      }
    );

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('Gemini error:', err);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const data = await apiRes.json();
    const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'לא נמצאה תשובה.';
    res.json({ explanation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
