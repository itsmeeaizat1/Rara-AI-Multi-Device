// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Confess Viral — ala TikTok, 6 mode confess anonymous
// .confessviral nomor|mode|pesan

const pluginConfig = {
  name: "confessviral",
  alias: ["confessviral"],
  category: "confess menfess",
  description: "Confes anonymous ala viral TikTok: nembak, kenalan, ndate, pcr, lowkey, dm",
  usage: ".confessviral nomor|mode|pesan",
  example: ".confessviral 6281234567890|nembak|Aku suka kamu",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const MODES = {
  nembak:  { emoji: "🫣",  label: "Nembak",    intro: "aku confess langsung" },
  kenalan: { emoji: "🤙",  label: "Kenalan",    intro: "aku mau kenalan sama kamu" },
  ndate:   { emoji: "🍭",  label: "Ndate",     intro: "aku mau n date sama kamu" },
  pcr:     { emoji: "💘",  label: "PCR",       intro: "aku mau pcr sama kamu" },
  lowkey:  { emoji: "🗝️",  label: "Lowkey",    intro: "aku suka kamu tapi lowkey" },
  dm:      { emoji: "📩",  label: "Slide DM",  intro: "aku slide ke DM kamu" },
};

const OPENERS = [
  "Halo, ada yang mau ngobrol sebentar?",
  "Hai, aku liat kamu dan pengen kenalan",
  "Halo, gak apa-apa kan aku cerita sedikit?",
  "Hai, aku mau ngomongin sesuatu yang jujur",
  "Halo, ini anonim kok, santai aja",
  "Hai, ada yang pengen aku sampaikan tapi takut",
  "Halo, kamu gak kenal aku, tapi aku tau kamu",
];

const OUTROS = [
  "Kalo gasuka, bales aja 'ga'. Gaperlu awkward.",
  "Ini anonymous, jadi aman. Gaperlu pressure.",
  "Yang jelas ini jujur, bales engga juga gpp.",
  "Kalo cocok, bisa lanjut chat biasa. Kalo engga, aman.",
  "Gaperlu balas kalo enggak mau. Tetap cool.",
  "Ini cuma confess. Gaperlu drama, oke?",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMessage(mode, pesan, targetName) {
  const md = MODES[mode] || MODES.nembak;
  const opener = pick(OPENERS);
  const outro = pick(OUTROS);
  const name = targetName ? `, *${targetName}*` : "";

  let text = ``
  text += `  Halo${name},\n\n`;
  text += `  ${opener}\n\n`;
  text += `  Aku ${md.intro}.\n\n`;
  text += `  *"${pesan}"*\n\n`;
  text += `  ${outro}\n\n`;
  text += `  🔒 _Pesan ini dikirim secara anonim_\n`;
  text += `  ✉️ _Balas pesan ini untuk membalas_\n\n`;
    return text;
}

if (!global.confessViralData) global.confessViralData = new Map();

import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { novaGameBox, gameCTA } from "../../src/lib/nova-games.js";

function trackViral(senderJid, targetJid, mode) {
  try {
    const db = getDatabase();
    // Sender tracking
    const sender = db.getUser(senderJid) || db.setUser(senderJid);
    if (!sender.confessViralStats) {
      sender.confessViralStats = {
        sent: 0, received: 0,
        nembak: 0, kenalan: 0, ndate: 0, pcr: 0, lowkey: 0, dm: 0,
      };
    }
    sender.confessViralStats.sent = (sender.confessViralStats.sent || 0) + 1;
    if (sender.confessViralStats[mode] !== undefined) {
      sender.confessViralStats[mode] = (sender.confessViralStats[mode] || 0) + 1;
    }
    db.setUser(senderJid, sender);
    // Target tracking
    const target = db.getUser(targetJid) || db.setUser(targetJid);
    if (!target.confessViralStats) {
      target.confessViralStats = {
        sent: 0, received: 0,
        nembak: 0, kenalan: 0, ndate: 0, pcr: 0, lowkey: 0, dm: 0,
      };
    }
    target.confessViralStats.received = (target.confessViralStats.received || 0) + 1;
    db.setUser(targetJid, target);
    db.save();
  } catch (e) {
    console.error("[confessviral] Tracking error:", e.message);
  }
}

async function handler(m, { sock }) {
  try {
    const raw = m.fullArgs?.trim() || m.text?.trim() || "";

    if (!raw || !raw.includes("|")) {
      const modeLines = Object.entries(MODES).map(([k, v]) => `${v.emoji} ${k} — ${v.label}`);
      await m.reply(claraWrap("confessviral", [
        `Confess anonymous ala viral TikTok.`,
        ``,
        `📌 Format: ${m.prefix}confessviral <nomor>|<mode>|<pesan>`,
        ``,
        `Mode tersedia:`,
        ...modeLines,
        ``,
        `💡 Contoh: ${m.prefix}confessviral 6281234567890|nembak|Aku suka kamu`,
        ``,
        `🤫 Identitas 100% anonim dan aman`,
      ]));
      return;
    }

    const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) {
      await m.reply(claraWrap("confessviral", `Format salah! Butuh 3 bagian.\n\n💡 Format: ${m.prefix}confessviral <nomor>|<mode>|<pesan>`, "error"));
      return;
      return;
    }

    const [numberRaw, modeRaw, ...rest] = parts;
    const number = String(numberRaw).replace(/\D+/g, "");
    const mode = String(modeRaw).toLowerCase().trim();
    const pesan = rest.join("|").trim();

    if (!number) {
      await m.reply(claraWrap("confessviral", "Nomor tujuan kosong nih!", "error"));
      return;
    }

    if (!MODES[mode]) {
      const modeLines = Object.entries(MODES).map(([k, v]) => `${v.emoji} ${k}`);
      await m.reply(claraWrap("confessviral", [
        `Mode gak valid nih: ${mode}`,
        ``,
        `Mode tersedia:`,
        ...modeLines,
      ]));
      return;
    }

    if (!pesan || pesan.length < 5) {
      await m.reply(claraWrap("confessviral", "Pesan kosong atau kependekan nih! Minimal 5 karakter.", "error"));
      return;
    }

    if (pesan.length > 1000) {
      await m.reply(claraWrap("confessviral", "Pesan kepanjangan! Maksimal 1000 karakter.", "error"));
      return;
    }

    // Normalize number
    let targetNumber = number;
    if (targetNumber.startsWith("0")) {
      targetNumber = "62" + targetNumber.slice(1);
    }

    if (targetNumber.length < 10 || targetNumber.length > 15) {
      await m.reply(claraWrap("confessviral", "Nomor tidak valid!", "error"));
      return;
    }

    const targetJid = targetNumber + "@s.whatsapp.net";

    if (targetJid === m.sender) {
      await m.reply(claraWrap("confessviral", "Nggak bisa confess ke diri sendiri! 😂", "error"));
      return;
    }

    // Cek nomor WA
    let targetName = "";
    try {
      const [onWa] = await sock.onWhatsApp(targetNumber);
      if (!onWa?.exists) {
        await m.reply(claraWrap("confessviral", `Nomor ${targetNumber} nggak terdaftar di WhatsApp!`, "error"));
        return;
      }
      targetName = onWa?.name || onWa?.notify || "";
    } catch (e) {
      console.error("[confessviral] onWhatsApp check:", e.message);
    }

    // Build & send
    const msgText = buildMessage(mode, pesan, targetName);

    try {
      const sentMsg = await sock.sendMessage(targetJid, {
        text: msgText,
        contextInfo: { forwardingScore: 0, isForwarded: false },
      });

      // Simpan untuk reply handler
      global.confessViralData.set(sentMsg.key.id, {
        senderJid: m.sender,
        senderChat: m.chat,
        targetJid,
        mode,
        createdAt: Date.now(),
      });

      // Track stats ke database
      trackViral(m.sender, targetJid, mode);

      setTimeout(() => {
        global.confessViralData.delete(sentMsg.key.id);
      }, 24 * 60 * 60 * 1000);

      const md = MODES[mode];
      const lines = [
        `│ • 📱 Ke : ${targetNumber}`,
        `│ • 🎯 Mode : ${md.label}`,
        "│ • 🔒 Status : Anonim",
        "│ • ✉️ Kalau dia balas, otomatis diterusin ke sini",
      ];
      if (targetName) lines.splice(2, 0, `│ • 👤 Nama : ${targetName}`);
      await m.reply(novaGameBox({
        title: "confess terkirim", icon: md.emoji,
        flavor: `${md.emoji} *CONFESS TERKIRIM!*`,
        body: lines.join("\n"),
        cta: gameCTA("confessviral"),
      }));
      await m.react(md.emoji);
    } catch (sendErr) {
      console.error("[confessviral] Send error:", sendErr.message);
      await m.reply(claraWrap("confessviral", `Gagal kirim: ${sendErr.message}`, "error"));
    }
  } catch (e) {
    console.error("[confessviral] Handler error:", e.message);
  }
}

async function replyHandler(m, { sock }) {
  try {
    if (!m.quoted) return false;

    const quotedId = m.quoted?.id || m.quoted?.key?.id;
    if (!quotedId) return false;

    const info = global.confessViralData.get(quotedId);
    if (!info) return false;

    if (m.sender !== info.targetJid) return false;

    const replyMessage = m.body?.trim();
    if (!replyMessage) return false;

    const md = MODES[info.mode] || MODES.nembak;

    let replyText = ``
    replyText += `💕 Orang yang kamu confess (${md.emoji} ${md.label}) balas!\n\n`;
    replyText += `  💬 *isi balasan:*\n`;
    replyText += `  \`\`\`${replyMessage}\`\`\`\n\n`;
    replyText += `  🔒 _Identitas kamu tetap anonim_\n\n`;
    
    await sock.sendMessage(info.senderChat, {
      text: replyText,
      contextInfo: { forwardingScore: 0, isForwarded: false },
    });

    await m.reply(claraWrap("confessviral", "Balasan terkirim ke pengirim!"));

    global.confessViralData.delete(quotedId);
    return true;
  } catch (e) {
    console.error("[confessviral] Reply handler error:", e.message);
    return false;
  }
}

export { pluginConfig as config, handler, replyHandler };
