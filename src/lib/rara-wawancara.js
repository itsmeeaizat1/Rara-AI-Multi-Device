// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-wawancara — Interview Simulator AI (cmd .aiagentwawancara, ide fitur no 5, 12 Sep 2026):
// AI jadi HRD buat latihan wawancara kerja — nanya via VN, jawab via VN/teks,
// tiap jawaban dinilai + feedback, akhir sesi skor akhir + chart + tips.
// Sesi per user persist db.setting("wawancaraSessions"), expired 30 menit.

import { aiChainChat } from "./rara-ai-fallback.js";

const SESSION_KEY = "wawancaraSessions";
const EXPIRY_MS = 30 * 60 * 1000;
export const TOTAL_QUESTIONS = 5;

// ── Sesi per user ─────────────────────────────────────────────
export function getSession(db, sender) {
  const all = db.setting(SESSION_KEY) || {};
  const s = all[sender];
  if (!s || !s.questions?.length) return null;
  if (Date.now() - (s.lastActive || 0) > EXPIRY_MS) {
    delete all[sender];
    db.setting(SESSION_KEY, all);
    return null;
  }
  return s;
}

export function setSession(db, sender, session) {
  const all = db.setting(SESSION_KEY) || {};
  if (!session) delete all[sender];
  else all[sender] = { ...session, lastActive: Date.now() };
  db.setting(SESSION_KEY, all);
}

export function clearSession(db, sender) {
  setSession(db, sender, null);
}

// ── Generator soal (AI, JSON strict) ───────────────────────────
export function questionsPrompt(posisi) {
  return `Kamu HRD senior Indonesia. Bikin ${TOTAL_QUESTIONS} pertanyaan wawancara kerja untuk pelamar posisi "${posisi}".

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"questions":["pertanyaan 1","pertanyaan 2","pertanyaan 3","pertanyaan 4","pertanyaan 5"]}

Aturan:
- Campur tipe: perkenalan diri, keahlian teknis utama posisi itu, pengalaman behavioral ("ceritakan saat..."), situasional ("bagaimana kalau..."), dan penutup (mengapa kamu layak diterima).
- Bahasa Indonesia natural seperti HRD bicara, SATU pertanyaan per item, maksimal 25 kata per pertanyaan.
- Spesifik ke posisi "${posisi}", bukan pertanyaan generik.`;
}

export function parseQuestions(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.replace(/```(json)?/gi, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const obj = JSON.parse(raw.slice(s, e + 1));
    const qs = (Array.isArray(obj.questions) ? obj.questions : [])
      .map((q) => String(q || "").trim())
      .filter((q) => q.length > 5)
      .slice(0, TOTAL_QUESTIONS);
    return qs.length >= 3 ? qs : null;
  } catch { return null; }
}

// ── Penilai jawaban (AI, JSON strict) ─────────────────────────
export function evaluatePrompt(posisi, question, answer) {
  return `Kamu HRD senior yang menilai jawaban kandidat posisi "${posisi}".

Pertanyaan: "${question}"
Jawaban kandidat: "${answer}"

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"skor":angka 1-10,"feedback":"feedback singkat","kuat":"poin kuat jawaban","lemah":"poin lemah jawaban"}

Aturan:
- skor = kualitas jawaban: struktur (STAR), relevansi ke pertanyaan, konkret vs generik, kepercayaan diri.
- feedback maksimal 2 kalimat bahasa Indonesia, jujur tapi membangun.
- kuat & lemah = frasa singkat (maksimal 10 kata), kalau gak ada isi "cukup baik" / "perlu lebih konkret".`;
}

export function parseEvaluation(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.replace(/```(json)?/gi, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const obj = JSON.parse(raw.slice(s, e + 1));
    const skor = Number(obj.skor);
    if (!Number.isFinite(skor) || skor < 1 || skor > 10) return null;
    return {
      skor: Math.round(skor),
      feedback: String(obj.feedback || "").slice(0, 240),
      kuat: String(obj.kuat || "cukup baik").slice(0, 80),
      lemah: String(obj.lemah || "perlu lebih konkret").slice(0, 80),
    };
  } catch { return null; }
}

// ── Tips akhir (AI, degrade silent) ───────────────────────────
export async function finalTips(posisi, summary, aiFn = aiChainChat) {
  try {
    const r = await aiFn(`Kamu career coach Indonesia. Kandidat latihan wawancara posisi "${posisi}". Rekap jawabannya: ${summary}. Beri TIP spesifik maksimal 3 poin singkat (bahasa Indonesia santai, fokus kelemahan terbesarnya). Balas teks polos.`).catch(() => null);
    if (r && typeof r === "string" && r.trim()) return r.trim().slice(0, 350);
  } catch {}
  return "";
}

// ── Verdict lokal dari rata-rata skor ─────────────────────────
export function verdictOf(avg) {
  if (avg >= 8.5) return { label: "SANGAT SIAP", emoji: "🏆", note: "Jawabanmu solid — tinggal jaga nerve pas wawancara beneran." };
  if (avg >= 7) return { label: "SIAP", emoji: "✅", note: "Modalnya udah bagus, poles lagi jawaban yang skornya rendah." };
  if (avg >= 5) return { label: "CUKUP", emoji: "⚖", note: "Dasarnya ada tapi masih generik — banyak latihan pakai contoh pengalaman nyata." };
  return { label: "PERLU LATIHAN", emoji: "📚", note: "Jangan nyerah — ulangi sesi ini dan jawab pakai pengalaman konkret (pola STAR)." };
}

export { aiChainChat };
