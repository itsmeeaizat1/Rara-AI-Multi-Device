// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import crypto from "node:crypto";

const pluginConfig = {
  name: "hash", alias: ["md5", "sha256", "sha1", "checksum"], category: "tools",
  description: "Hash text md5/sha256/sha1", usage: ".hash <algo> <text>",
  example: ".hash sha256 halo", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").trim().split(/\s+/);
    const algo = args[0]?.toLowerCase() || "sha256";
    const text = args.slice(1).join(" ");
    if (!text) {
      { const __navText = (claraWrap("Hash", [`│ ❏ Penggunaan: *${prefix}hash <algo> <text>*`,
        `│ ❏ Algoritma: md5, sha1, sha256, sha512`].join("\n"))); await m.reply( __navText, "hash"); };
      return { handled: true };
    }
    const valid = ["md5","sha1","sha256","sha512"];
    if (!valid.includes(algo)) throw new Error(`Algoritma tidak didukung. Pilih: ${valid.join(", ")}`);
    const hash = crypto.createHash(algo).update(text, "utf-8").digest("hex");
    await m.reply(claraWrap("Hash", [`│ ❏ Algoritma: *${algo}*`,
      `│ ❏ Input: *${text.substring(0,40)}*`,
      `│ ❏ Hash: \`${hash}\``].join("\n")));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };