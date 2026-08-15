// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "tribe",
  alias: ["tribe", "tribewar", "suku"],
  category: "future",
  description: "Tribe war - mini strategy game, bentuk tribe & serang",
  usage: ".tribe <command>",
  example: ".tribe create Harimau",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("tribe") || {};
  if (!all[gid]) {
    all[gid] = { tribes: {}, warHistory: [], counter: 0 };
    db.setting("tribe", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("tribe") || {};
  all[gid] = data;
  db.setting("tribe", all);
  db.save();
}

const MAX_MEMBERS = 8;

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const user = db.getUser(m.sender);

  function findUserTribe() {
    for (const [name, tribe] of Object.entries(cfg.tribes)) {
      if (tribe.members.includes(m.sender)) return { name, tribe };
    }
    return null;
  }

  if (sub === "create" || sub === "buat") {
    if (findUserTribe()) {
      await m.reply(claraWrap("Tribe", "Kamu sudah di tribe. Keluar dulu: " + prefix + "tribe leave."));
      return { handled: true };
    }
    const name = args.slice(2).join(" ").trim();
    if (!name || name.length > 20) {
      await m.reply(claraWrap("Tribe", "Format: " + prefix + "tribe create <nama max 20 huruf>"));
      return { handled: true };
    }
    if (Object.keys(cfg.tribes).some(t => t.toLowerCase() === name.toLowerCase())) {
      await m.reply(claraWrap("Tribe", "Nama tribe sudah dipakai."));
      return { handled: true };
    }
    cfg.counter++;
    cfg.tribes[name] = {
      id: cfg.counter,
      name,
      leader: m.sender,
      members: [m.sender],
      territory: 3,
      resources: 100,
      attackPower: 10,
      defensePower: 10,
      wins: 0,
      losses: 0,
      createdAt: Date.now(),
    };
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Tribe", "Tribe \"" + name + "\" dibuat!\nLeader: @" + m.sender.split("@")[0] + "\nTerritory: 3 | Resources: 100\nKetik " + prefix + "tribe info untuk cek."), { mentions: [m.sender] });
    return { handled: true };
  }

  if (sub === "join" || sub === "gabung") {
    if (findUserTribe()) {
      await m.reply(claraWrap("Tribe", "Kamu sudah di tribe. Keluar dulu: " + prefix + "tribe leave."));
      return { handled: true };
    }
    const name = args.slice(2).join(" ").trim();
    if (!name) {
      await m.reply(claraWrap("Tribe", "Format: " + prefix + "tribe join <nama tribe>"));
      return { handled: true };
    }
    const tribe = cfg.tribes[name];
    if (!tribe) {
      await m.reply(claraWrap("Tribe", "Tribe tidak ditemukan. Ketik " + prefix + "tribe list."));
      return { handled: true };
    }
    if (tribe.members.length >= MAX_MEMBERS) {
      await m.reply(claraWrap("Tribe", "Tribe penuh (max " + MAX_MEMBERS + " member)."));
      return { handled: true };
    }
    tribe.members.push(m.sender);
    tribe.attackPower += 5;
    tribe.defensePower += 5;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Tribe", "Bergabung dengan \"" + name + "\"!\nMembers: " + tribe.members.length + "/" + MAX_MEMBERS + "\nAttack: " + tribe.attackPower + " | Defense: " + tribe.defensePower));
    return { handled: true };
  }

  if (sub === "leave" || sub === "keluar") {
    const my = findUserTribe();
    if (!my) {
      await m.reply(claraWrap("Tribe", "Kamu tidak di tribe manapun."));
      return { handled: true };
    }
    my.tribe.members = my.tribe.members.filter(jid => jid !== m.sender);
    my.tribe.attackPower = Math.max(5, my.tribe.attackPower - 5);
    my.tribe.defensePower = Math.max(5, my.tribe.defensePower - 5);
    if (my.tribe.members.length === 0) {
      delete cfg.tribes[my.name];
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Tribe", "Keluar dari \"" + my.name + "\". Tribe bubar (0 member)."));
    } else {
      if (my.tribe.leader === m.sender) my.tribe.leader = my.tribe.members[0];
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Tribe", "Keluar dari \"" + my.name + "\". Leader baru: @" + my.tribe.leader.split("@")[0]), { mentions: [my.tribe.leader] });
    }
    return { handled: true };
  }

  if (sub === "attack" || sub === "serang") {
    const my = findUserTribe();
    if (!my) {
      await m.reply(claraWrap("Tribe", "Kamu tidak di tribe. Ketik " + prefix + "tribe create/join."));
      return { handled: true };
    }
    const targetName = args.slice(2).join(" ").trim();
    if (!targetName) {
      await m.reply(claraWrap("Tribe", "Format: " + prefix + "tribe attack <nama tribe musuh>"));
      return { handled: true };
    }
    const target = cfg.tribes[targetName];
    if (!target || targetName === my.name) {
      await m.reply(claraWrap("Tribe", "Tribe target tidak ditemukan atau itu tribe sendiri."));
      return { handled: true };
    }
    const cost = 20;
    if (my.tribe.resources < cost) {
      await m.reply(claraWrap("Tribe", "Resources tidak cukup! Butuh " + cost + ", punya " + my.tribe.resources + "."));
      return { handled: true };
    }
    my.tribe.resources -= cost;
    // Battle calculation
    const attackRoll = Math.random() * my.tribe.attackPower;
    const defenseRoll = Math.random() * target.defensePower;
    const win = attackRoll > defenseRoll;
    const territoryGain = win ? 1 : 0;
    const territoryLoss = win ? 0 : 1;
    my.tribe.territory += territoryGain;
    target.territory = Math.max(0, target.territory - territoryGain);
    target.territory += territoryLoss;
    my.tribe.territory = Math.max(0, my.tribe.territory - territoryLoss);
    target.territory = Math.max(0, target.territory - territoryLoss);
    if (win) {
      my.tribe.wins++;
      target.losses++;
      my.tribe.resources += 30;
      target.resources = Math.max(0, target.resources - 15);
    } else {
      my.tribe.losses++;
      target.wins++;
      target.resources += 10;
    }
    cfg.warHistory.push({ attacker: my.name, defender: targetName, win, ts: Date.now() });
    saveConfig(db, gid, cfg);

    await m.reply(claraWrap("Tribe War", [
      "ATTACK: " + my.name + " VS " + targetName,
      "",
      "Attack Power: " + my.tribe.attackPower + " (roll: " + Math.floor(attackRoll) + ")",
      "Defense Power: " + target.defensePower + " (roll: " + Math.floor(defenseRoll) + ")",
      "",
      win ? "MENANG! +1 territory, +30 resources" : "KALAH! -1 territory",
      "",
      my.name + ": territory=" + my.tribe.territory + " resources=" + my.tribe.resources,
      targetName + ": territory=" + target.territory + " resources=" + target.resources,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "gather" || sub === "kumpul") {
    const my = findUserTribe();
    if (!my) {
      await m.reply(claraWrap("Tribe", "Kamu tidak di tribe."));
      return { handled: true };
    }
    const gain = Math.floor(Math.random() * 20) + 10;
    my.tribe.resources += gain;
    saveConfig(db, gid, cfg);
    await m.reply(claraWrap("Tribe", "Kumpul resources! +" + gain + "\nTotal resources: " + my.tribe.resources));
    return { handled: true };
  }

  if (sub === "upgrade" || sub === "tingkatkan") {
    const my = findUserTribe();
    if (!my) {
      await m.reply(claraWrap("Tribe", "Kamu tidak di tribe."));
      return { handled: true };
    }
    const type = (args[2] || "").toLowerCase();
    const cost = 50;
    if (my.tribe.resources < cost) {
      await m.reply(claraWrap("Tribe", "Resources tidak cukup! Butuh " + cost + ", punya " + my.tribe.resources + "."));
      return { handled: true };
    }
    if (type === "attack" || type === "serang") {
      my.tribe.resources -= cost;
      my.tribe.attackPower += 10;
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Tribe", "Attack power naik! +10\nAttack: " + my.tribe.attackPower + " | Resources: " + my.tribe.resources));
    } else if (type === "defense" || type === "pertahanan") {
      my.tribe.resources -= cost;
      my.tribe.defensePower += 10;
      saveConfig(db, gid, cfg);
      await m.reply(claraWrap("Tribe", "Defense power naik! +10\nDefense: " + my.tribe.defensePower + " | Resources: " + my.tribe.resources));
    } else {
      await m.reply(claraWrap("Tribe", "Type: attack atau defense\nContoh: " + prefix + "tribe upgrade attack\nCost: " + cost + " resources"));
    }
    return { handled: true };
  }

  if (sub === "info" || sub === "cek") {
    const my = findUserTribe();
    if (!my) {
      await m.reply(claraWrap("Tribe", "Kamu tidak di tribe. Ketik " + prefix + "tribe create/join."));
      return { handled: true };
    }
    const memberList = my.tribe.members.map(jid => "@" + jid.split("@")[0]).join(", ");
    await m.reply(claraWrap("Tribe: " + my.name, [
      "Leader: @" + my.tribe.leader.split("@")[0],
      "Members: " + my.tribe.members.length + "/" + MAX_MEMBERS,
      "Territory: " + my.tribe.territory,
      "Resources: " + my.tribe.resources,
      "Attack: " + my.tribe.attackPower + " | Defense: " + my.tribe.defensePower,
      "Wins: " + my.tribe.wins + " | Losses: " + my.tribe.losses,
      "",
      "Members: " + memberList,
    ].join("\n")), { mentions: my.tribe.members });
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar" || !sub) {
    const tribes = Object.values(cfg.tribes);
    if (tribes.length === 0) {
      await m.reply(claraWrap("Tribe", "Belum ada tribe.\n" + prefix + "tribe create <nama> untuk buat."));
      return { handled: true };
    }
    const list = tribes.sort((a, b) => b.territory - a.territory).map((t, i) => (i + 1) + ". " + t.name + " - Territory: " + t.territory + ", Members: " + t.members.length + ", W/L: " + t.wins + "/" + t.losses).join("\n");
    await m.reply(claraWrap("Tribe List", "Ranking:\n" + list));
    return { handled: true };
  }

  if (sub === "warhistory" || sub === "riwayat") {
    const recent = cfg.warHistory.slice(-5).reverse();
    if (recent.length === 0) {
      await m.reply(claraWrap("Tribe", "Belum ada perang."));
      return { handled: true };
    }
    const list = recent.map(w => (w.win ? "WON" : "LOST") + " - " + w.attacker + " vs " + w.defender + " (" + new Date(w.ts).toLocaleDateString("id-ID") + ")").join("\n");
    await m.reply(claraWrap("Tribe War History", "Perang terakhir:\n" + list));
    return { handled: true };
  }

  await m.reply(claraWrap("Tribe", [
    "TRIBE WAR - MINI STRATEGY",
    "",
    prefix + "tribe create <nama> - buat tribe",
    prefix + "tribe join <nama> - gabung tribe",
    prefix + "tribe leave - keluar tribe",
    prefix + "tribe info - cek tribe kamu",
    prefix + "tribe list - ranking semua tribe",
    prefix + "tribe attack <nama> - serang tribe lain",
    prefix + "tribe gather - kumpul resources",
    prefix + "tribe upgrade <attack/defense> - upgrade",
    prefix + "tribe warhistory - riwayat perang",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
