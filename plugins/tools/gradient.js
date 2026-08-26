// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gradient", alias: ["colorgradient", "cssgradient"], category: "tools",
  alias: ["gradient"],
  description: "Generate gradient CSS", usage: ".gradient <warna1> <warna2>",
  example: ".gradient #ff0000 #0000ff", isOwner: false, isPremium: false,
  isGroup: false, isPrivate: false, cooldown: 3, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input || !input.includes("#")) {
      const colors = ["#"+Math.random().toString(16).slice(2,8), "#"+Math.random().toString(16).slice(2,8)];
      const css = `background: linear-gradient(135deg, ${colors[0]}, ${colors[1]});`;
      await m.reply( claraWrap("Gradient CSS", [`│ ❏ Warna 1: *${colors[0]}*`, `│ ❏ Warna 2: *${colors[1]}*`,
        `│ ❏ CSS: \`${css}\``].join("\n")) + "\n" + tipText(`Atau ketik ${prefix}gradient #ff0000 #0000ff`), "gradient");
      return { handled: true };
    }
    const parts = input.split(/\s+/);
    const c1 = parts[0]; const c2 = parts[1] || parts[0];
    const css = `background: linear-gradient(135deg, ${c1}, ${c2});`;
    await m.reply(claraWrap("Gradient CSS", [`│ ❏ Warna 1: *${c1}*`, `│ ❏ Warna 2: *${c2}*`,
      `│ ❏ CSS: \`${css}\``].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };