// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "hadisnabi",
  alias: ["hadisnabi"],
  category: "islami",
  description: "Hadis Nabi dari 9 perawi (API online, terjemahan Indonesia)",
  usage: ".hadisnabi <perawi> [range/random]",
  example: ".hadisnabi bukhari",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const CDN_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1";

const BOOKS = {
  bukhari: { name: "Sahih Bukhari", ind: "ind-bukhari", ara: "ara-bukhari", sections: 97 },
  muslim: { name: "Sahih Muslim", ind: "ind-muslim", ara: "ara-muslim", sections: 56 },
  abudawud: { name: "Sunan Abu Dawud", ind: "ind-abudawud", ara: "ara-abudawud", sections: 43 },
  tirmidhi: { name: "Jami At-Tirmidhi", ind: "ind-tirmidhi", ara: "ara-tirmidhi", sections: 46 },
  ibnmajah: { name: "Sunan Ibnu Majah", ind: "ind-ibnmajah", ara: "ara-ibnmajah", sections: 37 },
  nasai: { name: "Sunan An-Nasai", ind: "ind-nasai", ara: "ara-nasai", sections: 51 },
  malik: { name: "Muwatta Malik", ind: "ind-malik", ara: "ara-malik", sections: 18 },
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => a.toLowerCase());
    const bookKey = args[0];

    if (!bookKey) {
      let txt = "╭─「 ✦ Cara pakai: ✦ 」\n│\n";
      txt += "╰────  •  ────\n\n";
      let i = 1;
      for (const [key, book] of Object.entries(BOOKS)) {
        txt += i + ". *" + book.name + "*\n";
        txt += "   Perintah: .hadisnabi " + key + "\n\n";
        i++;
      }
      txt += "Sumber: fawazahmed0/hadith-api (jsDelivr CDN)";
      return await m.reply(txt);
    }

    const book = BOOKS[bookKey];
    if (!book) {
      return m.reply(claraWrap("hadisnabi", "Perawi tidak ditemukan!\nKetik .hadisnabi list buat lihat semua perawi."));
    }

    // Fetch section 1 dari buku untuk ambil hadis pertama
    const sectionNum = parseInt(args[1]) || (Math.floor(Math.random() * 5) + 1);

    // Fetch hadis Indonesia
    const indoData = await fetchJson(CDN_BASE + "/editions/" + book.ind + "/" + sectionNum + ".json");

    if (!indoData.hadiths || indoData.hadiths.length === 0) {
      return m.reply("Hadis tidak ditemukan untuk section " + sectionNum);
    }

    // Pilih hadis random dari section ini, atau yang pertama
    const hadisIdx = args[2] ? parseInt(args[2]) - 1 : Math.floor(Math.random() * indoData.hadiths.length);
    const hadis = indoData.hadiths[Math.min(hadisIdx, indoData.hadiths.length - 1)];

    // Coba fetch versi Arabic juga
    let arabicText = "";
    try {
      const araData = await fetchJson(CDN_BASE + "/editions/" + book.ara + "/" + sectionNum + ".json");
      if (araData.hadiths && araData.hadiths[Math.min(hadisIdx, araData.hadiths.length - 1)]) {
        arabicText = araData.hadiths[Math.min(hadisIdx, araData.hadiths.length - 1)].text;
      }
    } catch (e) { /* Arabic optional */ }

    // Nama section
    const sectionName = indoData.metadata?.section?.[sectionNum] || "Unknown";

    let txt = "╭─「 ✦ HADIS NABI ✦ 」\n│\n";
    txt += "╰────  •  ────\n";
    txt += "Kitab: *" + book.name + "*\n";
    txt += "Bab: " + sectionName + "\n";
    txt += "No. Hadis: " + hadis.hadithnumber + "\n\n";

    if (arabicText) {
      txt += "*ᴛᴇᴋꜱ ᴀʀᴀʙ:*\n" + arabicText + "\n\n";
    }

    txt += "*ᴛᴇʀᴊᴇᴍᴀʜᴀɴ ɪɴᴅᴏɴᴇꜱɪᴀ:*\n" + hadis.text + "\n\n";

    if (hadis.grades && hadis.grades.length > 0) {
      txt += "Status: " + (hadis.grades[0].grade || "N/A") + "\n";
    }

    txt += "Sumber: fawazahmed0/hadith-api";
    return await m.reply(txt);
  } catch (error) {
    return m.reply(claraWrap("Error", "\u274c " + error.message + "\n\nCoba lagi nanti atau pilih perawi lain."));
  }
}

export { pluginConfig as config, handler };
