// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "guildwar",
  alias: ["guildwar", "warrpg", "gw"],
  category: "rpg",
  description: "Sistem perang antar guild RPG",
  usage: ".guildwar <create/join/leave/status/declare/attack/defend/leaderboard/help>",
  example: ".guildwar create Nightmare",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const GUILD_CREATE_COST = 500;
const MAX_MEMBERS = 20;
const WAR_DURATION = 24 * 60 * 60 * 1000; // 24 jam
const WAR_COOLDOWN = 6 * 60 * 60 * 1000; // 6 jam cooldown setelah war
const ATTACK_COOLDOWN = 30 * 60 * 1000; // 30 menit antar attack

function getGroupId(m) {
  return m?.key?.remoteJid || m?.chat || m?.from;
}

function ensureGuildData(db) {
  if (!db.db.data.guildwar) {
    db.db.data.guildwar = {
      guilds: {},
      wars: [],
    };
    db.db.write();
  }
  return db.db.data.guildwar;
}

function getGuildByMember(guildData, sender) {
  for (const [name, guild] of Object.entries(guildData.guilds)) {
    if (guild.members.some((m) => m.id === sender)) {
      return { name, ...guild };
    }
  }
  return null;
}

function getGuildByName(guildData, name) {
  const guild = guildData.guilds[name];
  if (!guild) return null;
  return { name, ...guild };
}

