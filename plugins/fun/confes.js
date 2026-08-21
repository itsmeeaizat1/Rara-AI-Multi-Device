// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { claraHeader,
    separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "confes",
  alias: ["confes", "confessionv2", "confesv2"],
  category: "fun",
  description: "Confes anonymous ala viral TikTok: nembak, kenalan, ndate, pcr",
  usage: ".confes <nomor>|<mode>|<pesan>",
  example: ".confes 6281234567890|nembak|Aku suka kamu",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

const modes = {
  nembak: { emoji: "🫣", label: "Nembak", intro: "aku confess langsung" },
  kenalan: { emoji: "🤙", label: "Kenalan", intro: "aku mau kenalan" },
  ndate: { emoji: "🍭", label: "Ndate", intro: "aku mau n date kamu" },
  pcr: { emoji: "💘", label: "PCR", intro: "aku mau pcr sama kamu" },
  lowkey: { emoji: "🗝️", label: "Lowkey", intro: "aku suka kamu tapi lowkey" },
  dm: { emoji: "📩", label: "Slide DM", intro: "aku slide ke DM kamu" },
};

const randomOpeners = [
  "Halo, ada yang mau ngobrol sebentar?",
  "Hai, aku liat kamu dan pengen kenalan",
  "Halo, gak apa-apa kan aku cerita sedikit?",
  "Hai, aku mau ngomongin sesuatu yang jujur",
  "Halo, ini anonim kok, santai aja",
  "Hai, ada yang pengen aku sampaikan tapi takut dong",
  "Halo, kamu kaga kenalan aku, tapi aku tau kamu",
];

const randomOutros = [
  "Kalo gasuka, bales aja 'ga'. Gaperlu awkward.",
  "Ini anonymous, jadi aman. Gaperlu pressure.",
  "Yang jelas ini jujur, bales engga juga gpp.",
  "Kalo cocok, bisa lanjut chat biasa. Kalo engga, aman.",
  "Gaperlu balas kalo enggak mau. Tetap cool.",
  "Ini cuma confess. Gaperlu drama, oke?",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildAnonymousMessage(mode, pesan, targetName) {
  const modeData = modes[mode] || modes.nembak;
  const opener = pickRandom(randomOpeners);
  const outro = pickRandom(randomOutros);
  const name = targetName ? `, *${targetName}*` : "";

  return (
    `*${modeData.emoji} ${modeData.label}*\n\n` +
    `Halo${name},\n\n` +
    `${opener}\n\n` +
    `Aku ${modeData.intro}.\n\n` +
    `*"${pesan}"*\n\n` +
    `${outro}`
  );
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() ?? "";

    if (!raw || !raw.includes("|")) {
      const modeList = Object.entries(modes)
        .map(([k, v]) => `${v.emoji} ${v.label}`)
        .join(", ");

      const text =
        claraWrap("Confes", [`  ┊  ➶ Penggunaan: *${prefix}confes <nomor>|<mode>|<pesan>*`,
          `  ┊  ➶ Contoh: *${prefix}confes 6281234567890|nembak|Aku suka kamu*`].join("\n")) +
        "\n" +
        claraWrap("Mode", ["🫣 nembak", "🤙 kenalan", "🍭 ndate", "💘 pcr", "🗝️ lowkey", "📩 dm"].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Mode: ${modeList}`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "confes");
      return { handled: true };
    }

    const parts = raw.split("|").map((item) => item.trim()).filter(Boolean);
    if (parts.length < 3) {
      const text =
        claraWrap("Gagal", ["  ┊  ➶ Alasan: *Format salah*",
          `  ┊  ➶ Contoh: *${prefix}confes 6281234567890|nembak|Aku suka kamu*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(claraWrap("confes", text));
      return { handled: true };
    }

    const [numberRaw, modeRaw, ...rest] = parts;
    const number = String(numberRaw).replace(/\D+/g, "");
    const mode = String(modeRaw).toLowerCase();
    const pesan = rest.join("|");

    if (!number || !modes[mode] || !pesan) {
      const text =
        claraWrap("Gagal", ["  ┊  ➶ Alasan: *Mode tidak valid atau pesan kosong*",
          `  ┊  ➶ Contoh: *${prefix}confes 6281234567890|nembak|Aku suka kamu*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "confes");
      return { handled: true };
    }

    const targetJid = number.includes("@") ? number : `${number}@s.whatsapp.net`;
    let targetName = "";
    try {
      const contact = await sock.onWhatsApp(targetJid);
      targetName = contact?.name || contact?.notify || "";
    } catch {
      targetName = "";
    }

    const anonymousText = buildAnonymousMessage(mode, pesan, targetName);

    await sock.sendMessage(targetJid, {
      text: anonymousText,
    }).catch((e) => { console.error('[confes.js]:', e.message); });

    const modeData = modes[mode] || modes.nembak;
    const receipt =
      claraWrap("Terkirim", "💘") +
      "\n\n" +
      claraWrap(modeData.label, [
        `  ┊  ➶ Ke: *${targetJid}*`,
        `  ┊  ➶ Mode: *${modeData.label}*`,
        `  ┊  ➶ Status: *Terkirim*`,
      ]) +
      "\n\n" +
      separator("━", 22) +
      "\n" +
      tipText(`Nama orangnya: *${targetName || "tidak diketahui"}*`) +
      "\n" +
      tipText(`Ketik ${prefix}confes untuk confess lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(receipt);
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "confes");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
