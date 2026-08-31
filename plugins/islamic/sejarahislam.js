// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "sejarahislam",
  alias: ["sejarahislam"],
  category: "islami",
  description: "Sejarah Islam & info surat Al-Quran dari API online",
  usage: ".sejarahislam <topik>",
  example: ".sejarahislam info 2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const EQURAN_API = "https://equran.id/api/surat";
const ALQURAN_API = "https://api.alquran.cloud/v1";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const action = args[0];

    if (!action) {
      let txt = "╭──「 *Perintah:* 」\n│\n";
      txt += "╰──────────\n";
      txt += "Surat: *" + s.nama_latin + "* (" + s.nama + ")\n";
      txt += "Arti: " + s.arti + "\n";
      txt += "Nomor: " + s.nomor + "\n";
      txt += "Jumlah Ayat: " + s.jumlah_ayat + "\n";
      txt += "Tempat Turun: " + (s.tempat_turun === "mekah" ? "Mekkah" : "Madinah") + "\n\n";
      txt += "*Sejarah & Keterangan:*\n" + s.deskripsi.replace(/<[^>]*>/g, "") + "\n\n";
      txt += "Sumber: equran.id API";
      return await m.reply(txt);
    }

    // DAFTAR SURAT
    if (action === "daftarsurat" || action === "list") {
      const allSurah = await fetchJson(EQURAN_API);
      let txt = "╭──「 *DAFTAR 114 SURAT* 」\n│\n";
      txt += "╰──────────\n\n";

      for (let i = 0; i < allSurah.length; i++) {
        const s = allSurah[i];
        txt += s.nomor + ". " + s.nama_latin + " (" + s.jumlah_ayat + " ayat, " + (s.tempat_turun === "mekah" ? "Mekkah" : "Madinah") + ")\n";
      }

      txt += "\nInfo detail: .sejarahislam info <nomor>";
      return await m.reply(txt);
    }

    // FILTER TURUN
    if (action === "turun") {
      const tempat = args[1];
      if (!tempat || (tempat !== "mekah" && tempat !== "madinah")) {
        return m.reply(claraWrap("Sejarahislam", "Pilih: mekah atau madinah\n💡 *Contoh:* .sejarahislam turun mekah"));
      }

      const allSurah = await fetchJson(EQURAN_API);
      const filtered = allSurah.filter((s) => s.tempat_turun === tempat);

      let txt = "╭──「 *SURAT TURUN DI " + (tempat === "mekah" ? "MEKKAH" : "MADINAH") + "* 」\n│\n";
      txt += "╰──────────\n";
      txt += "Total: " + filtered.length + " surat\n\n";

      for (const s of filtered) {
        txt += s.nomor + ". " + s.nama_latin + " (" + s.jumlah_ayat + " ayat)\n";
      }

      txt += "\nInfo detail: .sejarahislam info <nomor>";
      return await m.reply(txt);
    }

    return m.reply(claraWrap("Sejarahislam", "Perintah tidak valid!\n\nKetik .sejarahislam buat lihat semua perintah."));
  } catch (error) {
    return m.reply(claraWrap("Error", "\u274c " + error.message + "\n\nCoba lagi nanti."));
  }
}

export { pluginConfig as config, handler };
