// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// libanimationrpg/libmasterdetectiverpg.js — LIB ANIMASI khusus Master Detective / detektif (owner 25 Sep 2026)
// Siram lokasi: 🚶 melintas kota / 🔍 menyisir sektor objek, jejak 👣/✨, akhir sesuai hasil.
// KHUSUS detektif (aturan "beda game beda animasi"). Isi MURNI KODE ANIMASI (pure dari ctx, gak import plugin).
// Dipanggil plugin saat user main game — animasi dimuat dari lib ini. Fallback gak dukung edit → senyap.

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
    frames.push("```\n" + header + "\n" + row + "\n" + tail + "\n```");
  }
  return frames;
}

export async function playSiramAnim(sock, jid, ctx, frameMs) {
  try { return await editFramesAnim(sock, jid, siramFrames(ctx), { frameMs }); }
  catch (e) { console.error("[anim-detektif] gagal (dilewati senyap):", e?.message || e); return false; }
}
