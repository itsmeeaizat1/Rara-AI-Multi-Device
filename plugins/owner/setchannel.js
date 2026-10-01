// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
import { persistSaluranConfig, normalizeNewsletterMeta } from "../../src/lib/nova-saluran.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pluginConfig = {
  name: "setchannel",
  alias: ["setsaluran", "saluranset"],
  category: "owner",
  description: "Set ID & link saluran WA untuk broadcast",
  usage: ".setchannel <link saluran>",
  example: ".setchannel https://whatsapp.com/channel/1234567890abcdef",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const input = m.text?.trim();

  if (!input) {
    // Show current config
    const currentId = config.saluran?.id || "@newsletter";
    const currentName = config.saluran?.name || "-";
    const currentLink = config.saluran?.link || "-";

    let status;
    if (!currentId.includes("@newsletter") || currentId === "@newsletter") {
      status = "Belum di-set (broadcast di-skip)";
    } else {
      status = "Aktif (broadcast akan jalan)";
    }

    return m.reply( "*pengaturan saluran*\n\n" +
      "ID: " + currentId + "\n" +
      "Nama: " + currentName + "\n" +
      "Link: " + currentLink + "\n" +
      "Status: " + status + "\n\n" +
      "Cara set:\n" +
      "1. Ketik: .setchannel <link saluran>\n" +
      "   Contoh: .setchannel https://whatsapp.com/channel/1234567890abcdef\n\n" +
      "2. Atau set manual di config.js bagian saluran.id\n" +
      "   Format ID: 120363xxx@newsletter\n\n" +
      "3. Bikin saluran baru: .createchannel <nama>\n\n" +
      "Cuma mau convert link → ID? Ketik: .channelid <link>", "setchannel");
  }

  // Parse input - could be a link or an ID
  let saluranId = "";
  let saluranLink = "";
  let saluranName = config.saluran?.name || "Nova AI Official";

  if (input.includes("whatsapp.com/channel/")) {
    // It's a link - extract channel code
    saluranLink = input.split(/[?\s]/)[0]; // clean query params
    const channelCode = input.split("whatsapp.com/channel/")[1]?.split(/[?\s]/)[0];

    if (!channelCode) {
      return m.reply(novaWrap("Setsaluran", "Link saluran tidak valid. Pastikan link benar."));
    }

    // Try to get newsletter ID from the link
    try {
      // Try to fetch newsletter metadata
      const metadata = normalizeNewsletterMeta(
        await sock.newsletterMetadata("invite", channelCode).catch(() => null),
      );

      if (metadata?.id) {
        saluranId = metadata.id;
        if (metadata?.name) saluranName = metadata.name;
      } else {
        // If can't get ID, save the link and let owner set ID manually
        return m.reply(novaWrap("setchannel", [
          "Tidak bisa dapat ID dari link tersebut.",
          "",
          "💡 Coba cara manual:",
          "1. Buka saluran di HP",
          "2. Titik tiga -> Info Saluran",
          "3. Salin ID (format: 120363xxx@newsletter)",
          "4. Ketik: .setchannel <ID>",
          "",
          "Atau tetap simpan link dulu?",
          "Ketik: .setchannel link " + saluranLink,
        ]));
      }
    } catch (e) {
      // If metadata fails, try to use the code as-is
      return m.reply(
        "Gagal dapat info saluran dari link.\n\n" +
        "Set manual:\n" +
        "1. Buka saluran di HP\n" +
        "2. Salin ID (format: 120363xxx@newsletter)\n" +
        "3. Ketik: .setchannel <ID>"
      );
    }
  } else if (input.includes("@newsletter")) {
    // It's already a newsletter ID
    saluranId = input.split(/[?\s]/)[0];
    saluranLink = config.saluran?.link || "https://whatsapp.com/channel/";
  } else if (input.startsWith("link ")) {
    // Just save the link
    saluranLink = input.slice(5).trim();
    saluranId = config.saluran?.id || "@newsletter";
    // Don't change ID, just update link
  } else {
    return m.reply(novaWrap("setchannel", [
      "Format tidak dikenal.",
      "",
      "💡 Ketik:",
      "1. .setchannel <link saluran> - auto detect ID",
      "2. .setchannel 120363xxx@newsletter - set ID manual",
      "3. .setchannel link <url> - set link saja",
      "4. .setchannel - lihat config saat ini",
    ]));
  }

  // Persist ke FILE YANG BENER (src/lib/config/bot-identity.js — dulu nulis ke
  // config.js yang cuma import reference → regex gak pernah match → ID hilang pas restart)
  try {
    persistSaluranConfig({ id: saluranId, link: saluranLink, name: saluranName });

    let replyText = "*saluran berhasil di-set*\n\n";
    replyText += "ID: " + saluranId + "\n";
    replyText += "Link: " + saluranLink + "\n";
    replyText += "Nama: " + saluranName + "\n\n";
    replyText += "Broadcast ke saluran sekarang *aktif*.\n";
    replyText += "Event yang ikut: notif bot on/off/mute, daftarsewa, jadibot, ban, block, sewa approve/reject/expired\n\n";
    replyText += "Cuma mau liat ID saluran? Ketik: .channelid <link>";

    return m.reply(replyText);
  } catch (e) {
    return m.reply(
      "Gagal update config: " + (e.message || "Unknown") + "\n\n" +
      "Set manual di src/lib/config/bot-identity.js:\n" +
      'saluran: { id: "' + saluranId + '", ... }'
    );
  }
}

export { pluginConfig as config, handler };
