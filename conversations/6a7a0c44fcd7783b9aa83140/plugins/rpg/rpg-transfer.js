import { alyaHeader, separator, tipText , claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { getUser, addUserMoney } from "../../src/lib/nova-rpg.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "rpgtransfer", alias: ["transferrpg", "kirimrpg", "rpgkirim", "payrpg"], category: "rpg",
  description: "Transfer money ke player lain", usage: ".rpgtransfer <@user> <jumlah>",
  example: ".rpgtransfer @user 5000", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: false, cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const mentioned = m.msg?.contextInfo?.mentionedJid || [];
    const args = (m.text || "").trim().split(/\s+/);
    const amount = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
    
    if (!mentioned.length || !amount) {
      await sendReplyWithNav(sock, m, claraWrap("Transfer", [`◦ Penggunaan: *${prefix}rpgtransfer @user <jumlah>*`,
        `◦ Contoh: *${prefix}rpgtransfer @628xxx 5000*`,
        `◦ Minimal: *Rp1000*`].join("\n")), "rpgtransfer");
      return { handled: true };
    }
    
    if (amount < 1000) {
      m.reply(claraWrap("Rpgtransfer", "Minimal transfer Rp1000"));
      return { handled: true };
    }
    
    const target = mentioned[0];
    if (target === m.sender) {
      m.reply(claraWrap("Rpgtransfer", "Tidak bisa transfer ke diri sendiri!"));
      return { handled: true };
    }
    
    const db = getDatabase();
    const user = getUser(db, m.sender);
    if (user.money < amount) {
      await sendReplyWithNav(sock, m, claraWrap("Transfer", [`◦ Butuh: *Rp${amount.toLocaleString("id-ID")}*`,
        `◦ Punya: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgtransfer");
      return { handled: true };
    }
    
    user.money -= amount;
    addUserMoney(db, target, amount);
    
    await sendReplyWithNav(sock, m, claraWrap("Transfer", [`◦ Dari: *@${m.sender.split("@")[0]}*`,
      `◦ Ke: *@${target.split("@")[0]}*`,
      `◦ Jumlah: *Rp${amount.toLocaleString("id-ID")}*`,
      `◦ Sisa: *Rp${user.money.toLocaleString("id-ID")}*`].join("\n")), "rpgtransfer");
  } catch (e) { await m.reply("Error: " + e.message); }
  return { handled: true };
}
export { pluginConfig as config, handler };