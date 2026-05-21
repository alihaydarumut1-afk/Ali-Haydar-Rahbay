import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';
import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const userQuotas = new Map();
const DAILY_AI_LIMIT = 30;

const checkQuota = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const incomingApiKey = req.body?.apiKey || '';

  // 1. Admin key ile gelen istekler sınırsız
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && incomingApiKey === adminKey) {
    req.isAdmin = true;
    return next();
  }

  // 2. Localhost sınırsız
  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) {
    return next();
  }

  // 3. Normal kullanıcılar kota kontrolüne tabi
  const today = new Date().toISOString().split('T')[0];
  const key = `${ip}_${today}`;
  const usage = userQuotas.get(key) || 0;
  if (usage >= DAILY_AI_LIMIT) {
    return res.status(429).json({ error: `Günlük yapay zeka limitinize (${DAILY_AI_LIMIT} işlem) ulaştınız. Lütfen yarın tekrar deneyin.` });
  }
  userQuotas.set(key, usage + 1);
  next();
};

// Admin key gelirse kendi API key'ini kullan, yoksa kullanıcının key'ini kullan
const resolveApiKey = (req, userProvidedKey) => {
  if (req.isAdmin) {
    return process.env.DEFAULT_API_KEY || userProvidedKey;
  }
  return userProvidedKey || process.env.DEFAULT_API_KEY;
};

app.post('/api/ai/chat', checkQuota, async (req, res) => {
  try {
    const { prompt, expectJson, maxTokens, apiKey } = req.body;
    const key = resolveApiKey(req, apiKey);
    if (!key) throw new Error('API şifresi eksik! Lütfen arayüzden şifrenizi girin.');

    let content = '';
    if (key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          temperature: 0.3,
          max_tokens: maxTokens || (expectJson ? 1500 : 800),
          ...(expectJson ? { response_format: { type: 'json_object' } } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Hatası');
      content = data.choices[0].message.content;
    } else {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens || (expectJson ? 1500 : 800),
            ...(expectJson ? { responseMimeType: 'application/json' } : {})
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini API Hatası');
      content = data.candidates[0].content.parts[0].text;
    }
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: 'Yapay zeka yanıt veremedi: ' + err.message });
  }
});

app.post('/api/ai/transcribe', checkQuota, async (req, res) => {
  try {
    const { audioBase64, mimeType, apiKey } = req.body;
    const key = resolveApiKey(req, apiKey);
    if (!key) throw new Error('API şifresi eksik! Lütfen arayüzden şifrenizi girin.');

    let text = '';
    if (key.startsWith('sk-')) {
      const buffer = Buffer.from(audioBase64, 'base64');
      const blob = new Blob([buffer], { type: mimeType });
      const formData = new FormData();
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('wav') ? 'wav' : 'webm';
      formData.append('file', blob, `recording.${ext}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'OpenAI Transcription Hatası');
      text = data.text.trim();
    } else {
      const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe the following English audio accurately. Reply ONLY with the transcription." },
              { inlineData: { mimeType: cleanMimeType, data: audioBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini Transcription Hatası');
      text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: 'Ses metne çevrilemedi: ' + err.message });
  }
});

app.post('/api/ai/speech', checkQuota, async (req, res) => {
  try {
    const { text, voice, apiKey } = req.body;
    const key = resolveApiKey(req, apiKey);

    if (key && key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'tts-1', voice: voice || 'alloy', input: text })
      });
      if (!response.ok) throw new Error('OpenAI Speech API Hatası');
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(arrayBuffer));
    } else {
      const googleUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text)}`;
      const response = await fetch(googleUrl);
      if (!response.ok) throw new Error('Google TTS Hatası');
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (err) {
    res.status(500).json({ error: 'Ses üretilemedi: ' + err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/transcript', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  try {
    const { Innertube } = await import('youtubei.js');
    const youtube = await Innertube.create({ retrieve_player: false });
    const info = await youtube.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    const segments = transcriptData?.transcript?.content?.body?.initial_segments || [];
    
    const formatted = segments
      .filter(seg => seg.snippet?.runs?.[0]?.text)
      .map((seg, index) => ({
        id: index,
        start: Number(seg.start_ms) / 1000,
        end: Number(seg.end_ms) / 1000,
        text: seg.snippet.runs.map(r => r.text).join('')
      }));

    if (formatted.length === 0) throw new Error('Transcript boş geldi');

    res.json(formatted);
  } catch (error) {
    console.error('Transcript error:', error.message);
    res.status(500).json({ error: 'Transkript alınamadı: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`🔑 Admin modu: ${process.env.ADMIN_API_KEY ? 'Aktif' : 'Pasif'}`);
  console.log(`===================================================`);
});