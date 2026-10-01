// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// coach — Fitness Coach AI (ide fitur no 8, 12 Sep 2026):
//   * .coach mulai <goal> → AI bikin program latihan 7 hari (JSON strict,
//     fallback program lokal — sesi gak pernah batal)
//   * .coach jadwal → program mingguan
//   * .coach done → check-in workout hari ini (streak harian ala kalori)
//   * .coach progress → konsistensi + streak + chart PNG
//   * reply foto badan + .coach → vision AI analisis postur → masuk
//     konteks program (regenerate program ikut analisis badan)
//   * .coach reset
// Persist user.coach {goal, program, vision, history[], startedAt} cap 300.

import { aiChainChat } from "../../src/lib/rara-ai-fallback.js";
import { visionScan } from "../../src/lib/rara-vision-chain.js";
import { raraWrap, raraCaption, tipText, toSC } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { renderChart } from "../tools/chart.js";
import te from "../../src/lib/rara-error.js";

const pluginConfig = {
  name: "coach",
  alias: ["coach", "coachai", "fitnes"],
  category: "ai",
  description: "Fitness Coach AI — program latihan 7 hari + tracking streak konsisten",
  usage: ".coach mulai <goal>\n.coach jadwal | done | progress | reset\n.coach (reply foto badan)",
  example: ".coach mulai turun berat badan\n.coach mulai naik otot\n.coach done",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

// ── Penyimpanan: user.coach ─────────────────────────────────────
function getStore(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  const c = user.coach && typeof user.coach === "object" ? user.coach : null;
  return { db, c };
}

function saveStore(m, coach) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  const next = { ...coach, history: (coach.history || []).slice(-300) };
  db.setUser(m.sender, { ...user, coach: next });
  return next;
}

// ── Tanggal helper ─────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
function ymd(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const DAY = 86400000;
function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / DAY);
}

