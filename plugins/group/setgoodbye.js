// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "setgoodbye",
  alias: ["setgoodbye"],
  category: "group",
  description: "Set custom goodbye message",
  usage: ".setgoodbye <pesan>",
  example: ".setgoodbye Bye {user}, sampai jumpa lagi!",
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
  const text = m.text || m.args.join(" ");

  if (!text) {
    return m.reply(raraWrap("setgoodbye", [
      "Set pesan goodbye custom buat grup ini.",
      "",
      `📌 Format: ${m.prefix}setgoodbye <pesan>`,
      "",
      "Placeholder yang bisa dipakai:",
      "{user} : Nama member yang keluar",
      "{number} : Nomor member",
      "{group} : Nama grup",
      "{desc} : Deskripsi grup",
      "{count} : Sisa member",
      "{owner} : Nama owner grup",
      "{date} : Tanggal (DD/MM/YYYY)",
      "{time} : Waktu (HH:mm WIB)",
      "{day} : Hari (Senin, Selasa, dll)",
      "{bot} : Nama bot",
      "{prefix} : Prefix bot",
      "",
      `💡 Contoh: ${m.prefix}setgoodbye Bye {user}! Sampai jumpa lagi pada {day}, {date}`,
    ]));
  }

  db.setGroup(m.chat, { goodbyeMsg: text, goodbye: true, leave: true });
  db.save();
  await m.reply(raraWrap("setgoodbye", [
    "Pesan goodbye berhasil di set!",
    "",
    `📌 Isi : ${text}`,
    "",
    `💡 Mau balikin ke default? Ketik ${m.prefix}resetgoodbye`,
  ], "success"));
}

export { pluginConfig as config, handler };
