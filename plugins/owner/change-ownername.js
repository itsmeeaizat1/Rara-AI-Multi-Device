// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getOwnerName } from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "ganti-namaowner",
  alias: ["ganti-namaowner"],
  category: "owner",
  description: "Ganti nama owner (utama atau tambahan)",
  usage: ".ganti-namaowner <nomor> <nama baru>",
  example: ".ganti-namaowner 628xxx Fauzan",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config }) {
  const db = getDatabase();
  const input = m.args;

  if (!input[0]) {
    const nameMap = db.setting("ownerNames") || {};
    const mainOwnerNum = config.owner?.number?.[0] || "";
    const mainName = config.owner?.name || "Owner";
    let list = `👤 *Owner Name List*\n\n`;
    list += `👑 Main: *${mainName}* (${mainOwnerNum})\n`;
    const entries = Object.entries(nameMap);
    if (entries.length > 0) {
      entries.forEach(([num, name]) => {
        list += `👤 ${num}: *${name}*\n`;
      });
    } else {
      list += `\nBelum ada nama custom untuk owner tambahan`;
    }
    list += `\n\n*Penggunaan:*\n`;
    list += `\`${m.prefix}ganti-namaowner <nomor> <nama>\`\n`;
    list += `\`${m.prefix}ganti-namaowner main <nama>\` — ganti nama owner utama`;
    return m.reply(list);
  }

  if (input[0].toLowerCase() === "main") {
    const newName = input.slice(1).join(" ").trim();
    if (!newName) {
      return m.reply( `👤 *Ganti Nama Owner Utama*\n\nNama saat ini: *${config.owner?.name || "-"}*\n\n\`${m.prefix}ganti-namaowner main <nama baru>\``, "ganti-namaowner");
    }
    try {
      const configPath = path.join(process.cwd(), "config.js");
      let configContent = fs.readFileSync(configPath, "utf8");
      configContent = configContent.replace(
        /owner:\s*\{[\s\S]*?name:\s*['"]([^'"]*)['"]/,
        (match, oldName) =>
          match
            .replace(`'${oldName}'`, `'${newName}'`)
            .replace(`"${oldName}"`, `'${newName}'`),
      );
      fs.writeFileSync(configPath, configContent);
      config.owner.name = newName;
      return m.reply(raraWrap("Ganti-namaowner", `✅ *Berhasil*\n\nNama owner utama diganti ke: *${newName}*`));
    } catch (error) {
      return m.reply(raraWrap("ganti-namaowner", te(m.prefix, m.command, m.pushName), "error"));
    }
  }

  const targetNumber = input[0].replace(/[^0-9]/g, "");
  const newName = input.slice(1).join(" ").trim();

  if (!targetNumber || targetNumber.length < 10) {
    return m.reply( `❌ *Gagal*\n\nNomor tidak valid\n\n\`${m.prefix}ganti-namaowner 628xxx NamaOwner\``, "ganti-namaowner");
  }

  if (!newName) {
    const currentName = getOwnerName(targetNumber);
    return m.reply( `👤 *Nama Owner*\n\n${targetNumber}: *${currentName}*\n\n\`${m.prefix}ganti-namaowner ${targetNumber} <nama baru>\``, "ganti-namaowner");
  }

  const nameMap = db.setting("ownerNames") || {};
  nameMap[targetNumber] = newName;
  db.setting("ownerNames", nameMap);

  return m.reply(raraWrap("Ganti-namaowner", `✅ *Berhasil*\n\nNama owner *${targetNumber}* diganti ke: *${newName}*`));
}

export { pluginConfig as config, handler };
