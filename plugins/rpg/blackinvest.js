// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// blackinvest.js — Investasi black market (high risk)
import { ensureRpg, addGold, removeGold, checkCooldown, setCooldown, formatTime } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "blackinvest",
  alias: ["blackinvest", "blackmarket"],
  category: "rpg",
  description: "Investasi di black market (high risk, 2-4x return)",
  usage: ".blackinvest <jumlah>",
  example: ".blackinvest 20000000",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 10, isEnabled: true,
};

const BLACK_CD = 12 * 60 * 60 * 1000;
const MIN_INVEST = 20000000;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("blackinvest", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const amount = parseInt(m.args?.[0]);
    if (!amount || amount < MIN_INVEST) {
      await m.react("🚫");
      return m.reply(claraWrap("blackinvest", `Minimal investasi ${MIN_INVEST.toLocaleString("id-ID")} gold!`, "guide"));
    }

    if ((rpg.gold || 0) < amount) {
      await m.react("🚫");
      return m.reply(claraWrap("blackinvest", "Gold tidak cukup!", "error"));
    }

    const cd = checkCooldown(m, "lastBlackinvest");
    if (cd) {
      await m.react("🚫");
      return m.reply(claraWrap("blackinvest", `Black market cooldown! Tunggu *${formatTime(cd)}* lagi.`, "error"));
    }

    removeGold(m, amount, sock);
    setCooldown(m, "lastBlackinvest", BLACK_CD);

    const roll = Math.random();
    if (roll < 0.5) {
      // Lose all
      await m.react("💸");
      let msg = `╭─「 *BLACK MARKET GAGAL* 」\n`;
      msg += `│ 🚨 Uang disita semua!\n`;
      msg += `│ 💸 Rugi: ${amount.toLocaleString("id-ID")} gold\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    } else if (roll < 0.7) {
      // Jailed
      setCooldown(m, "lastBansosJail", 10 * 60 * 1000);
      await m.react("🚓");
      let msg = `╭─「 *RAZIA POLISI* 」\n`;
      msg += `│ 🚓 Kau dipenjara 10 menit!\n`;
      msg += `│ 💸 Modal hangus: ${amount.toLocaleString("id-ID")}\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    } else {
      // Win 2x-4x
      const hasil = Math.floor(amount * (2 + Math.random() * 2));
      addGold(m, hasil);
      await m.react("🐣");
      let msg = `╭─「 *BLACK MARKET SUKSES* 」\n`;
      msg += `│ 🔥 Investasi berhasil!\n`;
      msg += `│ 💸 Modal: ${amount.toLocaleString("id-ID")}\n`;
      msg += `│ 💰 Hasil: ${hasil.toLocaleString("id-ID")}\n`;
      msg += `│ 📈 Profit: ${(hasil - amount).toLocaleString("id-ID")}\n`;
      msg += `╰──────────`;
      return m.reply(msg);
    }
  } catch (err) {
    console.error("blackinvest error:", err);
    await m.react("❌");
    return m.reply(claraWrap("blackinvest", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
