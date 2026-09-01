// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mount — Tunggangan, feed mount, bonus spd

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "mount",
  alias: ["mount"],
  aliases: ["mount", "mountfeed", "tunggangan", "naikkuda"],
  category: "rpg",
  description: "Pilih tunggangan, beri makan, bonus kecepatan",
  usage: ".mount <list|pilih <nama>|feed>",
  example: ".mount list",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const MOUNTS = {
  kuda:       { name: "Kuda 🐎", cost: 1000, spd: 10, desc: "Tunggangan dasar" },
  serigala:  { name: "Serigala 🐺", cost: 3000, spd: 20, atk: 15, desc: "Cepat & kuat" },
  beruang:   { name: "Beruang 🐻", cost: 5000, spd: 5, def: 30, desc: "Pertahanan tinggi" },
  naga:      { name: "Naga 🐉", cost: 20000, spd: 40, atk: 50, def: 40, desc: "Tunggangan legendaris" },
};

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("mount", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "mountfeed" || command === "mount" && (text || "").toLowerCase() === "feed") {
      if (!rpg.mount) return m.reply(claraWrap("mount", "Kamu belum punya tunggangan. Ketik .mount list.", "guide"));
      const mount = MOUNTS[rpg.mount.id];
      if (!mount) return m.reply(claraWrap("mount", "Tunggangan tidak valid.", "error"));

      await m.react("🕒");
      rpg.mount.happiness = Math.min(100, (rpg.mount.happiness || 50) + 30);
      rpg.mount.lastFeed = Date.now();
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 ᴍᴏᴜɴᴛ ғᴇᴇᴅ 」\n│ 🍎 Tunggangan *" + mount.name + "* diberi makan!\n│ 💚 Happiness: " + rpg.mount.happiness + "/100\n╰──────────");
    }

    const args = (text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();

    if (!action || action === "info") {
      if (rpg.mount) {
        const mount = MOUNTS[rpg.mount.id];
        return m.reply("╭─「 ᴍᴏᴜɴᴛ 」\n│ 🐾 Tunggangan: *" + mount.name + "*\n│ 💚 Happiness: " + (rpg.mount.happiness || 50) + "/100\n│ ⚡ SPD Bonus: +" + mount.spd + "\n" + (mount.atk ? "│ 💪 ATK Bonus: +" + mount.atk + "\n" : "") + (mount.def ? "│ 🛡️ DEF Bonus: +" + mount.def + "\n" : "") + "│\n│ 📌 .mount feed — beri makan\n╰──────────");
      }
      return m.reply("╭─「 ᴍᴏᴜɴᴛ 」\n│ 📌 Kamu belum punya tunggangan\n│ 📌 .mount list — liftar tunggangan\n│ 📌 .mount pilih <nama> — pilih tunggangan\n╰──────────");
    }

    if (action === "list") {
      let msg = "╭─「 ᴍᴏᴜɴᴛ ʟɪsᴛ 」\n";
      msg += "│ Pilih tunggangan:\n│\n";
      for (const [id, mount] of Object.entries(MOUNTS)) {
        const owned = rpg.mount?.id === id;
        msg += "│ " + (owned ? "✅" : "🔹") + " " + mount.name + " — " + mount.cost + " gold\n";
        msg += "│    " + mount.desc + " (SPD +" + mount.spd + ")\n";
      }
      msg += "│\n│ 📌 .mount pilih <nama>\n╰──────────";
      return m.reply(msg);
    }

    if (action === "pilih" || action === "beli") {
      const mountId = args[1]?.toLowerCase();
      if (!mountId || !MOUNTS[mountId]) return m.reply(claraWrap("mount", "Tunggangan tidak valid. Ketik .mount list.", "guide"));
      if (rpg.mount) return m.reply(claraWrap("mount", "Kamu sudah punya tunggangan: " + MOUNTS[rpg.mount.id].name, "info"));

      const mount = MOUNTS[mountId];
      if ((rpg.gold || 0) < mount.cost) return m.reply(claraWrap("mount", "Gold tidak cukup. Butuh " + mount.cost + " gold.", "info"));

      await m.react("🕒");
      rpg.gold = (rpg.gold || 0) - mount.cost;
      rpg.mount = { id: mountId, happiness: 50, lastFeed: Date.now() };
      rpg.spd = (rpg.spd || 10) + (mount.spd || 0);
      if (mount.atk) rpg.atk = (rpg.atk || 10) + mount.atk;
      if (mount.def) rpg.def = (rpg.def || 5) + mount.def;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("╭─「 ᴍᴏᴜɴᴛ 」\n│ 🐎 Kamu membeli *" + mount.name + "*!\n│ ⚡ SPD +" + mount.spd + "\n│ 💰 Sisa gold: " + (rpg.gold || 0) + "\n╰──────────");
    }
  } catch (e) {
    console.error("mount error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "mount", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
