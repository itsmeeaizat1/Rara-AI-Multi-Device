// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "base64", alias: ["base64"], category: "tools",
  alias: ["base64"],
  description: "Encode/decode Base64", usage: ".base64 <enc/dec> <text>",
  example: ".base64 enc halo dunia", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ");
    if (!action || !text) {
      { const __navText = (raraWrap("Base64", [`Encode: *${prefix}base64 enc <text>*`,
        `Decode: *${prefix}base64 dec <base64>*`].join("\n"))); await m.reply( __navText, "base64"); };
      return { handled: true };
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = Buffer.from(text, "utf-8").toString("base64");
    } else if (action === "dec" || action === "decode") {
      result = Buffer.from(text, "base64").toString("utf-8");
    } else { throw new Error("Pilih enc atau dec"); }
    await m.react("🐣");
    await m.reply(raraWrap("Base64", [`Input: *${text.substring(0,50)}*`,
      `Output: \`${result}\``].join("\n")));
  } catch (e) {
    await m.react("❌");
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };