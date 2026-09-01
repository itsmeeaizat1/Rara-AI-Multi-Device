// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Rebirth — Prestige system, reset level for permanent stat bonus

import {
  ensureRpg, rebirth, getItemCount
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "rebirthrpg",
  alias: ["rebirthrpg", "rebirth", "reinkarnasi"],
  category: "rpg",
  description: "Reinkarnasi — reset level untuk permanent stat bonus (Lv.100+)",
  usage: ".rebirthrpg",
  example: ".rebirthrpg",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("rebirthrpg", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Cek apakah sudah memenuhi syarat
    const hasStone = getItemCount(m, "rebirthStone") > 0;
    const canRebirth = rpg.level >= 100 && hasStone;

    if (!canRebirth) {
      let msg = `╭─「 *ʀᴇɪɴᴋᴀʀɴᴀsɪ* 」\n`;
      msg += `│ 🔄 Reinkarnasi = reset level untuk permanent bonus\n`;
      msg += `│\n`;
      msg += `│ 📋 *sʏᴀʀᴀᴛ*\n`;
      msg += `│ ${rpg.level >= 100 ? "✅" : "❌"} Level 100+ (sekarang: *${rpg.level}*)\n`;
      msg += `│ ${hasStone ? "✅" : "❌"} Batu Reinkarnasi (1x)\n`;
      msg += `│\n`;

      if (!hasStone) {
        msg += `│ 💡 Batu Reinkarnasi didapat dari:\n`;
        msg += `│   - Boss Raid (10% chance)\n`;
        msg += `│   - Event khusus\n`;
      }

      msg += `│\n`;
      msg += `│ 📊 *ʀᴇɪɴᴋᴀʀɴᴀsɪ sᴇʙᴇʟᴜᴍɴʏᴀ*\n`;
      msg += `│ Count: *${rpg.rebirthCount || 0}*\n`;
      msg += `│ Permanent Bonus: *+${rpg.permBonus || 0}%* ATK/DEF/HP/MP\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // Konfirmasi
    const args = m.text?.trim().split(/\s+/) || [];
    const confirm = args[0]?.toLowerCase();

    if (confirm !== "confirm" && confirm !== "ya") {
      let msg = `╭─「 *ʀᴇɪɴᴋᴀʀɴᴀsɪ* 」\n`;
      msg += `│ ⚠️ *ᴘᴇʀɪɴɢᴀᴛᴀɴ*\n`;
      msg += `│\n`;
      msg += `│ Kamu akan kehilalian:\n`;
      msg += `│ ❌ Level: ${rpg.level} → 1\n`;
      msg += `│ ❌ EXP: ${rpg.exp} → 0\n`;
      msg += `│ ❌ Gold: ${rpg.gold} → 0\n`;
      msg += `│ ❌ Inventory: semua item\n`;
      msg += `│ ❌ Job: reset ke Pemula\n`;
      msg += `│\n`;
      msg += `│ Kamu akan dapat:\n`;
      msg += `│ ✅ +5% permanent stat bonus (ATK/DEF/HP/MP)\n`;
      msg += `│ ✅ Rebirth count: ${(rpg.rebirthCount || 0) + 1}\n`;
      msg += `│ ✅ Total permanent bonus: +${(rpg.permBonus || 0) + 5}%\n`;
      msg += `│ ✅ Gems & Tokens tetap aman\n`;
      msg += `│ ✅ Achievements tetap\n`;
      msg += `│\n`;
      msg += `│ 📌 Ketik *.rebirthrpg confirm* untuk konfirmasi\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    }

    // Execute rebirth
    const result = rebirth(m, sock);

    if (result.success) {
      await m.react("🐣");
      let msg = `╭─「 *ʀᴇɪɴᴋᴀʀɴᴀsɪ* 」\n`;
      msg += `│ 🎉 Reinkarnasi berhasil!\n`;
      msg += `│\n`;
      msg += `│ 📊 Rebirth Count: *${result.rebirthCount}*\n`;
      msg += `│ ✨ Permanent Bonus: *+${result.bonusPercent}%* (ATK/DEF/HP/MP)\n`;
      msg += `│\n`;
      msg += `│ 💡 Level & stats direset, tapi permanent bonus aktif\n`;
      msg += `│ Mulai petualangan baru yang lebih kuat!\n`;
      msg += `╰──────────`;

      return m.reply(msg);
    } else {
      return m.reply(claraWrap("rebirthrpg", result.reason || "Gagal reinkarnasi.", "warn"));
    }
  } catch (err) {
    console.error("rebirthrpg error:", err);
    await m.react("❌");
    return m.reply(claraWrap("rebirthrpg", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
