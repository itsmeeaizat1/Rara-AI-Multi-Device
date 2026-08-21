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

// Selesaikan war yang udah lewat WAR_DURATION — bagi treasury, catat wins/losses
function resolveExpiredWars(guildData, db) {
  const now = Date.now();
  let changed = false;
  for (const war of guildData.wars) {
    if (war.status !== "active" || now < war.endTime) continue;

    const attackerGuild = guildData.guilds[war.attacker];
    const defenderGuild = guildData.guilds[war.defender];
    war.status = "ended";
    changed = true;

    if (!attackerGuild || !defenderGuild) continue;

    if (war.attackerPower === war.defenderPower) {
      war.winner = null;
    } else if (war.attackerPower > war.defenderPower) {
      war.winner = war.attacker;
      const loot = Math.floor((defenderGuild.treasury || 0) * 0.5);
      const penalty = Math.floor((defenderGuild.treasury || 0) * 0.1);
      attackerGuild.treasury = (attackerGuild.treasury || 0) + loot;
      defenderGuild.treasury = Math.max(0, (defenderGuild.treasury || 0) - loot - penalty);
      attackerGuild.wins = (attackerGuild.wins || 0) + 1;
      defenderGuild.losses = (defenderGuild.losses || 0) + 1;
    } else {
      war.winner = war.defender;
      const loot = Math.floor((attackerGuild.treasury || 0) * 0.5);
      const penalty = Math.floor((attackerGuild.treasury || 0) * 0.1);
      defenderGuild.treasury = (defenderGuild.treasury || 0) + loot;
      attackerGuild.treasury = Math.max(0, (attackerGuild.treasury || 0) - loot - penalty);
      defenderGuild.wins = (defenderGuild.wins || 0) + 1;
      attackerGuild.losses = (attackerGuild.losses || 0) + 1;
    }

    if (attackerGuild) attackerGuild.warCooldownUntil = now + WAR_COOLDOWN;
    if (defenderGuild) defenderGuild.warCooldownUntil = now + WAR_COOLDOWN;
  }
  if (changed) db.db.write();
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const guildData = ensureGuildData(db);
  resolveExpiredWars(guildData, db);
  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action || action === "help") {
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Guild War  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "┊ ➶ .guildwar create <nama> — Buat guild baru\n";
    txt += "┊ ➶ .guildwar join <nama> — Gabung guild\n";
    txt += "┊ ➶ .guildwar leave — Keluar guild\n";
    txt += "┊ ➶ .guildwar status — Lihat status guild kamu\n";
    txt += "┊ ➶ .guildwar list — Daftar semua guild\n";
    txt += "┊ ➶ .guildwar declare <guild musuh> — Deklarasi perang\n";
    txt += "┊ ➶ .guildwar attack — Serang (kalau attacker)\n";
    txt += "┊ ➶ .guildwar defend — Bertahan (kalau defender)\n";
    txt += "┊ ➶ .guildwar wars — Lihat perang aktif\n";
    txt += "┊ ➶ .guildwar leaderboard — Ranking guild\n\n";
    txt += "Biaya bikin guild: Rp " + GUILD_CREATE_COST.toLocaleString("id-ID");
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // CREATE
  if (action === "create") {
    const guildName = m.args?.[1];
    if (!guildName) {
      return m.reply(claraWrap("Guildwar", "Nama guild mana?\nContoh: .guildwar create Nightmare"));
    }
    if (guildData.guilds[guildName]) {
      return m.reply(claraWrap("Guildwar", "Guild *" + guildName + "* udah ada! Pilih nama lain."));
    }

    const existing = getGuildByMember(guildData, m.sender);
    if (existing) {
      return sendReplyWithNav(sock, m, "Kamu udah di guild *" + existing.name + "*!\nKeluar dulu: .guildwar leave", "guildwar");
    }

    const user = db.getUser(m.sender);
    if ((user.koin || 0) < GUILD_CREATE_COST) {
      return m.reply(claraWrap("Guildwar", "Koin gak cukup! Butuh Rp " + GUILD_CREATE_COST.toLocaleString("id-ID") + ", kamu punya Rp " + (user.koin || 0).toLocaleString("id-ID")));
    }

    user.koin -= GUILD_CREATE_COST;
    guildData.guilds[guildName] = {
      leaderName: m.pushName || "Player",
      members: [{ id: m.sender, name: m.pushName || "Player", role: "leader" }],
      level: 1,
      power: 10,
      treasury: 100,
      wins: 0,
      losses: 0,
      createdAt: Date.now(),
    };
    db.save();

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ GUILD DIBUAT!  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "Guild: *" + guildName + "*\n";
    txt += "Leader: " + (m.pushName || "Player") + "\n";
    txt += "Members: 1/" + MAX_MEMBERS + "\n";
    txt += "Treasury: Rp 100\n";
    txt += "Power: 10\n\n";
    txt += "Ajak temen join: .guildwar join " + guildName + "\n";
    txt += "Declare war: .guildwar declare <guild musuh>";
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
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ JOIN GUILD!  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += (m.pushName || "Player") + " join guild *" + guildName + "*!\n\n";
    txt += "Members: " + guild.members.length + "/" + MAX_MEMBERS + "\n";
    txt += "Power guild: " + guild.power + "\n\n";
    txt += "Cek status: .guildwar status";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // LEAVE
  if (action === "leave") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild manapun!"));
    }

    const guild = guildData.guilds[existing.name];
    const activeWar = findActiveWar(guildData, existing.name);
    if (activeWar) {
      return m.reply(claraWrap("Guildwar", "Gak bisa keluar guild lagi perang! Tunggu perang selesai dulu."));
    }

    guild.members = guild.members.filter((mem) => mem.id !== m.sender);
    guild.power = Math.max(10, guild.power - 5);

    if (guild.members.length === 0) {
      delete guildData.guilds[existing.name];
      db.save();
      return m.reply(claraWrap("Guildwar", "Kamu keluar dari *" + existing.name + "*.\nGuild dibubarkan karena gak ada member lagi."));
    }

    // Kalau leader keluar, angkat member pertama jadi leader baru
    if (existing.members.find((mem) => mem.id === m.sender)?.role === "leader") {
      guild.members[0].role = "leader";
      guild.leaderName = guild.members[0].name;
    }

    db.save();
    return m.reply(claraWrap("Guildwar", "Kamu keluar dari guild *" + existing.name + "*."));
  }

  // STATUS
  if (action === "status") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild manapun!\nBuat: .guildwar create <nama>\nAtau join: .guildwar join <nama>"));
    }

    const activeWar = findActiveWar(guildData, existing.name);

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + existing.name + "  ┊  ➶\n";
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

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ DAFTAR GUILD  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    for (const [name, g] of guilds.slice(0, 15)) {
      txt += "\n🏰 *" + name + "*\n";
      txt += "   Leader: " + g.leaderName + "\n";
      txt += "   Members: " + g.members.length + "/" + MAX_MEMBERS + " | Power: " + g.power + "\n";
      txt += "   W/L: " + g.wins + "/" + g.losses + "\n";
    }
    txt += "\nJoin: .guildwar join <nama>";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // DECLARE
  if (action === "declare") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild manapun!"));
    }
    if (existing.members.find((mem) => mem.id === m.sender)?.role !== "leader") {
      return m.reply(claraWrap("Guildwar", "Cuma leader guild yang bisa declare war!"));
    }

    const targetName = m.args?.[1];
    if (!targetName) {
      return m.reply(claraWrap("Guildwar", "Declare war ke guild mana?\nContoh: .guildwar declare Nightmare"));
    }
    if (targetName === existing.name) {
      return m.reply(claraWrap("Guildwar", "Gak bisa declare war ke guild sendiri!"));
    }

    const target = guildData.guilds[targetName];
    if (!target) {
      return m.reply(claraWrap("Guildwar", "Guild *" + targetName + "* tidak ditemukan!"));
    }

    if (findActiveWar(guildData, existing.name)) {
      return m.reply(claraWrap("Guildwar", "Guild kamu udah lagi perang! Selesaikan dulu."));
    }
    if (findActiveWar(guildData, targetName)) {
      return m.reply(claraWrap("Guildwar", "Guild *" + targetName + "* udah lagi perang sama guild lain!"));
    }
    if (existing.warCooldownUntil && Date.now() < existing.warCooldownUntil) {
      const wait = Math.ceil((existing.warCooldownUntil - Date.now()) / 3600000);
      return m.reply(claraWrap("Guildwar", "Guild kamu masih cooldown! Tunggu " + wait + " jam lagi."));
    }

    guildData.wars.push({
      attacker: existing.name,
      defender: targetName,
      attackerPower: existing.power,
      defenderPower: target.power,
      attackerContributors: {},
      defenderContributors: {},
      startTime: Date.now(),
      endTime: Date.now() + WAR_DURATION,
      status: "active",
      rounds: 0,
    });
    db.save();

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ WAR DIMULAI!  ┊  ➶\n";
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

    const lastAttack = war.attackerContributors[m.sender]?.lastAction || 0;
    if (Date.now() - lastAttack < ATTACK_COOLDOWN) {
      const remaining = Math.ceil((ATTACK_COOLDOWN - (Date.now() - lastAttack)) / 60000);
      return sendReplyWithNav(sock, m, "Cooldown attack! Tunggu " + remaining + " menit lagi.", "guildwar");
    }

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

    await addExpWithLevelCheck(sock, m, db, user, 20);
    db.save();

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + existing.name + "  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += (m.pushName || "Player") + " menyerang untuk *" + existing.name + "*!\n\n";
    txt += "Damage: " + finalDmg + (crit > 1 ? " (CRITICAL HIT! ⚔️)" : "") + "\n";
    txt += "Level bonus: +" + (userLevel * 3) + "\n";
    txt += "EXP: +20\n\n";
    txt += "*Power Skor:*\n";
    txt += war.attacker + " (ATK): " + war.attackerPower + "\n";
    txt += war.defender + " (DEF): " + war.defenderPower + "\n\n";

    const lead = war.attackerPower - war.defenderPower;
    if (lead > 0) {
      txt += "Guild kamu unggul +" + lead + "!\n";
    } else if (lead < 0) {
      txt += "Guild lawan unggul +" + Math.abs(lead) + "!\n";
    } else {
      txt += "Skor imbang!\n";
    }

    const remaining = Math.max(0, Math.ceil((war.endTime - Date.now()) / 3600000));
    txt += "Sisa war: " + remaining + " jam\n\n";
    txt += "Serang lagi dalam 30 menit!";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // DEFEND
  if (action === "defend") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild!"));
    }

    const war = findActiveWar(guildData, existing.name);
    if (!war) {
      return m.reply(claraWrap("Guildwar", "Guild kamu lagi ga perang!"));
    }
    if (war.defender !== existing.name) {
      return m.reply(claraWrap("Guildwar", "Guild kamu ATTACKER! Pake: .guildwar attack"));
    }

    const lastDefend = war.defenderContributors[m.sender]?.lastAction || 0;
    if (Date.now() - lastDefend < ATTACK_COOLDOWN) {
      const remaining = Math.ceil((ATTACK_COOLDOWN - (Date.now() - lastDefend)) / 60000);
      return sendReplyWithNav(sock, m, "Cooldown defend! Tunggu " + remaining + " menit lagi.", "guildwar");
    }

    const user = db.getUser(m.sender);
    const userLevel = Math.floor((user.rpg?.exp || 0) / 10000) + 1;
    const baseDef = 10 + userLevel * 3;
    const randomDef = Math.floor(Math.random() * baseDef) + Math.floor(baseDef / 2);
    const crit = Math.random() < 0.15 ? 2 : 1;
    const finalDef = randomDef * crit;

    war.defenderPower += finalDef;
    war.rounds++;

    if (!war.defenderContributors[m.sender]) {
      war.defenderContributors[m.sender] = { name: m.pushName || "Player", attacks: 0, defends: 0, totalDmg: 0 };
    }
    war.defenderContributors[m.sender].defends++;
    war.defenderContributors[m.sender].lastAction = Date.now();
    war.defenderContributors[m.sender].totalDmg += finalDef;

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
    txt += war.defender + " (DEF): " + war.defenderPower + "\n\n";

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

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ PERANG AKTIF  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    for (const war of activeWars) {
      const remaining = Math.max(0, Math.ceil((war.endTime - Date.now()) / 3600000));
      txt += "\n⚔️ *" + war.attacker + "* vs *" + war.defender + "*\n";
      txt += "   ATK: " + war.attackerPower + " | DEF: " + war.defenderPower + "\n";
      txt += "   Sisa: " + remaining + " jam\n";
    }
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // LEADERBOARD
  if (action === "leaderboard" || action === "lb") {
    const guilds = Object.entries(guildData.guilds).sort(
      (a, b) => (b[1].wins * 3 - b[1].losses) - (a[1].wins * 3 - a[1].losses)
    );

    if (guilds.length === 0) {
      return m.reply(claraWrap("Guildwar", "Belum ada guild sama sekali!"));
    }

    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ LEADERBOARD GUILD  ┊  ➶\n";
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
