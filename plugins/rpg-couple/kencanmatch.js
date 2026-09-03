// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Cinta — Kencan (Date Quest) — kasih affection + exp, burn energy + gold

import { getRpgData, useEnergy, addExp, addGold, removeGold, checkCooldown } from "../../src/lib/nova-rpg-service.js";
import { claraWrap, novaBox } from "../../src/lib/nova-menu-style.js";
import {
  getCintaData, addAffection, getCouplePower,
  KENCAN_ACTIVITIES, KENCAN_COOLDOWN_HOURS, formatDurasi
} from "../../src/lib/nova-rpg-cinta.js";

const pluginConfig = {
  name: "kencanmatch",
  alias: ["kencanmatch", "rpgkencan"],
  category: "rpg couple",
  description: "Ajak pasangan kencan untuk tambah affection",
  usage: ".rpgkencan atau .rpgkencan pilih",
  example: ".rpgkencan",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const rpg = getRpgData(m);
    const cinta = getCintaData(m);

    if (!cinta.spouse) {
      return m.reply(claraWrap("Kencan", [
        "Kamu belum punya pasangan!",
        `Gunakan ${m.prefix}jadianmatch @tag dulu`,
      ], "warn"));
    }

    // Cooldown check
    const cd = checkCooldown(m, "rpgkencan");
    if (cd) {
      return m.reply(claraWrap("Kencan", `Cooldown: ${formatDurasi(cd)} lagi`, "warn"));
    }

    const args = m.args || [];
    const pick = args[0] ? parseInt(args[0]) - 1 : null;

    if (pick === null || isNaN(pick) || pick < 0 || pick >= KENCAN_ACTIVITIES.length) {
      // Tampilkan menu kencan
      const menuLines = [
        `Pasangan: ${cinta.spouseName || cinta.spouse.split("@")[0]}`,
        `Affection: ${cinta.affection || 0}`,
        `Gold: ${rpg.gold || 0}`,
        `Energi: ${rpg.energy || 0}/${rpg.maxEnergy || 100}`,
        "---",
        { sub: "Pilih Aktivitas Kencan" },
      ];
      KENCAN_ACTIVITIES.forEach((a, i) => {
        menuLines.push(`${i + 1}. ${a.emoji} ${a.name}`);
        menuLines.push(`   ${a.cost} gold | ${a.energy} energi | +${a.affection} affection | +${a.exp} exp`);
      });
      menuLines.push("---", `Ketik: ${m.prefix}rpgkencan <nomor>`);
      return m.reply(novaBox("Kencan", menuLines));
    }

    const activity = KENCAN_ACTIVITIES[pick];

    // Cek gold
    if ((rpg.gold || 0) < activity.cost) {
      return m.reply(claraWrap("Kencan", [
        "Gold tidak cukup!",
        `Butuh: ${activity.cost} gold`,
        `Punya: ${rpg.gold || 0} gold`,
      ], "error"));
    }

    // Cek energy
    if (!useEnergy(m, activity.energy, sock)) {
      return m.reply(claraWrap("Kencan", `Energi tidak cukup! Butuh: ${activity.energy} energi`, "error"));
    }

    // Eksekusi kencan
    removeGold(m, activity.cost, sock);
    addAffection(m, activity.affection);
    addExp(m, activity.exp);

    // Affection ke pasangan juga
    const partnerCinta = getCintaData({ sender: cinta.spouse, pushName: cinta.spouseName });
    addAffection({ sender: cinta.spouse, pushName: cinta.spouseName }, activity.affection);

    // Update lastKencan
    const myCinta = getCintaData(m);
    myCinta.lastKencan = Date.now();
    myCinta.totalKencan = (myCinta.totalKencan || 0) + 1;
    const myRpg = getRpgData(m);
    myRpg.cinta = myCinta;
    const db = (await import("../../src/lib/nova-database.js")).getDatabase();
    db.setUser(m.sender, myRpg);
    db.save();

    // Random event
    const events = [
      `Kencan berjalan lancar! ${activity.emoji}`,
      `Pasanganmu sangat senang! ${activity.emoji}`,
      `Momennya romantis banget! ${activity.emoji}`,
      `Acara ini bikin makin dekat! ${activity.emoji}`,
      `Kencan sukses, chemistry naik! ${activity.emoji}`,
    ];
    const event = events[Math.floor(Math.random() * events.length)];

    const msg = novaBox("Kencan", [
      `${activity.emoji} ${activity.name}`,
      `"${event}"`,
      `Bersama: ${cinta.spouseName || cinta.spouse.split("@")[0]}`,
      "---",
      { sub: "Hasil" },
      `Affection: +${activity.affection} (Total: ${myCinta.affection})`,
      `EXP: +${activity.exp}`,
      `Gold: -${activity.cost}`,
      `Energi: -${activity.energy}`,
    ]);
    await m.reply(msg);
    await m.react(activity.emoji);
  } catch (e) {
    console.error("[rpgkencan] Error:", e.message);
  }
}

export { pluginConfig as config, handler };
