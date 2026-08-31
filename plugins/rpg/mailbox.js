// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mailbox — Mail system + medal display

import { ensureRpg, saveRpg, getRpgData } from "../../src/lib/nova-rpg-service.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mailbox",
  alias: ["mailbox"],
  aliases: ["mailbox", "mail", "medal", "kotaksurat"],
  category: "rpg",
  description: "Kotak surat RPG dan tampilan medali",
  usage: ".mailbox | .medal | .mail send <@target> <item>",
  example: ".mailbox",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

const MEDAL_TYPES = {
  firstBlood: { name: "First Blood", desc: "Menang duel pertama" },
  bossSlayer: { name: "Boss Slayer", desc: "Kalahkan 10 boss" },
  dungeonMaster: { name: "Dungeon Master", desc: "Clear 50 dungeon" },
  pvpChampion: { name: "PvP Champion", desc: "Menang 100 PvP" },
  richPlayer: { name: "Rich Player", desc: "Punya 10000 gold" },
  veteran: { name: "Veteran", desc: "Main 30+ hari" },
};

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("mailbox", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "medal") {
      rpg.medals = rpg.medals || [];
      if (rpg.medals.length === 0) return m.reply(claraWrap("medal", "Kamu belum punya medali.", "info"));
      let msg = "╭──「 *ᴍᴇᴅᴀʟɪ* 」\n";
      for (const medalId of rpg.medals) {
        const medal = MEDAL_TYPES[medalId];
        if (medal) msg += "│ 🏅 " + medal.name + " — " + medal.desc + "\n";
      }
      msg += "╰──────────";
      return m.reply(msg);
    }

    if (command === "mailbox" || command === "mail") {
      const args = (text || "").trim().split(/\s+/);
      const action = args[0]?.toLowerCase();

      // .mail send <@target> <item>
      if (action === "send") {
        const target = m.quoted?.sender || (args[1]?.startsWith("@") ? args[1].replace("@", "") + "@s.whatsapp.net" : null);
        const item = args.slice(2).join(" ").trim();
        if (!target) return m.reply(claraWrap("mailbox", "Reply target atau ketik .mail send @target <item>", "guide"));
        if (!item) return m.reply(claraWrap("mailbox", "Masukkan nama item. Contoh: .mail send @target hpPotion", "guide"));

        rpg.inventory = rpg.inventory || {};
        if (!rpg.inventory[item] || rpg.inventory[item] < 1) return m.reply(claraWrap("mailbox", "Item *" + item + "* tidak ada di inventory.", "info"));

        const targetRpg = ensureRpg({ sender: target }, "");
        if (!targetRpg) return m.reply(claraWrap("mailbox", "Target belum terdaftar RPG.", "error"));

        await m.react("🕒");
        rpg.inventory[item] -= 1;
        if (rpg.inventory[item] <= 0) delete rpg.inventory[item];
        targetRpg.mailbox = targetRpg.mailbox || [];
        targetRpg.mailbox.push({ from: m.pushName || "Player", item, date: Date.now() });
        saveRpg(m, rpg);
        saveRpg({ sender: target }, targetRpg);
        await m.react("🐣");
        return m.reply("╭──「 *ᴍᴀɪʟ sᴇɴᴅ* 」\n│ 💌 Item *" + item + "* dikirim ke target!\n╰──────────");
      }

      // .mailbox — lihat kotak surat
      rpg.mailbox = rpg.mailbox || [];
      if (rpg.mailbox.length === 0) return m.reply(claraWrap("mailbox", "Kotak suratmu kosong.", "info"));

      let msg = "╭──「 *ᴍᴀɪʟʙᴏx* 」\n";
      for (let i = 0; i < rpg.mailbox.length; i++) {
        const mail = rpg.mailbox[i];
        msg += "│ " + (i + 1) + ". Dari: " + mail.from + "\n";
        msg += "│    📦 " + mail.item + "\n";
      }
      msg += "│\n│ 📌 .mail claim <nomor> — ambil item\n╰──────────";
      return m.reply(msg);
    }
  } catch (e) {
    console.error("mailbox error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "mailbox", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
