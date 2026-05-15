import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

// Eğer projede import hatası alırsanız, bu import satırlarını şu şekilde değiştirin:
// const express = require('express');
// const cors = require('cors');
// const { YoutubeTranscript } = require('youtube-transcript');

const app = express();
app.use(cors());

app.get('/api/transcript', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    const formatted = transcript.map((item, index) => ({
      id: index,
      start: item.offset / 1000,
      end: (item.offset + item.duration) / 1000,
      text: item.text
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Transcript error:', error);
    res.status(500).json({ error: 'Transkript alınamadı. Videonun altyazısı kapalı olabilir.' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`✅ Arka plan sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`📺 YouTube transkriptleri başarıyla çekilebilir.`);
  console.log(`===================================================`);
});