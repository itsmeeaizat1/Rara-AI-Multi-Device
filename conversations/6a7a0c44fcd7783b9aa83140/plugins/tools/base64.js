import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "base64", alias: ["b64", "encode", "decode"], category: "tools",
  description: "Encode/decode Base64", usage: ".base64 <enc/dec> <text>",
  example: ".base64 enc halo dunia", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();
    const text = args.slice(1).join(" ");
    if (!action || !text) {
      { const __navText = (claraWrap("Base64", [`◦ Encode: *${prefix}base64 enc <text>*`,
        `◦ Decode: *${prefix}base64 dec <base64>*`].join("\n"))); await sendReplyWithNav(sock, m, __navText, "base64"); };
      return { handled: true };
    }
    let result;
    if (action === "enc" || action === "encode") {
      result = Buffer.from(text, "utf-8").toString("base64");
    } else if (action === "dec" || action === "decode") {
      result = Buffer.from(text, "base64").toString("utf-8");
    } else { throw new Error("Pilih enc atau dec"); }
    await m.reply(claraWrap("Base64", [`◦ Input: *${text.substring(0,50)}*`,
      `◦ Output: \`${result}\``].join("\n")));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };