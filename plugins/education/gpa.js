// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ipk",
  alias: ["ipk"],
  category: "education",
  description: "Kalkulator IPK/IPS - hitung IPK semester atau kumulatif",
  usage: ".ipk <command>",
  example: ".ipk add",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

const GRADE_MAP = { "A": 4, "AB": 3.5, "B": 3, "BC": 2.5, "C": 2, "CD": 1.5, "D": 1, "E": 0 };

function getPredicate(ipk) {
  if (ipk >= 3.5) return "Cumlaude (Dengan Pujian)";
  if (ipk >= 3.0) return "Sangat Memuaskan";
  if (ipk >= 2.5) return "Memuaskan";
  if (ipk >= 2.0) return "Cukup";
  return "Kurang";
}

const sessions = new Map();

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Kalkulator IPK/IPS\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}ipk add\` - Mulai input mata kuliah\n`;
    txt += `2. \`${m.prefix}ipk calc\` - Hitung IPK dari input\n`;
    txt += `3. \`${m.prefix}ipk quick <nilai1> <sks1> ...\` - Hitung cepat\n`;
    txt += `4. \`${m.prefix}ipk cancel\` - Batalkan sesi\n\n`;
    txt += `Nilai: A=4, AB=3.5, B=3, BC=2.5, C=2, CD=1.5, D=1, E=0\n\n`;
    txt += `Contoh: \`${m.prefix}ipk quick A 4 B 3 AB 2\``;
    return await m.reply( txt, { commandName: "ipk" });
  }
  try {
    if (cmd === "quick" || cmd === "cepat") {
      const inputArgs = cmdArgs;
      if (inputArgs.length < 2 || inputArgs.length % 2 !== 0) {
        return m.reply(raraWrap("ipk", "Format salah!\n\n💡 *Contoh:* `.ipk quick A 4 B 3 AB 2`\n\nFormat: <nilai> <sks> <nilai> <sks> ..."));
      }
      let totalBobot = 0, totalSKS = 0, details = [];
      for (let i = 0; i < inputArgs.length; i += 2) {
        const grade = inputArgs[i].toUpperCase().replace(".", "");
        const sks = parseInt(inputArgs[i + 1]);
        const bobot = GRADE_MAP[grade];
        totalBobot += bobot * sks;
        totalSKS += sks;
        details.push({ grade, sks, bobot: (bobot * sks).toFixed(1) });
      }
      const ipk = totalBobot / totalSKS;
      let txt = `Hasil Perhitungan IPK\n\nMata Kuliah:\n`;
      for (let i = 0; i < details.length; i++) {
        const d = details[i];
        txt += `${i + 1}. ${d.grade} - ${d.sks} SKS (bobot: ${d.bobot})\n`;
      }
      txt += `\nTotal SKS: ${totalSKS}\nTotal Bobot: ${totalBobot.toFixed(1)}\n`;
      txt += `IPK: *${ipk.toFixed(2)}*\nPredikat: *${getPredicate(ipk)}*\n\n`;
      txt += `_Konversi: A=4, AB=3.5, B=3, BC=2.5, C=2, CD=1.5, D=1, E=0_`;
      await m.reply(raraWrap("IPK", txt));
    }
    else if (cmd === "add" || cmd === "input" || cmd === "tambah") {
      sessions.set(sender, { courses: [], active: true });
      let txt = `Input Mata Kuliah\n\nKirim format:\n<nilai> <sks> <nama matkul (opsional)>\n\n`;
      txt += `Contoh: \`A 4 Kalkulus\`\nAtau: \`A 4\` (tanpa nama)\n\n`;
      txt += `Ketik *done* untuk menghitung\nKetik *cancel* untuk batal`;
      await m.reply(raraWrap("IPK", txt));
    }
    else if (cmd === "cancel" || cmd === "batal") {
      sessions.delete(sender);
      await m.reply(raraWrap("Ipk", "Sesi input IPK dibatalkan."));
    }
    else if (cmd === "calc" || cmd === "hitung" || cmd === "done") {
      const session = sessions.get(sender);
      if (!session || session.courses.length === 0) {
        return m.reply(raraWrap("ipk", "Belum ada mata kuliah yang diinput!\n\nKetik `.ipk add` untuk mulai."));
      }
      let totalBobot = 0, totalSKS = 0;
      let txt = `Hasil Perhitungan IPK\n\nMata Kuliah:\n`;
      for (let i = 0; i < session.courses.length; i++) {
        const c = session.courses[i];
        const bobot = GRADE_MAP[c.grade] * c.sks;
        totalBobot += bobot;
        totalSKS += c.sks;
        txt += `${i + 1}. ${c.grade} - ${c.sks} SKS`;
        if (c.name) txt += ` (${c.name})`;
        txt += ` [bobot: ${bobot.toFixed(1)}]\n`;
      }
      const ipk = totalBobot / totalSKS;
      txt += `\nTotal SKS: ${totalSKS}\nTotal Bobot: ${totalBobot.toFixed(1)}\n`;
      txt += `IPK: *${ipk.toFixed(2)}*\nPredikat: *${getPredicate(ipk)}*`;
      await m.reply(raraWrap("IPK", txt));
      sessions.delete(sender);
    }
    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}ipk help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[IPK] Error:", e.message);
    await m.reply(raraWrap("ipk", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
