// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// RPG Mailbox — Mail system + medal display

import { ensureRpg, saveRpg, getRpgData } from "../../src/lib/rara-rpg-service.js";
import te from "../../src/lib/rara-error.js";
import { animGeneric } from "../../src/lib/rara-rpg-anim.js";
import { boxMessage } from "../../src/lib/styler.js";
import { raraRpgBox } from "../../src/lib/rara-games.js";

const pluginConfig = {
  name: "mailbox",
  alias: ["mailbox", "mail", "kotaksurat"],
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
    if (!rpg) return m.reply(raraRpgBox("mailbox", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "medal") {
      rpg.medals = rpg.medals || [];
      if (rpg.medals.length === 0) return m.reply(raraRpgBox("medal", "Kamu belum punya medali.", "info"));
      // GUARD FORMAT: kotak wajib boxLeft() — kalimat bebas panjang
      const msg = [];
      for (const medalId of rpg.medals) {
        const medal = MEDAL_TYPES[medalId];
        if (medal) msg.push(`🏅 ${medal.name} — ${medal.desc}`);
      }
      return m.reply(boxMessage("◆ MEDALI ◆", msg.join("\n")));
    }

    if (command === "mailbox" || command === "mail") {
      const args = (text || "").trim().split(/\s+/);
      const action = args[0]?.toLowerCase();

      // .mail send <@target> <item>
      if (action === "send") {
        const target = m.quoted?.sender || (args[1]?.startsWith("@") ? args[1].replace("@", "") + "@s.whatsapp.net" : null);
        const item = args.slice(2).join(" ").trim();
        if (!target) return m.reply(raraRpgBox("mailbox", "Reply target atau ketik .mail send @target <item>", "guide"));
        if (!item) return m.reply(raraRpgBox("mailbox", "Masukkan nama item. Contoh: .mail send @target hpPotion", "guide"));

        rpg.inventory = rpg.inventory || {};
        if (!rpg.inventory[item] || rpg.inventory[item] < 1) return m.reply(raraRpgBox("mailbox", "Item *" + item + "* tidak ada di inventory.", "info"));

        const targetRpg = ensureRpg({ sender: target }, "");
        if (!targetRpg) return m.reply(raraRpgBox("mailbox", "Target belum terdaftar RPG.", "error"));

        await m.react("🕒");
        rpg.inventory[item] -= 1;
        if (rpg.inventory[item] <= 0) delete rpg.inventory[item];
        targetRpg.mailbox = targetRpg.mailbox || [];
        targetRpg.mailbox.push({ from: m.pushName || "Player", item, date: Date.now() });
        saveRpg(m, rpg);
        saveRpg({ sender: target }, targetRpg);
        await m.react("🐣");
        return m.reply("💌 Item *" + item + "* dikirim ke target!");
      }

      // .mailbox — lihat kotak surat
      rpg.mailbox = rpg.mailbox || [];
      if (rpg.mailbox.length === 0) return m.reply(raraRpgBox("mailbox", "Kotak suratmu kosong.", "info"));

      await animGeneric(m, sock, '📬', 'Opening mailbox');

      let msg = "";
      for (let i = 0; i < rpg.mailbox.length; i++) {
        const mail = rpg.mailbox[i];
        msg += (i + 1) + ". Dari: " + mail.from + "\n";
        msg += "📦 " + mail.item + "\n";
      }
      msg += "\n📌 .mail claim <nomor> — ambil item\n";
      return m.reply(msg);
    }
  } catch (e) {
    console.error("mailbox error:", e.message);
    await m.react("❌");
    return m.reply(raraRpgBox(m.command || "mailbox", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
