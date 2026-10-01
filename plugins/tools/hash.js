// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {  raraWrap, raraCaption } from "../../src/lib/rara-menu-style.js";
import crypto from "node:crypto";

const pluginConfig = {
  name: "hash", alias: ["hash"], category: "tools",
  alias: ["hash"],
  description: "Hash text md5/sha256/sha1", usage: ".hash <algo> <text>",
  example: ".hash sha256 halo", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const args = (m.text || "").trim().split(/\s+/);
    const algo = args[0]?.toLowerCase() || "sha256";
    const text = args.slice(1).join(" ");
    if (!text) {
      { const __navText = (raraCaption({
  emoji: "🛠️",
  name: "hash",
  description: "Hash text md5/sha256/sha1",
  usage: `${prefix}hash <algo> <text>`,
  example: `${prefix}hash sha256 halo`,
})); await m.reply( __navText, "hash"); };
      return { handled: true };
    }
    const valid = ["md5","sha1","sha256","sha512"];
    if (!valid.includes(algo)) throw new Error(`Algoritma tidak didukung. Pilih: ${valid.join(", ")}`);
    const hash = crypto.createHash(algo).update(text, "utf-8").digest("hex");
    await m.react("🐣");
    await m.reply(raraWrap("Hash", [`Algoritma: *${algo}*`,
      `Input: *${text.substring(0,40)}*`,
      `Hash: \`${hash}\``].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };