// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Transfer — Transfer gold to another player

import {
  ensureRpg, removeGold, addGold
} from "../../src/lib/rara-rpg-service.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import te from "../../src/lib/rara-error.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "transfergold",
  alias: ["transfergold", "tfgold", "tfgoldrpg"],
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
    if (!rpg) return m.reply(raraRpgBox("tfgold", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // Parse args: amount + @tag
    const text = m.text?.trim() || "";
    const amountMatch = text.match(/(\d+)/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

    let targetJid = m.mentionedJid?.[0];
    if (!targetJid && m.quoted) targetJid = m.quoted.sender;

    if (!amount || amount < MIN_TRANSFER) {
  await animGeneric(m, sock, "💰", "Transferring Gold");
      return m.reply(raraRpgBox("tfgold", `Jumlah tidak valid. Contoh: .tfgold 100 @user`, "warn"));
    }

    if (!targetJid) {
      return m.reply(raraRpgBox("tfgold", "Tag penerima! Contoh: .tfgold 100 @user", "warn"));
    }

    if (targetJid === m.sender) {
      return m.reply(raraRpgBox("tfgold", "Nggak bisa transfer ke diri sendiri 😅", "warn"));
    }

    if (rpg.gold < amount) {
      await m.react("🚫");
      return m.reply(raraRpgBox("tfgold", `Gold tidak cukup! Kamu punya *${rpg.gold}*, mau transfer *${amount}*.`, "warn"));
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
      return m.reply(raraRpgBox("tfgold", "Penerima belum terdaftar di RPG.", "error"));
    }
    addGold({ sender: targetJid }, received);

    await m.react("🐣");
    let msg = "";
    msg += `✅ Transfer berhasil!\n`;
    msg += `
`;
    msg += `👤 Dari: *${m.pushName}*\n`;
    msg += `👤 Ke: *${targetJid.split("@")[0]}*\n`;
    msg += `💵 Jumlah: *${amount} gold*\n`;
    msg += `📉 Tax (5%): *${tax} gold*\n`;
    msg += `💰 Diterima: *${received} gold*\n`;
    msg += `
`;
    msg += `💼 Gold kamu: *${rpg.gold - amount}*\n`;
    
    return m.reply(msg);
  } catch (err) {
    console.error("tfgold error:", err);
    await m.react("❌");
    return m.reply(raraRpgBox("tfgold", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
