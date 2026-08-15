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
    let txt = "╔┈┈「 GUILD WAR SYSTEM 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Sistem perang antar guild buat bikin grup ramai!\n\n";
    txt += "*Perintah:*\n";
    txt += "1. .guildwar create <nama> — Buat guild (Rp " + GUILD_CREATE_COST + ")\n";
    txt += "2. .guildwar join <nama> — Gabung guild\n";
    txt += "3. .guildwar leave — Keluar dari guild\n";
    txt += "4. .guildwar status — Cek guild kamu\n";
    txt += "5. .guildwar list — Daftar semua guild\n";
    txt += "6. .guildwar declare <nama> — Declare war ke guild lain\n";
    txt += "7. .guildwar attack — Serang guild musuh\n";
    txt += "8. .guildwar defend — Bertahan dari serangan\n";
    txt += "9. .guildwar leaderboard — Ranking guild\n";
    txt += "10. .guildwar wars — Daftar perang aktif\n\n";
    txt += "*Cara Kerja:*\n";
    txt += "1. Buat/join guild di grup\n";
    txt += "2. Leader declare war ke guild lain\n";
    txt += "3. Member serang (ATK) & bertahan (DEF)\n";
    txt += "4. Guild dengan total power tertinggi menang\n";
    txt += "5. War berlangsung 24 jam\n";
    txt += "6. Pemenang dapat loot + exp + treasury\n";
    txt += "7. Kalah kehilangan 10% koin treasury\n";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // CREATE
  if (action === "create") {
    const guildName = args[1];
    if (!guildName) {
      return m.reply(claraWrap("Guildwar", "Nama guild apa?\nContoh: .guildwar create Nightmare"));
    }

    if (guildData.guilds[guildName]) {
      return sendReplyWithNav(sock, m, "Guild *" + guildName + "* udah ada! Pilih nama lain.", "guildwar");
    }

    const existing = getGuildByMember(guildData, m.sender);
    if (existing) {
      return sendReplyWithNav(sock, m, "Kamu udah di guild *" + existing.name + "*!\nKeluar dulu: .guildwar leave", "guildwar");
    }

    const user = db.getUser(m.sender);
    if ((user.koin || 0) < GUILD_CREATE_COST) {
      return sendReplyWithNav(sock, m, "Koin kurang!\nButuh: Rp " + GUILD_CREATE_COST + "\nKoin: Rp " + (user.koin || 0).toLocaleString("id-ID"), "guildwar");
    }

    user.koin -= GUILD_CREATE_COST;
    guildData.guilds[guildName] = {
      leader: m.sender,
      leaderName: m.pushName || "Player",
      members: [{ id: m.sender, name: m.pushName || "Player", role: "leader" }],
      level: 1,
      exp: 0,
      treasury: 100,
      wins: 0,
      losses: 0,
      power: 10,
      createdAt: Date.now(),
      lastWarEnd: 0,
    };
    db.save();

    return sendReplyWithNav(sock, m, "╔┈┈「 GUILD DIBUAT! 」╎❏\n" +
      "╚┈┈❖\n" +
      "Guild: *" + guildName + "*\n" +
      "Leader: " + (m.pushName || "Player") + "\n" +
      "Members: 1/" + MAX_MEMBERS + "\n" +
      "Treasury: Rp 100\n" +
      "Power: 10\n\n" +
      "Ajak temen join: .guildwar join " + guildName + "\n" +
      "Declare war: .guildwar declare <guild musuh>", "guildwar");
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
    return sendReplyWithNav(sock, m, "╔┈┈「 JOIN GUILD 」╎❏\n" +
      "╚┈┈❖\n" +
      (m.pushName || "Player") + " bergabung ke *" + guildName + "*!\n\n" +
      "Members: " + guild.members.length + "/" + MAX_MEMBERS + "\n" +
      "Guild Power: " + guild.power + "\n\n" +
      "Siap tempur! ⚔️", "guildwar");
  }

  // LEAVE
  if (action === "leave") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum tergabung guild manapun!"));
    }

    // Leader ga bisa keluar kalau masih ada member
    if (existing.leader === m.sender && existing.members.length > 1) {
      return m.reply(claraWrap("Guildwar", "Kamu leader! Pindahkan leadership dulu atau kick semua member.\nKetik: .guildwar disband (hapus guild)"));
    }

    const guild = guildData.guilds[existing.name];
    guild.members = guild.members.filter((m) => m.id !== m.sender);
    guild.power = Math.max(10, guild.power - 5);

    if (guild.members.length === 0) {
      delete guildData.guilds[existing.name];
    }
    db.save();

    return sendReplyWithNav(sock, m, "Kamu keluar dari guild *" + existing.name + "*.", "guildwar");
  }

  // DISBAND
  if (action === "disband") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum tergabung guild manapun!"));
    }
    if (existing.leader !== m.sender) {
      return m.reply(claraWrap("Guildwar", "Hanya leader yang bisa membubarkan guild!"));
    }

    delete guildData.guilds[existing.name];
    db.save();

    return sendReplyWithNav(sock, m, "Guild *" + existing.name + "* udah dibubarkan.", "guildwar");
  }

  // STATUS
  if (action === "status") {
    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Belum join guild!\nBuat: .guildwar create <nama>\nJoin: .guildwar join <nama>"));
    }

    const activeWar = findActiveWar(guildData, existing.name);

    let txt = "╔┈┈「 GUILD STATUS 」╎❏\n";
    txt += "╚┈┈❖\n";
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

    let txt = "╔┈┈「 DAFTAR GUILD 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Total guild: " + guilds.length + "\n\n";

    for (let i = 0; i < guilds.length; i++) {
      const [name, g] = guilds[i];
      const medals = ["🥇", "🥈", "🥉"];
      const medal = medals[i] || (i + 1) + ".";
      const warIcon = findActiveWar(guildData, name) ? " ⚔️" : "";
      txt += medal + " *" + name + "*" + warIcon + "\n";
      txt += "   Leader: " + g.leaderName + " | Power: " + g.power + "\n";
      txt += "   Members: " + g.members.length + " | W/L: " + g.wins + "/" + g.losses + "\n";
      txt += "   Treasury: Rp " + g.treasury.toLocaleString("id-ID") + "\n\n";
    }
    txt += "Join guild: .guildwar join <nama>";
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // DECLARE WAR
  if (action === "declare") {
    const targetName = args[1];
    if (!targetName) {
      return m.reply(claraWrap("Guildwar", "Declare war ke guild mana?\nContoh: .guildwar declare ShadowSquad"));
    }

    const existing = getGuildByMember(guildData, m.sender);
    if (!existing) {
      return m.reply(claraWrap("Guildwar", "Kamu belum join guild!"));
    }
    if (existing.leader !== m.sender) {
      return m.reply(claraWrap("Guildwar", "Hanya leader yang bisa declare war!"));
    }

    const target = guildData.guilds[targetName];
    if (!target) {
      return sendReplyWithNav(sock, m, "Guild *" + targetName + "* tidak ada!\nLihat: .guildwar list", "guildwar");
    }
    if (targetName === existing.name) {
      return m.reply(claraWrap("Guildwar", "Nggak bisa war guild sendiri! 😂"));
    }

    // Cek cooldown
    if (Date.now() - (existing.lastWarEnd || 0) < WAR_COOLDOWN) {
      const remaining = Math.ceil((WAR_COOLDOWN - (Date.now() - existing.lastWarEnd)) / 3600000);
      return sendReplyWithNav(sock, m, "Guild baru selesai war! Cooldown " + remaining + " jam lagi.", "guildwar");
    }

    // Cek war aktif
    if (findActiveWar(guildData, existing.name)) {
      return m.reply(claraWrap("Guildwar", "Guild kamu lagi perang! Selesaikan dulu."));
    }
    if (findActiveWar(guildData, targetName)) {
      return sendReplyWithNav(sock, m, "Guild *" + targetName + "* lagi perang sama guild lain!", "guildwar");
    }

    // Cek minimum members
    if (existing.members.length < 2) {
      return m.reply(claraWrap("Guildwar", "Guild kamu butuh minimal 2 member buat war!"));
    }
    if (target.members.length < 2) {
      return m.reply(claraWrap("Guildwar", "Guild lawan terlalu lemah (min 2 member)."));
    }

    guildData.wars.push({
      attacker: existing.name,
      defender: targetName,
      attackerPower: 0,
      defenderPower: 0,
      attackerContributors: {},
      defenderContributors: {},
      status: "active",
      startTime: Date.now(),
      endTime: Date.now() + WAR_DURATION,
      rounds: 0,
    });

    db.save();

    let txt = "╔┈┈「 PERANG DIMULAI! 」╎❏\n";
    txt += "╚┈┈❖\n";
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


    let txt = "╔┈┈「 SERANGAN! 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += (m.pushName || "Player") + " menyerang untuk *" + existing.name + "*!\n\n";
    txt += "Damage: " + finalDmg + (crit > 1 ? " (CRITICAL! 💥)" : "") + "\n";
    txt += "Level bonus: +" + (userLevel * 3) + "\n";
    txt += "EXP: +20\n\n";
    txt += "*Power Skor:*\n";
    txt += existing.name + " (ATK): " + war.attackerPower + "\n";
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


    let txt = "╔┈┈「 PERTAHANAN! 」╎❏\n";
    txt += "╚┈┈❖\n";
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

    let txt = "╔┈┈「 PERANG AKTIF 」╎❏\n";
    txt += "╚┈┈❖\n";
    txt += "Total perang: " + activeWars.length + "\n\n";

    for (const war of activeWars) {
      const remaining = Math.max(0, Math.ceil((war.endTime - Date.now()) / 3600000));
      const lead = war.attackerPower - war.defenderPower;
      txt += "⚔️ *" + war.attacker + "* vs *" + war.defender + "*\n";
      txt += "   ATK Power: " + war.attackerPower + "\n";
      txt += "   DEF Power: " + war.defenderPower + "\n";
      txt += "   " + (lead > 0 ? "Attacker unggul +" + lead : lead < 0 ? "Defender unggul +" + Math.abs(lead) : "Imbang") + "\n";
      txt += "   Sisa: " + remaining + " jam\n\n";
    }
    return await sendReplyWithNav(sock, m, txt, "guildwar");
  }

  // LEADERBOARD
  if (action === "leaderboard" || action === "lb") {
    const guilds = Object.entries(guildData.guilds).sort(
      (a, b) => (b[1].wins * 3 - b[1].losses) - (a[1].wins * 3 - a[1].losses)
    );

    if (guilds.length === 0) {
      return m.reply(claraWrap("Guildwar", "Belum ada guild!"));
    }

    let txt = "╔┈┈「 GUILD RANKING 」╎❏\n";
    txt += "╚┈┈❖\n";

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
