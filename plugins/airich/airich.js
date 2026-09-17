// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// ============================================================
// 🔹 KATEGORI BARU: AI RICH (plugins/airich/)
// 🔹 Kategori wadah — kode inti AKAN DIBERIKAN OWNER (belum dipasang).
// 🔹 Slot template standar rumah: owner paste kode → tinggal isi
//   pluginConfig + handler di bawah. Handler auto-jawab "belum
//   dipasang" sampai kode owner nyangkut.
// 🔹 HOUSE RULES kategori ini:
//   - reply/menu pakai smallcaps (otomatis via claraWrap)
//   - pesan berkotak wajib boxLeft() dari src/lib/styler.js
//   - loading = react emoji 🧠/🔍/🛠️/⚡ (tanpa morphing edit-in-place)
//   - bar meter hasil = ▰▱ (dilarang █░), ticker/countdown = 🕒 (dilarang ⏳)
//   - error STRICT: error asli API keluar apa adanya, no fallback AI lain
//   - canvas kalau perlu: @napi-rs/canvas + assets/fonts (pola kiblat.js)
// ============================================================
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "airich",
  alias: ["airich", "richai", "ai-rich", "rich"],
  category: "airich",
  description: "AI Rich ✨ — HTML hidup di dalam gelembung chat",
  usage: ".airich",
  example: ".airich",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 5, energi: 1,
  isEnabled: true,
};

// ── HUB fitur airich (17 Sep 2026: request owner "airich cmd disable" —
//   dulu stub "belum dipasang"; sekarang kategori udah punya 3 fitur asli,
//   .airich jadi daftar fitur + cara pakai) ──
async function handler(m, { sock }) {
  return m.reply(claraWrap("airich", [
    "✨ *AI Rich — HTML hidup di dalam chat*",
    "",
    "Kartu interaktif beneran (bukan gambar): HTML dirender",
    "langsung di dalam gelembung pesan.",
    "",
    "🔍 .googleairich <query>",
    "   Google + hasil asli DuckDuckGo di dalam chat",
    "",
    "▶️ .youtubeairich <query>",
    "   Pencarian YouTube + player di dalam chat",
    "",
    "🚀 .plane",
    "   Game Space Rush (tap kiri/kanan, hindari meteor)",
    "",
    "_Tips: kalau kartu gak muncul, pastikan WhatsApp_",
    "_kamu versi terbaru — AI Rich butuh client 2.25.xx+_",
  ].join("\n"), "guide"));
}

export default { pluginConfig, handler, command: "airich" };
export { pluginConfig as config, handler };
