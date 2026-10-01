// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// selectskill.js — Pilih skill RPG
import { ensureRpg, saveRpg, getRpgData } from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const SKILLS = ["swordmaster", "necromancer", "witch", "archer", "magicswordmaster", "thief", "shadow"];

const pluginConfig = {
  name: "selectskill",
  alias: ["selectskill", "pilihskill"],
  category: "rpg",
  description: "Pilih skill RPG (hanya bisa sekali)",
  usage: ".selectskill <nama_skill>",
  example: ".selectskill necromancer",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(raraRpgBox("selectskill", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const skill = m.args?.[0]?.trim().toLowerCase();
    if (!skill || !SKILLS.includes(skill)) {
      await m.react("🚫");
      let msg = "";
      msg += `Pilih skill yang tersedia:\n`;
      msg += `
`;
      SKILLS.forEach(s => { msg += `› ${s}\n`; });
      msg += `
`;
      msg += `Cara: .selectskill <nama_skill>\n`;
      msg += `Contoh: .selectskill necromancer\n`;
            return m.reply(msg);
    }

    if (rpg.skill && rpg.skill !== "") {
      await m.react("🚫");
      return m.reply(raraRpgBox("selectskill", `Kamu sudah punya skill *${rpg.skill}*. Tidak bisa diganti!`, "error"));
    }

    rpg.skill = skill;
    saveRpg(m, rpg);
    await m.react("🐣");
    let msg = "";
    msg += `✅ Kamu memilih skill: *${skill}*\n`;
    msg += `Skill tidak bisa diganti!\n`;
        return m.reply(msg);
  } catch (err) {
    console.error("selectskill error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("selectskill", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
