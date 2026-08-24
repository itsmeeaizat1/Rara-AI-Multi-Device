// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "kisahrasul",
  aliases: ["kisahrasul", "kisahsahabat", "sahabatnabi", "kisahsahabat"],
  category: "islami",
  description: "Kisah 10 Sahabat Nabi yang dijanjikan surga (Asyarah Mubasyarah)",
  usage: ".kisahrasul | .kisahrasul <nomor>",
  example: ".kisahrasul | .kisahrasul 1 (Abu Bakar)",
  isGroupOnly: false,
}

const SAHABAT = [
  {
    no: 1,
    nama: "Abu Bakar Ash-Shiddiq",
    julukan: "Ash-Shiddiq (Yang Membenarkan)",
    periode: "Khalifah pertama (632-634 M)",
    kisah: "Abu Bakar adalah sahabat terdekat Nabi SAW sejak sebelum Islam. Beliau orang pertama yang mempercayai Isra Mi'raj tanpa ragu, sehingga digelari Ash-Shiddiq. Saat Nabi hijrah ke Madinah, Abu Bakar mendampingi beliau dalam gua Tsur. Sebagai khalifah pertama, beliau menumpas nabi palsu dan orang murtad. Abu Bakar menghafal seluruh Al-Quran dan menjadi yang pertama mengumpulkan mushaf Al-Quran. Beliau wafat pada usia 63 tahun, sama seperti usia Nabi SAW.",
  },
  {
    no: 2,
    nama: "Umar bin Khattab",
    julukan: "Al-Faruq (Yang Memisahkan haq dan bathil)",
    periode: "Khalifah kedua (634-644 M)",
    kisah: "Umar awalnya musuh bebuyutan Islam, bahkan berniat membunuh Nabi SAW. Namun saat mendengar saudarinya membaca Al-Quran (Surah Thaha), hatinya tersentuh dan masuk Islam. Kedatangan Umar ke Islam membuat umat Muslim berani beribadah di Ka'bah secara terbuka. Sebagai khalifah, beliau memperluas wilayah Islam hingga Persia, Mesir, dan Suriah. Umar terkenal dengan keadilan dan kepedulian terhadap rakyatnya. Beliau dibunuh oleh budak Maghribi (Abu Lu'lu'ah) saat sholat subuh.",
  },
  {
    no: 3,
    nama: "Utsman bin Affan",
    julukan: "Dzun Nurain (Yang Memiliki Dua Cahaya)",
    periode: "Khalifah ketiga (644-656 M)",
    kisah: "Utsman menikah dengan dua putri Nabi SAW (Ruqayyah dan Ummu Kultsum), sehingga digelari Dzun Nurain. Beliau dikenal sangat pemurah, pernah membeli sumur Rumah dan mewakafkannya untuk Muslim. Pada masanya, Al-Quran disatukan dalam satu mushaf (Mushaf Utsmani) karena khawatir perbedaan bacaan setelah banyak penghafal syahid. Utsman wafat dibunuh saat membaca Al-Quran di rumahnya, darahnya menetes ke ayat yang sedang dibacanya.",
  },
  {
    no: 4,
    nama: "Ali bin Abi Thalib",
    julukan: "Karramallahu Wajhahu (Allah Memuliakan Wajahnya)",
    periode: "Khalifah keempat (656-661 M)",
    kisah: "Ali adalah sepupu dan menantu Nabi SAW (menikah dengan Fatimah az-Zahra). Beliau pemuda pertama yang masuk Islam. Ali dikenal sangat berani dan ahli ilmu. Saat hijrah, Ali tidur di tempat Nabi SAW untuk mengelabui para pembunuh yang akan menyerang. Pada Perang Khaibar, Ali mencabut pintu benteng yang berat sebagai tameng. Beliau terkenal dengan kalimat-kalimat hikmah (Kalimat Ali). Ali wafat dibunuh oleh Abdurrahman bin Muljam saat sholat subuh di Kufah.",
  },
  {
    no: 5,
    nama: "Thalhah bin Ubaidillah",
    julukan: "Thalhatul Khair (Thalhah yang Baik)",
    periode: "Sahabat, wafat 656 M",
    kisah: "Thalhah dikenal sangat dermawan. Pada Perang Uhud, beliau melindungi Nabi SAW dengan tubuhnya hingga jarinya terputus dan tubuhnya penuh luka lebih dari 70 luka. Nabi SAW bersabda: 'Siapa ingin melihat syahid berjalan di bumi, lihatlah Thalhah bin Ubaidillah.' Beliau sangat kaya raya dan selalu bersedekah. Thalhah wafat dalam Perang Jamal.",
  },
  {
    no: 6,
    nama: "Zubair bin Awwam",
    julukan: "Al-Hawari (Pendukung Setia)",
    periode: "Sahabat, wafat 656 M",
    kisah: "Zubair adalah sepupu dan sahabat dekat Nabi SAW. Beliau disebut 'Al-Hawari' karena selalu membela Nabi seperti pendukung Isa AS. Zubair adalah pedang terbaik di kalangan sahabat, selalu berada di barisan terdepan setiap peperangan. Beliau sangat berani, dikenal dengan perjuangan yang tak kenal lelah. Zubair wafat dibunuh saat sedang sholat di Bashrah setelah Perang Jamal.",
  },
  {
    no: 7,
    nama: "Abdurrahman bin Auf",
    julukan: "Sahabat yang Dermawan",
    periode: "Sahabat, wafat 652 M",
    kisah: "Abdurrahman masuk Islam awal dan ikut hijrah Habasyah kemudian Madinah. Di Madinah, beliau memulai dari nol namun berkat kerja keras dan kejujuran, menjadi saudagar terkaya. Saat masuk Madinah, saudara sebaya Muawiyah meminta separuh hartanya, Abdurrahman langsung memberikan. Beliau pernah membebaskan 30 budak dalam satu hari. Saat wafat, istrinya mewarisi emas yang harus dipotong dengan kapak karena terlalu banyak.",
  },
  {
    no: 8,
    nama: "Sa'ad bin Abi Waqqash",
    julukan: "Pemanah Pertama Islam",
    periode: "Sahabat, wafat 674 M",
    kisah: "Sa'ad adalah pemuda yang masuk Islam di usia 17 tahun dan termasuk 7 orang pertama yang masuk Islam. Beliau pemanah terbaik, tidak pernah meleset. Sa'ad adalah panglima Perang Qadisiyah yang berhasil mengalahkan tentara Persia. Beliau juga salah satu dari 6 orang yang Nabi SAW tunjuk untuk menjadi khalifah (Ahlus Syura). Sa'ad wafat di Madinah dan disebut sebagai Muslim pertama yang menembaki orang kafir.",
  },
  {
    no: 9,
    nama: "Sa'id bin Zaid",
    julukan: "Sahabat yang Didoakan Nabi",
    periode: "Sahabat, wafat 673 M",
    kisah: "Sa'id masuk Islam sebelum dakwah ke rumah Arqam. Beliau menikah dengan Fatimah binti Khattab (saudari Umar). Saat Umar ingin membunuh Nabi, dialah yang mengarahkan Umar ke rumah saudarinya yang sedang membaca Al-Quran, yang akhirnya membuat Umar masuk Islam. Nabi SAW mendoakan: 'Ya Allah, terimalah doa Sa'id...' sehingga setiap doa Sa'id mustajab. Beliau tidak ingin menjadi khalifah meskipun termasuk Ahlus Syura.",
  },
  {
    no: 10,
    nama: "Abu Ubaidah bin Jarrah",
    julukan: "Aminul Ummah (Yang Dipercaya Umat)",
    periode: "Sahabat, wafat 639 M",
    kisah: "Nabi SAW menyebut Abu Ubaidah sebagai 'Aminul Ummah' (orang yang dipercaya umat). Beliau panglima yang menaklukkan Suriah dan Palestina. Saat wabah tha'un menyerang Suriah, Abu Ubaidah memerintahkan pasukan tidak keluar dari daerah terjangkit (karantina), dan beliau sendri wafat karena tha'un. Abu Ubaidah pernah mencabut dua anak panah dari wajah Nabi SAW saat Perang Uhud, giginya patah saat melakukannya.",
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > SAHABAT.length) {
      let lines = [];
      lines.push("Kisah 10 Sahabat yang Dijanjikan Surga");
      lines.push("(Asyarah Mubasyarah)");
      lines.push("");
      SAHABAT.forEach(s => {
        lines.push(s.no + ". " + s.nama);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "kisahrasul <nomor>");
      lines.push("Contoh: " + usedPrefix + "kisahrasul 1");
      return m.reply(claraWrap("Kisah Sahabat Nabi", lines.join("\n")));
    }

    const s = SAHABAT[input - 1];
    return m.reply(claraWrap("Kisah - " + s.nama, [
      "Nama: " + s.nama,
      "Julukan: " + s.julukan,
      "Periode: " + s.periode,
      "",
      "Kisah:",
      s.kisah,
    ].join("\n")));
  } catch (e) {
    return m.reply(claraWrap("Kisah Sahabat", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
