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
  description: "AI Rich — kategori plugin baru (kode menyusul dari owner)",
  usage: ".airich",
  example: ".airich",
  isOwner: false, isPremium: false, isGroup: true, isPrivate: true,
  cooldown: 5, energi: 1,
  // ✅ true kalau udah dipasang; false = auto-jawab "belum dipasang"
  isEnabled: false,
};

async function handler(m, { sock }) {
  // ── SEMENTARA: slot kosong — kode owner dipasang di sini ──
  return m.reply(claraWrap("airich", [
    "🏠 *AI Rich — kategori plugin baru*",
    "",
    "Folder plugins/airich/ udah siap.",
    "Kode inti masih menunggu dari owner.",
    "",
    "Begitu kode dipasang, fitur di kategori ini langsung jalan",
    "tanpa perlu registrasi apa pun (loader auto-detect folder).",
  ].join("\n"), "guide"));
}

export default { pluginConfig, handler, command: "airich" };
