import React from 'react';

// Hata anında kullanılacak varsayılan veriler
const fallbackStaticData = {
  scores: { pronunciation: 70, fluency: 65, intonation: 60, vocabulary: 75, overall: 68 },
  feedback: {
    pronunciation: { comment: "Genel olarak anlaşılır.", examples: [], tip: "Daha fazla pratik yapın." },
    fluency: { comment: "Biraz duraksama var.", fillerWords: ["uhm", "like"], tip: "Daha akıcı konuşmaya çalışın." },
    intonation: { comment: "Vurgular fena değil.", tip: "Soru cümlelerinde sesinizi yükseltin." },
    strengths: ["Temel kelime kullanımı"],
    improvements: ["Hız", "Vurgu"]
  },
  targetWordUsage: []
};

// Saf CSS ile dairesel skor halkası animasyonu
const ScoreRing = ({ score, label }) => {
  const color = score < 50 ? '#E24B4A' : score < 75 ? '#EF9F27' : '#639922';
  const strokeDasharray = `${score}, 100`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <path strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <path 
            className="animate-ring-fill"
            style={{ '--target-array': `"${score}, 100"` }}
            strokeDasharray={strokeDasharray} 
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
            fill="none" 
            stroke={color} 
            strokeWidth="3" 
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-2xl font-black text-slate-800">
          {score}
        </div>
      </div>
      <span className="mt-2 text-sm font-semibold text-slate-600 text-center">{label}</span>
    </div>
  );
};

export default function SpeakingReport({ isLoading, data, isError }) {
  const report = isError ? fallbackStaticData : data;

  // Shimmer Effect Yükleme Durumu
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-1/3 rounded bg-slate-200"></div>
          <div className="flex justify-around">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-24 rounded-full bg-slate-200"></div>)}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-slate-200"></div>)}
          </div>
        </div>
        <div className="mt-4 text-center text-sm font-semibold text-indigo-600 animate-pulse">
          Yapay zeka sesinizi analiz ediyor...
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { scores, feedback, targetWordUsage } = report;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Saf CSS Animasyon Eklentisi */}
      <style>{`
        @keyframes ring-fill {
          from { stroke-dasharray: 0, 100; }
          to { stroke-dasharray: var(--target-array); }
        }
        .animate-ring-fill { animation: ring-fill 1.5s ease-out forwards; }
      `}</style>
      
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">AI Konuşma Analizi</h3>
        {isError && <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold tracking-wide text-rose-600">⚠️ AI KULLANILAMIYOR - STATİK VERİ</span>}
      </div>

      {/* Skor Halkaları */}
      <div className="mb-8 flex flex-wrap justify-around gap-4 rounded-xl bg-slate-50 p-6 border border-slate-100">
        <ScoreRing score={scores.overall} label="Genel Puan" />
        <ScoreRing score={scores.pronunciation} label="Telaffuz" />
        <ScoreRing score={scores.fluency} label="Akıcılık" />
        <ScoreRing score={scores.intonation} label="Tonlama" />
        <ScoreRing score={scores.vocabulary} label="Kelime Bilgisi" />
      </div>

      {/* Kategori Geri Bildirim Kartları */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
          <h4 className="mb-2 flex items-center gap-2 font-bold text-indigo-900">🗣️ Telaffuz</h4>
          <p className="mb-3 text-sm text-slate-700">{feedback.pronunciation?.comment}</p>
          {feedback.pronunciation?.examples?.length > 0 && (
            <div className="mb-3 text-xs text-slate-600">
              <span className="font-semibold">Hatalı Kelimeler:</span> {feedback.pronunciation.examples.join(', ')}
            </div>
          )}
          <div className="mt-auto rounded-lg bg-white p-3 text-xs italic text-indigo-700 border border-indigo-100">
            💡 Tip: {feedback.pronunciation?.tip}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50/50 p-5">
          <h4 className="mb-2 flex items-center gap-2 font-bold text-emerald-900">🌊 Akıcılık</h4>
          <p className="mb-3 text-sm text-slate-700">{feedback.fluency?.comment}</p>
          {feedback.fluency?.fillerWords?.length > 0 && (
            <div className="mb-3 text-xs text-slate-600">
              <span className="font-semibold">Dolgu Kelimeleri:</span> {feedback.fluency.fillerWords.join(', ')}
            </div>
          )}
          <div className="mt-auto rounded-lg bg-white p-3 text-xs italic text-emerald-700 border border-emerald-100">
            💡 Tip: {feedback.fluency?.tip}
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-purple-100 bg-purple-50/50 p-5">
          <h4 className="mb-2 flex items-center gap-2 font-bold text-purple-900">🎵 Tonlama</h4>
          <p className="mb-3 text-sm text-slate-700">{feedback.intonation?.comment}</p>
          <div className="mt-auto rounded-lg bg-white p-3 text-xs italic text-purple-700 border border-purple-100">
            💡 Tip: {feedback.intonation?.tip}
          </div>
        </div>
      </div>

      {/* Güçlü ve Gelişime Açık Yönler */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5 shadow-sm">
          <h4 className="mb-4 font-bold text-slate-900">🌟 Güçlü Yönleriniz</h4>
          <ul className="flex flex-wrap gap-2">
            {feedback.strengths?.map((str, i) => <li key={i} className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">✓ {str}</li>)}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 p-5 shadow-sm">
          <h4 className="mb-4 font-bold text-slate-900">📈 Gelişim Alanları</h4>
          <ul className="flex flex-wrap gap-2">
            {feedback.improvements?.map((imp, i) => <li key={i} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">🎯 {imp}</li>)}
          </ul>
        </div>
      </div>

      {/* Hedef Kelime Kullanımı */}
      {targetWordUsage?.length > 0 && (
        <div>
          <h4 className="mb-4 font-bold text-slate-900">Hedef Kelime Kullanımı</h4>
          <div className="flex flex-wrap gap-3">
            {targetWordUsage.map((tw, i) => (
              <div key={i} className={`flex flex-col gap-1 rounded-lg border p-3 ${tw.used ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`font-semibold ${tw.used ? 'text-emerald-700' : 'text-slate-500'}`}>{tw.word}</span>
                {tw.used && <span className="text-xs text-emerald-600 italic">"{tw.context}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}