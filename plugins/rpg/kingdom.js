// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Kingdom — Create kingdom, build base, defend

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { animGeneric } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "kingdom",
  alias: ["kingdom"],
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
    if (!rpg) return m.reply(novaRpgBox("kingdom", "RPG belum siap. Ketik .daftar dulu.", "error"));

    // .kingdom <nama> — dirikan kerajaan
    if (command === "kingdom") {
  await animGeneric(m, sock, "👑", "Loading Kingdom");
      if (rpg.kingdom) return m.reply(novaRpgBox("kingdom", "Kerajaanmu: *" + rpg.kingdom + "*", "info"));
      const name = (text || "").trim();
      if (!name) return m.reply(novaRpgBox("kingdom", "Ketik: .kingdom <nama_kerajaan>", "guide"));
      if (name.length > 30) return m.reply(novaRpgBox("kingdom", "Nama kerajaan maksimal 30 karakter.", "info"));

      await m.react("🕒");
      rpg.kingdom = name;
      rpg.kingdomLevel = 1;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("🏯 Kamu mendirikan kerajaan *" + name + "*!\n📌 Ketik .build untuk bangun markas");
    }

    // .build — bangun/upgrade markas
    if (command === "build") {
      const currentBase = rpg.base || null;
      if (currentBase) {
        return m.reply("🏠 Markasmu: *" + currentBase + "*\n🛡️ DEF Bonus: " + (rpg.baseDef || 0) + "\n📌 Ketik .build <tipe> untuk upgrade");
      }
      const baseType = (text || "").trim().toLowerCase();
      if (!baseType) {
        let msg = "";
        msg += "Pilih tipe markas:\n\n";
        for (const [type, info] of Object.entries(BASE_TYPES)) {
          msg += "🏠 " + type + " — " + info.cost + " gold\n";
          msg += "   " + info.desc + " (DEF +" + info.def + ")\n";
        }
        msg += "";
        return m.reply(msg);
      }

      const base = BASE_TYPES[baseType];
      if (!base) return m.reply(novaRpgBox("build", "Tipe tidak valid. Pilih: " + Object.keys(BASE_TYPES).join(", "), "guide"));
      if ((rpg.gold || 0) < base.cost) return m.reply(novaRpgBox("build", "Gold tidak cukup. Butuh " + base.cost + " gold.", "info"));

      await m.react("🕒");
      rpg.gold = (rpg.gold || 0) - base.cost;
      rpg.base = baseType;
      rpg.baseDef = base.def;
      rpg.def = (rpg.def || 5) + base.def;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("🧱 Kamu membangun *" + baseType + "*!\n🛡️ DEF +" + base.def + "\n💰 Sisa gold: " + (rpg.gold || 0) + "");
    }

    // .defend — perkuat markas
    if (command === "defend") {
      if (!rpg.base) return m.reply(novaRpgBox("defend", "Kamu belum punya markas. Ketik .build dulu.", "guide"));
      const bonus = Math.floor(Math.random() * 30) + 20;
      await m.react("🕒");
      rpg.baseDef = (rpg.baseDef || 0) + bonus;
      rpg.def = (rpg.def || 5) + bonus;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("🛡️ Markas diperkuat!\nDEF +" + bonus + "\nTotal base DEF: " + rpg.baseDef + "");
    }
  } catch (e) {
    console.error("kingdom error:", e.message);
    await m.react("❌");
    return m.reply(novaRpgBox(m.command || "kingdom", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
