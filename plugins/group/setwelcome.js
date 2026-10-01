// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "setwelcome",
  alias: ["setwelcome"],
  category: "group",
  description: "Set custom welcome message",
  usage: ".setwelcome <pesan>",
  example: ".setwelcome Halo {user}, selamat datang di {group}!",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const text = m.fullArgs?.trim() || m.args.join(" ");

  if (!text) {
    return m.reply(raraWrap("setwelcome", [
      "Set pesan welcome custom buat grup ini.",
      "",
      `📌 Format: ${m.prefix}setwelcome <pesan>`,
      "",
      "Placeholder yang bisa dipakai:",
      "{user} : Nama member yang masuk",
      "{number} : Nomor member",
      "{group} : Nama grup",
      "{desc} : Deskripsi grup",
      "{count} : Total member",
      "{owner} : Nama owner grup",
      "{date} : Tanggal (DD/MM/YYYY)",
      "{time} : Waktu (HH:mm WIB)",
      "{day} : Hari (Senin, Selasa, dll)",
      "{bot} : Nama bot",
      "{prefix} : Prefix bot",
      "",
      `💡 Contoh: ${m.prefix}setwelcome Halo {user}! Selamat datang di {group} pada {day}, {date}`,
    ]));
  }

  db.setGroup(m.chat, { welcomeMsg: text, welcome: true });
  db.save();
  await m.reply(raraWrap("setwelcome", [
    "Pesan welcome berhasil di set!",
    "",
    `📌 Isi : ${text}`,
    "",
    `💡 Mau balikin ke default? Ketik ${m.prefix}resetwelcome`,
  ], "success"));
}

export { pluginConfig as config, handler };
