// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import te from "../../src/lib/rara-error.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "tocase",
  alias: ["tocase"],
  aliases: ["tocase", "convertcase", "caseconvert"],
  category: "convert",
  description: "Convert plugin handler ESM/CJS ke format case untuk bot case-based",
  usage: ".tocase (reply code plugin)",
  example: ".tocase",
  isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    if (!m.quoted || !m.quoted.text) return m.reply(raraWrap("tocase", "Reply ke plugin handler (ESM/CJS) yang mau diubah jadi case.", "guide"));

    await m.react("🕒");
    const code = m.quoted.text.trim();

    const cmdMatch = code.match(/handler\.command\s*=\s*\[(.*?)\]/) ||
                     code.match(/alias:\s*\[(.*?)\]/) ||
                     code.match(/aliases:\s*\[(.*?)\]/);
    const bodyMatch = code.match(/let handler\s*=\s*async\s*\(.*?\)\s*=>\s*{([\s\S]+?)^\}/m) ||
                     code.match(/async function.*?\([\s\S]*?\)\s*{([\s\S]+?)^\}/m) ||
                     code.match(/async function handler[\s\S]*?{([\s\S]+?)^}/m);

    if (!cmdMatch || !bodyMatch) { await m.react("❌"); return m.reply(raraWrap("tocase", "Tidak bisa mendeteksi struktur command atau isi fungsi.")); }

    const commands = cmdMatch[1].split(",").map(v => v.replace(/['"\[\]\s]/g, "")).filter(Boolean);
    const body = bodyMatch[1].trim();

    const result = commands.map(cmd =>
      `case '${cmd}': {\n  ${body.replace(/\n/g, "\n  ")}\n}\nbreak;`
    ).join("\n\n");

    await m.react("🐣");

    if (result.length > 4000) {
      const filename = `converted_case_${Date.now()}.js`;
      const tmpDir = path.join(process.cwd(), "tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const filepath = path.join(tmpDir, filename);
      fs.writeFileSync(filepath, result);

      await sock.sendMessage(m.chat, {
        document: fs.readFileSync(filepath),
        mimetype: "application/javascript",
        fileName: filename,
      }, { quoted: m });

      try { fs.unlinkSync(filepath); } catch {}
    } else {
      m.reply("✅ Berikut hasil konversi:\n\n```js\n" + result + "\n```");
    }
  } catch (e) {
    console.error("tocase error:", e.message);
    await m.react("❌");
    m.reply(raraWrap("tocase", "Gagal mengonversi plugin: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
