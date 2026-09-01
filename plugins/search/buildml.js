// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "buildml",
  alias: ["buildml", "mlbuild", "buildmlbb"],
  category: "search",
  description: "Build hero Mobile Legends (emblem, spell, item)",
  usage: ".buildml <nama hero>",
  example: ".buildml Lancelot",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 8, energi: 1, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const hero = m.args.join(" ").trim();
    if (!hero) {
      return m.reply(claraWrap("buildml", `Mau cari build hero apa?\n\nContoh: ${m.prefix}buildml Lancelot`, "guide"));
    }

    await m.react("🕒");
    const { data } = await axios.get(`https://api.apocalypse.web.id/search/buildml?hero=${encodeURIComponent(hero)}`, {
      timeout: 15000, headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!data || data.status === false || (!data.result && !data.data)) {
      await m.react("❌");
      return m.reply(claraWrap("buildml", `Hero "${hero}" tidak ditemukan.`, "error"));
    }

    const r = data.result || data.data || data;
    await m.react("🐣");

    let msg = `╭─「 ✦ ʙᴜɪʟᴅ ᴍʟ ʙʙ ✦ 」\n`;
    msg += `│ Hero: *${r.hero || r.name || hero}*\n`;
    if (r.emblem) msg += `│ Emblem: *${r.emblem}*\n`;
    if (r.spell || r.battle_spell) msg += `│ Battle Spell: *${r.spell || r.battle_spell}*\n`;
    if (r.item || r.items) {
      const items = Array.isArray(r.item || r.items) ? (r.item || r.items) : [(r.item || r.items)];
      msg += `│\n`;
      msg += `│ Item Build:\n`;
      items.forEach((it, i) => { msg += `│ ${i + 1}. ${typeof it === "string" ? it : it.name || it.item || JSON.stringify(it)}\n`; });
    }
    if (r.tips || r.note) {
      msg += `│\n`;
      msg += `│ Tips: ${r.tips || r.note}\n`;
    }
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("buildml error:", err);
    await m.react("❌");
    return m.reply(claraWrap("buildml", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
