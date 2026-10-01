// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  raraHeader, separator, raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "css", alias: ["css"], category: "tools",
  alias: ["css"],
  description: "Generate CSS snippet", usage: ".css <template>",
  example: ".css flexbox", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

const TEMPLATES = {
  flexbox: `.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 1rem;\n}`,
  grid: `.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 1rem;\n}`,
  center: `.center {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 100vh;\n}`,
  card: `.card {\n  border-radius: 12px;\n  box-shadow: 0 4px 6px rgba(0,0,0,0.1);\n  padding: 1.5rem;\n  background: white;\n}`,
  button: `.btn {\n  padding: 0.75rem 1.5rem;\n  border: none;\n  border-radius: 8px;\n  background: #007bff;\n  color: white;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.btn:hover {\n  opacity: 0.9;\n}`,
  navbar: `.navbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 2rem;\n  background: #1a1a2e;\n  color: white;\n}`,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const tpl = m.text?.trim()?.toLowerCase();
    if (!tpl) {
      { const __navText = (raraCaption({
  emoji: "🛠️",
  name: "css",
  description: "Generate CSS snippet",
  usage: `${prefix}css <template>`,
  example: `${prefix}css flexbox`,
})); await m.reply( __navText, "css"); };
      return { handled: true };
    }
    if (!TEMPLATES[tpl]) throw new Error(`Template "${tpl}" tidak ada. Pilih: ${Object.keys(TEMPLATES).join(", ")}`);
    await m.react("🐣");
    await m.reply(raraHeader("CSS: " + tpl, "🎯") + "\n\n```css\n" + TEMPLATES[tpl] + "\n```");
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };