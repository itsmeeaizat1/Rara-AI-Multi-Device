// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmasterdetectiverpg.js — LIB ANIMASI EMOJI-GRID khusus Master Detective / detektif
// (upgrade owner 28 Sep 2026: cutscene 3 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD (MENUJU/MENYIRIM · lokasi) · baris gerak (🚶 melintas kota / 🔍 menyisir sektor,
// jejak 👣/✨) · baris adegan kontekstual (pergi = kota 🏙️🚕 · cari = interior lokasi 🕯️🕸️, impact 💥 saat temu/
// 🔒 saat lockbox) · status aksi. Baris gerak TETAP di posisi line index 2 (kontrak e2e jejak bertambah).
// SITUASI MENENTUKAN LEVEL ANIMASI (owner 28 Sep): tier kasus menambah sektor (t1=6 · t2=8 · t3=10, +1 lockbox).
// BEDA TIER BEDA SUASANA: t1 kota 🏙️🚕 · t2 senja gerimis 🌆🌧️ · t3 jalanan berbahaya 🌃🚔🌧️. Badge ⭐ per tier di HUD.
// KHUSUS detektif (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../rara-anim-runner.js";

// ctx: { mode: pergi|cari, locName, locEmoji, hasil }
export function siramFrames({ mode, locName, locEmoji, hasil, tier }) {
  const t = Math.min(3, Math.max(1, Number(tier) || 1));
  const misteri = mode === "cari" && (hasil === "lockbox" || hasil === "pending") ? 1 : 0;
  const slots = 6 + (t - 1) * 2 + misteri; // SITUASI MENENTUKAN LEVEL: tier naik & lockbox → menyisir makin lama
  const scene = mode === "pergi"
    ? ["🏢", "🏪", "🏦", "🏫", "🏭", "🚧"]
    : ["🪑", "📦", "🗄️", "🚪", "🪟", "🗑️"];
  const mover = mode === "pergi" ? "🚶" : "🔍";
  const trail = mode === "pergi" ? "👣" : "✨";
  const badge = "⭐".repeat(t);
const header = mode === "pergi"
    ? "🚶 MENUJU · " + (locName || "LOKASI").toUpperCase() + " " + (locEmoji || "") + " " + badge
    : "🔍 MENYIRIM · " + (locName || "LOKASI").toUpperCase() + " " + (locEmoji || "") + " " + badge;
  // baris adegan grid — kontekstual per mode + akhir sesuai hasil (impact 💥/🔒)
  const adeganPergi = ["🏙️  🚕  🏙️  🌆", "🌆  🚕  🌃  🌧️", "🌃  🚔  🌧️  🌡️"][t - 1];
  const adeganCari = [(locEmoji || "🕯️") + "  🕸️  🪟  🕯️", (locEmoji || "🕯️") + "  🕸️  🌧️  📠", (locEmoji || "🕯️") + "  🕸️  🚨  🌧️"][t - 1];
  const adeganAkhir = mode === "pergi" ? "📍 ✨ 🏁"
    : hasil === "temu" ? "💥 ✨ 💡"
    : hasil === "lockbox" ? "🔒 ✨ 🗝️"
    : hasil === "pending" ? "🔒 🤔 🗝️"
    : "🤷 🌫️ 🤷";
  const adegan = (f) => (f === slots ? adeganAkhir : mode === "pergi" ? adeganPergi : adeganCari);
  const hasilText = mode === "pergi"
    ? "📍 TIBA! Sekitarnya menyusul…"
    : hasil === "temu" ? "✨ JEJAK DITEMUKAN! Hasil menyusul…"
    : hasil === "lockbox" ? "🔒 PETI TERKUNCI TERLIHAT!"
    : hasil === "pending" ? "🔒 PETI MASIH TERKUNCI…"
    : "🤷 SEKTOR SUDAH BERSIH…";
  const frames = [];
  for (let f = 0; f <= slots; f++) {
    const row = scene.map((s, i) => {
      if (i === Math.min(f, slots - 1)) return mover;
      if (i < f) return trail;
      return s;
    }).join("");
    const tail = f === 0 ? "MEMULAI PENYISIRAN…" : f < slots ? (mode === "pergi" ? "MELINTAS… " : "MENYIRIM… ") + f + "/" + slots : hasilText;
    frames.push("```\n" + header + "\n" + row + "\n" + adegan(f) + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playSiramAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, siramFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-detektif] gagal (dilewati senyap):", e?.message || e); return false; }
}
