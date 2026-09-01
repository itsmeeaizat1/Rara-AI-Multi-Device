// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { unloadPlugin } from "../../src/lib/nova-plugins.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "delplugin",
  alias: ["delplugin"],
  category: "owner",
  description: "Hapus plugin berdasarkan nama",
  usage: ".delplugin <nama>",
  example: ".delplugin bliblidl",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function findPluginFile(pluginsDir, name) {
  const folders = fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const folder of folders) {
    const folderPath = path.join(pluginsDir, folder);
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const baseName = file.replace(".js", "");
      if (baseName.toLowerCase() === name.toLowerCase()) {
        return { folder, file, path: path.join(folderPath, file) };
      }
    }
  }

  return null;
}

async function handler(m, { sock }) {
  const name = m.fullArgs?.trim() || m.args?.[0];

  if (!name) {
    return m.reply(
      `Hapus plugin berdasarkan nama\n\n` +
        `Contoh:\n` +
        `\`${m.prefix}delplugin bliblidl\``, "delplugin");
  }
  try {
    const pluginsDir = path.join(process.cwd(), "plugins");
    const found = findPluginFile(pluginsDir, name);

    if (!found) {
      return m.reply(`❌ Plugin \`${name}\` tidak ditemukan`);
    }

    let unloadResult = { success: false };
    try {
      unloadResult = unloadPlugin(found.path) || { success: true };
    } catch (e) { console.error('[delplugin.js]:', e.message); }

    fs.unlinkSync(found.path);
    return m.reply(
      `✅ Plugin Dihapus\n\n` +
        `File: \`${found.file}\`\n` +
        `Folder: \`${found.folder}\`\n` +
        `Unload: ${unloadResult.success ? "✅ Sukses" : "⚠️ Pending"}\n\n` +
        `Plugin sudah dihapus dan tidak aktif!`,
    );
  } catch (error) {
    await m.reply(claraWrap("delplugin", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
