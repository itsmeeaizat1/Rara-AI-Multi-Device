// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rizzmeter",
  alias: ["rizzmeter"],
  category: "smart",
  description: "Rizz meter - ukur level karisma/rizz kamu (Gen Z viral)",
  usage: ".rizzmeter [@target]",
  example: ".rizzmeter",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const RIZZ_TIERS = [
  { min: 0, max: 10, title: "Negative Rizz", emoji: "💀", desc: "Bukan rizz, tapi anti-rizz. Setiap kamu buka mulut, orang mundur 3 langkah." },
  { min: 11, max: 20, title: "L Rizz", emoji: "L", desc: "L rizz detected. Jangan nyoba deketin orang dulu, heal dulu." },
  { min: 21, max: 35, title: "Cope Rizz", emoji: "Cope", desc: "Rizz masih copium level. Coba practice di depan cermin." },
  { min: 36, max: 50, title: "Mid Rizz", emoji: "Mid", desc: "Lumayan, bisa ngobrol. Tapi belum ada yang kepincut." },
  { min: 51, max: 65, title: "Decent Rizz", emoji: "Decent", desc: "Oke lah, mulai ada yang notice kamu. Keep going!" },
  { min: 66, max: 75, title: "W Rizz", emoji: "W", desc: "W rizz! Kamu bisa bikin orang senyum tanpa usaha." },
  { min: 76, max: 85, title: "God Tier Rizz", emoji: "God", desc: "Rizz kamu god tier. Orang ngerasa spesial di deket kamu." },
  { min: 86, max: 95, title: "Sigma Rizz", emoji: "Sigma", desc: "Sigma rizz. Kamu ambisius, mysterious, dan irresistible." },
  { min: 96, max: 100, title: "MAXXX RIZZ", emoji: "MAXXX", desc: "Rizz udah level mythic. Semua orang auto jatuh cinta." },
];

const RIZZ_LINES = [
  "Kalo kamu bintang, aku pengen jadi langit buat nahan kamu.",
  "Kamu suka kopi? Soalnya aku suka kamu dan kita bisa blend.",
  "Aku bukan alien, tapi aku baru aja jatuh dari surga buat kamu.",
  "Kamu punya map? Soalnya aku nyasar di mata kamu.",
  "Kalo kamu WiFi, aku pasti udah connect dari tadi.",
  "Kamu suka matematika? Soalnya aku + kamu = sempurna.",
  "Aku bukan kamera, tapi aku selalu focus ke kamu.",
  "Kamu bukan Google, tapi kamu punya semua yang aku cari.",
  "Kalo kamu hujan, aku rela basah di depan rumah kamu.",
  "Kamu suka game? Soalnya kamu udah unlock level hati aku.",
];

const ROAST_LINES = [
  "Rizz kamu selemah sinyal di mall basement.",
  "Coba deketin orang dulu, jangan cuma deketin bot.",
  "Rizz kamu cuma berlaku di WhatsApp, real life? Hmmm.",
  "Selemah itu rizz, bahkan AI aja nolak.",
  "Coba comb rambut dulu, siapa tau rizz naik.",
  "Rizz kamu se-mid kuota 1GB di akhir bulan.",
];

function getConfig(db, gid) {
  const all = db.setting("rizzmeter") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("rizzmeter") || {};
  all[gid] = data;
  db.setting("rizzmeter", all);
  db.save();
}

function todayDate() {
  return new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const gid = m.chat;
  const cfg = getConfig(db, gid);
  const today = todayDate();

  // Check if mentioned someone
  const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid[0] : m.sender;
  const isSelf = mentioned === m.sender;

  // Reset daily per user
  if (!cfg[mentioned]) cfg[mentioned] = {};
  if (cfg[mentioned].lastCheck !== today) {
    cfg[mentioned].lastCheck = today;
    cfg[mentioned].score = null;
    cfg[mentioned].checkedToday = false;
  }

  if (cfg[mentioned].checkedToday) {
    const tier = RIZZ_TIERS.find(t => cfg[mentioned].score >= t.min && cfg[mentioned].score <= t.max);
    await m.reply(claraWrap("Rizz Meter", [
      (isSelf ? "Kamu" : "@" + mentioned.split("@")[0]) + " udah dicek hari ini!",
      "Score: " + cfg[mentioned].score + "/100",
      "Tier: " + (tier?.emoji || "") + " " + (tier?.title || "?"),
      "",
      "Cek lagi besok ya!",
    ].join("\n")), { mentions: [mentioned] });
    return { handled: true };
  }

  // Calculate rizz score
  const user = db.getUser(mentioned);
  const hour = new Date().getHours();
  const nameHash = (mentioned.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 20;
  const activityBonus = Math.min(15, ((user?.totalCommands || 0) % 15));
  const timeBonus = (hour >= 19 && hour <= 23) ? 15 : (hour >= 7 && hour <= 11) ? 10 : 5;
  const rngScore = Math.floor(Math.random() * 50) + nameHash;
  const score = Math.min(100, Math.max(0, rngScore + activityBonus + timeBonus - 5));

  const tier = RIZZ_TIERS.find(t => score >= t.min && score <= t.max) || RIZZ_TIERS[0];
  const bar = "▰".repeat(Math.floor(score / 10)) + "▱".repeat(10 - Math.floor(score / 10));

  // Pick response line based on score
  let pickUpLine = "";
  let roastLine = "";
  if (score >= 60) {
    pickUpLine = "Rizz line kamu:\n" + RIZZ_LINES[Math.floor(Math.random() * RIZZ_LINES.length)];
  } else if (score <= 30) {
    roastLine = "Roast:\n" + ROAST_LINES[Math.floor(Math.random() * ROAST_LINES.length)];
  }

  cfg[mentioned].score = score;
  cfg[mentioned].checkedToday = true;
  cfg[mentioned].tier = tier.title;
  saveConfig(db, gid, cfg);

  await m.reply(claraWrap("Rizz Meter", [
    (isSelf ? "" : "@" + mentioned.split("@")[0] + " - "),
    "Score: " + score + "/100",
    "[" + bar + "]",
    "",
    "Tier: " + tier.emoji + " " + tier.title,
    tier.desc,
    "",
    pickUpLine || roastLine || "",
    "",
    "Cek lagi besok buat rizz baru!",
  ].join("\n")), { mentions: [mentioned] });
  return { handled: true };
}

export { pluginConfig as config, handler };
