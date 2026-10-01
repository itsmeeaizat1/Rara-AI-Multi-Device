// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// aiagentwawancara (dulu .wawancara, rename 12 Sep 2026) — Interview Simulator AI (ide fitur no 5):
// AI jadi HRD buat latihan wawancara kerja.
//   * .aiagentwawancara mulai <posisi> → sesi mulai, HRD nanya via VN
//   * jawab pake VN (reply VN + .aiagentwawancara) atau ketik jawabannya
//   * tiap jawaban dinilai (skor + feedback + kuat/lemah)
//   * 5 pertanyaan → laporan akhir: skor + chart + verdict + tips AI
//   * .aiagentwawancara ulang | skip | skor | stop
// Sesi per user, expired 30 menit idle.

import { aiChainChat } from "../../src/lib/rara-ai-fallback.js";
import { raraWrap, raraCaption, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { transcribeAudio } from "../../src/lib/rara-stt.js";
import { speakToBuffer } from "../../src/lib/rara-telpon.js";
import { renderChart } from "../tools/chart.js";
import te from "../../src/lib/rara-error.js";
import {
  getSession, setSession, clearSession, TOTAL_QUESTIONS,
  questionsPrompt, parseQuestions, evaluatePrompt, parseEvaluation,
  finalTips, verdictOf,
} from "../../src/lib/rara-wawancara.js";

const pluginConfig = {
  name: "aiagentwawancara",
  alias: ["aiagentwawancara"],
  category: "ai",
  description: "Latihan wawancara kerja bareng AI HRD — tanya via VN, dinilai per jawaban",
  usage: ".aiagentwawancara mulai <posisi>\n.aiagentwawancara (reply VN jawabanmu)\n.aiagentwawancara ulang | skip | skor | stop",
  example: ".aiagentwawancara mulai frontend developer\n.aiagentwawancara mulai admin keuangan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

const HRD_VOICE = "Ardi"; // suara HRD (haidar natural)
const SUBS = new Set(["mulai", "start", "stop", "selesai", "batal", "ulang", "repeat", "skor", "skip", "lanjut"]);

// Fallback lokal — soal generik kalau AI generator down (sesi gak pernah batal total)
const LOCAL_QUESTIONS = [
  "Coba perkenalkan dirimu singkat, latar belakang pendidikan dan pengalaman kerja.",
  "Apa keahlian utamamu yang paling relevan untuk posisi ini? Jelaskan dengan contoh nyata.",
  "Ceritakan satu pengalaman kerja tersulitmu dan bagaimana kamu mengatasinya.",
  "Kalau kamu mendapat tenggat yang mepet tapi data masih belum lengkap, apa yang kamu lakukan?",
  "Mengapa kamu layak diterima untuk posisi ini dibanding kandidat lain?",
];

// ── Seam e2e ──
let parserAi = aiChainChat;
let parserStt = transcribeAudio;
let parserTts = speakToBuffer;
export function _setWawancaraDepsForTest({ ai, stt, tts } = {}) {
  parserAi = ai || aiChainChat;
  parserStt = stt || transcribeAudio;
  parserTts = tts || speakToBuffer;
}

async function sendHrdVoice(m, sock, text) {
  try {
    const buf = await parserTts(text, HRD_VOICE);
    await sock.sendMessage(m.chat, { audio: buf, mimetype: "audio/mpeg", ptt: true }, { quoted: m });
    return true;
  } catch (e) {
    console.error("[aiagentwawancara] TTS gagal, fallback teks:", e.message);
    return false;
  }
}

function questionCard(session, prefix) {
  const qNo = session.qIdx + 1;
  return `🎤 *PERTANYAAN ${qNo}/${session.questions.length}*\n_posisi: ${session.posisi}_\n\n"${session.questions[session.qIdx]}"\n\n` +
    tipText(`Jawab via VN (reply VN-mu + ${prefix}aiagentwawancara) atau ketik langsung`);
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();
    const session = getSession(db, m.sender);

    // ═══ guide (kecuali reply VN — itu jawaban voice) ═══
    if (!sub && !m.quoted?.isAudio) {
      const guide = raraCaption({
        emoji: "💼",
        name: "aiagentwawancara",
        description: "Latihan wawancara kerja bareng AI HRD via voice note",
        usage: `${prefix}aiagentwawancara mulai <posisi>\n${prefix}aiagentwawancara (reply VN jawabanmu)\n${prefix}aiagentwawancara ulang | skip | skor | stop`,
        example: `${prefix}aiagentwawancara mulai frontend developer`,
      }) + "\n" + tipText(`5 pertanyaan, dinilai per jawaban, skor akhir + tips`);
      return m.reply(guide, "aiagentwawancara");
    }

    // ═══ mulai ═══
    if (sub === "mulai" || sub === "start") {
      const posisi = args.slice(1).join(" ").trim();
      if (!posisi) {
        return m.reply(raraWrap("aiagentwawancara", `Mau latihan untuk posisi apa?\n\nFormat: ${prefix}aiagentwawancara mulai frontend developer`, "info"));
      }
      if (session) {
        return m.reply(raraWrap("aiagentwawancara", `Masih ada sesi aktif (posisi *${session.posisi}*, pertanyaan ${session.qIdx + 1}/${session.questions.length}).\nLanjutin jawab, atau ${prefix}aiagentwawancara stop buat batalin.`, "info"));
      }
      await m.react("🧠");
      let questions = null;
      try {
        questions = parseQuestions(await parserAi(questionsPrompt(posisi)));
      } catch {}
      if (!questions) questions = LOCAL_QUESTIONS; // degrade — soal generik
      const fresh = { posisi: posisi.slice(0, 60), questions, qIdx: 0, answers: [], startedAt: Date.now() };
      setSession(db, m.sender, fresh);
      await m.react("🐣");
      const voiceSent = await sendHrdVoice(m, sock, `Halo, saya HRD yang akan mewawancarai Anda hari ini untuk posisi ${posisi}. ${questions[0]}`);
      return m.reply(questionCard(fresh, prefix) + (voiceSent ? "" : `\n\n⚠ ${toSC("VN HRD gagal dibikin — baca pertanyaannya di teks aja")}`));
    }

    // ═══ subcommand lain (tanpa sesi = info) ═══
    if (SUBS.has(sub) && !session && sub !== "stop" && sub !== "batal") {
      return m.reply(raraWrap("aiagentwawancara", `Belum ada sesi latihan. Mulai dulu: ${prefix}aiagentwawancara mulai <posisi>`, "info"));
    }

    if (sub === "stop" || sub === "selesai" || sub === "batal") {
      if (!session) return m.reply(raraWrap("aiagentwawancara", "Gak ada sesi yang jalan.", "info"));
      clearSession(db, m.sender);
      const done = session.answers.length;
      return m.reply(raraWrap("aiagentwawancara", done
        ? `🛑 Sesi dibatalkan. Terjawab ${done}/${session.questions.length} pertanyaan — ${prefix}aiagentwawancara mulai ${session.posisi} buat coba lagi.`
        : "🛑 Sesi dibatalkan. Kapan-kapan latihan lagi ya!"));
    }
    if (sub === "ulang" || sub === "repeat") {
      const ok = await sendHrdVoice(m, sock, session.questions[session.qIdx]);
      return m.reply(ok ? `🔁 ${toSC("pertanyaan diulang — cek VN barusan")}` : questionCard(session, prefix));
    }
    if (sub === "skip") {
      if (session.qIdx + 1 >= session.questions.length) return finishInterview(m, sock, db, session, prefix);
      session.answers.push({ q: session.questions[session.qIdx], a: "", skipped: true }); // soal yang di-skip tetap tercatat
      session.qIdx += 1;
      setSession(db, m.sender, session);
      const voiceSent = await sendHrdVoice(m, sock, session.questions[session.qIdx]);
      return m.reply(questionCard(session, prefix));
    }
    if (sub === "skor") {
      const answered = session.answers.filter((a) => !a.skipped);
      if (!answered.length) return m.reply(raraWrap("aiagentwawancara", `Progress: pertanyaan ${session.qIdx + 1}/${session.questions.length} — belum ada jawaban yang dinilai.`, "info"));
      const avg = answered.reduce((s, a) => s + a.skor, 0) / answered.length;
      const lines = answered.map((a, i) => `${i + 1}. ${a.q.slice(0, 40)}… — *${a.skor}/10*`).join("\n");
      return m.reply(raraWrap("aiagentwawancara", `📊 *SKOR SEMENTARA: ${avg.toFixed(1)}/10*\n\n${lines}\n\nProgress: ${session.qIdx + 1}/${session.questions.length}`));
    }

    // ═══ jalur jawaban — sesi WAJIB aktif ═══
    if (!session) {
      return m.reply(raraWrap("aiagentwawancara", `Belum ada sesi latihan. Mulai dulu: ${prefix}aiagentwawancara mulai <posisi>`, "info"));
    }

    // jawaban via reply VN
    const quotedVn = m.quoted?.isAudio ? m.quoted : null;
    let answerText = "";
    if (quotedVn) {
      await m.react("🕒");
      try { await sock.sendPresenceUpdate?.("recording", m.chat); } catch {}
      const buffer = await quotedVn.download();
      if (!buffer || !buffer.length) {
        await m.react("❌");
        return m.reply(raraWrap("aiagentwawancara", "Gagal download VN-mu. Coba kirim ulang.", "error"));
      }
      const transcript = await parserStt(buffer, quotedVn.mimetype || "audio/ogg; codecs=opus").catch(() => "");
      if (!transcript || transcript.trim().length < 2) {
        await m.react("❌");
        return m.reply(raraWrap("aiagentwawancara", "Gak kedengeran jelas nih — rekam ulang lagi ya, atau ketik jawabanmu."));
      }
      answerText = transcript.trim().slice(0, 900);
    } else {
      answerText = args.join(" ").trim().slice(0, 900);
      if (!answerText) return m.reply(questionCard(session, prefix));
    }

    // ═══ evaluasi jawaban ═══
    await m.react("🧠");
    const question = session.questions[session.qIdx];
    let evalRes = null;
    try {
      evalRes = parseEvaluation(await parserAi(evaluatePrompt(session.posisi, question, answerText)));
    } catch {}
    if (!evalRes) {
      await m.react("❌");
      return m.reply(raraWrap("aiagentwawancara", "AI penilai lagi bermasalah — coba kirim ulang jawabanmu ya.", "error"));
    }
    session.answers.push({ q: question, a: answerText, skor: evalRes.skor, feedback: evalRes.feedback, kuat: evalRes.kuat, lemah: evalRes.lemah });

    // pertanyaan terakhir → laporan akhir
    if (session.qIdx + 1 >= session.questions.length) {
      return finishInterview(m, sock, db, session, prefix);
    }

    session.qIdx += 1;
    setSession(db, m.sender, session);
    await m.react("🐣");
    const fbCard =
      `📝 *PENILAIAN JAWABAN ${session.qIdx}/${session.questions.length}*\n` +
      `⭐ Skor: *${evalRes.skor}/10*\n💬 ${evalRes.feedback}\n💪 Kuat: ${evalRes.kuat}\n🎯 Perlu dipoles: ${evalRes.lemah}`;
    const voiceSent = await sendHrdVoice(m, sock, session.questions[session.qIdx]);
    return m.reply(raraWrap("aiagentwawancara", fbCard + "\n\n" + questionCard(session, prefix)) + (voiceSent ? "" : ""));
  } catch (err) {
    console.error("aiagentwawancara error:", err);
    await m.react("❌");
    return m.reply(raraWrap("aiagentwawancara", te.raraError(err) || "Gagal memproses", "error"));
  }
}

// ── Laporan akhir ──
async function finishInterview(m, sock, db, session, prefix) {
  const answered = session.answers.filter((a) => !a.skipped);
  const scores = answered.map((a) => a.skor);
  const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  const verdict = verdictOf(avg);

  // chart skor per pertanyaan
  let chartSent = false;
  if (answered.length) {
    try {
      const png = await renderChart({
        title: "Skor Jawaban Wawancara",
        subtitle: `${session.posisi} — rata-rata ${avg.toFixed(1)}/10`,
        items: answered.map((a, i) => ({ label: `Q${i + 1}`, value: a.skor })),
      });
      await sock.sendMedia(m.chat, png, null, m, { type: "image" });
      chartSent = true;
    } catch {}
  }

  // tips AI (degrade silent)
  const summary = answered.map((a, i) => `Q${i + 1} (skor ${a.skor}): lemahnya ${a.lemah}`).join("; ");
  const tips = await finalTips(session.posisi, summary || "kandidat skip semua pertanyaan", parserAi);

  clearSession(db, m.sender);

  const lines = answered.map((a, i) =>
    `${i + 1}. ⭐${a.skor}/10 — ${a.q.slice(0, 50)}${a.q.length > 50 ? "…" : ""}\n   ↳ ${a.feedback}`
  ).join("\n");

  let txt = `${verdict.emoji} *${verdict.label} — ${avg.toFixed(1)}/10*\n_posisi: ${session.posisi}_\n\n${verdict.note}\n`;
  if (lines) txt += `\n📝 *RINCIAN:*\n${lines}`;
  if (session.answers.some((a) => a.skipped)) txt += `\n⏭ ${session.answers.filter((a) => a.skipped).length} pertanyaan di-skip (gak dinilai)`;
  if (tips) txt += `\n\n💡 *TIPS:*\n${tips}`;
  txt += `\n\n♻ ${toSC("latihan lagi?")} ${prefix}${toSC("aiagentwawancara mulai")} ${session.posisi}`;
  await m.react("🐣");
  return m.reply(raraWrap("aiagentwawancara", txt));
}

export { pluginConfig as config, handler };
