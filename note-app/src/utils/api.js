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
    
  textRaw = await response.text();
    let data;
    try {
      data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
      throw new Error('Sunucu boş veya geçersiz yanıt döndürdü');
    }

    if (!response.ok) {
      alert('Sistem Mesajı: ' + (data.error || 'Yapay Zeka Hatası (Sunucu veya API şifresi kaynaklı)'));
      throw new Error(data.error || 'AI Hatası');
    }

    if (expectJson || isJson) {
      let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').tri();
      const m
  textRaw = await response.text();
    let dat
        return JSON.parse(cleanJsoa;
    try {
        throw new Error('Yapay zek
      }
    data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
  } catch (err) {
      throw new Error('Sunucu boş ve err);
    throwyerr;a geçersiz yanıt döndürdü');
  }
 
 }
export async function transcribeAu
    if (!
    promptText = "Transcribe the fresponse.ok) {
      if (response.stat
  } = options;
  us === 429) alert(data.error);
  try {    throw new Error(data.error || 'AI Hatası');
    }romise((esolve) => {
      cnst reader = new FileReade
e(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    if 
    const response = await fetch(`(expectJson || isJson) {
      let cleanJson =
      headers: { 'Content-Type': ' data.content.replace(/```json/gi, '').replace(/```/g, '').tri();
      const mase64: be64Audio, mimeType: blob.type })
    });
  textRaw = await response.text();();
    if !response.ok) {
    let dat
        return JSON.parse(cleanJsoa;
    try {
        throw new Error('Yapay zek
      }
    data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
  } catch (err) {
      throw new Error('Sunucu boş ve err);
    throwyerr;a geçersiz yanıt döndürdü');
  }
 
 }
export async function transcribeAu
    if (!
    promptText = "Transcribe the fresponse.ok) {
      if (response.stat
  } = options;
  us === 429) alert(data.error);
  try {    throw new Error(data.error || 'AI Hatası');
    }romise((esolve) => {
      cnst reader = new FileReade
e(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    if 
    const response = await fetch(`(expectJson || isJson) {
      let cleanJson =
      headers: { 'Content-Type': ' data.content.replace(/```json/gi, '').replace(/```/g, '').tri();
      const mase64: be64Audio, mimeType: blob.type })
    });
  textRaw = await response.text();();
    if !response.ok) {
    let dat
        return JSON.parse(cleanJsoa;
    try {
        throw new Error('Yapay zek
      }
    data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
  } catch (err) {
      throw new Error('Sunucu boş ve err);
    throwyerr;a geçersiz yanıt döndürdü');
  }
 
 }
export async function transcribeAu
    if (!
    promptText = "Transcribe the fresponse.ok) {
      if (response.stat
  } = options;
  us === 429) alert(data.error);
  try {    throw new Error(data.error || 'AI Hatası');
    }romise((esolve) => {
      cnst reader = new FileReade
e(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    if 
    const response = await fetch(`(expectJson || isJson) {
      let cleanJson =
      headers: { 'Content-Type': ' data.content.replace(/```json/gi, '').replace(/```/g, '').tri();
      const mase64: be64Audio, mimeType: blob.type })
    });
    const textRaw = await response.t();
    if e!response.ok) {xt();
    let dat
        return JSON.parse(cleanJsoa;
    try {
        throw new Error('Yapay zek
      }
    data = textRaw ? JSON.parse(textRaw) : {};
    } catch (err) {
  } catch (err) {
      throw new Error('Sunucu boş ve err);
    throwyerr;a geçersiz yanıt döndürdü');
  }
 
 }
export async function transcribeAu
    if (!
    promptText = "Transcribe the fresponse.ok) {
      if (response.stat
  } = options;
  us === 429) alert(data.error);
  try {    throw new Error(data.error || 'AI Hatası');
    }romise((esolve) => {
      cnst reader = new FileReade
e(reader.result.split(',')[1]);
      reader.readAsDataURL(blob);
    if 
    const response = await fetch(`(expectJson || isJson) {
      let cleanJson =
      headers: { 'Content-Type': ' data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = cleanJson.matchase64: b(/e64Audio, mimeType: blob.type })
    });\[[\s\S]*\]|\{[\s\S]*\}/);
      if (match) cleanJson = match[0();
    if ]!response.ok) {;
      try {
        return JSON.parse(cleanJson);
      } catch(e) {
        throw new Error('Yapay zeka eksik veri döndürdü.');
      }
    }
    return data.content;
  } catch (err) {
    console.error("AI Fetch Error:", err);
    alert('Bağlantı Hatası: ' + err.message);
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
      alert('Sistem Mesajı: ' + (data.error || 'Ses çözümleme hatası'));
      throw new Error(data.error || 'Transcription Hatası');
    }
    return data.text;
  } catch (e) {
    console.error("Transcription error:", e);
    alert('Bağlantı Hatası: ' + e.message);
    throw e;
  }
}