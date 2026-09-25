// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Mount — Tunggangan, feed mount, bonus spd

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { playStableAnim as libPlayStableAnim } from "../../src/lib/libanimationrpg/libmountrpg.js";
import te from "../../src/lib/nova-error.js";
import { novaRpgBox } from "../../src/lib/nova-games.js";

const pluginConfig = {
  name: "mount",
  alias: ["mount", "mountfeed", "tunggangan", "naikkuda"],
  category: "rpg",
  description: "Pilih tunggangan, beri makan, bonus kecepatan",
  usage: ".mount <list|pilih <nama>|feed>",
  example: ".mount list",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const MOUNTS = {
  kuda:       { name: "Kuda 🐎", emoji: "🐎", cost: 1000, spd: 10, desc: "Tunggangan dasar" },
  serigala:  { name: "Serigala 🐺", emoji: "🐺", cost: 3000, spd: 20, atk: 15, desc: "Cepat & kuat" },
  beruang:   { name: "Beruang 🐻", emoji: "🐻", cost: 5000, spd: 5, def: 30, desc: "Pertahanan tinggi" },
  naga:      { name: "Naga 🐉", emoji: "🐉", cost: 20000, spd: 40, atk: 50, def: 40, desc: "Tunggangan legendaris" },
};

// ── 🎬 ANIMASI KHAS MOUNT: KANDANG ──
// Mode "pilih": tunggangan 🐎 berjalan dari ujung padang 🌾 mendekati pemilik 🤠 sampai jinak 💞.
// Mode "feed": tunggangan mendekati wortel/beri makan 🥕 lalu makan lahap 💛.
// KHUSUS mount (aturan "beda game beda animasi") — beda dari siram detektif & pendakian gunung.
const ANIM_FRAME_MS = process.env.MOUNT_ANIM_MS !== undefined ? Number(process.env.MOUNT_ANIM_MS) : 700;

// ── 🎬 ANIMASI dimuat dari lib libmountrpg.js (kandang 🐎 berjalan / 🥕 makan) ──
async function playStableAnim(m, sock, opts) {
  await libPlayStableAnim(sock, m.chat, opts, ANIM_FRAME_MS);
}

async function handler(m, { sock, text }) {
  try {
    // FIX (21 Sep 2026): payload dispatch TIDAK mengirim 'command' — baca dari m.command.
    // Dulu cabang feed gak pernah jalan → .mount feed balas kosong (stuck di loading).
    const cmd = (m.command || "").toLowerCase();
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(novaRpgBox("mount", "RPG belum siap. Ketik .daftar dulu.", "error"));

    const feedArgs = (text || "").trim().split(/\s+/);
    const action0 = feedArgs[0]?.toLowerCase();
    if (cmd === "mountfeed" || action0 === "feed" || (text || "").trim().toLowerCase() === "feed") {
      if (!rpg.mount) return m.reply(novaRpgBox("mount", "Kamu belum punya tunggangan. Ketik .mount list.", "guide"));
      const mount = MOUNTS[rpg.mount.id];
      if (!mount) return m.reply(novaRpgBox("mount", "Tunggangan tidak valid.", "error"));

      await m.react("🕒");
      await playStableAnim(m, sock, { mode: "feed", mountName: mount.name, emoji: mount.emoji });
      rpg.mount.happiness = Math.min(100, (rpg.mount.happiness || 50) + 30);
      rpg.mount.lastFeed = Date.now();
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Tunggangan *" + mount.name + "* diberi makan!\nHappiness: " + rpg.mount.happiness + "/100");
    }

    const args = (text || "").trim().split(/\s+/);
    const action = args[0]?.toLowerCase();

    if (!action || action === "info") {
      if (rpg.mount) {
        const mount = MOUNTS[rpg.mount.id];
        return m.reply("Tunggangan: *" + mount.name + "*\nHappiness: " + (rpg.mount.happiness || 50) + "/100\nSPD Bonus: +" + mount.spd + "\n" + (mount.atk ? "ATK Bonus: +" + mount.atk + "\n" : "") + (mount.def ? "DEF Bonus: +" + mount.def + "\n" : "") + "\n.mount feed — beri makan");
      }
      return m.reply("Kamu belum punya tunggangan\n.mount list — list tunggangan\n.mount pilih <nama> — pilih tunggangan");
    }

    if (action === "list") {
      let msg = "Pilih tunggangan:\n\n";
      for (const [id, mount] of Object.entries(MOUNTS)) {
        const owned = rpg.mount?.id === id;
        msg += (owned ? "✅" : "🔹") + " " + mount.name + " — " + mount.cost + " gold\n";
        msg += "   " + mount.desc + " (SPD +" + mount.spd + ")\n";
      }
      msg += "\n.mount pilih <nama>";
      return m.reply(msg);
    }

    if (action === "pilih" || action === "beli") {
      const mountId = args[1]?.toLowerCase();
      if (!mountId || !MOUNTS[mountId]) return m.reply(novaRpgBox("mount", "Tunggangan tidak valid. Ketik .mount list.", "guide"));
      if (rpg.mount) return m.reply(novaRpgBox("mount", "Kamu sudah punya tunggangan: " + MOUNTS[rpg.mount.id].name, "info"));

      const mount = MOUNTS[mountId];
      if ((rpg.gold || 0) < mount.cost) return m.reply(novaRpgBox("mount", "Gold tidak cukup. Butuh " + mount.cost + " gold.", "info"));

      await m.react("🕒");
      await playStableAnim(m, sock, { mode: "pilih", mountName: mount.name, emoji: mount.emoji });
      rpg.gold = (rpg.gold || 0) - mount.cost;
      rpg.mount = { id: mountId, happiness: 50, lastFeed: Date.now() };
      rpg.spd = (rpg.spd || 10) + (mount.spd || 0);
      if (mount.atk) rpg.atk = (rpg.atk || 10) + mount.atk;
      if (mount.def) rpg.def = (rpg.def || 5) + mount.def;
      saveRpg(m, rpg);
      await m.react("🐣");
      return m.reply("Kamu membeli *" + mount.name + "*!\nSPD: +" + mount.spd + "\nSisa gold: " + (rpg.gold || 0));
    }
  } catch (e) {
    console.error("mount error:", e.message);
    await m.react("❌");
    return m.reply(novaRpgBox(m.command || "mount", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