// ── Streak dari history ─────────────────────────────────────────
function streakInfo(history) {
  const days = [...new Set((history || []).map((h) => h.d))].sort();
  if (!days.length) return { streak: 0, best: 0 };
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    run = daysBetween(days[i - 1], days[i]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const today = ymd(Date.now());
  const last = days[days.length - 1];
  const gap = daysBetween(last, today);
  const streak = gap === 0 || gap === 1 ? runAtLast(days, last) : 0;
  return { streak, best };
}
function runAtLast(days, last) {
  let run = 1;
  for (let i = days.indexOf(last); i > 0; i--) {
    if (daysBetween(days[i - 1], days[i]) === 1) run++;
    else break;
  }
  return run;
}
function consistency(history, nDays) {
  const days = new Set((history || []).map((h) => h.d));
  let hit = 0;
  for (let i = 0; i < nDays; i++) if (days.has(ymd(Date.now() - i * DAY))) hit++;
  return Math.round((hit / nDays) * 100);
}

// ── Program: prompt + parse AI ──────────────────────────────────
function programPrompt(goal, visionNote) {
  return `Kamu personal trainer bersertifikat Indonesia. Bikin program latihan 7 HARI untuk goal: "${goal}".
${visionNote ? `Analisis foto badan klien: "${visionNote}" — sesuaikan programnya.\n` : ""}
Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"program":[{"hari":1,"fokus":"nama fokus hari itu","latihan":[{"nama":"nama gerakan","set":"3x12","catatan":"tips singkat"}]}]}

Aturan:
- Tepat 7 hari (hari 1-7), tiap hari 3-5 gerakan.
- Sesuaikan ke goal: turun berat = dominan kardio+HIIT+kalori burn; naik otot = split push/pull/legs; badan sehat = campuran + mobility. 1-2 hari rest/active recovery WAJIB ada.
- Semua gerakan jenis bodyweight/rumahan TANPA alat gym kecuali goal-nya minta gym.
- set format "3x12" atau "3x30 detik". catatan maksimal 8 kata.
- Semua bahasa Indonesia.`;
}

function parseProgram(raw) {
  if (!raw || typeof raw !== "string") return null;
  const txt = raw.replace(/```(json)?/gi, "");
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    const obj = JSON.parse(txt.slice(a, b + 1));
    const arr = Array.isArray(obj.program) ? obj.program : [];
    const days = arr
      .map((d) => ({
        hari: Math.max(1, Math.min(7, Math.round(Number(d.hari) || 1))),
        fokus: String(d.fokus || "").slice(0, 40),
        latihan: (Array.isArray(d.latihan) ? d.latihan : [])
          .map((x) => ({ nama: String(x.nama || "").slice(0, 50), set: String(x.set || "").slice(0, 15), catatan: String(x.catatan || "").slice(0, 60) }))
          .filter((x) => x.nama)
          .slice(0, 5),
      }))
      .filter((d) => d.latihan.length)
      .slice(0, 7);
    return days.length >= 4 ? days.sort((x, y) => x.hari - y.hari) : null;
  } catch { return null; }
}

// Fallback lokal — program generik per goal (AI down tetap jalan)
function localProgram(goal) {
  const g = String(goal || "").toLowerCase();
  const pushup = { nama: "Push up", set: "3x12", catatan: "turunkan badan pelan" };
  const squat = { nama: "Squat", set: "3x15", catatan: "punggung tegak" };
  const plank = { nama: "Plank", set: "3x30 detik", catatan: "kencangkan perut" };
  if (/otot|massa|besar|bulking|sixpack/.test(g)) {
    return [
      { hari: 1, fokus: "Push (dada/tris)", latihan: [pushup, { nama: "Diamond push up", set: "3x10", catatan: "fokus trisep" }, plank] },
      { hari: 2, fokus: "Pull (punggung/bis)", latihan: [{ nama: "Superman hold", set: "3x20 detik", catatan: "angkat dada" }, { nama: "Incline push up", set: "3x12", catatan: "tangan di kursi" }] },
      { hari: 3, fokus: "Legs (kaki)", latihan: [squat, { nama: "Lunge", set: "3x10/kaki", catatan: "lutut gak nyentuh tanah" }, { nama: "Calf raise", set: "3x20", catatan: "naik jinjit" }] },
      { hari: 4, fokus: "Rest", latihan: [{ nama: "Jalan santai", set: "20 menit", catatan: "recovery aktif" }] },
      { hari: 5, fokus: "Full body", latihan: [pushup, squat, plank] },
      { hari: 6, fokus: "Core", latihan: [plank, { nama: "Sit up", set: "3x15", catatan: "gak nyentuh leher" }, { nama: "Mountain climber", set: "3x30 detik", catatan: "laju konstan" }] },
      { hari: 7, fokus: "Rest", latihan: [{ nama: "Stretching", set: "15 menit", catatan: "seluruh badan" }] },
    ];
  }
  if (/turun|weight loss|diet|kurus|langsing|berat badan/.test(g)) {
    return [
      { hari: 1, fokus: "Kardio full", latihan: [{ nama: "Jogging", set: "25 menit", catatan: "tempo ngobrol" }, { nama: "Jumping jack", set: "3x40 detik", catatan: "jaga napas" }] },
      { hari: 2, fokus: "HIIT", latihan: [{ nama: "Burpee", set: "4x10", catatan: "boleh versi mudah" }, { nama: "High knees", set: "4x30 detik", catatan: "laju maksimal" }] },
      { hari: 3, fokus: "Rest aktif", latihan: [{ nama: "Jalan cepat", set: "30 menit", catatan: "recovery" }] },
      { hari: 4, fokus: "Full body", latihan: [squat, pushup, plank] },
      { hari: 5, fokus: "Kardio + core", latihan: [{ nama: "Skipping", set: "3x60 detik", catatan: "tanpa tali boleh" }, { nama: "Sit up", set: "3x15", catatan: "gerak terkontrol" }] },
      { hari: 6, fokus: "HIIT", latihan: [{ nama: "Squat jump", set: "4x12", catatan: "mendarat lembut" }, { nama: "Mountain climber", set: "4x30 detik", catatan: "punggung datar" }] },
      { hari: 7, fokus: "Rest", latihan: [{ nama: "Stretching", set: "15 menit", catatan: "fokus kaki" }] },
    ];
  }
  return [
    { hari: 1, fokus: "Full body", latihan: [pushup, squat, plank] },
    { hari: 2, fokus: "Kardio ringan", latihan: [{ nama: "Jalan cepat", set: "30 menit", catatan: "tempo ngobrol" }] },
    { hari: 3, fokus: "Core", latihan: [plank, { nama: "Sit up", set: "3x15", catatan: "terkontrol" }] },
    { hari: 4, fokus: "Rest", latihan: [{ nama: "Stretching", set: "15 menit", catatan: "seluruh badan" }] },
    { hari: 5, fokus: "Full body", latihan: [pushup, squat, { nama: "Lunge", set: "3x10/kaki", catatan: "jaga keseimbangan" }] },
    { hari: 6, fokus: "Kardio", latihan: [{ nama: "Jogging", set: "20 menit", catatan: "tempo santai" }] },
    { hari: 7, fokus: "Rest", latihan: [{ nama: "Jalan santai", set: "20 menit", catatan: "recovery" }] },
  ];
}

// ── Vision prompt: analisis foto badan ──────────────────────────
function bodyPrompt() {
  return `Analisis foto badan orang untuk program fitness (JANGAN sebut angka berat badan/BMI spesifik — jangan halusinasi ukuran).

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown):
{"postur":"kondisi fisik umum","catatan":"catatan postur/bentuk badan yang kelihatan","rekomendasi":"rekomendasi latihan awal"}

Aturan:
- postur maksimal 8 kata (contoh: "bahu membungkuk, perut menonjol", "badan relatif proporsional").
- catatan maksimal 2 kalimat, objektif dari yang kelihatan di foto.
- rekomendasi maksimal 2 kalimat, gerakan awal yang aman.
- Kalau gambar BUKAN foto badan/manusia berdiri/duduk jelas, isi postur "BUKAN_FOTO_BADAN" dan sisanya kosong.
- Bahasa Indonesia.`;
}

function parseBody(raw) {
  if (!raw || typeof raw !== "string") return null;
  const txt = raw.replace(/```(json)?/gi, "");
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  if (a === -1 || b === -1 || b <= a) return null;
  try {
    const obj = JSON.parse(txt.slice(a, b + 1));
    const postur = String(obj.postur || "").slice(0, 80);
    if (!postur || postur.toUpperCase() === "BUKAN_FOTO_BADAN") return null;
    return {
      postur,
      catatan: String(obj.catatan || "").slice(0, 240),
      rekomendasi: String(obj.rekomendasi || "").slice(0, 240),
    };
  } catch { return null; }
}

// ── Render program ────────────────────────────────────────────
function renderProgram(program, todayDay) {
  return program.map((d) => {
    const mark = todayDay && d.hari === todayDay ? " ◀ hari ini" : "";
    const lines = d.latihan.map((x) => `   • ${x.nama} — ${x.set}${x.catatan ? ` (${x.catatan})` : ""}`).join("\n");
    return `📅 *Hari ${d.hari}: ${d.fokus || "Latihan"}*${mark}\n${lines}`;
  }).join("\n\n");
}

// ── Seam e2e ───────────────────────────────────────────────────
let depAi = aiChainChat;
let depVision = visionScan;
export function _setCoachDepsForTest({ ai, vision } = {}) {
  depAi = ai || aiChainChat;
  depVision = vision || visionScan;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const { db, c: store } = getStore(m);
    const args = m.args || [];
    const sub = (args[0] || "").toLowerCase();

    // ═══ reply foto badan ═══
    if (m.quoted?.isImage || m.isImage) {
      await m.react("🧠");
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer || !buffer.length) {
        await m.react("❌");
        return m.reply(raraWrap("coach", "Gagal download gambar. Coba kirim ulang.", "error"));
      }
      const res = await depVision({ imageBuffer: buffer, question: bodyPrompt(), sessionKey: null })
        .catch((e) => ({ status: false, error: e.message }));
      if (!res?.status) {
        await m.react("❌");
        return m.reply(raraWrap("coach", res?.error || "Gagal membaca gambar", "error"));
      }
      const body = parseBody(res.text);
      if (!body) {
        await m.react("❌");
        return m.reply(raraWrap("coach", "Gak kedeteksi foto badan yang jelas. Kirim foto badan berdiri/samping dengan pencahayaan bagus.", "error"));
      }
      // simpan vision note — dipakai pas generate/regenerate program
      const merged = { ...(store || { goal: "badan sehat", history: [] }), vision: body, startedAt: store?.startedAt || Date.now() };
      saveStore(m, merged);
      await m.react("🐣");
      let txt = `🔍 *ANALISIS BADAN*\n🧍 ${body.postur}\n📝 ${body.catatan}\n🎯 ${body.rekomendasi}`;
      txt += `\n\n${store?.program ? `✅ Analisis kesimpen — ${prefix}coach mulai ulang buat regenerate program sesuai badanmu` : `✅ Langkah berikutnya: ${prefix}coach mulai <goal>`}`;
      return m.reply(txt);
    }

    // ═══ guide ═══
    if (!sub) {
      const guide = raraCaption({
        emoji: "💪",
        name: "coach",
        description: "Fitness Coach AI — program latihan 7 hari + tracking streak",
        usage: `${prefix}coach mulai <goal>\n${prefix}coach jadwal | done | progress | reset\n${prefix}coach (reply foto badan)`,
        example: `${prefix}coach mulai turun berat badan`,
      }) + "\n" + tipText(store?.program ? `Sesi aktif: ${store.goal} — hari ini ${prefix}coach done kalau udah latihan` : `Kirim foto badan dulu biar programnya makin pas`);
      return m.reply(guide, "coach");
    }

    // ═══ mulai ═══
    if (sub === "mulai" || sub === "start") {
      const goal = args.slice(1).join(" ").trim() || (store?.goal ? "" : "");
      if (!goal && !store?.goal) {
        return m.reply(raraWrap("coach", `Goal-nya apa?\n\nContoh: ${prefix}coach mulai turun berat badan / naik otot / badan sehat`, "info"));
      }
      const finalGoal = goal || store.goal;
      const regen = !!store?.program;
      await m.react("🧠");
      let program = null;
      try {
        program = parseProgram(await depAi(programPrompt(finalGoal, store?.vision?.catatan || "")));
      } catch {}
      if (!program) program = localProgram(finalGoal); // degrade — program lokal
      saveStore(m, { ...(store || { history: [] }), goal: finalGoal, program, startedAt: store?.startedAt || Date.now() });
      await m.react("🐣");
      const dayNow = new Date();
      const todayDay = ((dayNow.getDay() + 6) % 7) + 1; // senin=1..minggu=7
      let txt = `${regen ? "🔄" : "💪"} *PROGRAM LATIHAN 7 HARI*\n🎯 Goal: ${finalGoal}\n`;
      if (store?.vision?.catatan) txt += `🧍 Disesuaikan analisis badanmu\n`;
      txt += `\n${renderProgram(program, todayDay)}\n\n${tipText(`Mulai hari ini — udah kelar? ${prefix}coach done buat jaga streak`)}`;
      return m.reply(txt);
    }

    // ═══ butuh sesi ═══
    if (!store?.program) {
      return m.reply(raraWrap("coach", `Belum ada program. Mulai dulu: ${prefix}coach mulai <goal>`, "info"));
    }

    // ═══ jadwal ═══
    if (sub === "jadwal") {
      const dayNow = new Date();
      const todayDay = ((dayNow.getDay() + 6) % 7) + 1;
      const { streak } = streakInfo(store.history);
      return m.reply(`💪 *PROGRAM: ${store.goal}*\n🔥 Streak: ${streak} hari\n\n${renderProgram(store.program, todayDay)}`);
    }

    // ═══ done (check-in) ═══
    if (sub === "done" || sub === "selesai" || sub === "checkin") {
      const today = ymd(Date.now());
      if ((store.history || []).some((h) => h.d === today)) {
        const { streak } = streakInfo(store.history);
        return m.reply(raraWrap("coach", `Hari ini udah di-check-in 🔥 Streak kamu ${streak} hari — besok lagi ya!`, "info"));
      }
      const history = [...(store.history || []), { d: today, done: 1 }];
      saveStore(m, { ...store, history });
      const { streak, best } = streakInfo(history);
      const msg = streak >= 2
        ? `🔥 *STREAK ${streak} HARI — KONSISTEN!*\nJangan putus besok, badan kamu yang untung.`
        : `✅ *Workout hari ini kelar!*\nBesok lagi ya — streak dimulai dari 1.`;
      return m.reply(raraWrap("coach", msg + `\n\n📊 Rekor terbaikmu: ${best} hari${best === streak ? " (baru!)" : ""}`));
    }

    // ═══ progress ═══
    if (sub === "progress") {
      const { streak, best } = streakInfo(store.history);
      const week = consistency(store.history, 7);
      const month = consistency(store.history, 30);
      let chartNote = "";
      try {
        const items = [];
        const names = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        for (let i = 6; i >= 0; i--) {
          const ts = Date.now() - i * DAY;
          items.push({ label: names[new Date(ts).getDay()], value: (store.history || []).some((h) => h.d === ymd(ts)) ? 1 : 0 });
        }
        const png = await renderChart({
          title: "Konsistensi Latihan 7 Hari",
          subtitle: `${store.goal} — streak ${streak} hari, konsistensi ${week}%`,
          items,
        });
        await sock.sendMedia(m.chat, png, null, m, { type: "image" });
        chartNote = "📊 Chart terkirim di atas";
      } catch {}
      return m.reply(raraWrap("coach", `📈 *PROGRESS — ${store.goal}*\n\n🔥 Streak: ${streak} hari (rekor: ${best})\n📅 7 hari terakhir: ${week}%\n🗓 30 hari terakhir: ${month}%\n\n${week >= 70 ? "Sustain mode! Badanmu mulai terbiasa." : week >= 40 ? "Udah jalan — tinggal rapikan jadwal biar gak bolong." : "Masih bolong-bolong — mulai dari 3x seminggu aja dulu."}${chartNote ? `\n\n${chartNote}` : ""}`));
    }

    // ═══ reset ═══
    if (sub === "reset") {
      saveStore(m, { goal: "", program: null, vision: null, history: [], startedAt: 0 });
      return m.reply(raraWrap("coach", "♻ Program & streak direset. Mulai fresh kapan aja: .coach mulai <goal>"));
    }

    // ═══ sub gak dikenal → guide singkat ═══
    return m.reply(raraWrap("coach", `Sub gak dikenal. Yang ada: mulai | jadwal | done | progress | reset`, "info"));
  } catch (err) {
    console.error("coach error:", err);
    await m.react("❌");
    return m.reply(raraWrap("coach", te.raraError(err) || "Gagal memproses", "error"));
  }
}

export { pluginConfig as config, handler, parseProgram, parseBody, localProgram, streakInfo, consistency };
