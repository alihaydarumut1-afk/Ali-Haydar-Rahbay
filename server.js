<<<<<<< HEAD
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';
import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
=======
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const ROOT = process.cwd();
>>>>>>> 59f1940 (fix: render backend url)

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const userQuotas = new Map();
const DAILY_AI_LIMIT = 30;

const isLocalhost = (ip) => {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.includes('127.0.0.1')
  );
};

const checkQuota = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const incomingApiKey = req.body?.apiKey || '';

  // 1. Admin key ile gelen istekler sınırsız
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && incomingApiKey === adminKey) {
    req.isAdmin = true;
    return next();
  }

<<<<<<< HEAD
  // 2. Localhost sınırsız
  if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1')) {
=======
  if (isLocalhost(ip)) {
    req.isLocalhost = true;
>>>>>>> 59f1940 (fix: render backend url)
    return next();
  }

  // 3. Normal kullanıcılar kota kontrolüne tabi
  const today = new Date().toISOString().split('T')[0];
  const quotaKey = `${ip}_${today}`;
  const usage = userQuotas.get(quotaKey) || 0;

  if (usage >= DAILY_AI_LIMIT) {
    return res.status(429).json({
      error: `Günlük yapay zeka limitinize (${DAILY_AI_LIMIT} işlem) ulaştınız. Lütfen yarın tekrar deneyin.`
    });
  }

  userQuotas.set(quotaKey, usage + 1);
  next();
};

// Admin key gelirse kendi API key'ini kullan, yoksa kullanıcının key'ini kullan
const resolveApiKey = (req, userProvidedKey) => {
  return process.env.DEFAULT_API_KEY || userProvidedKey || '';
};

// ──────────────────────────────────────────────
// AI CHAT
// ──────────────────────────────────────────────
app.post('/api/ai/chat', checkQuota, async (req, res) => {
  try {
    const { prompt, expectJson, maxTokens, apiKey } = req.body;
    const key = resolveApiKey(req, apiKey);
<<<<<<< HEAD
=======

    console.log(
      'CHAT | KEY:', key?.substring(0, 15),
      '| isAdmin:', !!req.isAdmin,
      '| isLocalhost:', !!req.isLocalhost,
      '| IP:', req.ip
    );

>>>>>>> 59f1940 (fix: render backend url)
    if (!key) throw new Error('API şifresi eksik! Lütfen arayüzden şifrenizi girin.');

    let content = '';

    if (key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
<<<<<<< HEAD
          messages: [{ role: 'system', content: prompt }],
=======
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Always respond in valid JSON format when asked.' },
            { role: 'user', content: prompt }
          ],
>>>>>>> 59f1940 (fix: render backend url)
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
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    res.json({ content });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Yapay zeka yanıt veremedi: ' + err.message });
  }
});

// ──────────────────────────────────────────────
// TRANSCRIBE (Ses → Metin)
// ──────────────────────────────────────────────
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
      text = data.text?.trim() || '';

    } else {
      const cleanMimeType = mimeType.split(';')[0] || 'audio/webm';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe the following English audio accurately. Reply ONLY with the transcription.' },
                { inlineData: { mimeType: cleanMimeType, data: audioBase64 } }
              ]
            }],
            generationConfig: { temperature: 0.1 }
          })
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini Transcription Hatası');
      text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    }

    res.json({ text });
  } catch (err) {
    console.error('Transcribe error:', err.message);
    res.status(500).json({ error: 'Ses metne çevrilemedi: ' + err.message });
  }
});

// ──────────────────────────────────────────────
// SPEECH (Metin → Ses)
// ──────────────────────────────────────────────
app.post('/api/ai/speech', checkQuota, async (req, res) => {
  try {
    const { text, voice, apiKey } = req.body;
    const key = resolveApiKey(req, apiKey);

    if (key && key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: voice || 'alloy',
          input: text
        })
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
    console.error('Speech error:', err.message);
    res.status(500).json({ error: 'Ses üretilemedi: ' + err.message });
  }
});

<<<<<<< HEAD
app.use(express.static(path.join(__dirname, 'dist')));

=======
// ──────────────────────────────────────────────
// TRANSCRIPT (YouTube - youtube-transcript paketi)
// ──────────────────────────────────────────────
>>>>>>> 59f1940 (fix: render backend url)
app.get('/api/transcript', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  try {
<<<<<<< HEAD
    const { Innertube } = await import('youtubei.js');
    const youtube = await Innertube.create();
    
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
=======
    const { YoutubeTranscript } = require('youtube-transcript');
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });

    if (!raw || raw.length === 0) {
      return res.status(404).json({ error: 'Bu video için İngilizce transkript bulunamadı. Videonun CC altyazısı olduğundan emin olun.' });
    }

    // Frontend'in beklediği formata dönüştür: { id, text, start, end }
    const transcript = raw.map((item, idx) => ({
      id: idx,
      text: item.text,
      start: item.offset / 1000,        // ms → saniye
      end: (item.offset + item.duration) / 1000
    }));

    res.json(transcript);
  } catch (err) {
    console.error('Transcript error:', err.message);
    const msg = err.message?.includes('no longer available')
      ? 'Video artık mevcut değil.'
      : err.message?.includes('disabled')
      ? 'Bu videonun altyazısı devre dışı bırakılmış.'
      : 'Transkript alınamadı: ' + err.message;
    res.status(500).json({ error: msg });
  }
});

// ──────────────────────────────────────────────
// STATIC & SPA FALLBACK
// ──────────────────────────────────────────────
app.use(express.static(path.join(ROOT, 'note-app', 'dist')));

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(ROOT, 'note-app', 'dist', 'index.html'));
>>>>>>> 59f1940 (fix: render backend url)
});

// ──────────────────────────────────────────────
// SUNUCUYU BAŞLAT
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`✅ Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`📁 ROOT: ${ROOT}`);
  console.log(`🔑 Admin modu   : ${process.env.ADMIN_API_KEY ? 'Aktif' : 'Pasif'}`);
  console.log(`🔑 Default key  : ${process.env.DEFAULT_API_KEY ? 'Var ✅' : 'YOK ❌'}`);
  console.log(`🔑 Key önizleme : ${process.env.DEFAULT_API_KEY?.substring(0, 15) || 'TANIMSIZ'}`);
  console.log(`===================================================`);
});