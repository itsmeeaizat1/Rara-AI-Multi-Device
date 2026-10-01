// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "sholawat",
  alias: ["sholawat"],
  aliases: ["sholawat", "selawat", "sholawatnabi", "shalawat"],
  category: "islami",
  description: "Kumpulan sholawat nabi (Arab, latin, arti, keutamaan)",
  usage: ".sholawat | .sholawat <nomor>",
  example: ".sholawat | .sholawat 1",
  isGroupOnly: false,
}

const SHOLAWAT = [
  {
    no: 1,
    nama: "Sholawat Nariyah",
    arab: "اللَّهُمَّ صَلِّ صَلَاةً كَامِلَةً وَسَلِّمْ سَلَامًا تَامًّا عَلَى سَيِّدِنَا مُحَمَّدٍ",
    latin: "Allaahumma sholli sholaatan kaamilatan wa sallim salaaman taamman 'alaa sayyidinaa Muhammadinil ladzii tanhallu bihil 'uqadu wa tanfariju bihil kurabu wa tuqdhoo bihil hawaa'iju wa tunaaalu bihir raghaa'ibu wa husnal khalawaqi wa yuslimaa tayyibul khatamaati wal fawaatihi wa wal awaaqibi wa yuslimaa basyara wa batin",
    arti: "Ya Allah, limpahkanlah sholawat yang sempurna dan salam yang sempurna kepada penghulu kami Nabi Muhammad SAW, yang dengannya terlepas ikatan, dibebaskan kesusahan, ditunaikan hajat, dicapai segala keinginan dan baiknya khalak, dan yang dengannya diperoleh puncak yang baik dari segala yang diawali, diakhiri, dhohir maupun batin",
    keutamaan: "Dibaca 41x atau 100x setelah sholat fardhu untuk memohon hajat. Konon dibaca 4444x untuk hajat besar.",
  },
  {
    no: 2,
    nama: "Sholawat Fatih",
    arab: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ الْفَاتِحِ لِمَا أُغْلِقَ",
    latin: "Allaahumma sholli 'alaa sayyidinaa Muhammadinil faatihi limaa ughliqa wa l khaatimi maa sabaqon naashiril haqqi bil haqqi wal haadi ilaa shiraatikal mustaqiim, 'alaihi wa 'alaa aalihi haqqa qadrihi wa miqdaarihil 'azhiim",
    arti: "Ya Allah, limpahkanlah sholawat kepada penghulu kami Nabi Muhammad SAW, pembuka apa yang terkunci, penutup apa yang terdahulu, penolong kebenaran dengan kebenaran, dan pemberi petunjuk ke jalan yang lurus. Semoga Allah limpahkan sholawat kepadanya dan keluarganya sesuai kedudukan dan kebesarannya yang agung",
    keutamaan: "Dibaca 1x setelah sholat fardhu. Syekh Muhyiddin Ibn Arabi berkata tidak ada sholawat yang lebih agung dari ini.",
  },
  {
    no: 3,
    nama: "Sholawat Munjiyat (Penyelamat)",
    arab: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِ سَيِّدِنَا مُحَمَّدٍ",
    latin: "Allaahumma sholli 'alaa sayyidinaa Muhammadin wa 'alaa aali sayyidinaa Muhammad, sholaatan tuna jinnaa bihaa min jamii'il ahwaali wal aafaaat, wa taqdhii lanaa bihaa jamii'al hawaaij, wa tuthahhirunaa bihaa min jamii'is sayyi'aat, wa tarfa'unaa bihaa 'indaka a'ladh darajaat",
    arti: "Ya Allah, limpahkan sholawat kepada penghulu kami Nabi Muhammad SAW dan keluarganya, sholawat yang dengannya kami diselamatkan dari segala ketakutan dan penyakit, yang dengannya segala hajat kami ditunaikan, yang dengannya kami disucikan dari segala keburukan, dan yang dengannya kami diangkat ke derajat tertinggi di sisi-Mu",
    keutamaan: "Dibaca 100x setiap hari untuk keselamatan dunia dan akhirat. Dibaca saat ada musibah atau kesulitan.",
  },
  {
    no: 4,
    nama: "Sholawat Ibrahimiyah (Tasyahud)",
    arab: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ",
    latin: "Allaahumma sholli 'alaa Muhammad wa 'alaa aali Muhammad, kamaa shollaita 'alaa Ibrahim wa 'alaa aali Ibrahim, innaka hamiidum majiid. Allaahumma baarik 'alaa Muhammad wa 'alaa aali Muhammad, kamaa baarakta 'alaa Ibrahim wa 'alaa aali Ibrahim, innaka hamiidum majiid",
    arti: "Ya Allah, berilah sholawat kepada Nabi Muhammad dan keluarganya, sebagaimana Engkau memberi sholawat kepada Nabi Ibrahim dan keluarganya. Sesungguhnya Engkau Maha Terpuji lagi Maha Agung. Ya Allah, berilah keberkahan kepada Nabi Muhammad dan keluarganya, sebagaimana Engkau memberi keberkahan kepada Nabi Ibrahim dan keluarganya. Sesungguhnya Engkau Maha Terpuji lagi Maha Agung",
    keutamaan: "Sholawat yang paling lengkap dan sempurna. Dibaca dalam tasyahud akhir sholat fardhu. Jika dibaca 10x setiap hari, dijamin syafaat dari Nabi SAW di akhirat.",
  },
  {
    no: 5,
    nama: "Sholawat Badar (Bashori)",
    arab: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ صَلَاةً تُنْعِشُنَا بِهَا",
    latin: "Allaahumma sholli 'alaa sayyidinaa Muhammad, sholaatan tun'ishunaa bihaa wa yuhilla 'alainaa bihaa asraarahu wa shohihal 'abidinaa bihaa, wa tunjiyanaa bihaa min ghammam jami'il balaaya, Allahumma sholli 'alaihi wa 'alaa aalihi wa shohbihi wa sallim",
    arti: "Ya Allah, limpahkan sholawat kepada penghulu kami Muhammad, sholawat yang dengannya kami diberi kehidupan dan dengan sholawat itu terbuka rahasia-rahasianya, yang menguatkan para hamba-Nya, dan menyelamatkan kami dari segala bencana. Ya Allah, limpahkan sholawat kepadanya, keluarganya, dan sahabatnya",
    keutamaan: "Dibaca setiap ba'da sholat fardhu untuk keselamatan dari bala bencana. Populer di pesantren-pesantren Jawa Timur.",
  },
  {
    no: 6,
    nama: "Sholawat Pendek (Sholawat Iftitah)",
    arab: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
    latin: "Allaahumma sholli 'alaa Muhammad (10x atau 100x)",
    arti: "Ya Allah, limpahkanlah sholawat kepada Nabi Muhammad",
    keutamaan: "Sholawat paling ringan namun pahalanya berat. Dibaca 10x setiap hari, siapa membaca 10x sholawat kepadaku, Allah akan memberi 10x rahmat, 10x keberkahan, dan 10x derajat.",
  },
  {
    no: 7,
    nama: "Sholawat Jumat",
    arab: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ خَيْرِ خَلْقِكَ",
    latin: "Allaahumma sholli 'alaa sayyidinaa Muhammadin khairi khalqik, wa 'alaa aalihi washohbihi wa sallim tasliimaa (baca 80x pada hari Jumat)",
    arti: "Ya Allah, limpahkan sholawat kepada penghulu kami Muhammad, sebaik-baik ciptaan-Mu, dan kepada keluarganya serta sahabatnya, dan berilah kesejahteraan yang sempurna",
    keutamaan: "Dibaca 80x pada hari Jumat. Hadits: 'Perbanyaklah sholawat kepadaku pada hari Jumat dan malam Jumat, karena sholawat kalian dipersembahkan kepadaku' (HR. Abu Daud).",
  },
  {
    no: 8,
    nama: "Sholawat Syifa (Penyembuh)",
    arab: "اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ صَلَاةً شِفَاءً",
    latin: "Allaahumma sholli 'alaa sayyidinaa Muhammadin sholaatan syifaa'an min kulli daa'in (baca 7x untuk orang sakit)",
    arti: "Ya Allah, limpahkan sholawat kepada penghulu kami Muhammad, sholawat yang menjadi obat penyembuh dari segala penyakit",
    keutamaan: "Dibaca 7x untuk orang sakit. Juga dibaca untuk memohon kesembuhan dari penyakit fisik maupun hati.",
  },
  {
    no: 9,
    nama: "Sholawat Ghouts (Pertolongan)",
    arab: "اللَّهُمَّ يَا رَبَّنَا صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ",
    latin: "Allaahumma yaa rabbanaa sholli 'alaa sayyidinaa Muhammadin daf'al balaai minka bi qudsihi wal qabooli ka sya'nika bika wa 'alaa aalihi wa shohbihi wa sallim",
    arti: "Ya Allah, Ya Tuhan kami, limpahkan sholawat kepada penghulu kami Muhammad, yang dengannya terhindar bala dari-Mu, dengan kesucian dan penerimaan sebagaimana kehendak-Mu kepadanya, dan kepada keluarganya dan sahabatnya",
    keutamaan: "Dibaca saat menghadapi kesulitan besar atau bala bencana untuk memohon pertolongan Allah melalui perantara Nabi.",
  },
  {
    no: 10,
    nama: "Sholawat Thibbil Qulub (Obat Hati)",
    arab: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى سَيِّدِنَا مُحَمَّدٍ طِبِّ الْقُلُوبِ",
    latin: "Allaahumma sholli wa sallim 'alaa sayyidinaa Muhammadin thibbil quloobi wa dawaa'ihaa wa 'aafiatil abdaani wa syifaa'ihi wa 'alaa aalihi wa shohbihi wa sallim",
    arti: "Ya Allah, limpahkan sholawat dan salam kepada penghulu kami Muhammad, obat hati dan penyembuhnya, kesehatan badan dan penyembuhnya, serta kepada keluarganya dan sahabatnya",
    keutamaan: "Dibaca untuk membersihkan hati dari penyakit hati (iri, dengki, sombong, riya). Juga untuk memohon kesehatan fisik dan batin.",
  },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > SHOLAWAT.length) {
      let lines = [];
      lines.push("Sholawat Nabi - " + SHOLAWAT.length + " Sholawat");
      lines.push("");
      SHOLAWAT.forEach(s => {
        lines.push(s.no + ". " + s.nama);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "sholawat <nomor>");
      lines.push("Contoh: " + usedPrefix + "sholawat 1");
      return m.reply(novaWrap("Sholawat Nabi", lines.join("\n")));
    }

    const s = SHOLAWAT[input - 1];
    return m.reply(novaWrap("Sholawat - " + s.nama, [
      "Teks Arab:",
      s.arab,
      "",
      "Latin:",
      s.latin,
      "",
      "Arti:",
      s.arti,
      "",
      "Keutamaan:",
      s.keutamaan,
    ].join("\n")));
  } catch (e) {
    return m.reply(novaWrap("Sholawat Nabi", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
