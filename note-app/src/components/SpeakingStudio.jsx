import { useState, useEffect, useRef } from 'react'
import { Bot, Mic, Square, Save, Trash2, RotateCcw, Plus, User } from 'lucide-react'
import useWords from '../hooks/useWords.js'

const getBaseUrl = () => (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.origin.includes('file://'))) ? 'http://localhost:3000' : window.location.origin;
const getUserApiKey = () => { if (typeof window !== 'undefined') return localStorage.getItem('USER_API_KEY') || ''; return ''; };

async function fetchAI(prompt, expectJson = false, maxTokensOverride = null) {
  try {
    const response = await fetch(`${getBaseUrl()}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, expectJson, maxTokens: maxTokensOverride, apiKey: getUserApiKey() })
    });
    const textRaw = await response.text();
    let data;
    try { data = textRaw ? JSON.parse(textRaw) : {}; }
    catch (err) {
      if (!response.ok && (response.status === 502 || response.status === 504)) throw new Error('Cannot connect to backend. Make sure "node server.js" is running.');
      throw new Error('Server returned empty or invalid response');
    }
    if (!response.ok) { if (response.status === 429) alert(data.error); throw new Error(data.error || 'AI Error'); }
    if (expectJson) {
      try {
        let cleanJson = data.content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const match = cleanJson.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (match) cleanJson = match[0];
        return JSON.parse(cleanJson);
      } catch(e) { throw new Error('AI returned incomplete data.'); }
    }
    return data.content;
  } catch (err) { console.error(err); throw err; }
}

async function transcribeAudioWithAI(blob) {
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
  let data;
  try { const textRaw = await response.text(); data = textRaw ? JSON.parse(textRaw) : {}; }
  catch (e) { throw new Error('Server returned invalid response'); }
  if (!response.ok) { if (response.status === 429) alert(data.error); throw new Error(data.error || 'Transcription Error'); }
  return data.text;
}

const DB_NAME = 'PronunciationDB';
const STORE_NAME = 'audioStore';
const initDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = (e) => { e.target.result.createObjectStore(STORE_NAME); };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const saveAudioToDB = async (key, blob) => { try { const db = await initDB(); db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(blob, key); } catch (e) {} };
const getAudioFromDB = async (key) => { try { const db = await initDB(); return await new Promise((resolve) => { const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); }); } catch (e) { return null; } };

function extractSpokenText(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  try {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      return obj.spoken_reply || obj.response || obj.reply || obj.text || obj.message || obj.answer || Object.values(obj).find(v => typeof v === 'string' && v.length > 5) || trimmed;
    }
  } catch (_) {}
  return trimmed;
}

// ── SCORING UTILS ────────────────────────────────────────────────────────────
const countWords = (str) => str ? str.trim().split(/\s+/).filter(Boolean).length : 0;

/** Hard-coded guard for empty / near-empty turns — never reaches AI */
function getLiveTurnGuard(transcript) {
  const wc = countWords(transcript);
  if (wc === 0) return { session_score: 0, overall_progress: '-1.0', feedback_type: 'no_speech', feedback_note: 'No speech detected this turn. Please unmute your microphone and speak in full English sentences.' };
  if (wc <= 2) return { session_score: 1.5, overall_progress: '-1.0', feedback_type: 'fluency', feedback_note: `Only ${wc} word(s) detected ("${transcript}"). IELTS requires extended, coherent responses — full sentences with ideas.` };
  return null; // pass to AI
}

/** Hard-coded full-session zero guard */
function buildZeroScoreReport() {
  return {
    academic_score: 'IELTS Band 0',
    band_breakdown: { fluency_coherence: 0, lexical_resource: 0, grammatical_range: 0, pronunciation: 0 },
    evaluation: {
      fluency_and_coherence: 'No speech was produced during this session. The candidate must speak in full sentences to be assessed.',
      lexical_resource: 'No vocabulary could be evaluated.',
      grammatical_range: 'No grammatical structures were produced.',
      pronunciation: 'No audio was available to assess pronunciation.'
    },
    overall_comment: 'Band 0 awarded: the candidate produced no speech. To receive a real score, speak throughout the simulation using full English sentences.'
  };
}

export default function SpeakingStudio() {
  const { words = [], addWord } = useWords() || {}

  const [status, setStatus] = useState('setup')
  const [roles, setRoles] = useState({ user: '', ai: '', scenario: '', level: 'B1-B2', aiMode: 'normal' })
  const [messages, setMessages] = useState([])
  const [feedbackData, setFeedbackData] = useState(null)
  const [interimText, setInterimText] = useState('')
  const currentTranscriptRef = useRef('')

  const [sessionScore, setSessionScore] = useState(null)
  const [overallProgress, setOverallProgress] = useState('0')
  const [feedbackType, setFeedbackType] = useState('general')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [addedWords, setAddedWords] = useState({})

  const [isRecording, setIsRecording] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isSavedOpen, setIsSavedOpen] = useState(false)

  const [activeSessionId, setActiveSessionId] = useState(null)
  const [savedSessions, setSavedSessions] = useState(() => { try { return JSON.parse(localStorage.getItem('speaking_sessions') || '[]'); } catch { return []; } })

  const recognitionRef = useRef(null)
  const chatEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const isRecordingRef = useRef(false)

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isProcessing])
  useEffect(() => { return () => { window.speechSynthesis.cancel(); if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop(); } catch(e) {} } }; }, [])

  const handleStartSimulation = async () => {
    if (!roles.user.trim() || !roles.ai.trim() || !roles.scenario.trim()) return alert("Please fill in all fields.");
    setStatus('chatting'); setMessages([]); setFeedbackData(null); setAddedWords({}); setIsProcessing(true); setActiveSessionId(null);
    const modeRule = roles.aiMode === 'professor'
      ? "4. PROFESSOR MODE: Correct mistakes concisely. End with a question."
      : "4. NORMAL MODE: 1-2 short natural sentences. Share a thought, not just a question.";
    const prompt = `You are an AI character in an English speaking practice simulation.\nYour role: ${roles.ai}\nUser's role: ${roles.user}\nScenario: ${roles.scenario}\nTarget Level: ${roles.level}\nRULES:\n1. ENGLISH ONLY.\n2. Natural, contractions allowed.\n3. No asterisks, emojis, stage directions.\n${modeRule}`;
    try {
      const rawReply = await fetchAI(prompt);
      const reply = extractSpokenText(rawReply);
      await playAiAudio(reply, () => { setMessages([{ role: 'ai', content: reply }]); });
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  }

  const playAiAudio = async (text, onReady) => {
    setIsAiSpeaking(true);
    try {
      const cacheKey = `en-US-${text.toLowerCase().trim()}`;
      let blobToPlay = null;
      const cachedBlob = await getAudioFromDB(cacheKey);
      if (cachedBlob) { blobToPlay = cachedBlob; }
      else {
        const response = await fetch(`${getBaseUrl()}/api/ai/speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: 'alloy', apiKey: getUserApiKey() }) });
        if (response.ok) { blobToPlay = await response.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        else if (response.status === 429) { const err = await response.json(); alert(err.error); }
        if (!blobToPlay) {
          const res = await fetch(`https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text)}`);
          if (res.ok) { blobToPlay = await res.blob(); await saveAudioToDB(cacheKey, blobToPlay); }
        }
      }
      if (blobToPlay) {
        const audioSource = URL.createObjectURL(blobToPlay);
        const audio = new Audio(audioSource);
        if (roles.level.includes('A1') || roles.level.includes('A2')) audio.playbackRate = 0.85;
        audio.onended = () => { setIsAiSpeaking(false); URL.revokeObjectURL(audioSource); };
        audio.onerror = () => setIsAiSpeaking(false);
        if (onReady) onReady();
        await audio.play();
        return;
      }
    } catch (err) { console.warn('API TTS failed, falling back:', err); }
    if (!('speechSynthesis' in window)) { setIsAiSpeaking(false); if (onReady) onReady(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = (roles.level.includes('A1') || roles.level.includes('A2')) ? 0.85 : 1.0;
    const voices = window.speechSynthesis.getVoices();
    const engVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    const englishVoice = engVoices.find(v => v.lang === 'en-US' || v.lang === 'en_US') || engVoices[0];
    if (englishVoice) utterance.voice = englishVoice;
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    if (onReady) onReady();
    window.speechSynthesis.speak(utterance);
  }

  const handleStartRecording = async () => {
    if (isAiSpeaking || isProcessing) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Your browser does not support Web Speech API. Please use Chrome.');
    window.speechSynthesis.cancel();
    setInterimText(''); currentTranscriptRef.current = ''; audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; recognition.interimResults = true; recognition.continuous = true;
      recognition.onresult = (e) => {
        let interim = '', finalStr = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) finalStr += e.results[i][0].transcript + ' ';
          else interim += e.results[i][0].transcript;
        }
        if (finalStr) currentTranscriptRef.current += finalStr;
        setInterimText(currentTranscriptRef.current + interim);
      };
      recognition.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'audio-capture') { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); isRecordingRef.current = false; setIsRecording(false); } };
      recognition.onend = () => { if (isRecordingRef.current && mediaRecorderRef.current?.state === 'recording' && recognitionRef.current) { try { recognitionRef.current.start(); } catch (err) {} } };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      alert('Microphone access denied. Please check your browser permissions.');
      isRecordingRef.current = false; setIsRecording(false);
    }
  }

  const handleStopRecording = async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false; setIsRecording(false); setIsProcessing(true);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; recognitionRef.current.onerror = null;
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    const blob = await new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state !== 'recording') { resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' })); return; }
      recorder.onstop = () => resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      recorder.stop();
    });
    if (mediaRecorderRef.current?.stream) mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    let transcript = currentTranscriptRef.current.trim();
    if (!transcript && blob && blob.size > 500) {
      setInterimText('✨ Transcribing your voice...');
      try { const aiText = await transcribeAudioWithAI(blob); if (aiText) transcript = aiText.trim(); }
      catch(e) { console.error('Fallback transcription failed', e); }
    }
    setInterimText('');

    // ── LIVE GUARD: never send empty/tiny turns to AI ──
    const guard = getLiveTurnGuard(transcript);
    if (guard) {
      setSessionScore(guard.session_score);
      setOverallProgress(guard.overall_progress);
      setFeedbackType(guard.feedback_type);
      setFeedbackNote(guard.feedback_note);
      if (transcript) setMessages(prev => [...prev, { role: 'user', content: transcript }]);
      setIsProcessing(false);
      return;
    }

    const newHistory = [...messages, { role: 'user', content: transcript }];
    setMessages(newHistory);
    currentTranscriptRef.current = '';

    const wc = countWords(transcript);
    const vocabDensity = wc >= 40 ? 'extended' : wc >= 20 ? 'moderate' : 'limited';

    const modeInstruction = roles.aiMode === 'professor'
      ? `1. PROFESSOR MODE: Correct mistakes concisely (1-2 sentences). End with a follow-up question.`
      : `1. NORMAL MODE: Ultra-short (1-2 sentences, ≤20 words). React naturally. Don't always ask a question.`;

    const prompt = `You are ${roles.ai} in a voice conversation with ${roles.user}. Scenario: ${roles.scenario}. Level: ${roles.level}.

Conversation history:
${newHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n')}

RULES:
${modeInstruction}
2. English only. No formatting tags.
3. STRICT IELTS LIVE SCORING — USER'S LAST MESSAGE: "${transcript}" (${wc} words, ${vocabDensity} output)

BAND CALIBRATION (apply without mercy):
• 0 words → 0.0
• 1-3 words → 1.0-2.0 (completely inadequate)
• 4-8 words, broken/simple → 2.5-3.5
• 9-15 words, basic sentences → 3.5-4.5
• 16-25 words, some errors → 4.5-5.5
• 26-40 words, mostly correct → 5.5-6.5
• 41-70 words, fluent+varied vocab → 6.5-7.5
• 70+ words, native-like → 7.5-9.0

DEDUCTIONS (mandatory):
• Each major grammar error: -0.5
• Repetition or heavy filler words: -0.5
• Off-topic or incoherent: -1.0
• Underdeveloped answer for context: -0.5

- session_score: 0.0-9.0, half-bands (e.g. 5.5)
- overall_progress: change vs previous turn ("+0.5", "-1.0", "0", etc.)
- feedback_type: "fluency" | "coherence" | "lexical_resource" | "grammatical_range" | "pronunciation_hint" | "no_speech"
- feedback_note: One sentence quoting the user's EXACT words. Never generic praise. E.g. 'You said "I am agree" — correct: "I agree" (stative verb, no auxiliary).'

Respond ONLY in valid JSON:
{ "spoken_reply": "...", "session_score": 5.5, "overall_progress": "+0.5", "feedback_type": "grammatical_range", "feedback_note": "..." }`;

    try {
      const rawText = await fetchAI(prompt, false, 400);
      let replyJson = {};
      try { const match = rawText.match(/\{[\s\S]*\}/); if (match) replyJson = JSON.parse(match[0]); } catch(e) {}
      replyJson.spoken_reply = extractSpokenText(rawText);
      setSessionScore(replyJson.session_score ?? sessionScore);
      setOverallProgress(replyJson.overall_progress || '0');
      setFeedbackType(replyJson.feedback_type || 'general');
      setFeedbackNote(replyJson.feedback_note || '');
      await playAiAudio(replyJson.spoken_reply || "Okay.", () => {
        setMessages(prev => [...prev, { role: 'ai', content: replyJson.spoken_reply || "Okay." }]);
      });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "[Connection error, please try again.]" }]);
    } finally { setIsProcessing(false); }
  }

  const handleEndSimulation = async () => {
    window.speechSynthesis.cancel();
    if (recognitionRef.current) { recognitionRef.current.onend = null; try { recognitionRef.current.stop(); } catch(e) {} }
    if (mediaRecorderRef.current?.state === 'recording') { try { mediaRecorderRef.current.stop(); } catch(e) {} }
    isRecordingRef.current = false; setIsRecording(false); setIsAiSpeaking(false); setStatus('review');
    if (messages.length === 0) return;
    setIsEvaluating(true);

    // ── SESSION ZERO GUARD ──
    const userTurns = messages.filter(m => m.role === 'user');
    const totalUserWords = userTurns.reduce((acc, m) => acc + countWords(m.content), 0);
    if (totalUserWords === 0) { setFeedbackData(buildZeroScoreReport()); setIsEvaluating(false); return; }

    const avgWPT = (totalUserWords / Math.max(userTurns.length, 1)).toFixed(1);
    const allUserText = userTurns.map(m => m.content).join(' ');

    const prompt = `You are a strict, professional IELTS Speaking examiner. Evaluate ONLY the USER's turns from this transcript.

TARGET LEVEL: ${roles.level}
TOTAL USER WORDS: ${totalUserWords} across ${userTurns.length} turn(s) | AVG WORDS/TURN: ${avgWPT}
ALL USER SPEECH: "${allUserText}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY SCORING RULES — ZERO EXCEPTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TOTAL WORDS 0 → All bands 0. academic_score: "IELTS Band 0".
2. TOTAL WORDS 1-20 → Maximum overall band: 3.0. Output reflects extremely limited production.
3. TOTAL WORDS 21-60 → Maximum overall band: 5.0 (only if quality is high).
4. TOTAL WORDS 61-120 → Bands up to 6.5 IF quality justifies (penalise simple vocab, errors, repetition).
5. TOTAL WORDS 120+ → Full range available (1-9) based purely on quality.
6. NEVER inflate. "Yes. I like it. Good." is Band 2-3, not Band 6.
7. Each criterion scored INDEPENDENTLY with evidence from actual speech.
8. Quote EXACT words/phrases from the transcript in every criterion feedback.
9. Overall Band = mean of 4 criteria, rounded to nearest 0.5.

CRITERION DESCRIPTORS:
Fluency & Coherence — Band 1-2: single words only | 3-4: very slow, many pauses | 5-6: some fluency, loose ideas | 7-8: speaks at length, organised | 9: fully fluent
Lexical Resource — Band 1-2: isolated words | 3-4: very basic, frequent wrong choices | 5-6: everyday vocab, attempts less common | 7-8: wide range, precise | 9: full idiomatic flexibility
Grammatical Range — Band 1-2: cannot produce sentences | 3-4: basic forms only, frequent errors | 5-6: mix of simple/complex | 7-8: mostly error-free | 9: full natural control
Pronunciation — Band 1-2: unintelligible | 3-4: very limited control | 5-6: generally intelligible | 7-8: clear, effective | 9: highly proficient

FULL TRANSCRIPT:
${userTurns.map((m, i) => `[Turn ${i+1} — ${countWords(m.content)} words]: ${m.content}`).join('\n')}

Respond ONLY with valid JSON, no markdown:
{
  "academic_score": "IELTS Band X.X",
  "band_breakdown": { "fluency_coherence": X.X, "lexical_resource": X.X, "grammatical_range": X.X, "pronunciation": X.X },
  "evaluation": {
    "fluency_and_coherence": "Quote exact words. State what was insufficient or strong.",
    "lexical_resource": "Quote words used. Give specific C1 alternatives (e.g. 'good' → 'beneficial').",
    "grammatical_range": "Quote exact error with correction and grammar rule.",
    "pronunciation": "Infer from transcript. Note likely intelligibility patterns."
  },
  "overall_comment": "2-3 honest sentences. Name the main weakness. Give ONE concrete study action."
}`;

    try {
      const evalData = await fetchAI(prompt, true);
      setFeedbackData(evalData);
    } catch (e) { console.error('Evaluation error:', e); setFeedbackData(null); }
    finally { setIsEvaluating(false); }
  }

  const saveSession = () => {
    if (activeSessionId) return alert('This session is already saved!');
    const newSession = { id: Date.now(), date: new Date().toISOString(), roles, messages, sessionScore, overallProgress, feedbackData };
    const updated = [newSession, ...savedSessions];
    setSavedSessions(updated);
    localStorage.setItem('speaking_sessions', JSON.stringify(updated));
    setActiveSessionId(newSession.id);
    alert('Session saved successfully!');
  }

  const loadSession = (session) => {
    setRoles(session.roles); setMessages(session.messages); setSessionScore(session.sessionScore || null);
    setOverallProgress(session.overallProgress || '0'); setFeedbackData(session.feedbackData || null);
    setActiveSessionId(session.id); setStatus('review');
  }

  const deleteSession = (id) => {
    if (!window.confirm("Delete this transcript?")) return;
    const updated = savedSessions.filter(s => s.id !== id);
    setSavedSessions(updated);
    localStorage.setItem('speaking_sessions', JSON.stringify(updated));
  }

  const resetSetup = () => { setStatus('setup'); setMessages([]); setFeedbackData(null); setSessionScore(null); setOverallProgress('0'); setFeedbackNote(''); setFeedbackType('general'); setActiveSessionId(null); }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-zinc-100 eye-care:text-amber-950">

      {/* ── SETUP ── */}
      {status === 'setup' && (
        <div className="flex flex-col items-center">
          <div className="mt-8 w-full max-w-lg rounded-3xl bg-white border border-zinc-200 p-8 shadow-sm dark:bg-zinc-800 dark:border-zinc-700 eye-care:bg-[#FDF6E3] eye-care:border-[#EAE0C8]">
            <div className="text-center mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Speaking Studio</p>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-zinc-50 eye-care:text-amber-950 mt-2">Set Your Role & Speak!</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Scenario / Context</label>
                <textarea value={roles.scenario} onChange={(e) => setRoles({ ...roles, scenario: e.target.value })} rows="2" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400" placeholder="e.g., Ordering food at a restaurant..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300">Your Role</label>
                  <input type="text" value={roles.user} onChange={(e) => setRoles({ ...roles, user: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="e.g., Customer" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300">AI's Role</label>
                  <input type="text" value={roles.ai} onChange={(e) => setRoles({ ...roles, ai: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" placeholder="e.g., Waiter" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-zinc-300">English Level</label>
                <select value={roles.level} onChange={(e) => setRoles({ ...roles, level: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-500 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                  <option value="A1-A2">A1-A2 (Beginner)</option>
                  <option value="B1-B2">B1-B2 (Intermediate)</option>
                  <option value="C1-C2">C1-C2 (Advanced)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-zinc-300">AI Mode</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setRoles({ ...roles, aiMode: 'normal' })} className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all" style={roles.aiMode === 'normal' ? { borderColor: '#4f46e5', backgroundColor: '#eef2ff', color: '#4338ca' } : { borderColor: '#e2e8f0', backgroundColor: 'transparent', color: '#64748b' }}>
                    <span className="text-xl">💬</span><span className="text-sm font-bold">Casual Chat</span>
                  </button>
                  <button type="button" onClick={() => setRoles({ ...roles, aiMode: 'professor' })} className="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all" style={roles.aiMode === 'professor' ? { borderColor: '#059669', backgroundColor: '#ecfdf5', color: '#065f46' } : { borderColor: '#e2e8f0', backgroundColor: 'transparent', color: '#64748b' }}>
                    <span className="text-xl">🎓</span><span className="text-sm font-bold">Professor</span>
                  </button>
                </div>
              </div>
              <button onClick={handleStartSimulation} disabled={isProcessing} className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-4 font-bold text-white transition hover:bg-indigo-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? 'Preparing...' : 'Start Simulation'}
              </button>
            </div>
          </div>

          {savedSessions.length > 0 && (
            <div className="mt-12 w-full max-w-4xl animate-fade-in">
              <button onClick={() => setIsSavedOpen(!isSavedOpen)} className="flex w-full items-center justify-between rounded-2xl bg-white p-5 border border-slate-200 shadow-sm transition hover:bg-slate-50 mb-6 dark:bg-zinc-800 dark:border-zinc-700">
                <span className="text-xl font-bold text-slate-900 dark:text-zinc-50 flex items-center gap-2"><Save size={20} className="text-indigo-600" /> Saved Recordings</span>
                <svg className={`h-5 w-5 text-slate-500 transition-transform ${isSavedOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isSavedOpen && (
                <div className="grid gap-4 md:grid-cols-2 animate-fade-in">
                  {savedSessions.map(session => (
                    <div key={session.id} className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex flex-col justify-between dark:bg-zinc-800 dark:border-zinc-700">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">{session.roles.scenario}</p>
                          {session.sessionScore !== null && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold px-2 py-0.5 rounded text-xs">Band {session.sessionScore}</span>}
                        </div>
                        <p className="text-xs font-semibold text-indigo-600 mb-3">{session.roles.user} & {session.roles.ai}</p>
                        <div className="bg-slate-50 rounded-xl p-3 h-24 overflow-y-auto custom-scrollbar text-sm text-slate-600 border border-slate-100 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700">
                          {session.messages.map((m, i) => (<div key={i} className="mb-2"><strong className="text-slate-800 dark:text-zinc-200">{m.role === 'user' ? 'You' : 'AI'}:</strong> {m.content}</div>))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-zinc-700">
                        <span className="text-xs text-slate-400 font-medium">{new Date(session.date).toLocaleDateString('en-US')}</span>
                        <div className="flex gap-2">
                          <button onClick={() => loadSession(session)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition text-xs font-bold">Review</button>
                          <button onClick={() => deleteSession(session.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CHATTING ── */}
      {status === 'chatting' && (
        <div className="mx-auto mt-4 w-full max-w-3xl flex flex-col h-[80vh] rounded-[2rem] overflow-hidden animate-fade-in relative shadow-2xl"
          style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)', border: '1px solid #1e293b' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 z-10" style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" style={{ boxShadow: '0 0 6px #34d399' }} /> Live Simulation
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{roles.scenario}</p>
            </div>
            <button onClick={handleEndSimulation} className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
              onMouseEnter={e => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171'; }}>
              End Simulation
            </button>
          </div>

          {/* IELTS Score Panel */}
          {sessionScore !== null && (
            <div className="absolute top-20 right-5 z-20 w-56 animate-fade-in">
              <div className="rounded-2xl p-4 shadow-2xl" style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.1)', backdropFilter: 'blur(16px)' }}>
                <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#475569' }}>IELTS Score</span>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{roles.level}</span>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <div>
                    <p className="text-[10px] uppercase font-medium mb-0.5" style={{ color: '#475569' }}>Band Score</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-black ${sessionScore === 0 ? 'text-rose-400' : sessionScore < 3 ? 'text-orange-400' : sessionScore < 5 ? 'text-amber-400' : 'text-slate-100'}`}>{sessionScore}</span>
                      <span className={`text-sm font-bold ${String(overallProgress).startsWith('+') ? 'text-emerald-400' : String(overallProgress).startsWith('-') ? 'text-rose-400' : 'text-slate-500'}`}>
                        {String(overallProgress).startsWith('+') ? '↑' : String(overallProgress).startsWith('-') ? '↓' : ''}{overallProgress !== '0' ? overallProgress : ''}
                      </span>
                    </div>
                  </div>
                </div>
                {feedbackNote && (
                  <div className="rounded-xl p-2.5 mt-1" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(148,163,184,0.06)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${feedbackType === 'no_speech' ? 'bg-rose-600' : feedbackType === 'grammatical_range' ? 'bg-rose-400' : feedbackType === 'fluency' ? 'bg-amber-400' : feedbackType === 'lexical_resource' ? 'bg-sky-400' : 'bg-violet-400'}`} />
                      <span className="text-[9px] uppercase font-bold" style={{ color: '#475569' }}>{feedbackType.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{feedbackNote}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-0 select-none">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full transition-all duration-700" style={{ width: 280, height: 280, background: isAiSpeaking ? 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', transform: isAiSpeaking ? 'scale(1.15)' : 'scale(1)' }} />
            </div>
            <div className="relative flex flex-col items-center">
              {isAiSpeaking && (<>
                <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', border: '1.5px solid rgba(99,102,241,0.25)', animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite' }} />
                <div className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', border: '1.5px solid rgba(99,102,241,0.15)', animation: 'ping 1.4s cubic-bezier(0,0,0.2,1) infinite 0.4s' }} />
              </>)}
              <div className="relative rounded-full flex items-center justify-center transition-all duration-500" style={{ width: 128, height: 128, background: 'linear-gradient(145deg, #1e293b, #0f172a)', border: isAiSpeaking ? '3px solid rgba(99,102,241,0.6)' : '3px solid rgba(148,163,184,0.1)', boxShadow: isAiSpeaking ? '0 0 32px rgba(99,102,241,0.3)' : '0 4px 24px rgba(0,0,0,0.4)' }}>
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: 80, height: 80 }}>
                  <circle cx="50" cy="38" r="22" fill="#334155" /><ellipse cx="50" cy="20" rx="22" ry="10" fill="#1e293b" /><ellipse cx="50" cy="17" rx="18" ry="7" fill="#475569" />
                  <circle cx="50" cy="38" r="18" fill="#e2c9a8" /><ellipse cx="43" cy="35" rx="3" ry="3.5" fill="#1e293b" /><ellipse cx="57" cy="35" rx="3" ry="3.5" fill="#1e293b" />
                  <circle cx="44" cy="34" r="1" fill="white" /><circle cx="58" cy="34" r="1" fill="white" />
                  {isAiSpeaking ? (<ellipse cx="50" cy="44" rx="5" ry="3.5" fill="#1e293b"><animate attributeName="ry" values="3.5;1.5;4;1.5;3.5" dur="0.5s" repeatCount="indefinite" /></ellipse>) : (<path d="M44 44 Q50 49 56 44" stroke="#c4a47c" strokeWidth="1.5" fill="none" strokeLinecap="round" />)}
                  <rect x="44" y="54" width="12" height="10" rx="3" fill="#e2c9a8" /><path d="M22 100 Q22 72 50 68 Q78 72 78 100 Z" fill="#334155" /><path d="M44 64 L50 74 L56 64" fill="#1e293b" />
                </svg>
              </div>
              {isProcessing && !isAiSpeaking && (
                <div className="absolute -bottom-2 flex gap-1">
                  {[0,1,2].map(i => (<div key={i} className="rounded-full" style={{ width:6, height:6, background:'#6366f1', animation:`bounce 1s ease-in-out ${i*0.15}s infinite` }} />))}
                </div>
              )}
            </div>
            <p className="mt-5 text-base font-bold" style={{ color: '#cbd5e1' }}>{roles.ai}</p>
            <p className="mt-1 text-sm font-medium" style={{ color: '#475569' }}>
              {isAiSpeaking ? 'Speaking...' : isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Your Turn'}
            </p>
          </div>

          {/* Chat messages */}
          <div className="w-full p-4 pt-8 z-10" style={{ height: 192, background: 'linear-gradient(to top, #0f172a 70%, transparent)' }}>
            <div className="h-full overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed" style={msg.role === 'user' ? { background: '#1e3a5f', color: '#e2e8f0', borderRadius: '16px 16px 4px 16px' } : { background: '#1e293b', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.08)', borderRadius: '16px 16px 16px 4px' }}>
                    <span className="block text-[9px] uppercase font-bold mb-1" style={{ color: msg.role === 'user' ? '#7dd3fc' : '#6366f1', opacity: 0.8 }}>{msg.role === 'user' ? 'You' : roles.ai}</span>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isRecording && (
                <div className="flex justify-end animate-fade-in">
                  <div className="max-w-[82%] rounded-2xl px-4 py-2.5 text-sm italic" style={{ background: 'rgba(30,58,95,0.6)', color: '#94a3b8', border: '1px solid rgba(125,211,252,0.15)', borderRadius: '16px 16px 4px 16px' }}>
                    <span className="block text-[9px] uppercase font-bold mb-1" style={{ color: '#7dd3fc', opacity: 0.8 }}>You (Listening...)</span>
                    {interimText || 'Speak now...'}
                  </div>
                </div>
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: '#1e293b', color: '#475569', border: '1px solid rgba(148,163,184,0.06)', borderRadius: '16px 16px 16px 4px' }}>
                    <span className="inline-flex gap-1">{[0,1,2].map(i => <span key={i} className="rounded-full inline-block" style={{ width:5, height:5, background:'#4f46e5', animation:`bounce 0.9s ease-in-out ${i*0.15}s infinite` }} />)}</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Mic button */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
            <button onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={isAiSpeaking || isProcessing}
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300"
              style={isRecording ? { background: '#ef4444', boxShadow: '0 0 24px rgba(239,68,68,0.5)', transform: 'scale(1.1)', color: '#fff' } : { background: '#f1f5f9', color: '#0f172a', opacity: (isAiSpeaking || isProcessing) ? 0.4 : 1 }}>
              {isRecording ? <Square size={22} fill="currentColor" /> : <Mic size={24} />}
            </button>
          </div>
          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
        </div>
      )}

      {/* ── REVIEW ── */}
      {status === 'review' && (
        <div className="mx-auto mt-8 w-full max-w-4xl space-y-6 animate-fade-in pb-12">
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-3xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-zinc-800 dark:border-zinc-700">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-50">Session Summary</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{roles.scenario}</p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
              <button onClick={resetSetup} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700 transition hover:bg-slate-200"><RotateCcw size={18} /> New Simulation</button>
              {!activeSessionId && <button onClick={saveSession} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700 shadow-sm"><Save size={18} /> Save Analysis</button>}
            </div>
          </div>

          {isEvaluating ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm animate-pulse dark:bg-zinc-800 dark:border-zinc-700">
              <div className="relative flex h-24 w-24 items-center justify-center mb-6">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-20"></span>
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><Bot size={32} /></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-zinc-50 mb-2">AI is analyzing your performance...</h3>
              <p className="text-slate-500 dark:text-zinc-400">Grammar, vocabulary, and fluency are being assessed against official IELTS rubrics.</p>
            </div>
          ) : feedbackData ? (
            <div className="space-y-6">
              {/* Score badge */}
              <div className="flex items-center gap-5 rounded-3xl bg-slate-900 p-6 text-white shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-indigo-500 bg-slate-800 shadow-inner shrink-0"><span className="text-xl font-black">🎓</span></div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold">{feedbackData.academic_score || 'N/A'}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">Official IELTS Examiner Score</p>
                </div>
              </div>

              {/* Band breakdown */}
              {feedbackData.band_breakdown && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: 'fluency_coherence', label: 'Fluency & Coherence', icon: '🗣️', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-900/20', darkBorder: 'dark:border-emerald-800/50', darkText: 'dark:text-emerald-400' },
                    { key: 'lexical_resource', label: 'Lexical Resource', icon: '📚', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700', darkBg: 'dark:bg-sky-900/20', darkBorder: 'dark:border-sky-800/50', darkText: 'dark:text-sky-400' },
                    { key: 'grammatical_range', label: 'Grammar Range', icon: '✍️', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', darkBg: 'dark:bg-rose-900/20', darkBorder: 'dark:border-rose-800/50', darkText: 'dark:text-rose-400' },
                    { key: 'pronunciation', label: 'Pronunciation', icon: '🎙️', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700', darkBg: 'dark:bg-amber-900/20', darkBorder: 'dark:border-amber-800/50', darkText: 'dark:text-amber-400' },
                  ].map(({ key, label, icon, bg, border, text, darkBg, darkBorder, darkText }) => (
                    <div key={key} className={`rounded-2xl ${bg} ${border} ${darkBg} ${darkBorder} border p-4 text-center`}>
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className={`text-3xl font-black ${text} ${darkText}`}>{feedbackData.band_breakdown[key] ?? '—'}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide ${text} ${darkText} mt-1 opacity-80`}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Overall comment */}
              <div className="rounded-3xl bg-indigo-50/50 border border-indigo-100 p-6 shadow-sm dark:bg-indigo-900/20 dark:border-indigo-800/50">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-3 flex items-center gap-2"><span className="text-2xl">📋</span> Overall Comment</h3>
                <p className="text-slate-900 dark:text-zinc-100 leading-relaxed font-semibold">{feedbackData.overall_comment}</p>
              </div>

              {/* Criterion cards */}
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  { key: 'fluency_and_coherence', label: 'Fluency & Coherence', icon: '🗣️', bg: 'bg-white', border: 'border-emerald-100', text: 'text-emerald-900', darkBg: 'dark:bg-emerald-900/20', darkBorder: 'dark:border-emerald-800/50', darkText: 'dark:text-emerald-400' },
                  { key: 'lexical_resource', label: 'Lexical Resource', icon: '📚', bg: 'bg-white', border: 'border-sky-100', text: 'text-sky-900', darkBg: 'dark:bg-sky-900/20', darkBorder: 'dark:border-sky-800/50', darkText: 'dark:text-sky-400' },
                  { key: 'grammatical_range', label: 'Grammatical Range & Accuracy', icon: '✍️', bg: 'bg-white', border: 'border-rose-100', text: 'text-rose-900', darkBg: 'dark:bg-rose-900/20', darkBorder: 'dark:border-rose-800/50', darkText: 'dark:text-rose-400' },
                  { key: 'pronunciation', label: 'Pronunciation', icon: '🎙️', bg: 'bg-white', border: 'border-amber-100', text: 'text-amber-900', darkBg: 'dark:bg-amber-900/20', darkBorder: 'dark:border-amber-800/50', darkText: 'dark:text-amber-400' },
                ].map(({ key, label, icon, bg, border, text, darkBg, darkBorder, darkText }) => (
                  <div key={key} className={`rounded-3xl ${bg} ${border} ${darkBg} ${darkBorder} border p-6 shadow-sm`}>
                    <h3 className={`text-base font-bold ${text} ${darkText} mb-3 flex items-center gap-2`}><span>{icon}</span> {label}</h3>
                    <p className="text-sm text-slate-900 dark:text-zinc-100 font-semibold leading-relaxed">{feedbackData.evaluation?.[key]}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-6">
                <button onClick={resetSetup} className="rounded-2xl bg-slate-900 px-8 py-4 font-bold text-white transition hover:bg-slate-800 shadow-xl">Start New Simulation</button>
              </div>

              {/* Transcript */}
              <div className="mt-10 pt-8 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2"><User size={20} className="text-indigo-500" /> Full Conversation Transcript</h3>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-5 max-h-96 overflow-y-auto custom-scrollbar shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300'}`}>
                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">{msg.role === 'user' ? `You (${roles.user})` : `AI (${roles.ai})`}</p>
                        <p className="text-slate-800 dark:text-zinc-200 leading-relaxed font-medium text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:bg-zinc-800 dark:border-zinc-700">
              <p className="text-slate-500">Analysis could not be generated, or the conversation was too short.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}