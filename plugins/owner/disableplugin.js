// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import te from "../../src/lib/rara-error.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "disableplugin",
  alias: ["disableplugin"],
  category: "owner",
  description: "Menonaktifkan plugin tertentu",
  usage: ".disableplugin <nama_plugin>",
  example: ".disableplugin sticker",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function findPluginFile(pluginName) {
  const pluginsDir = path.join(process.cwd(), "plugins");
  const categories = fs.readdirSync(pluginsDir).filter((f) => {
    return fs.statSync(path.join(pluginsDir, f)).isDirectory();
  });

  for (const category of categories) {
    const categoryPath = path.join(pluginsDir, category);
    const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      try {
        const filePath = path.join(categoryPath, file);
        const plugin = await import(`file://${filePath.replace(/\\/g, "/")}`);

        if (!plugin.config) continue;

        const name = Array.isArray(plugin.config.name)
          ? plugin.config.name[0]
          : plugin.config.name;

        const aliases = plugin.config.alias || [];

        if (name === pluginName || aliases.includes(pluginName)) {
          return { filePath, plugin, category, file };
        }
      } catch (e) { console.error('[disableplugin.js]:', e.message); }
    }
  }

  return null;
}

async function handler(m, { sock }) {
  const args = m.args || [];
  const pluginName = args[0]?.toLowerCase();

  if (!pluginName) {
    return m.reply( raraWrap("disableplugin", `🔌 *Disable Plugin*\n\n` +
        `Masukkan nama plugin yang ingin dinonaktifkan\n\n` +
        `*Contoh:*\n` +
        `\`${m.prefix}disableplugin sticker\`\n` +
        `\`${m.prefix}disableplugin tiktok\``, "guide"), "disableplugin");
  }

  const found = await findPluginFile(pluginName);

  if (!found) {
    return m.reply(raraWrap("Disableplugin", `❌ Plugin *${pluginName}* tidak ditemukan!`));
  }

  const { filePath, plugin, category, file } = found;

  if (plugin.config.isEnabled === false) {
    return m.reply(raraWrap("Disableplugin", `⚠️ Plugin *${pluginName}* sudah dinonaktifkan!`));
  }

  try {
    let content = fs.readFileSync(filePath, "utf-8");

    content = content.replace(/isEnabled:\s*true/i, "isEnabled: false");

    fs.writeFileSync(filePath, content);

    await m.reply(raraWrap("disableplugin", `✅ *Plugin Disabled*\n\n` +
        `📦 Plugin: *${plugin.config.name}*\n` +
        `🏷️ Category: *${category}*\n` +
        `📄 File: *${file}*\n` +
        `• Status: *Disabled*\n` +
        `\n` +
        `Restart bot atau gunakan hot reload untuk apply.`));
  } catch (error) {
    await m.reply(raraWrap("disableplugin", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
