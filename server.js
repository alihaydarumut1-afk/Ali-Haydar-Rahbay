require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { YoutubeTranscript } = require('youtube-transcript');
const path = require('path');

const app = express();

// Frontend'in bu sunucuya erişebilmesi için CORS izni veriyoruz
app.use(cors());

app.use(express.json({ limit: '50mb' }));

const getAIKey = () => {
  const key = process.env.AI_KEY;
  if (!key) throw new Error('Sunucuda AI_KEY bulunamadı! Lütfen .env dosyasından ekleyin.');
  return key;
};

app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, expectJson, maxTokens } = req.body;
    const key = getAIKey();
    
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
      if (!response.ok) throw new Error(data.error?.message || 'OpenAI Hatası');
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
      if (!response.ok) throw new Error(data.error?.message || 'Gemini Hatası');
      content = data.candidates[0].content.parts[0].text;
    }
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    const key = getAIKey();
    
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/speech', async (req, res) => {
  try {
    const { text, voice } = req.body;
    const key = getAIKey();

    if (key.startsWith('sk-')) {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: text })
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
    res.status(500).json({ error: err.message });
  }
});

// React arayüzünü localhost üzerinden sunuyoruz (file:// hatasını önlemek için)
app.use(express.static(path.join(__dirname, 'note-app', 'dist')));

app.get('/api/transcript', async (req, res) => {
  try {
    const videoId = req.query.videoId;
    if (!videoId) return res.status(400).json({ error: 'Video ID gereklidir' });
    
    // YoutubeTranscript kütüphanesi ile videonun altyazılarını çekiyoruz
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    res.json(transcript);
  } catch (error) {
    console.error('Transcript API Hatası:', error.message);
    res.status(500).json({ error: 'Altyazı alınamadı veya engellendi. Geçerli bir video linki girdiğinizden emin olun.' });
  }
});

// React Router gibi sayfa içi yönlendirmelerde hata vermemesi için
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'note-app', 'dist', 'index.html'));
});

function startBackendServer() {
  return new Promise((resolve) => {
    const startServer = (port) => {
      const server = app.listen(port, () => {
        const actualPort = server.address().port;
        console.log(`✅ Arka plan sunucusu ${actualPort} portunda çalışıyor!`);
        resolve(actualPort);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          startServer(0); // Port doluysa rastgele boş bir port bul ve onunla başla
        } else {
          console.error('Sunucu başlatma hatası:', err);
        }
      });
    };
    startServer(3000);
  });
}

module.exports = { startBackendServer };

// Dosya terminalden doğrudan "node server.js" komutuyla çalıştırılırsa sunucuyu otomatik başlat
if (require.main === module) {
  startBackendServer();
}