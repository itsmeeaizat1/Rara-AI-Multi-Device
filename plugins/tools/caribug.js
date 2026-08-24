// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "caribug",
  alias: ["debug", "findbug"],
  category: "tools",
  description: "Cari bug di kode pemrograman",
  usage: ".caribug [kode] atau reply kode",
  example: ".caribug function test() {}",
  cooldown: 20,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock,  args }) {
  let code = m.quoted?.text || args.join(" ");

  if (!code) {
    return m.reply( `*🐛 CARI BUG*\n\nKirim kode atau reply pesa{ const __navText = (ug.\n\nContoh:\n\`${m.prefix}caribug function test() {}\``, "caribug");
  }

  m.react("🕒");

  try {
    const apiUrl = `); return await m.reply(__navText); }ttps://api.cuki.biz.id/api/aicode/caribug`;
    const res = await axios.get(apiUrl, {
      params: {
        apikey: config.APIkey.cuki,
        code: code,
        language: "auto"
      },
      timeout: 60000
    });

    const data = res.data;

    if (!data.success || !data.data) {
      throw new Error("Gagal menganalisa kode dari server");
    }

    const info = data.data;
    const meta = info.metadata;
    const bugInfo = info.bugsFound;
    
    let text = `🐛 *ʜᴀꜱɪʟ ᴀɴᴀʟɪꜱᴀ ʙᴜɢ*\n\n`;
    text += `*ʙᴀʜᴀꜱᴀ:* ${meta.detectedLanguage}\n`;
    text += `*ᴛɪɴɢᴋᴀᴛ:* ${meta.severityInfo.level} ${meta.severityInfo.icon}\n`;
    text += `*ʙᴜɢ ᴅɪᴛᴇᴍᴜᴋᴀɴ:* ${bugInfo.total}\n\n`;
    
    if (bugInfo.summary) {
      text += `*📝 Ringkasan:*\n${bugInfo.summary}\n\n`;
    }
    
    if (info.codeAnalysis?.fixed?.code) {
      text += `*✨ Kode Perbaikan:*\n\`\`\`${meta.detectedLanguage}\n${info.codeAnalysis.fixed.code}\n\`\`\`\n\n`;
    }
    
    if (bugInfo.details && bugInfo.details.length > 0) {
      text += `*📌 Detail:* \n`;
      bugInfo.details.forEach((d, i) => {
        text += `- ${d.type || d.description}\n`;
      });
    }

    m.react("🐣");
    { const __navText = (text.trim()); await m.reply(__navText); };
  } catch (err) {
    console.error("[CariBug]", err.message);
    m.reply(claraWrap("caribug", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
