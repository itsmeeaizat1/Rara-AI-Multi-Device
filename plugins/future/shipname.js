// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "shipname",
  alias: ["shipname"],
  category: "future",
  description: "Ship name - combine 2 nama jadi couple name + compatibility",
  usage: ".shipname @user1 @user2",
  example: ".shipname @user1 @user2",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const SHIP_LABELS = [
  { min: 0, max: 10, label: "SANGAT TOXIC", emoji: "💀", desc: "Hindari. Hubungan ini merusak keduanya." },
  { min: 11, max: 25, label: "Red Flag Central", emoji: "🚩", desc: "Banyak tanda bahaya. Jalankan saja." },
  { min: 26, max: 40, label: "Kurang Cocok", emoji: "😬", desc: "Bisa jalan, tapi banyak perjuangan." },
  { min: 41, max: 55, label: "Lumayan", emoji: "😐", desc: "Tidak buruk, tidak hebat. Biasa saja." },
  { min: 56, max: 70, label: "Cocok", emoji: "😊", desc: "Percayalah, ada potensi di sini!" },
  { min: 71, max: 85, label: "Sangat Cocok", emoji: "💕", desc: "Kalian adalah pasangan yang hebat!" },
  { min: 86, max: 95, label: "SOULMATE", emoji: "💖", desc: "Dibuat untuk bersama. Tidak ada yang bisa menghalangi kalian." },
  { min: 96, max: 100, label: "DESTINED TOGETHER", emoji: "💞", desc: "Kalian ditakdirkan! Tingkat mitos!" },
];

const CHEMISTRY_REASONS = [
  "Kedua nama memiliki frekuensi yang harmonis.",
  "Vokal kalian seimbang, menandakan kestabilan.",
  "Konsonan kalian saling melengkapi.",
  "Nilai numerik nama kalian memiliki resonansi.",
  "Karakter pertama kalian memiliki kecocokan.",
  "Panjang nama kalian sepadan.",
  "Huruf unik kalian menciptakan chemistry.",
  "Ritme nama kalian sinkron.",
  "Inisial kalian melengkapi satu sama lain.",
  "Aura kalian bertemu di dimensi yang sama.",
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function makeShipName(name1, name2) {
  // Portmanteau: first half of name1 + second half of name2
  const mid1 = Math.ceil(name1.length / 2);
  const mid2 = Math.floor(name2.length / 2);
  const part1 = name1.slice(0, mid1);
  const part2 = name2.slice(mid2);
  const ship = part1 + part2;
  // Capitalize
  return ship.charAt(0).toUpperCase() + ship.slice(1).toLowerCase();
}

function getCompatibility(name1, name2) {
  const seed = hashString(name1 + name2 + name2 + name1);
  // Base score from hash
  let score = seed % 100;
  // Boost based on shared characters
  const set1 = new Set(name1.toLowerCase().split(""));
  const set2 = new Set(name2.toLowerCase().split(""));
  const shared = [...set1].filter(c => set2.has(c)).length;
  score += shared * 3;
  // Length similarity
  const diff = Math.abs(name1.length - name2.length);
  score -= diff * 2;
  // Clamp
  score = Math.max(0, Math.min(100, score));
  return score;
}

function getConfig(db, gid) {
  const all = db.setting("shipname") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("shipname") || {};
  all[gid] = data;
  db.setting("shipname", all);
  db.save();
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const gid = m.chat;

  const mentioned = m.mentionedJid && m.mentionedJid.length >= 2 ? m.mentionedJid : null;
  if (!mentioned) {
    await m.reply(claraWrap("Ship Name", "Tag 2 orang!\n💡 *Contoh:* " + prefix + "shipname @user1 @user2"));
    return { handled: true };
  }

  const jid1 = mentioned[0];
  const jid2 = mentioned[1];
  const num1 = jid1.split("@")[0];
  const num2 = jid2.split("@")[0];

  const shipName = makeShipName(num1, num2);
  const compat = getCompatibility(num1, num2);
  const label = SHIP_LABELS.find(l => compat >= l.min && compat <= l.max) || SHIP_LABELS[0];
  const reason = CHEMISTRY_REASONS[hashString(num1 + num2) % CHEMISTRY_REASONS.length];

  // Save to history
  const cfg = getConfig(db, gid);
  if (!cfg.history) cfg.history = [];
  cfg.history.push({ jid1, jid2, shipName, compat, ts: Date.now() });
  saveConfig(db, gid, cfg);

  const bar = "█".repeat(Math.floor(compat / 10)) + "░".repeat(10 - Math.floor(compat / 10));

  await m.reply(claraWrap("Ship Name", [
    "Ship: " + shipName,
    "",
    "@" + num1 + " x @" + num2,
    "",
    "Compatibility: " + compat + "%",
    "[" + bar + "]",
    "",
    label.emoji + " " + label.label,
    label.desc,
    "",
    "Chemistry: " + reason,
  ].join("\n")), { mentions: [jid1, jid2] });
  return { handled: true };
}

export { pluginConfig as config, handler };
