import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "npm",
  alias: ["npmsearch", "npmjs", "npmfind"],
  category: "search",
  description: "Search package di NPM registry",
  usage: ".npm <query>",
  example: ".npm axios",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const query = m.args?.join(" ");

  if (!query) {
    return m.reply(
      `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
        `> \`${m.prefix}npm <query>\`\n\n` +
        `> Contoh:\n` +
        `> \`${m.prefix}npm axios\``,
    );
  }

  await m.react("🕐");

  try {
    const res = await fetch(
      `https://registry.npmjs.com/-/v1/search?text=${encodeURIComponent(query)}&size=10`,
    );
    const data = await res.json();

    if (!data.objects || data.objects.length === 0) {
      return m.reply(
        `❌ *ᴛɪᴅᴀᴋ ᴅɪᴛᴇᴍᴜᴋᴀɴ*\n\n> Package "${query}" tidak ditemukan`,
      );
    }

    let text = `📦 *ɴᴘᴍ sᴇᴀʀᴄʜ*\n\n`;
    text += `> Query: \`${query}\`\n`;
    text += `> Found: ${data.total} packages\n\n`;

    data.objects.slice(0, 8).forEach((item, i) => {
      const pkg = item.package;
      const score = Math.round((item.score?.final || 0) * 100);

      text += `${i + 1}. *${pkg.name}*\n`;
      text += `> 📌 v${pkg.version}\n`;
      if (pkg.description) {
        text += `> 📝 ${pkg.description.slice(0, 50)}${pkg.description.length > 50 ? "..." : ""}\n`;
      }
      text += `> 🔗 ${pkg.links?.npm || "-"}\n`;
      if (pkg.author?.name) {
        text += `> 👤 ${pkg.author.name}\n`;
      }
      text += `> ⭐ Score: ${score}%`;
    });

    await m.react("✅");
    await m.reply(claraWrap("npm", text));
  } catch (e) {
    m.reply(claraWrap("npm", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
