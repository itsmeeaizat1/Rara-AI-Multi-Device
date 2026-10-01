// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .swsave — AUTO DOWNLOAD STATUS: status/story kontak otomatis
// diteruskan ke DM owner seketika (fitur langka bot MD luar sana).
//   .swsave on/off/status — toggle + status
// Dilengkapi dedupe: satu status cuma diteruskan sekali.
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "statussave",
  alias: ["swsave", "statussave", "autodlstatus"],
  category: "owner",
  description: "Status kontak otomatis diteruskan ke DM owner",
  usage: ".swsave <on/off/status>",
  example: ".swsave on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.text?.trim().split(/\s+/).slice(1) || [];
  const action = (args[0] || "status").toLowerCase();
  const cur = db.setting("autoStatusDownload") || { enabled: false };

  if (action === "on" || action === "aktif" || action === "aktifkan") {
    db.setting("autoStatusDownload", { ...cur, enabled: true });
    return m.reply(
      raraWrap("Auto Download Status", [
        "AKTIF — semua status kontak otomatis diteruskan ke DM kamu.",
        "Status media (gambar/video/audio) dan teks dua-duanya.",
        "Satu status cuma sekali (dedupe), jadi gak nge-spam.",
      ]),
      { commandName: "swsave" }
    );
  }

  if (action === "off" || action === "mati" || action === "matikan") {
    db.setting("autoStatusDownload", { ...cur, enabled: false });
    return m.reply(
      raraWrap("Auto Download Status", [
        "MATI — status kontak gak diteruskan lagi.",
        "Aktifin lagi kapan aja: .swsave on",
      ])
    );
  }

  if (action === "clear" || action === "reset") {
    db.setting("statusDownloadSeen", []);
    return m.reply(
      raraWrap("Auto Download Status", [
        "Riwayat dedupe dibersihin — semua status berikutnya diteruskan lagi walau pernah muncul.",
      ])
    );
  }

  const total = (db.setting("statusDownloadSeen") || []).length;
  return m.reply(
    raraWrap("Auto Download Status", [
      `Mode: ${cur.enabled ? "AKTIF" : "MATI"}`,
      `Riwayat dedupe tersimpan: ${total} status`,
      "",
      "Perintah: .swsave on/off/clear/status",
      "Semua status kontak diteruskan ke DM owner seketika.",
    ])
  );
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
