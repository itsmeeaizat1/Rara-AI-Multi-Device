// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, toSC, bracketBox, tipText } from "../../src/lib/nova-menu-style.js";
import { getBirthday, setBirthday } from "../../src/lib/nova-auto-birthday.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "setultah",
  alias: ["setultah", "setbirthday", "ultah"],
  category: "user",
  description: "Set tanggal lahir untuk auto birthday reminder",
  usage: ".setultah DD-MM (atau DD-MM-YYYY)",
  example: ".setultah 15-08-2005",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text?.trim();

  if (!text) {
    const db = getDatabase();
    const existing = getBirthday(m.sender);

    let infoLines = [
      `${toSC("Set tanggal lahir untuk dapat ucapan ultah otomatis")}`,
      "",
      `${toSC("Format")}: DD-MM atau DD-MM-YYYY`,
    ];

    if (existing) {
      infoLines.splice(1, 0, `${toSC("Tanggal lahir kamu")}: ${existing.birthdayDisplay || existing.birthday}`);
      infoLines.splice(2, 0, "");
    }

    infoLines.push("", `${toSC("Contoh")}:`, `${m.prefix}setultah 15-08`, `${m.prefix}setultah 15-08-2005`);

    return m.reply(bracketBox("🎂", toSC("Set Tanggal Lahir"), infoLines));
  }

  // Parse input — accept DD-MM or DD-MM-YYYY
  const match = text.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{4}))?$/);

  if (!match) {
    await m.react("❗");
    return m.reply(
      bracketBox("❗", toSC("Format Tidak Valid"), [
        `${toSC("Gunakan format DD-MM atau DD-MM-YYYY")}`,
        `${toSC("Contoh")}: ${m.prefix}setultah 15-08`,
        `${m.prefix}setultah 15-08-2005`,
      ])
    );
  }

  const [, day, month, year] = match;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = year ? parseInt(year) : null;

  // Validate
  if (monthNum < 1 || monthNum > 12) {
    await m.react("❗");
    return m.reply(claraWrap("setultah", "Bulan gak valid! (1-12)"));
  }

  // Simple day validation
  const maxDays = new Date(yearNum || 2000, monthNum, 0).getDate();
  if (dayNum < 1 || dayNum > maxDays) {
    await m.react("❗");
    return m.reply(claraWrap("setultah", "Tanggal gak valid nih!"));
  }

  // Validate year if provided
  if (yearNum) {
    const currentYear = new Date().getFullYear();
    if (yearNum < 1900 || yearNum > currentYear) {
      await m.react("❗");
      return m.reply(claraWrap("setultah", "Tahun gak valid nih!"));
    }
  }

  // Save
  const birthdayStr = yearNum
    ? `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`
    : `${day.padStart(2, "0")}-${month.padStart(2, "0")}`;

  const result = setBirthday(m.sender, birthdayStr);

  if (!result.success) {
    return m.reply(claraWrap("setultah", "Gagal simpan tanggal lahir nih"));
  }
  const lines = [
    `${toSC("Tanggal lahir tersimpan!")}: ${birthdayStr}`,
    "",
    `${toSC("Bot akan otomatis kirim ucapan ulang tahun")}`,
    `${toSC("di tanggal")} ${dayNum}/${monthNum} ${toSC("setiap tahun")}`,
  ];

  if (yearNum) {
    const age = new Date().getFullYear() - yearNum;
    lines.push(`${toSC("Umur sekarang")}: ${age} ${toSC("tahun")}`);
  }

  lines.push("", tipText(toSC("Ubah kapan saja dengan .setultah DD-MM")));

  return m.reply(bracketBox("🎂✅", toSC("Tanggal Lahir Disimpan"), lines));
}

export { pluginConfig as config, handler };
