// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "weton", alias: ["neptu", "pasaran"], category: "fun",
  description: "Hitung weton Jawa & neptu", usage: ".weton <DD-MM-YYYY>",
  example: ".weton 17-08-1945", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 5, energi: 0, isEnabled: true,
};

const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const HARI_NEPTU = [5,4,3,7,8,9,7];
const PASARAN = ["Legi","Pahing","Pon","Wage","Kliwon"];
const PASARAN_NEPTU = [9,9,7,4,8];

function getPasaran(date) {
  const epoch = new Date(1900, 0, 1);
  const diff = Math.floor((date - epoch) / 86400000);
  return PASARAN[(diff % 5 + 5) % 5];
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const input = m.text?.trim();
    if (!input) {
      await sendReplyWithNav(sock, m, claraWrap("Weton Jawa", [`◦ Penggunaan: *${prefix}weton <DD-MM-YYYY>*`,
        `◦ Contoh: *${prefix}weton 17-08-1945*`].join("\n")), "weton");
      return { handled: true };
    }
    const parts = input.split(/[-/]/).map(Number);
    if (parts.length < 3) throw new Error("Format tanggal salah");
    const date = new Date(parts[2], parts[1]-1, parts[0]);
    if (isNaN(date)) throw new Error("Tanggal tidak valid");
    const hariIdx = date.getDay();
    const hari = HARI[hariIdx];
    const pasaran = getPasaran(date);
    const neptuHari = HARI_NEPTU[hariIdx];
    const neptuPasaran = PASARAN_NEPTU[PASARAN.indexOf(pasaran)];
    const total = neptuHari + neptuPasaran;
    let sifat;
    if (total <= 8) sifat = "Lemu (lembut, sabar)";
    else if (total <= 16) sifat = "Pati (tegas, kuat)";
    else sifat = "Pegat (pemisah, berubah-ubah)";
    
    await m.reply(claraWrap("Weton Jawa", [`◦ Tanggal: *${date.toLocaleDateString("id-ID")}*`,
      `◦ Hari: *${hari}* (neptu: ${neptuHari})`,
      `◦ Pasaran: *${pasaran}* (neptu: ${neptuPasaran})`,
      `◦ Total Neptu: *${total}*`,
      `◦ Sifat: *${sifat}*`].join("\n")) + "\n" + tipText(`Ketik ${prefix}menu untuk kembali`));
  } catch (e) {
    await m.reply(claraWrap("Gagal", [`◦ ${e.message}`].join("\n")));
  }
  return { handled: true };
}
export { pluginConfig as config, handler };