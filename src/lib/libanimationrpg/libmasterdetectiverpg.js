// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmasterdetectiverpg.js — LIB ANIMASI EMOJI-GRID khusus Master Detective / detektif
// (upgrade owner 28 Sep 2026: cutscene 3 baris → GRID EMOJI FRAME-BY-FRAME 4 baris ala "scene situasional")
// Grid per frame: HUD (MENUJU/MENYIRIM · lokasi) · baris gerak (🚶 melintas kota / 🔍 menyisir sektor,
// jejak 👣/✨) · baris adegan kontekstual (pergi = kota 🏙️🚕 · cari = interior lokasi 🕯️🕸️, impact 💥 saat temu/
// 🔒 saat lockbox) · status aksi. Baris gerak TETAP di posisi line index 2 (kontrak e2e jejak bertambah).
// KHUSUS detektif (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback channel gak dukung edit → senyap.

import { editFramesAnim } from "../nova-anim-runner.js";

// ctx: { mode: pergi|cari, locName, locEmoji, hasil }
export function siramFrames({ mode, locName, locEmoji, hasil }) {
  const slots = 6;
  const scene = mode === "pergi"
    ? ["🏢", "🏪", "🏦", "🏫", "🏭", "🚧"]
    : ["🪑", "📦", "🗄️", "🚪", "🪟", "🗑️"];
  const mover = mode === "pergi" ? "🚶" : "🔍";
  const trail = mode === "pergi" ? "👣" : "✨";
  const header = mode === "pergi"
    ? "🚶 MENUJU · " + (locName || "LOKASI").toUpperCase() + " " + (locEmoji || "")
    : "🔍 MENYIRIM · " + (locName || "LOKASI").toUpperCase() + " " + (locEmoji || "");
  // baris adegan grid — kontekstual per mode + akhir sesuai hasil (impact 💥/🔒)
  const adeganPergi = "🏙️  🚕  🏙️  🌆";
  const adeganCari = (locEmoji || "🕯️") + "  🕸️  🪟  🕯️";
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
