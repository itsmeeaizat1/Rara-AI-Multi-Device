// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// kalori — Kalori AI (ide fitur baru no 2, 12 Sep 2026):
//   * reply/attach foto makanan → vision AI estimasi menu + kalori per item
//     + total, langsung masuk log harian per user
//   * .kalori <nama makanan> → estimasi kalori via AI tanpa foto
//   * .kalori log      → catatan hari ini (total vs target)
//   * .kalori laporan  → rekap 7 hari + chart PNG
//   * .kalori target N → set target kalori harian (default 2000)
//   * .kalori hapus    → hapus entri terakhir | .kalori reset → bersihin log
// Penyimpanan: user.kalori { target, entries[] } (merge aman via setUser).

import { visionScan } from "../../src/lib/nova-vision-chain.js";
import { aiChainChat } from "../../src/lib/nova-ai-fallback.js";
import { novaWrap, novaCaption, tipText, toSC } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { renderChart } from "../tools/chart.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "kalori",
  alias: ["kalori", "kkal", "caloriecounter"],
  category: "ai",
  description: "Estimasi kalori makanan dari foto/nama + log harian",
  usage: ".kalori (reply foto makanan)\n.kalori nasi goreng\n.kalori log\n.kalori laporan\n.kalori target 2000\n.kalori hapus\n.kalori reset",
  example: ".kalori (reply foto nasi padang)\n.kalori indomie goreng 2 bungkus\n.kalori laporan",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 8,
  energi: 1,
  isEnabled: true,
};

// ── Penyimpanan: user.kalori { target, entries } ──
function getKaloriStore(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender) || {};
  const k = user.kalori && typeof user.kalori === "object" ? user.kalori : {};
  return {
    db,
    target: Number(k.target) > 0 ? Number(k.target) : 2000,
    entries: Array.isArray(k.entries) ? k.entries : [],
  };
}

function saveKaloriStore(m, db, { target, entries }) {
  db.setUser(m.sender, { kalori: { target, entries: entries.slice(-300) } });
}

// ── Prompt estimasi (JSON strict) ──
function estimatePrompt(detail) {
  return `Kamu nutrisionis. Estimasi kalori makanan/minuman berikut: ${detail}

Balas HANYA JSON valid (tanpa penjelasan, tanpa markdown) dengan format:
{"menu":[{"nama":"nama item","kalori":angka}],"total":angka,"catatan":"catatan singkat bahasa Indonesia"}

Aturan: estimasi realistis porsi INDONESIA (nasi 200 kkal, ayam goreng 250 kkal, es teh manis 90 kkal, dll). Angka kalori = integer per item. total = jumlah semua item. catatan maksimal 1 kalimat.`;
}

