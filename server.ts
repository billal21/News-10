
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

import translate from 'translate-google-api';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,bn-BD;q=0.8,bn;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
  timeout: 15000, // Increased timeout to 15s
});

function getGenAI() {
  // Prioritize user's custom key names first
  const key = process.env.My_Key || 
              process.env.MY_KEY ||
              process.env.Gemini_New || 
              process.env.Gemini_API_Key ||
              process.env.GEMINI_API_KEY || 
              process.env.gemini_api_key;
  
  if (!key || key.trim() === "" || key === "AI Studio Free Tier" || key.length < 10) {
    return null;
  }
  
  return new GoogleGenerativeAI(key.trim());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/rss', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    try {
      // Direct fetch with browser-like headers to bypass 403 Forbidden
      const response = await fetch(url as string, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://www.google.com/'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Source returned status ${response.status}`);
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);
      res.json(feed);
    } catch (error: any) {
      console.error(`RSS Error for ${url}:`, error.message);
      res.status(500).json({ 
        error: 'Failed to fetch news', 
        details: error.message,
        url: url
      });
    }
  });

  // API Route: Batch Translate Titles
  app.post('/api/translate-list', async (req, res) => {
    const { titles } = req.body;
    const genAI = getGenAI();

    if (!titles || !Array.isArray(titles)) {
      return res.status(400).json({ error: 'Titles array is required' });
    }

    // Try Gemini First
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Translate the following English news headlines into professional Bengali for a news portal. 
        Return ONLY a JSON array of strings. Do not include numbering or any other text.
        
        Headlines:
        ${JSON.stringify(titles)}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');
        let cleanText = text;
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanText = text.substring(jsonStart, jsonEnd + 1);
        }

        const translations = JSON.parse(cleanText);
        if (Array.isArray(translations)) {
          return res.json(translations.map(t => String(t).replace(/^\d+\.\s*/, '')));
        }
      } catch (geminiError: any) {
        console.error('Gemini translate-list error, falling back:', geminiError.message || geminiError);
      }
    }

    // Fallback: Free Google Translate API
    try {
      const translations = await translate(titles, { to: 'bn' });
      res.json(Array.isArray(translations) ? translations : [translations]);
    } catch (fallbackError: any) {
      console.error('Fallback translate error:', fallbackError);
      res.status(500).json({ error: 'Translation failed', details: fallbackError.message });
    }
  });

  // API Route: Gemini Generation
  app.post('/api/generate', async (req, res) => {
    const { sourceText, sourceUrl, sourceTitle, sourceMedia } = req.body;
    const genAI = getGenAI();
    
    // Try Gemini First
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          You are a professional Bengali journalist working for CN10 News. 
          Rewrite the following news from ${sourceMedia || 'International Sources'} in professional Bengali, 
          making it completely UNIQUE and SEO-friendly while maintaining factual accuracy.
          
          Return ONLY a JSON object with these keys: "webTitle", "webFullArticle", "fbCaption", "fbCommentDetail".
          
          Source Content: ${sourceText || sourceUrl}
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        let cleanText = text;
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanText = text.substring(jsonStart, jsonEnd + 1);
        }

        return res.json(JSON.parse(cleanText));
      } catch (geminiError: any) {
        console.error('Gemini generate error, falling back:', geminiError.message || geminiError);
      }
    }

    // Fallback: Free Google Translate
    try {
      const textToTranslate = sourceText || sourceTitle || "No content found";
      
      const [translatedTitle, translatedContent] = await Promise.all([
        translate(sourceTitle || "সংবাদ", { to: 'bn' }),
        translate(textToTranslate, { to: 'bn' })
      ]);

      const tTitle = Array.isArray(translatedTitle) ? translatedTitle[0] : translatedTitle;
      const tContent = Array.isArray(translatedContent) ? translatedContent[0] : translatedContent;
      
      res.json({
        webTitle: tTitle,
        webFullArticle: `${tContent}\n\n— CN10 নিউজ ডেস্ক\nসূত্র: ${sourceMedia || 'আন্তর্জাতিক মাধ্যম'}`,
        fbCaption: `📢 ব্রেকিং নিউজ (${sourceMedia}): ${tTitle}\n\nবিশ্বের সাম্প্রতিক খবরের আপডেট পেতে আমাদের সাথেই থাকুন।\n#CN10 #LatestNews #BengaliNews #Verification`,
        fbCommentDetail: `তথ্যসূত্র: ${sourceMedia || 'সংগৃহীত'}\nএটি সরাসরি ${sourceMedia} থেকে পাওয়া খবরের অনুবাদ। বিস্তারিত তথ্যের জন্য মূল সংবাদটি দেখুন।\n\nলিঙ্ক: ${sourceUrl || 'N/A'}`
      });
    } catch (fallbackError: any) {
      console.error('Fallback generate error:', fallbackError);
      res.status(500).json({ error: 'Content generation failed', details: fallbackError.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
