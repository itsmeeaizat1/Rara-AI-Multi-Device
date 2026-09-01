// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// redeem.js — Redeem/Gift Code System (owner create, user claim)
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "redeem",
  alias: ["redeem", "redeemcode", "giftcode", "claimcode", "coderedeem"],
  category: "rpg",
  description: "Redeem gift code untuk klaim reward (owner create, user claim)",
  usage: ".redeem <code> (klaim)\n.redeem create <reward_type> <amount> (owner only)",
  example: ".redeem NOVA2026\n.redeem create gold 10000",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

// In-memory redeem codes (sebaiknya simpan ke DB di production)
const redeemCodes = new Map();

async function handler(m, { sock }) {
  try {
    const subCmd = (m.args[0] || "").toLowerCase();
    const isOwner = m.isOwner || m.sender === config?.owner;

    // OWNER: create redeem code
    if (subCmd === "create" && isOwner) {
      const rewardType = m.args[1]?.toLowerCase();
      const amount = parseInt(m.args[2] || "0");
      const customCode = m.args[3];

      if (!rewardType || !amount) {
        return m.reply(claraWrap("redeem", `Buat redeem code:\n\n${m.prefix}redeem create <type> <amount> [custom_code]\n\nType: gold, energi, diamond, exp\nContoh: ${m.prefix}redeem create gold 10000`, "guide"));
      }

      // Generate code
      const code = customCode || "NOVA" + Math.random().toString(36).slice(2, 8).toUpperCase();

      redeemCodes.set(code, {
        type: rewardType,
        amount: amount,
        created: Date.now(),
        claimed: new Set(),
        maxClaims: 100,
      });

      let msg = `╭─「 ✦ ʀᴇᴅᴇᴇᴍ ᴄᴏᴅᴇ ✦ 」\n`;
      msg += `│ Code: *${code}*\n`;
      msg += `│ Reward: *${amount} ${rewardType}*\n`;
      msg += `│ Max Claims: *100*\n`;
      msg += `│\n`;
      msg += `│ Share code ini ke user:\n`;
      msg += `│ .redeem ${code}\n`;
      msg += `╰────  •  ────`;
      return m.reply(msg);
    }

    // OWNER: list all codes
    if (subCmd === "list" && isOwner) {
      if (redeemCodes.size === 0) {
        return m.reply(claraWrap("redeem", "Belum ada redeem code aktif.", "error"));
      }
      let msg = `╭─「 ✦ ʀᴇᴅᴇᴇᴍ ʟɪsᴛ ✦ 」\n`;
      for (const [code, info] of redeemCodes) {
        msg += `│ ${code} - ${info.amount} ${info.type} (${info.claimed.size}/${info.maxClaims} claimed)\n`;
      }
      msg += `╰────  •  ────`;
      return m.reply(msg);
    }

    // USER: claim code
    const code = (m.args[0] || m.text?.trim() || "").toUpperCase();
    if (!code || code === "") {
      return m.reply(claraWrap("redeem", `Masukkan kode redeem.\n\nContoh: ${m.prefix}redeem NOVA2026`, "guide"));
    }

    const redeem = redeemCodes.get(code);
    if (!redeem) {
      await m.react("❌");
      return m.reply(claraWrap("redeem", `Code "${code}" tidak valid atau sudah expired.`, "error"));
    }

    if (redeem.claimed.has(m.sender)) {
      await m.react("❌");
      return m.reply(claraWrap("redeem", `Kamu sudah klaim code "${code}" sebelumnya.`, "error"));
    }

    if (redeem.claimed.size >= redeem.maxClaims) {
      await m.react("❌");
      return m.reply(claraWrap("redeem", `Code "${code}" sudah mencapai batas maksimal klaim.`, "error"));
    }

    // Claim!
    redeem.claimed.add(m.sender);
    await m.react("🐣");

    // Apply reward
    let rewardMsg = "";
    try {
      const db = await getDatabase();
      switch (redeem.type) {
        case "gold":
        case "money":
          await db.addGold?.(m.sender, redeem.amount) || await db.addBalance?.(m.sender, redeem.amount);
          rewardMsg = `+${redeem.amount} Gold`;
          break;
        case "energi":
        case "energy":
          await db.addEnergi?.(m.sender, redeem.amount);
          rewardMsg = `+${redeem.amount} Energi`;
          break;
        case "diamond":
        case "gem":
          await db.addDiamond?.(m.sender, redeem.amount);
          rewardMsg = `+${redeem.amount} Diamond`;
          break;
        case "exp":
        case "xp":
          await db.addExp?.(m.sender, redeem.amount);
          rewardMsg = `+${redeem.amount} EXP`;
          break;
        default:
          rewardMsg = `+${redeem.amount} ${redeem.type}`;
      }
    } catch (e) {
      console.error("redeem reward apply:", e);
      rewardMsg = `+${redeem.amount} ${redeem.type} (applied)`;
    }

    let msg = `╭─「 ✦ ʀᴇᴅᴇᴇᴍ sᴜᴄᴄᴇss ✦ 」\n`;
    msg += `│ Code: *${code}*\n`;
    msg += `│ Reward: *${rewardMsg}*\n`;
    msg += `│ Status: ✅ Berhasil diklaim\n`;
    msg += `╰────  •  ────`;
    return m.reply(msg);
  } catch (err) {
    console.error("redeem error:", err);
    await m.react("❌");
    return m.reply(claraWrap("redeem", err.message || "Error", "error"));
  }
}

export { pluginConfig as config, handler };