function findActiveWar(guildData, guildName) {
  return guildData.wars.find(
    (w) =>
      w.status === "active" &&
      (w.attacker === guildName || w.defender === guildName)
  );
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const guildData = ensureGuildData(db);
  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action || action === "help") {
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Perintah:  ┊  ➶\n" +
      "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n" +
      "Guild: *" + guildName + "*\n" +
      "Leader: " + (m.pushName || "Player") + "\n" +
      "Members: 1/" + MAX_MEMBERS + "\n" +
      "Treasury: Rp 100\n" +
      "Power: 10\n\n" +
      "Ajak temen join: .guildwar join " + guildName + "\n" +
      "Declare war: .guildwar declare <guild musuh>";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // JOIN
  if (action === "join") {
    const guildName = args[1];
    if (!guildName) {
      return m.reply(claraWrap("Guildwar", "Guild mana?\nContoh: .guildwar join Nightmare"));
    }

    const guild = guildData.guilds[guildName];
    if (!guild) {
      return sendReplyWithNav(sock, m, "Guild *" + guildName + "* tidak ada!\nLihat daftar: .guildwar list", "guildwar");
    }

    const existing = getGuildByMember(guildData, m.sender);
    if (existing) {
      return sendReplyWithNav(sock, m, "Kamu udah di guild *" + existing.name + "*!\nKeluar dulu: .guildwar leave", "guildwar");
    }

    if (guild.members.length >= MAX_MEMBERS) {
      return sendReplyWithNav(sock, m, "Guild *" + guildName + "* udah penuh! (" + MAX_MEMBERS + " members)", "guildwar");
    }

    guild.members.push({ id: m.sender, name: m.pushName || "Player", role: "member" });
    guild.power += 5;
    db.save();

    await m.react("✅");
    return sendReplyWithNav(sock, m, "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + guildName + "  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "Guild: *" + existing.name + "*\n";
    txt += "Leader: " + existing.leaderName + "\n";
    txt += "Level: " + existing.level + "\n";
    txt += "Members: " + existing.members.length + "/" + MAX_MEMBERS + "\n";
    txt += "Power: " + existing.power + "\n";
    txt += "Treasury: Rp " + existing.treasury.toLocaleString("id-ID") + "\n";
    txt += "Wins: " + existing.wins + " | Losses: " + existing.losses + "\n\n";

    txt += "*Members:*\n";
    for (const mem of existing.members.slice(0, 10)) {
      txt += (mem.role === "leader" ? "👑 " : "👤 ") + mem.name + "\n";
    }
    if (existing.members.length > 10) {
      txt += "...dan " + (existing.members.length - 10) + " lainnya\n";
    }

    if (activeWar) {
      const enemy = activeWar.attacker === existing.name ? activeWar.defender : activeWar.attacker;
      const remaining = Math.max(0, activeWar.endTime - Date.now());
      const hours = Math.floor(remaining / 3600000);
      txt += "\n*PERANG AKTIF:*\n";
      txt += "vs *" + enemy + "*\n";
      txt += "Sisa waktu: " + hours + " jam\n";
      txt += "ATK Power: " + (activeWar.attackerPower || 0) + "\n";
      txt += "DEF Power: " + (activeWar.defenderPower || 0) + "\n";
      txt += "Serang: .guildwar attack\n";
      txt += "Bertahan: .guildwar defend";
    } else {
      txt += "\nTidak ada perang aktif.\n";
      txt += "Declare war: .guildwar declare <guild>";
    }
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // LIST
  if (action === "list") {
    const guilds = Object.entries(guildData.guilds).sort(
      (a, b) => b[1].power - a[1].power
    );

    if (guilds.length === 0) {
      return m.reply(claraWrap("Guildwar", "Belum ada guild! Buat pertama: .guildwar create <nama>"));
    }

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + name + "  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "ATTACKER: *" + existing.name + "* (Power: " + existing.power + ")\n";
    txt += "DEFENDER: *" + targetName + "* (Power: " + target.power + ")\n\n";
    txt += "Durasi: 24 jam\n";
    txt += "Guild dengan power tertinggi menang!\n\n";
    txt += "*ATTACKER:* .guildwar attack\n";
    txt += "*DEFENDER:* .guildwar defend\n";
    txt += "Setiap member bisa serang/bertahan tiap 30 menit.\n";
    txt += "Makin banyak kontribusi, makin tinggi power!\n\n";
    txt += "Hadiah menang: Exp + 50% treasury lawan\n";
    txt += "Hukum kalah: Kehilangan 10% treasury";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // ATTACK
  if (action === "attack") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild!"));
    }

    const war = findActiveWar(guildData, existing.name);
    if (!war) {
      return m.reply(claraWrap("Guildwar", "Guild kamu lagi ga perang!"));
    }
    if (war.attacker !== existing.name) {
      return m.reply(claraWrap("Guildwar", "Guild kamu DEFENDER! Pake: .guildwar defend"));
    }

    // Cek cooldown member
    const lastAttack = war.attackerContributors[m.sender]?.lastAction || 0;
    if (Date.now() - lastAttack < ATTACK_COOLDOWN) {
      const remaining = Math.ceil((ATTACK_COOLDOWN - (Date.now() - lastAttack)) / 60000);
      return sendReplyWithNav(sock, m, "Cooldown attack! Tunggu " + remaining + " menit lagi.", "guildwar");
    }

    // Hitung damage berdasarkan level user
    const user = db.getUser(m.sender);
    const userLevel = Math.floor((user.rpg?.exp || 0) / 10000) + 1;
    const baseDmg = 10 + userLevel * 3;
    const randomDmg = Math.floor(Math.random() * baseDmg) + Math.floor(baseDmg / 2);
    const crit = Math.random() < 0.15 ? 2 : 1;
    const finalDmg = randomDmg * crit;

    war.attackerPower += finalDmg;
    war.rounds++;

    if (!war.attackerContributors[m.sender]) {
      war.attackerContributors[m.sender] = { name: m.pushName || "Player", attacks: 0, defends: 0, totalDmg: 0 };
    }
    war.attackerContributors[m.sender].attacks++;
    war.attackerContributors[m.sender].lastAction = Date.now();
    war.attackerContributors[m.sender].totalDmg += finalDmg;

    // Exp kecil buat attacker
    await addExpWithLevelCheck(sock, m, db, user, 20);
    db.save();


    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + existing.name + "  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += (m.pushName || "Player") + " bertahan untuk *" + existing.name + "*!\n\n";
    txt += "Defense: " + finalDef + (crit > 1 ? " (PERFECT DEFENSE! 🛡️)" : "") + "\n";
    txt += "Level bonus: +" + (userLevel * 3) + "\n";
    txt += "EXP: +20\n\n";
    txt += "*Power Skor:*\n";
    txt += war.attacker + " (ATK): " + war.attackerPower + "\n";
    txt += existing.name + " (DEF): " + war.defenderPower + "\n\n";

    const lead = war.defenderPower - war.attackerPower;
    if (lead > 0) {
      txt += "Guild kamu unggul +" + lead + "!\n";
    } else if (lead < 0) {
      txt += "Guild lawan unggul +" + Math.abs(lead) + "!\n";
    } else {
      txt += "Skor imbang!\n";
    }

    const remaining = Math.max(0, Math.ceil((war.endTime - Date.now()) / 3600000));
    txt += "Sisa war: " + remaining + " jam\n\n";
    txt += "Bertahan lagi dalam 30 menit!";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // WARS LIST
  if (action === "wars") {
    const activeWars = guildData.wars.filter((w) => w.status === "active");

    if (activeWars.length === 0) {
      return m.reply(claraWrap("Guildwar", "Tidak ada perang aktif sekarang."));
    }

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + war.attacker + "  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";

    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < Math.min(10, guilds.length); i++) {
      const [name, g] = guilds[i];
      const score = g.wins * 3 - g.losses;
      const medal = medals[i] || (i + 1) + ".";
      txt += medal + " *" + name + "*\n";
      txt += "   Power: " + g.power + " | W/L: " + g.wins + "/" + g.losses + "\n";
      txt += "   Score: " + score + " | Treasury: Rp " + g.treasury.toLocaleString("id-ID") + "\n\n";
    }
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  return m.reply(claraWrap("Guildwar", "Perintah tidak valid!\n\nKetik .guildwar help buat lihat semua perintah."));
}

export { pluginConfig as config, handler };
