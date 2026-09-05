// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import crypto from "node:crypto";

const pluginConfig = {
  name: "password", alias: ["password"], category: "tools",
  alias: ["password"],
  description: "Generate password acak", usage: ".password <panjang>",
  example: ".password 16", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMS = "0123456789";
const SYMS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const len = Math.min(Math.max(parseInt(m.text) || 12, 8), 64);
    const all = LOWER + UPPER + NUMS + SYMS;
    let pw = "";
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) pw += all[bytes[i] % all.length];
    const strength = len >= 16 ? "Sangat Kuat" : len >= 12 ? "Kuat" : "Sedang";
    { const __navText = (claraWrap("Password Generator", [`Password: \`${pw}\``,
      `Panjang: *${len} karakter*`,
      `Kekuatan: *${strength}*`].join("\n")) + "\n" + tipText("Jangan share password ke siapapun!"));       await m.react("🐣");
await m.reply(__navText); };
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };