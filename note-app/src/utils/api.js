const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : 'https://note-app-server-44hm.onrender.com';

const getUserApiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('USER_API_KEY') || '';
  }
  return '';
};

export async function fetchAI(prompt, options = {}) {
  const {
    expectJson = false,
    maxTokens = null,
  } = options;

  const isJson = expectJson || prompt.includes('JSON') || prompt.includes('json');
  const tokens = maxTokens || (isJson ? 1500 : 800);

  try {
    const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, expectJson: isJson, maxTokens: tokens, apiKey: getUserApiKey() })
    });

    const textRaw = await response.text();
    let data;
    try {
      data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
      throw new Error('Sunucu boş veya geçersiz yanıt döndürdü');
    }

    if (!response.ok) {
      if (response.status === 429) alert(data.error);
      throw new Error(data.error || 'AI Hatası');
    }

    if (isJson) {
      let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (match) cleanJson = match[0];
      try {
        return JSON.parse(cleanJson);
      } catch (e) {
        throw new Error('Yapay zeka eksik veri döndürdü.');
      }
    }

    return data.content;
  } catch (err) {
    console.error("AI Fetch Error:", err);
    throw err;
  }
}

export async function transcribeAudioWithAI(blob, options = {}) {
  try {
    const base64Audio = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });

    const response = await fetch(`${getBaseUrl()}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type, apiKey: getUserApiKey() })
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) alert(data.error);
      throw new Error(data.error || 'Transcription Hatası');
    }
    return data.text;
  } catch (e) {
    console.error("Transcription error:", e);
    throw e;
  }
}

export async function generateSpeechWithAI(text) {
  const response = await fetch(`${getBaseUrl()}/api/ai/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'alloy', apiKey: getUserApiKey() })
  });
  if (!response.ok) {
    throw new Error('Speech API Hatası');
  }
  return await response.blob();
}