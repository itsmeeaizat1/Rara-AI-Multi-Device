// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import crypto from "node:crypto";

const pluginConfig = {
  name: "uuid", alias: ["guid", "uniqueid"], category: "tools",
  description: "Generate UUID v4", usage: ".uuid",
  example: ".uuid", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 2, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const u1 = crypto.randomUUID();
    const u2 = crypto.randomUUID();
    const u3 = crypto.randomUUID();
    { const __navText = (claraWrap("UUID Generator", [`│ ❏ 1: \`${u1}\``,
      `│ ❏ 2: \`${u2}\``,
      `│ ❏ 3: \`${u3}\``].join("\n")) + "\n" + tipText(`Ketik ${prefix}uuid untuk generate lagi`)); await m.reply(__navText); };
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };