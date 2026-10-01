// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Tes Buta Warna (Ishihara)
 * Fitur: .butawarna — 5 ronde plate Ishihara DIGENERASI canvas (tiap tes
 *        beda angka), jawab angkanya, skor + interpretasi.
 *        Angka disembunyi di balik titik warna merah-hijau (Ishihara-style).
 *        Disclaimer: bukan diagnosis medis.
 */
import path from "path";
import { fileURLToPath } from "url";
import { raraWrap, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "butawarna",
  alias: ["butawarna", "teswarna", "ishihara", "colorblindtest"],
  category: "fun",
  description: "Tes buta warna Ishihara — 5 plate angka acak, skor + interpretasi",
  usage: ".butawarna <jawaban> | .butawarna mulai | .butawarna stop",
  example: ".butawarna mulai\n.butawarna 74",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 1,
  isEnabled: true,
};

const ROUNDS = 5;
const ROUND_TIMEOUT_MS = 60 * 1000;

// sesi per user (RAM — quiz epheral, restart = batalin aja)
const sessions = new Map(); // sender → { round, answers: [{num, ok}], current, startedAt }
export function _getSessionsForTest() { return sessions; }

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, "../../assets/fonts");

// palet Ishihara-style: background hijau-kuning, angka oranye-merah
// (kontras rendah buat mata merah-hijau — mirip plate asli)
const BG_COLORS = ["#B8C687", "#A3B76C", "#C5C077", "#97A85B", "#B7BE6C", "#A9B167"];
const FIG_COLORS = ["#D9722E", "#C25A2B", "#E08A3C", "#B84E2C", "#D98B45", "#C96A32"];

/** Render 1 plate Ishihara: angka tersembunyi di titik-titik. */
export async function renderIshiharaPlate(number, seed = Math.random()) {
  const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
  try { GlobalFonts.registerFromPath(path.join(FONT_DIR, "Anton.ttf"), "Anton"); } catch {}

  const W = 600, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // seeded RNG biar e2e bisa deterministik
  let s = Math.floor(seed * 2 ** 31) || 12345;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

  // 1) render angka ke offscreen buat tahu area angka
  const off = createCanvas(W, H);
  const octx = off.getContext("2d");
  octx.font = "420px Anton, Arial Black, sans-serif";
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillStyle = "#000";
  octx.fillText(String(number), W / 2, H / 2 + 30);
  const mask = octx.getImageData(0, 0, W, H).data;

  const inNumber = (x, y) => {
    const i = (Math.floor(y) * W + Math.floor(x)) * 4;
    return mask[i + 3] > 0; // channel ALPHA — area angka (fix: mask[i] itu channel R)
  };

  // 2) titik-titik random — titik DI DALAM angka pakai palet figure, di luar pakai bg
  ctx.fillStyle = "#DDD9B8"; // dasar krem biar gak ada lubang kosong
  ctx.fillRect(0, 0, W, H);

  const dotCount = 480;
  const dots = [];
  for (let i = 0; i < dotCount; i++) {
    const r = 8 + rand() * 22;
    // coba beberapa posisi biar sebar
    let x = 0, y = 0, tries = 0;
    do {
      x = r + rand() * (W - 2 * r);
      y = r + rand() * (H - 2 * r);
      tries++;
    } while (tries < 4 && dots.some((d) => Math.hypot(d.x - x, d.y - y) < (d.r + r) * 0.75));
    const inside = inNumber(x, y);
    const palette = inside ? FIG_COLORS : BG_COLORS;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
    ctx.fill();
    dots.push({ x, y, r });
  }

  // pastiin angka keisi minimal N titik figure biar kebaca
  let figureDots = dots.filter((_, i) => inNumber(dots[i]?.x || 0, dots[i]?.y || 0)).length;

  return { buffer: canvas.toBuffer("image/png"), figureDots };
}

function interpretasi(skor) {
  if (skor === ROUNDS) return "🟢 Penglihatan warna kamu normal — semua plate kebaca bener. 👏";
  if (skor >= 3) return "🟡 Beberapa plate salah. Bisa jadi karena layar/kualitas gambar — tapi kalau sering salah baca angka merah-hijau di kehidupan sehari-hari, ada baiknya dicek lebih lanjut.";
  return "🔴 Banyak plate gak kebaca. Kemungkinan ada gangguan penglihatan warna merah-hijau (protanopi/deuteranopi) — disarankan tes ke optometris/dokter mata buat diagnosis beneran.";
}

async function sendPlate(m, sock, sess, prefix) {
  const { buffer, figureDots } = await renderIshiharaPlate(sess.current);
  if (figureDots < 6) {
    // angka kebalik (rng jelek) — regenerate
    return sendPlate(m, sock, sess, prefix);
  }
  const caption = raraWrap("Buta Warna", [
    `🎨 *PLATE ${sess.round}/${ROUNDS}*`,
    "",
    "Angka berapa yang kamu lihat?",
    `Ketik: ${prefix}butawarna <angka> — waktu 60 detik`,
  ].join("\n"));
  await sock.sendMedia(m.chat, buffer, caption, m, { type: "image" });
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const arg = (m.args?.[0] || "").toLowerCase();
  const key = m.sender;

  // ── mulai ──
  if (arg === "mulai" || arg === "start") {
    if (sessions.has(key)) {
      return m.reply(raraWrap("Buta Warna", `Tes kamu lagi jalan — plate ${sessions.get(key).round}/${ROUNDS}. Ketik ${prefix}butawarna <jawaban>`));
    }
    const sess = { round: 1, answers: [], current: 10 + Math.floor(Math.random() * 90), startedAt: Date.now(), lastPlateAt: Date.now() };
    sessions.set(key, sess);
    await m.react("🛠️");
    await sendPlate(m, sock, sess, prefix);
    return;
  }

  // ── stop ──
  if (arg === "stop" || arg === "batal" || arg === "stop" || arg === "selesai") {
    if (!sessions.has(key)) return m.reply(raraWrap("Buta Warna", "Gak ada tes yang jalan."));
    sessions.delete(key);
    await m.react("🐣");
    return m.reply(raraWrap("Buta Warna", "🛑 Tes dibatalin. Ketik .butawarna mulai kapan aja buat coba lagi."));
  }

  const sess = sessions.get(key);

  // tanpa sesi → panduan
  if (!sess) {
    return m.reply(raraWrap("Buta Warna", [
      "🎨 *Tes Buta Warna (Ishihara)*",
      "",
      `Ketik ${prefix}butawarna mulai — nanti aku kirim 5 plate titik-titik warna.`,
      "Tiap plate ada angka tersembunyi — baca terus jawab: " + `${prefix}butawarna <angka>`,
      "",
      "Di akhir dapet skor + interpretasi penglihatan warnamu 🎯",
      "_Catatan: tes hiburan & skrining awal — bukan diagnosis medis._",
    ].join("\n")) + "\n" + tipText(`Contoh: ${prefix}butawarna mulai`));
  }

  // ── jawaban ──
  const guess = parseInt(String(m.args?.[0] || "").replace(/\D/g, ""), 10);
  if (!Number.isFinite(guess)) {
    return m.reply(raraWrap("Buta Warna", `Ketik angkanya ya: ${prefix}butawarna <angka>\nPlate ${sess.round}/${ROUNDS} masih nunggu.`));
  }
  // timeout 60 dtk sejak plate terakhir
  if (Date.now() - sess.lastPlateAt > ROUND_TIMEOUT_MS) {
    sessions.delete(key);
    return m.reply(raraWrap("Buta Warna", "⏰ Waktu 60 detik habis — tes dibatalin. Ketik .butawarna mulai buat ulang."));
  }

  const ok = guess === sess.current;
  sess.answers.push({ num: sess.current, guess, ok });

  if (sess.round >= ROUNDS) {
    const skor = sess.answers.filter((a) => a.ok).length;
    sessions.delete(key);
    await m.react(skor === ROUNDS ? "🎉" : "🐣");
    const detail = sess.answers.map((a, i) => `${i + 1}. Angka ${a.num} → kamu jawab ${a.guess} ${a.ok ? "✅" : "❌"}`).join("\n");
    return m.reply(raraWrap("Buta Warna", [
      `📊 *HASIL TES BUTA WARNA*`,
      "",
      `🎯 Skor: *${skor}/${ROUNDS}*`,
      "",
      "〔 Rincian 〕",
      detail,
      "",
      interpretasi(skor),
      "",
      "_Skrining awal — bukan pengganti diagnosis dokter mata._",
    ].join("\n")));
  }

  sess.round += 1;
  sess.current = 10 + Math.floor(Math.random() * 90);
  sess.lastPlateAt = Date.now();
  await m.react(ok ? "✅" : "❌");
  await sendPlate(m, sock, sess, prefix);
}

export { pluginConfig as config, handler };
