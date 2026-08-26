// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// menu2.js — Quick menu shortcut (elegant, style ◈ untuk list command)
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/nova-plugins.js";
import { getCasesByCategory } from "../../case/nova.js";
import path from "path";
import { sendMenuCard } from "../../src/lib/nova-menu-card.js";
import { listBox } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "menu2",
  alias: ["menu2", "quickmenu", "qm", "fastmenu"],
  category: "main",
  description: "Menu navigasi cepat dengan shortcut",
  usage: ".menu2",
  example: ".menu2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const QUICK_LINKS = [
  { label: "Menu Utama", cmd: "menu", emoji: "🏠" },
  { label: "All Menu", cmd: "allmenu", emoji: "📋" },
  { label: "Kategori", cmd: "allmenucategory", emoji: "📂" },
  { label: "Info Bot", cmd: "info", emoji: "ℹ️" },
  { label: "Owner", cmd: "owner", emoji: "👑" },
  { label: "Sewa Bot", cmd: "sewa", emoji: "🛒" },
  { label: "Donasi", cmd: "donasi", emoji: "💝" },
  { label: "Rules", cmd: "rules", emoji: "📜" },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    await m.react("🕒");
    const prefix = botConfig.command?.prefix || ".";
    const botName = botConfig.bot?.name || "Nova AI Whatsapp Bot";

    const items = QUICK_LINKS.map((q) => `${q.emoji} ${prefix}${q.cmd} — ${q.label}`);

    const totalFitur = (() => {
      const pluginCats = getCategories();
      const commandsByCategory = getCommandsByCategory();
      const caseCats = getCasesByCategory();
      let total = 0;
      for (const cat of pluginCats) total += (commandsByCategory[cat] || []).length;
      for (const cat of Object.keys(caseCats)) total += (caseCats[cat] || []).length;
      return total;
    })();

    const text = `${listBox("Quick Menu", items)}\n\nTotal ${totalFitur} fitur\n${botName}`;

    const navButtons = [
      { id: `${prefix}menu`, text: "🏠 Menu" },
      { id: `${prefix}allmenu`, text: "📋 All Menu" },
      { id: `${prefix}owner`, text: "👑 Owner" },
    ];

    await m.react("🐣");
    await sendMenuCard(sock, m, {
      text,
      footer: botName,
      thumbnailPath: path.join(process.cwd(), "assets", "image", "menu.jpg"),
      buttons: navButtons,
      title: "Quick Menu",
    });

  } catch (e) {
    console.error("[menu2] handler error:", e.message);
    try { await m.reply("❌ Gagal menampilkan menu2: " + e.message); } catch {}
    await m.react("❌");
  }
}

export { pluginConfig as config, handler };
