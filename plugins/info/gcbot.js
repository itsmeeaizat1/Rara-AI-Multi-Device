// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaHeader,  separator, tipText, novaWrap } from "../../src/lib/nova-menu-style.js";
import { getSupportStatus } from "../../src/lib/support/support.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(process.cwd(), "tmp");

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function tempPath(ext) {
  ensureTmp();
  return path.join(TMP_DIR, `gcbot_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
}

const pluginConfig = {
  name: "gcbot",
  alias: ["gcbot"],
  category: "info",
  description: "Lihat daftar grup bot",
  usage: ".gcbot",
  example: ".gcbot",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {

    const groups = [];
    const chats = await sock.groupFetchAllParticipating();
    for (const [jid, meta] of Object.entries(chats || {})) {
      if (!jid?.endsWith("@g.us")) continue;
      const name = meta?.subject || "Grup";
      const count = meta?.participants?.length;
      groups.push(`${name} (${count ?? "-"})`);
    }

    const lines = groups.length
      ? groups.map((name, i) => `${i + 1}. ${name}`)
      : ["Belum ada grup."];

    // Section Join Grup Resmi — link dari src/lib/support/support.js
    const st = getSupportStatus();
    const joinSection = st.groupSet
      ? novaWrap("Join Grup Resmi", [
          `Nama: ${st.raw.group.name}`,
          `Link: ${st.raw.group.link}`,
          "",
          `Klik link di atas untuk gabung grup resmi bot`,
        ]) + "\n\n"
      : "";

    const text =
      novaWrap("Grup Bot", ["👥", "---", ...lines]) +
      "\n\n" +
      joinSection +
      tipText(`Total grup: ${groups.length}`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(text, "gcbot");
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      novaError("GcBot", "Gagal nih, coba lagi ya");

    await m.reply( text, "gcbot");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