// ── Parse JSON dari jawaban AI (robust: strip code fence / cari blok {}) ──
function parseEstimate(text) {
  if (!text || typeof text !== "string") return null;
  let raw = text.replace(/```(json)?/gi, "").trim();
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1 || e <= s) return null;
  try {
    const obj = JSON.parse(raw.slice(s, e + 1));
    const menu = Array.isArray(obj.menu) ? obj.menu.filter((x) => x && x.nama && Number(x.kalori) > 0) : [];
    const total = Number(obj.total) > 0 ? Math.round(Number(obj.total)) : menu.reduce((a, x) => a + Math.round(Number(x.kalori) || 0), 0);
    if (!menu.length || !total) return null;
    return { menu: menu.map((x) => ({ nama: String(x.nama), kalori: Math.round(Number(x.kalori)) })), total, catatan: String(obj.catatan || "") };
  } catch { return null; }
}

// ── Format card hasil estimasi ──
function formatEstimate(est, { isPhoto, remaining, target }) {
  const lines = est.menu.map((it, i) => `${i + 1}. ${it.nama} — ${it.kalori} kkal`);
  let msg = `${isPhoto ? "📸" : "📝"} *ESTIMASI KALORI*\n\n` +
    lines.join("\n") +
    `\n\n🔥 *Total: ${est.total} kkal*`;
  if (est.catatan) msg += `\n💡 ${est.catatan}`;
  msg += `\n\n📊 *Log hari ini:* sisa ${Math.max(0, remaining)} kkal dari target ${target} kkal` +
    (remaining < 0 ? `\n⚠ Melebihi target ${Math.abs(remaining)} kkal` : "");
  return msg;
}

// Seam e2e: estimator bisa di-inject biar tes gak nyamber AI live
let estimatorText = aiChainChat;
let estimatorVision = visionScan;
export function _setKaloriEstimatorsForTest({ text, vision } = {}) {
  estimatorText = text || aiChainChat;
  estimatorVision = vision || visionScan;
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const sub = (m.args?.[0] || "").toLowerCase();
    const store = getKaloriStore(m);

    // ── Subcommand ──
    if (sub === "log" || sub === "hari") {
      const today = new Date().toISOString().split("T")[0];
      const todayEntries = store.entries.filter((e) => new Date(e.ts).toISOString().split("T")[0] === today);
      const total = todayEntries.reduce((a, e) => a + e.total, 0);
      const remaining = store.target - total;
      if (!todayEntries.length) {
        return m.reply(novaWrap("kalori", "Belum ada catatan makan hari ini.\n" + tipText(`Reply foto makanan + ${prefix}kalori, atau ketik ${prefix}kalori <makanan>`)));
      }
      const list = todayEntries.map((e, i) => `${i + 1}. ${e.name} — ${e.total} kkal`).join("\n");
      return m.reply(novaWrap("kalori",
        `📋 *Log hari ini (${todayEntries.length}x makan)*\n\n${list}\n\n🔥 Total: ${total} kkal\n🎯 Target: ${store.target} kkal\n${remaining >= 0 ? "✅ Sisa jatah: " + remaining + " kkal" : "⚠ Lebih " + Math.abs(remaining) + " kkal dari target"}`));
    }

    if (sub === "target") {
      const n = parseInt(m.args?.[1] || "", 10);
      if (!Number.isFinite(n) || n < 500 || n > 10000) {
        return m.reply(novaWrap("kalori", `Target sekarang: *${store.target} kkal/hari*\n\nFormat: ${prefix}kalori target 2000\n(500-10000 kkal, default 2000)`, "info"));
      }
      saveKaloriStore(m, store.db, { target: n, entries: store.entries });
      return m.reply(novaWrap("kalori", `✅ Target kalori harian disimpan: *${n} kkal*`));
    }

    if (sub === "hapus" || sub === "undo") {
      if (!store.entries.length) return m.reply(novaWrap("kalori", "Log masih kosong, gak ada yang bisa dihapus.", "error"));
      const last = store.entries.pop();
      saveKaloriStore(m, store.db, { target: store.target, entries: store.entries });
      return m.reply(novaWrap("kalori", `🗑 Entri terakhir dihapus: *${last.name}* (${last.total} kkal)`));
    }

    if (sub === "reset" || sub === "bersih") {
      saveKaloriStore(m, store.db, { target: store.target, entries: [] });
      return m.reply(novaWrap("kalori", "✅ Log kalori dibersihkan. Target tetap: " + store.target + " kkal"));
    }

    if (sub === "laporan" || sub === "rekap") {
      const days = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000).toISOString().split("T")[0];
        days[d] = 0;
      }
      for (const e of store.entries) {
        const d = new Date(e.ts).toISOString().split("T")[0];
        if (d in days) days[d] += e.total;
      }
      const dayKeys = Object.keys(days);
      const total7 = dayKeys.reduce((a, d) => a + days[d], 0);
      const activeDays = dayKeys.filter((d) => days[d] > 0).length;
      const avg = activeDays ? Math.round(total7 / activeDays) : 0;

      // chart PNG per hari
      const items = dayKeys.map((d) => ({ label: new Date(d).toLocaleDateString("id-ID", { weekday: "short" }), value: days[d] }));
      const png = await renderChart({
        title: "Kalori 7 Hari Terakhir",
        subtitle: `Target ${store.target} kkal/hari — rata-rata ${avg} kkal`,
        items,
      });
      await sock.sendMedia(m.chat, png, null, m, { type: "image" });

      const pct = Math.round((total7 / (store.target * 7)) * 100);
      const verdict = pct > 105 ? "⚠ Rata-rata di atas target — kurangi porsi atau tambah olahraga"
        : pct < 70 ? "📉 Rata-rata jauh di bawah target — jangan skip makan berlebihan"
        : "✅ Rata-rata pas di target, pertahankan";
      return m.reply(novaWrap("kalori",
        `📊 *Rekap 7 hari*\n\n🔥 Total: ${total7} kkal (${pct}% dari target 7 hari)\n📅 Hari tercatat: ${activeDays}/7\n⚖ Rata-rata: ${avg} kkal/hari\n\n${verdict}`));
    }

    // ── Estimasi: foto (reply/attach) atau teks ──
    const isPhoto = (m.quoted && m.quoted.isImage) || m.isImage;
    const textFood = m.args?.join(" ").trim();
    if (!isPhoto && !textFood) {
      const guide = novaCaption({
        emoji: "🍽",
        name: "kalori",
        description: "Estimasi kalori makanan dari foto/nama + log harian",
        usage: `${prefix}kalori (reply foto makanan)\n${prefix}kalori <nama makanan>\n${prefix}kalori log | laporan | target 2000 | hapus`,
        example: `${prefix}kalori (reply foto nasi padang)\n${prefix}kalori indomie goreng 2 bungkus`,
      }) + "\n" + tipText(`Makan sehat, hidup sehat`);
      return m.reply(guide, "kalori");
    }

    await m.react("🧠");

    let est = null;
    let engineUsed = "";
    if (isPhoto) {
      const buffer = m.quoted?.isImage ? await m.quoted.download() : await m.download();
      if (!buffer || !buffer.length) {
        await m.react("❌");
        return m.reply(novaWrap("kalori", "Gagal download gambar. Coba kirim ulang.", "error"));
      }
      const res = await estimatorVision({
        imageBuffer: buffer,
        question: estimatePrompt("gambar makanan/minuman yang terlihat di foto"),
        sessionKey: null,
      }).catch((e) => ({ status: false, error: e.message }));
      if (!res?.status) {
        await m.react("❌");
        return m.reply(novaWrap("kalori", res?.error || "Gagal menganalisis foto", "error"));
      }
      est = parseEstimate(res.text);
      engineUsed = res.engine || "vision";
    } else {
      const reply = await estimatorText(estimatePrompt(textFood)).catch(() => null);
      est = parseEstimate(reply);
      engineUsed = "ai";
    }

    if (!est) {
      await m.react("❌");
      return m.reply(novaWrap("kalori", "AI gak bisa estimasi itu. Coba foto lebih jelas atau tulis nama makanan yang lebih spesifik.", "error"));
    }

    // simpan log
    const name = isPhoto
      ? est.menu.slice(0, 3).map((x) => x.nama).join(", ").slice(0, 60)
      : textFood.slice(0, 60);
    const entries = [...store.entries, { ts: Date.now(), name, items: est.menu, total: est.total }];
    saveKaloriStore(m, store.db, { target: store.target, entries });

    const today = new Date().toISOString().split("T")[0];
    const todayTotal = entries.filter((e) => new Date(e.ts).toISOString().split("T")[0] === today).reduce((a, e) => a + e.total, 0);
    const remaining = store.target - todayTotal;

    await m.react("🐣");
    const msg = formatEstimate(est, { isPhoto, remaining, target: store.target }) +
      `\n\n⚙ ${toSC("engine")} : ${engineUsed} | ${toSC("log otomatis tersimpan — cek")} ${prefix}${toSC("kalori log")}`;
    return m.reply(msg);
  } catch (err) {
    console.error("kalori error:", err);
    await m.react("❌");
    return m.reply(novaWrap("kalori", te.novaError(err) || "Gagal memproses", "error"));
  }
}

export { pluginConfig as config, handler, parseEstimate };
