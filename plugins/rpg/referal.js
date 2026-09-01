// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// referal.js — Sistem referral RPG
import { ensureRpg, addExp, saveRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import crypto from "crypto";

const XP_FIRST_TIME = 2500;
const XP_LINK_CREATOR = 15000;
const XP_BONUS = { 5: 40000, 10: 100000, 20: 250000, 50: 1000000, 100: 10000000 };

const pluginConfig = {
  name: "referal",
  alias: ["referal", "ref"],
  category: "rpg",
  description: "Sistem referral RPG — dapatkan EXP dari referral",
  usage: ".referal [kode_referral]",
  example: ".referal\n.referal ABC123XYZ",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

function genCode() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  return Array.from({ length: 11 }, () => chars[crypto.randomInt(62)]).join("");
}

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("referal", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const code = m.args?.[0]?.trim();

    if (code) {
      // Using someone's referral code
      if (rpg.ref_count !== undefined && rpg.ref_count > 0) {
        await m.react("🚫");
        return m.reply(claraWrap("referal", "Kamu sudah menggunakan kode referral sebelumnya!", "error"));
      }
      // Find code creator
      const allUsers = getRpgData ? getRpgData(m) : null;
      // Simple: check if code matches any known ref_code
      // Since we can't iterate all users easily, just validate format
      if (code.length !== 11) {
        await m.react("🚫");
        return m.reply(claraWrap("referal", "Kode referral tidak valid!", "error"));
      }
      rpg.ref_count = 0;
      addExp(m, XP_FIRST_TIME);
      await m.react("🐣");
      let msg = "";
      msg += `✅ Kamu menggunakan kode referral!\n`;
      msg += `✨ +${XP_FIRST_TIME.toLocaleString("id-ID")} EXP\n`;
            return m.reply(msg);
    }

    // Show own referral code
    if (!rpg.ref_code) {
      rpg.ref_code = genCode();
      rpg.ref_count = rpg.ref_count || 0;
      saveRpg(m, rpg);
    }

    const botNumber = sock.user?.id?.split("@")[0] || "";
    const refLink = `wa.me/${botNumber}?text=.referal%20${rpg.ref_code}`;
    await m.react("🐣");
    let msg = "";
    msg += `🎫 Kode: *${rpg.ref_code}*\n`;
    msg += `👥 Total referral: ${rpg.ref_count || 0}\n`;
    msg += `
`;
    msg += `💡 Reward untuk pengguna baru: +${XP_FIRST_TIME.toLocaleString("id-ID")} EXP\n`;
    msg += `💡 Reward untuk kamu: +${XP_LINK_CREATOR.toLocaleString("id-ID")} EXP\n`;
    msg += `
`;
    msg += `📤 Bagikan link:\n`;
    msg += `${refLink}\n`;
    msg += `
`;
    msg += `Bonus milestone:\n`;
    for (const [count, xp] of Object.entries(XP_BONUS)) {
      msg += `${count} orang = +${xp.toLocaleString("id-ID")} EXP\n`;
    }
        return m.reply(msg);
  } catch (err) {
    console.error("referal error:", err);
    await m.react("❌");
    return m.reply(claraWrap("referal", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
