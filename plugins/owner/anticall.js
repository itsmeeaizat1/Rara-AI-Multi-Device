// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .anticall — atur panggilan telepon masuk ke nomor bot (OWNER)
// UPGRADE 18 Sep 2026 (request owner: "lbh baik klo ada org yg nlpon tnpa
// ditolak mksdnya tkutnya keluarga saya yg nlpon jd mngkin hrs ada opsi
// tolak telepon on off"):
//   .anticall off   → DEFAULT: panggilan dibiarkan bunyi, gak ditolak
//                     (keluarga bisa nelpon normal)
//   .anticall info  → TIDAK ditolak, tapi bot kirim pesan teks ke
//                     penelepon: "saya bot, gak bisa angkat — kirim VN!"
//   .anticall on    → DITOLAK otomatis + pesan penjelasan
import { getDatabase } from "../../src/lib/rara-database.js";
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const MODES = {
  on: { key: true, label: "TOLAK otomatis + kirim pesan penjelasan" },
  info: { key: "info", label: "TIDAK ditolak (tetap bunyi) — bot kirim pesan info ke penelepon" },
  off: { key: false, label: "Tidak melakukan apa-apa — panggilan bunyi normal" },
};

const pluginConfig = {
  name: "anticall",
  alias: ["anticall", "antitelepon"],
  category: "owner",
  description: "Atur panggilan telepon masuk — tolak / info / biarkan",
  usage: ".anticall on — Tolak panggilan otomatis\n.anticall info — Gak ditolak, kirim pesan info ke penelepon\n.anticall off — Biarkan panggilan bunyi normal (default)\n.anticall status — Cek mode aktif",
  example: ".anticall info",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function currentMode() {
  const db = getDatabase();
  const cur = db.setting("antiCall") ?? config.features?.antiCall ?? false;
  if (cur === true) return "on";
  if (cur === "info") return "info";
  return "off";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const option = (m.text || "").trim().toLowerCase();
  const prefix = m.prefix || ".";

  if (!option || option === "status") {
    const cur = currentMode();
    return m.reply(raraWrap("Anti Call", [
      "Mode saat ini: " + (cur === "on" ? "TOLAK (panggilan ditolak otomatis)" : cur === "info" ? "INFO (gak ditolak, bot kirim pesan info)" : "OFF (panggilan dibiarkan bunyi normal)"),
      "Default bot: OFF — panggilan tidak ditolak",
      "",
      "Pilihan mode:",
      prefix + "anticall on — Tolak panggilan otomatis",
      prefix + "anticall info — Gak ditolak, kirim pesan info ke penelepon",
      prefix + "anticall off — Biarkan panggilan (disarankan kalau keluarga sering nelpon)",
    ]));
  }

  const mode = MODES[option];
  if (!mode) {
    return m.reply(raraWrap("Anti Call", [
      "Mode tidak valid!",
      "Pilihan: on (tolak) / info (pesan info saja) / off (biarkan)",
      "Contoh: " + prefix + "anticall info",
    ], "error"));
  }

  db.setting("antiCall", mode.key);
  return m.reply(raraWrap("Anti Call", [
    "Mode diubah: " + option.toUpperCase(),
    mode.label,
  ]));
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
