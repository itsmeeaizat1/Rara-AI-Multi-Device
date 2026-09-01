// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Kingdom — Create kingdom, build base, defend

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "kingdom",
  alias: ["kingdom"],
  aliases: ["kingdom", "build", "defend"],
  category: "rpg",
  description: "Dirikan kerajaan, bangun markas, dan pertahankan",
  usage: ".kingdom <nama> | .build | .defend",
  example: ".kingdom Kerajaan Nova",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 2, isEnabled: true,
};

const BASE_TYPES = {
  "markas kayu":    { cost: 500, def: 20, desc: "Markas sederhana" },
  "markas batu":    { cost: 2000, def: 50, desc: "Markas kokoh" },
  "benteng":        { cost: 5000, def: 100, desc: "Benteng pertahanan" },
  "kastil":         { cost: 15000, def: 250, desc: "Kastil megah" },
};

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("kingdom", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // .kingdom <nama> — dirikan kerajaan
    if (command === "kingdom") {
      if (rpg.kingdom) return m.reply(claraWrap("kingdom", "Kerajaanmu: *" + rpg.kingdom + "*", "info"));
      const name = (text || "").trim();
      if (!name) return m.reply(claraWrap("kingdom", "Ketik: .kingdom <nama_kerajaan>", "guide"));
      if (name.length > 30) return m.reply(claraWrap("kingdom", "Nama kerajaan maksimal 30 karakter.", "info"));

      await m.react("🕒");
      rpg.kingdom = name;
      rpg.kingdomLevel = 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 ᴋɪɴɢᴅᴏᴍ 」\n│ 🏯 Kamu mendirikan kerajaan *" + name + "*!\n│ 📌 Ketik .build untuk bangun markas\n╰──────────");
    }

    // .build — bangun/upgrade markas
    if (command === "build") {
      const currentBase = rpg.base || null;
      if (currentBase) {
        return m.reply("╭─「 ʙᴜɪʟᴅ 」\n│ 🏠 Markasmu: *" + currentBase + "*\n│ 🛡️ DEF Bonus: " + (rpg.baseDef || 0) + "\n│ 📌 Ketik .build <tipe> untuk upgrade\n╰──────────");
      }
      const baseType = (text || "").trim().toLowerCase();
      if (!baseType) {
        let msg = "╭─「 ʙᴜɪʟᴅ 」\n";
        msg += "│ Pilih tipe markas:\n│\n";
        for (const [type, info] of Object.entries(BASE_TYPES)) {
          msg += "│ 🏠 " + type + " — " + info.cost + " gold\n";
          msg += "│    " + info.desc + " (DEF +" + info.def + ")\n";
        }
        msg += "╰──────────";
        return m.reply(msg);
      }

      const base = BASE_TYPES[baseType];
      if (!base) return m.reply(claraWrap("build", "Tipe tidak valid. Pilih: " + Object.keys(BASE_TYPES).join(", "), "guide"));
      if ((rpg.gold || 0) < base.cost) return m.reply(claraWrap("build", "Gold tidak cukup. Butuh " + base.cost + " gold.", "info"));

      await m.react("🕒");
      rpg.gold = (rpg.gold || 0) - base.cost;
      rpg.base = baseType;
      rpg.baseDef = base.def;
      rpg.def = (rpg.def || 5) + base.def;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 ʙᴜɪʟᴅ 」\n│ 🧱 Kamu membangun *" + baseType + "*!\n│ 🛡️ DEF +" + base.def + "\n│ 💰 Sisa gold: " + (rpg.gold || 0) + "\n╰──────────");
    }

    // .defend — perkuat markas
    if (command === "defend") {
      if (!rpg.base) return m.reply(claraWrap("defend", "Kamu belum punya markas. Ketik .build dulu.", "guide"));
      const bonus = Math.floor(Math.random() * 30) + 20;
      await m.react("🕒");
      rpg.baseDef = (rpg.baseDef || 0) + bonus;
      rpg.def = (rpg.def || 5) + bonus;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 ᴅᴇғᴇɴᴅ 」\n│ 🛡️ Markas diperkuat!\n│ DEF +" + bonus + "\n│ Total base DEF: " + rpg.baseDef + "\n╰──────────");
    }
  } catch (e) {
    console.error("kingdom error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "kingdom", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
