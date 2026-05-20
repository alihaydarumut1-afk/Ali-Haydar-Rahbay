require('dotenv').config();
const { HttpsProxyAgent } = require('https-proxy-agent');
const express = require('express');
const cors = require('cors');
const { YoutubeTranscript } = require('youtube-transcript');
const path = require('path');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const userQuotas = new Map();
const DAILY_AI_LIMIT = 2;

const checkQuota = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const incomingApiKey = req.body?.apiKey || '';

  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && incomingApiKey === adminKey) {
    req.isAdmin = true;
    return next();
  }

  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) {
    return next();
  }

  const today = new Date().toISOString().split('T')[0];
  const key = `${ip}_${today}`;
  const usage = userQuotas.get(key) || 0;
  if (usage >= DAILY_AI_LIMIT) {
    return res.status(429).json({ error: `Günlük yapay zeka limitinize (${DAILY_AI_LIMIT} işlem) ulaştınız. Lütfen yarın tekrar deneyin.` });
  }
  userQuotas.set(key, usage + 1);
  next();
};

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
    console.log('Kullanılan key:', key?.substring(0, 20));
    if (!key) throw new Error('API şifresi eksik! Lütfen arayüzden şifrenizi girin.');

    let content = '';
    if (key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
  { role: 'system', content: 'You are a helpful assistant. Always respond in valid JSON format when asked.' },
  { role: 'user', content: prompt }
],
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

app.use(express.static(path.join(__dirname, 'note-app', 'dist')));

app.get('/api/transcript', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  const proxies = [
    'http://178.62.193.19:3128',
    'http://51.159.115.233:3128',
    'http://20.111.54.16:8123',
  ];

  for (const proxyUrl of proxies) {
    try {
      const agent = new HttpsProxyAgent(proxyUrl);
      const customFetch = (url, options = {}) =>
        fetch(url, { ...options, agent });

      const transcript = await YoutubeTranscript.fetchTranscript(videoId, { fetch: customFetch });
      const formatted = transcript.map((item, index) => ({
        id: index,
        start: item.offset / 1000,
        end: (item.offset + item.duration) / 1000,
        text: item.text
      }));
      return res.json(formatted);
    } catch (err) {
      console.error(`Proxy başarısız (${proxyUrl}):`, err.message);
    }
  }

  res.status(500).json({ error: 'Transkript alınamadı. Tüm proxy\'ler başarısız oldu.' });
});

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'note-app', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`🔑 Admin modu: ${process.env.ADMIN_API_KEY ? 'Aktif' : 'Pasif'}`);
  console.log(`===================================================`);
});