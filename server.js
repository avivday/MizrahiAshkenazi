import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

  const isMizrahi = mode === 'מזרחי';
  const prompt = `You are a master of casual Israeli Hebrew slang, specializing in both Ashkenazi Yiddish-rooted expressions and Mizrahi Arabic street language. You know the exact nuances of real street language and never confuse phonetically similar words.

The user wants to know about this ${isMizrahi ? 'Mizrahi' : 'Ashkenazi'} expression: "${word}"

CRITICAL: Before writing, verify the exact authentic meaning of "${word}". Do not hallucinate or merge it with similar-sounding words.

Respond in exactly this format (no markdown, no bullet points, no intro):
[Line 1]: One short, punchy Hebrew sentence explaining exactly what it means and when to use it — direct, like a friend translating for you.
[Line 2]: A funny, realistic Hebrew example sentence of someone saying it in real life, in quotes.

Reference examples of the format (do not copy these, just match the style):
נו שוין — כבר מזמן, בא נזוז
"נו שוין, מתי אתה מגיע?"
פנאני — בן אדם פתטי שמגזים עם עצמו
"הוא לבש את כל התכשיטים, אחד פנאני"`;

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
