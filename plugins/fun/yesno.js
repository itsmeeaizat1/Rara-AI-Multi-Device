// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "yesno",
  alias: ["yesno"],
  category: "fun",
  description: "Decision maker dramatis dengan animasi suspense",
  usage: ".yesno <pertanyaan>",
  example: ".yesno hari ini harus makan seblak?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const ANSWERS = [
  { type: "yes", text: "IYA, gas aja! Jangan ragu lagi." },
  { type: "yes", text: "100% IYA. Semesta udah kasih lampu hijau." },
  { type: "yes", text: "Yoi, lakuin sekarang juga!" },
  { type: "yes", text: "Iya banget. Taruh aja dulu, nanti juga kelar." },
  { type: "yes", text: "Pasti iya. Jangan overthinking." },
  { type: "yes", text: "Iya, dan kamu bakal nyesel kalo gak lakuin." },
  { type: "yes", text: "Big YES. Nggak perlu dipikir dua kali." },
  { type: "no", text: "JANGAN. percaya aja, hari ini bukan harinya." },
  { type: "no", text: "Nope. Simpan energi buat hal lain." },
  { type: "no", text: "Gak. Jangan lakuin. Mentang-mentang bisa, bukan berarti harus." },
  { type: "no", text: "Tidak. Besok aja, gak harus hari ini." },
  { type: "no", text: "Batal. Niat aja gak kuat, jangan dipaksain." },
  { type: "no", text: "No. Bad idea, bro/sis." },
  { type: "no", text: "Ditolak mentah-mentah oleh semesta." },
  { type: "maybe", text: "Hmm... tergantung. Gak bisa dipastikan sekarang." },
  { type: "maybe", text: "Bisa iya bisa tidak. Tanya lagi besok." },
  { type: "maybe", text: "Tergantung mood. Coba cek perasaan kamu dulu." },
  { type: "maybe", text: "50/50. Lem koin aja, hasilnya sama." },
  { type: "maybe", text: "Entahlah. Gak ada yang tahu pasti." },
  { type: "maybe", text: "Sistem error. Coba tanya dengan kalimat berbeda." },
];

function pickAnswer() {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
}

function getEmoji(type) {
  if (type === "yes") return "🟢";
  if (type === "no") return "🔴";
  return "🟡";
}

async function handler(m, { sock, config: botConfig, text: args }) {
  const prefix = botConfig?.command?.prefix || ".";

  let question = args;
  if (!question && m.quoted) question = m.quoted.text;

  if (!question || question.trim().length < 3) {
    const help = claraWrap("YesNo", [
      `│ ❏ Decision maker dramatis`,
      ``,
      `│ ❏ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*`,
      `  ${prefix}yesno <pertanyaan>`,
      `  ${prefix}yesno harus aku terima tawaran kerja ini?`,
      ``,
      `│ ❏ Hasil: YES / NO / MAYBE + alasan random`,
      `│ ❏ 20+ jawaban variatif, dramatis, kadang absurd`,
    ].join("\n"));
    return m.reply(help, "yesno");
  }

  await m.react("🕒");

  await new Promise(r => setTimeout(r, 1200));

  const answer = pickAnswer();
  const emoji = getEmoji(answer.type);
  const label = answer.type === "yes" ? "YES" : answer.type === "no" ? "NO" : "MAYBE";

  const result = [
    `Pertanyaan: "${question.trim()}"`,
    ``,
    `${emoji} JAWABAN: ${label}`,
    ``,
    `${answer.text}`,
    ``,
    `_Putusan dari semesta, bukan sumber resmi ya :v_`,
  ].join("\n");

  await m.reply(claraWrap("YesNo", result));
  await m.react("🐣");

  return { handled: true };
}

export { pluginConfig as config, handler };
