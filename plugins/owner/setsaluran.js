// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from '../../config.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pluginConfig = {
  name: "setsaluran",
  alias: ["setsaluran"],
  category: "owner",
  description: "Set ID & link saluran WA untuk broadcast",
  usage: ".setsaluran <link saluran>",
  example: ".setsaluran https://whatsapp.com/channel/1234567890abcdef",
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

    return m.reply( "*ᴘᴇɴɢᴀᴛᴜʀᴀɴ ꜱᴀʟᴜʀᴀɴ*\n\n" +
      "ID: " + currentId + "\n" +
      "Nama: " + currentName + "\n" +
      "Link: " + currentLink + "\n" +
      "Status: " + status + "\n\n" +
      "Cara set:\n" +
      "1. Ketik: .setsaluran <link saluran>\n" +
      "   Contoh: .setsaluran https://whatsapp.com/channel/1234567890abcdef\n\n" +
      "2. Atau set manual di config.js bagian saluran.id\n" +
      "   Format ID: 120363xxx@newsletter\n\n" +
      "3. Bikin saluran baru: .buatsaluran <nama>", "setsaluran");
  }

  // Parse input - could be a link or an ID
  let saluranId = "";
  let saluranLink = "";

  if (input.includes("whatsapp.com/channel/")) {
    // It's a link - extract channel code
    saluranLink = input.split(/[?\s]/)[0]; // clean query params
    const channelCode = input.split("whatsapp.com/channel/")[1]?.split(/[?\s]/)[0];

    if (!channelCode) {
      return m.reply(claraWrap("Setsaluran", "Link saluran tidak valid. Pastikan link benar."));
    }

    // Try to get newsletter ID from the link
    try {
      // Try to fetch newsletter metadata
      const metadata = await sock.newsletterMetadata("invite", channelCode).catch(() => null);

      if (metadata?.id) {
        saluranId = metadata.id;
      } else {
        // If can't get ID, save the link and let owner set ID manually
        return m.reply(claraWrap("setsaluran", [
          "Tidak bisa dapat ID dari link tersebut.",
          "",
          "💡 Coba cara manual:",
          "1. Buka saluran di HP",
          "2. Titik tiga -> Info Saluran",
          "3. Salin ID (format: 120363xxx@newsletter)",
          "4. Ketik: .setsaluran <ID>",
          "",
          "Atau tetap simpan link dulu?",
          "Ketik: .setsaluran link " + saluranLink,
        ]));
      }
    } catch (e) {
      // If metadata fails, try to use the code as-is
      return m.reply(
        "Gagal dapat info saluran dari link.\n\n" +
        "Set manual:\n" +
        "1. Buka saluran di HP\n" +
        "2. Salin ID (format: 120363xxx@newsletter)\n" +
        "3. Ketik: .setsaluran <ID>"
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
    return m.reply(claraWrap("setsaluran", [
      "Format tidak dikenal.",
      "",
      "💡 Ketik:",
      "1. .setsaluran <link saluran> - auto detect ID",
      "2. .setsaluran 120363xxx@newsletter - set ID manual",
      "3. .setsaluran link <url> - set link saja",
      "4. .setsaluran - lihat config saat ini",
    ]));
  }

  // Update config.js file
  try {
    const configPath = path.resolve(__dirname, "../../config.js");
    let configContent = fs.readFileSync(configPath, "utf8");

    // Update saluran.id
    const oldId = config.saluran?.id || "@newsletter";
    configContent = configContent.replace(
      /id:\s*["']@newsletter["']/,
      'id: "' + saluranId + '"'
    );

    // Update saluran.link if we have a new one
    if (saluranLink && saluranLink !== "https://whatsapp.com/channel/") {
      const oldLink = config.saluran?.link || "https://whatsapp.com/channel/";
      configContent = configContent.replace(
        new RegExp('link:\\s*["]' + oldLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["]'),
        'link: "' + saluranLink + '"'
      );
    }

    fs.writeFileSync(configPath, configContent);

    // Update runtime config
    config.saluran.id = saluranId;
    if (saluranLink) config.saluran.link = saluranLink;


    let replyText = "*ꜱᴀʟᴜʀᴀɴ ʙᴇʀʜᴀꜱɪʟ ᴅɪ-ꜱᴇᴛ*\n\n";
    replyText += "ID: " + saluranId + "\n";
    replyText += "Link: " + saluranLink + "\n";
    replyText += "Nama: " + (config.saluran?.name || "Nova AI Official") + "\n\n";
    replyText += "Broadcast ke saluran sekarang *aktif*.\n";
    replyText += "Event yang dikirim: daftarsewa, jadibot, ban, block, sewa approve/reject/expired";

    return m.reply(replyText);
  } catch (e) {
    return m.reply(
      "Gagal update config: " + (e.message || "Unknown error") + "\n\n" +
      "Set manual di config.js:\n" +
      'saluran: { id: "' + saluranId + '", ... }'
    );
  }
}

export { pluginConfig as config, handler };
