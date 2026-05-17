const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;

export async function fetchAI(prompt, options = {}) {
  const {
    expectJson = false,
    maxTokens = null,
    temperature = 0.7,
    role = 'user'
  } = options;

  const isJson = expectJson || prompt.includes('JSON') || prompt.includes('json');
  const tokens = maxTokens || (isJson ? 1500 : 800);

  try {
    const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, expectJson: isJson, maxTokens: tokens })
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 429) alert(data.error);
      throw new Error(data.error || 'AI Hatası');
    }

    if (expectJson || isJson) {
      let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (match) cleanJson = match[0];
      return JSON.parse(cleanJson);
    }
    return data.content;
  } catch (err) {
    console.error("AI Fetch Error:", err);
    throw err;
  }
}

export async function transcribeAudioWithAI(blob, options = {}) {
  const {
    promptText = "Transcribe the following English audio accurately. Reply ONLY with the transcription.",
    forceGemini = false
  } = options;
  
  try {
    const base64Audio = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    });
    const response = await fetch(`${getBaseUrl()}/api/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64Audio, mimeType: blob.type })
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