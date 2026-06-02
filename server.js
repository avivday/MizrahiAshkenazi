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

  const prompt = `
  You are a master of casual Israeli Hebrew words, specializing in both Ashkenazi Yiddish expressions, and Mizrahi Arabic street. You know the exact nuances of real street language and do not confuse phonetically similar words.
  The word given can be a single word, or a sentence, or a phrase

The user wants to know about this ${mode === 'מזרחי' ? 'Mizrahi' : 'Ashkenazi'} word/expression: "${word}"

CRITICAL ACCURACY CHECK: Before writing, verify the exact authentic meaning of "${word}" in Israeli. Do not hallucinate or merge it with similar-sounding words (for example, ensure you don't confuse words like "דוואפרה/ג'אפרה" with "דאווין", or vice versa).

Provide a response strictly in the following format (no intro, no markdown, no quotes):

Follow this structure, and this structure only:
[Line 1]: A single, short, and funny Hebrew sentence explaining exactly what it means and when to use it. Keep the tone light and direct, like a quick translation between friends.
[Line 2]: A funny, realistic Hebrew example sentence showing how someone would actually say it in real life. This needs to be in quotes.

E.g:
דוואפרה - מישהו שעושה פוזה
פון אונזרר - מבית אבא, מהמקורות שלנו
האק נישט אין טשייניק  - אל תכה בקומקום, אל תבלבל את המוח
דאווין - פוזה
שופוני יא נאס - תראו אותי אנשים, כינוי לפוזה
טבחה - תבשיל מזרחי
  `;

  try {
    const apiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 1500 },
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
