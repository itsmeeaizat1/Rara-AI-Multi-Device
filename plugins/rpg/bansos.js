// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bansos.js — Korupsi dana bansos (high risk high reward)
import { ensureRpg, addGold, removeGold, checkCooldown, setCooldown, formatTime } from "../../src/lib/nova-rpg-service.js";
import { reactCooldown } from "../../src/lib/nova-menu-style.js";
import { animBansos } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "bansos",
  alias: ["bansos", "korupsi"],
  category: "rpg",
  description: "Korupsi dana bansos (high risk, high reward)",
  usage: ".bansos",
  example: ".bansos",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 5, isEnabled: true,
};

const BANSOS_CD = 5 * 60 * 1000;
const JAIL_TIME = 4 * 60 * 60 * 1000;

async function handler(m, { sock }) {
  try {
    await m.react("🕒");
    await animBansos(m, sock);
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("bansos", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Check if still in jail
    const jailCd = checkCooldown(m, "lastBansosJail");
    if (jailCd) {
      await reactCooldown(m);
      return m.reply(novaRpgBox("bansos", `*ANDA MASIH DI TAHAN!* 👮\nTunggu *${formatTime(jailCd)}* lagi untuk bebas.`, "error"));
    }

    // Check normal cooldown
    const cd = checkCooldown(m, "lastBansos");
    if (cd) {
      await m.react("🚫");
      return m.reply(novaRpgBox("bansos", `Tunggu *${formatTime(cd)}* lagi untuk korupsi bansos lagi.`, "error"));
    }

    if ((rpg.gold || 0) < 1000) {
      await m.react("🚫");
      return m.reply(novaRpgBox("bansos", "Gold minimal 1.000 untuk korupsi bansos!", "error"));
    }

    const randomaku = Math.floor(Math.random() * 101);
    const randomkamu = Math.floor(Math.random() * 101);

    if (randomaku > randomkamu) {
      // Caught
      removeGold(m, 3500000, sock);
      setCooldown(m, "lastBansosJail", JAIL_TIME);
      setCooldown(m, "lastBansos", BANSOS_CD);
      await m.react("😭");
      let msg = "";
      msg += `🕴️❌ Kamu tertangkap!\n`;
      msg += `💸 Denda: Rp 3.500.000\n`;
      msg += `⛔ Penjara: 4 jam\n`;
            return m.reply(msg);
    } else if (randomaku < randomkamu) {
      // Success
      addGold(m, 3000000);
      setCooldown(m, "lastBansos", BANSOS_CD);
      await m.react("🐣");
      let msg = "";
      msg += `🕴️💰 Berhasil korupsi!\n`;
      msg += `💰 +Rp 3.000.000\n`;
      msg += `Cepat cuci uangnya!\n`;
            return m.reply(msg);
    } else {
      // Escape
      setCooldown(m, "lastBansos", BANSOS_CD);
      await m.react("🏃");
      let msg = "";
      msg += `🏃‍♂️ Gagal korupsi tapi berhasil kabur!\n`;
      msg += `Tidak ada hasil, tapi kamu selamat.\n`;
            return m.reply(msg);
    }
  } catch (err) {
    console.error("bansos error:", err);
    await m.react("❌");
    return m.reply(novaRpgBox("bansos", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
