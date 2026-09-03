// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .convertoffer on/off — toggle tawaran convert otomatis setelah download/play
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "convertoffer",
  alias: ["convertoffer"],
  aliases: ["convertoffer", "convertoff", "offerconvert", "tawaranconvert"],
  category: "owner",
  description: "On/off tawaran convert otomatis setelah media terkirim (.play/.playvideo/download)",
  usage: ".convertoffer on/off",
  example: ".convertoffer off",
  isOwner: true, isPremium: false,
  cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const option = (m.text || "").toLowerCase().trim();
  const current = db.setting("convertOffer") ?? false;

  if (!option) {
    return m.reply(novaBox("Convertoffer", [
      "Toggle tawaran convert otomatis",
      "yang muncul setelah media terkirim.",
      "",
      `Status: ${current ? "Aktif ✅" : "Nonaktif ❌"}`,
      "",
      "Ketik:",
      ".convertoffer on — aktifkan",
      ".convertoffer off — matikan",
      "",
      "Catatan: walau OFF, command",
      ".convert <format> tetap bisa",
      "dipakai manual sama user.",
    ]));
  }

  if (option === "on") {
    db.setting("convertOffer", true);
    await m.react("🐣");
    return m.reply(novaBox("Convertoffer", [
      "Tawaran convert otomatis",
      "udah diaktifkan ✅",
    ]));
  }

  if (option === "off") {
    db.setting("convertOffer", false);
    await m.react("🐣");
    return m.reply(novaBox("Convertoffer", [
      "Tawaran convert otomatis",
      "udah dimatikan ❌",
      "",
      "Command .convert <format> tetap",
      "jalan, cuma pesan tawarannya",
      "gak dikirim lagi.",
    ]));
  }

  return m.reply(novaBox("Convertoffer", [
    "Pilih on atau off ya!",
    "",
    "Contoh: .convertoffer off",
  ]));
}

export { pluginConfig as config, handler };
