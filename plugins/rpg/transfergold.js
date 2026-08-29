// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Transfer — Transfer gold to another player

import {
  ensureRpg, removeGold, addGold
} from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "transfergold",
  alias: ["transfergold", "tfgold", "tfkoinrpg"],
  category: "rpg",
  description: "Transfer gold RPG ke player lain",
  usage: ".tfgold <jumlah> @tag",
  example: ".tfgold 100 @user",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const MIN_TRANSFER = 1;
const TAX_RATE = 0.05; // 5% tax

async function handler(m, { sock }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("tfgold", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Parse args: amount + @tag
    const text = m.text?.trim() || "";
    const amountMatch = text.match(/(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

    let targetJid = m.mentionedJid?.[0];
    if (!targetJid && m.quoted) targetJid = m.quoted.sender;

    if (!amount || amount < MIN_TRANSFER) {
      return m.reply(claraWrap("tfgold", `Jumlah tidak valid. Contoh: .tfgold 100 @user`, "warn"));
    }

    if (!targetJid) {
      return m.reply(claraWrap("tfgold", "Tag penerima! Contoh: .tfgold 100 @user", "warn"));
    }

    if (targetJid === m.sender) {
      return m.reply(claraWrap("tfgold", "Nggak bisa transfer ke diri sendiri 😅", "warn"));
    }

    if (rpg.gold < amount) {
      await m.react("🚫");
      return m.reply(claraWrap("tfgold", `Gold tidak cukup! Kamu punya *${rpg.gold}*, mau transfer *${amount}*.`, "warn"));
    }

    // Tax
    const tax = Math.floor(amount * TAX_RATE);
    const received = amount - tax;

    // Transfer
    removeGold(m, amount, sock);

    // Add to target
    const targetRpg = ensureRpg({ sender: targetJid }, targetJid.split("@")[0]);
    if (!targetRpg) {
      addGold(m, amount); // refund
      return m.reply(claraWrap("tfgold", "Penerima belum terdaftar di RPG.", "error"));
    }
    addGold({ sender: targetJid }, received);

    await m.react("🐣");
    let msg = `╭──「 *ᴛʀᴀɴsғᴇʀ ɢᴏʟᴅ* 」\n`;
    msg += `│ ✅ Transfer berhasil!\n`;
    msg += `│\n`;
    msg += `│ 👤 Dari: *${m.pushName}*\n`;
    msg += `│ 👤 Ke: *${targetJid.split("@")[0]}*\n`;
    msg += `│ 💵 Jumlah: *${amount} gold*\n`;
    msg += `│ 📉 Tax (5%): *${tax} gold*\n`;
    msg += `│ 💰 Diterima: *${received} gold*\n`;
    msg += `│\n`;
    msg += `│ 💼 Gold kamu: *${rpg.gold - amount}*\n`;
    msg += `╰──────────`;

    return m.reply(msg);
  } catch (err) {
    console.error("tfgold error:", err);
    await m.react("❌");
    return m.reply(claraWrap("tfgold", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
