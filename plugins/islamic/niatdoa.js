// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "niatdoa",
  alias: ["niat", "doaislam", "doasehari"],
  category: "islamic",
  description: "Niat sholat & kumpulan doa sehari-hari",
  usage: ".niatdoa <niat/doa>",
  example: ".niatdoa niat subuh",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const NIAT_SHOLAT = {
  subuh: {
    arab: "اُصَلِّى فَرْضَ الصُّبْحِ رَكْعَتَيْنِ مُسْتَقْبِلَ الْقِبْلَةِ اِمَامًا/مَأْمُوْمًا لِلَّهِ تَعَالَى",
    latin: "Ushalli fardhash-shubhi rak'ataini mustaqbilal qiblati imaman/ma'muman lillahi ta'ala",
    arti: "Aku berniat sholat fardhu Subuh 2 rakaat menghadap kiblat sebagai imam/ma'mum karena Allah Ta'ala",
  },
  dzuhur: {
    arab: "اُصَلِّى فَرْضَ الظُّهْرِ اَرْبَعَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ اِمَامًا/مَأْمُوْمًا لِلَّهِ تَعَالَى",
    latin: "Ushalli fardhaz-zuhri arba'a raka'aatin mustaqbilal qiblati imaman/ma'muman lillahi ta'ala",
    arti: "Aku berniat sholat fardzu Zuhur 4 rakaat menghadap kiblat sebagai imam/ma'mum karena Allah Ta'ala",
  },
  ashar: {
    arab: "اُصَلِّى فَرْضَ الْعَصْرِ اَرْبَعَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ اِمَامًا/مَأْمُوْمًا لِلَّهِ تَعَالَى",
    latin: "Ushalli fardhal-'ashri arba'a raka'aatin mustaqbilal qiblati imaman/ma'muman lillahi ta'ala",
    arti: "Aku berniat sholat fardhu Ashar 4 rakaat menghadap kiblat sebagai imam/ma'mum karena Allah Ta'ala",
  },
  maghrib: {
    arab: "اُصَلِّى فَرْضَ الْمَغْرِبِ ثَلاَثَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ اِمَامًا/مَأْمُوْمًا لِلَّهِ تَعَالَى",
    latin: "Ushalli fardhal-maghribi tsalaata raka'aatin mustaqbilal qiblati imaman/ma'muman lillahi ta'ala",
    arti: "Aku berniat sholat fardhu Maghrib 3 rakaat menghadap kiblat sebagai imam/ma'mum karena Allah Ta'ala",
  },
  isya: {
    arab: "اُصَلِّى فَرْضَ الْعِشَاءِ اَرْبَعَ رَكَعَاتٍ مُسْتَقْبِلَ الْقِبْلَةِ اِمَامًا/مَأْمُوْمًا لِلَّهِ تَعَالَى",
    latin: "Ushalli fardhal-'isyai arba'a raka'aatin mustaqbilal qiblati imaman/ma'muman lillahi ta'ala",
    arti: "Aku berniat sholat fardhu Isya 4 rakaat menghadap kiblat sebagai imam/ma'mum karena Allah Ta'ala",
  },
};

const DOAS = {
  bangun: {
    title: "Doa Bangun Tidur",
    arab: "اَلْحَمْدُ لِلَّهِ الَّذِى اَحْيَانَا بَعْدَ مَا اَمَاتَنَا وَاِلَيْهِ النُّشُوْرُ",
    latin: "Alhamdu lillahil-ladzii ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur",
    arti: "Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan",
  },
  makan: {
    title: "Doa Sebelum Makan",
    arab: "اَللَّهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ",
    latin: "Allahumma baarik lanaa fiimaa razaqtanaa wa qinaa 'adzaaban naar",
    arti: "Ya Allah, berkahilah rezeki yang Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka",
  },
  makan_habis: {
    title: "Doa Sesudah Makan",
    arab: "اَلْحَمْدُ لِلَّهِ الَّذِى اَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِيْنَ",
    latin: "Alhamdu lillahil-ladzii ath'amanaa wa saqaanaa wa ja'alanaa muslimiin",
    arti: "Segala puji bagi Allah yang memberi makan dan minum kepada kami serta menjadikan kami muslim",
  },
  masuk_wc: {
    title: "Doa Masuk Toilet",
    arab: "اَللَّهُمَّ اِنِّى اَعُوْذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ",
    latin: "Allahumma innii a'uudzu bika minal-khubutsi wal-khabaa'its",
    arti: "Ya Allah, aku berlindung kepada-Mu dari godaan setan laki-laki dan perempuan",
  },
  keluar_wc: {
    title: "Doa Keluar Toilet",
    arab: "غُفْرَانَكَ",
    latin: "Ghufraanaka",
    arti: "Aku memohon ampunan-Mu",
  },
  keluar_rumah: {
    title: "Doa Keluar Rumah",
    arab: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لاَ حَوْلَ وَلاَ قُوَّةَ اِلاَّ بِاللَّهِ",
    latin: "Bismillaahi tawakkaltu 'alallaah, laa hawla wa laa quwwata illaa billaah",
    arti: "Dengan nama Allah, aku bertawakal kepada Allah. Tidak ada daya dan kekuatan kecuali dengan Allah",
  },
  masuk_rumah: {
    title: "Doa Masuk Rumah",
    arab: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا",
    latin: "Bismillaahi walajnaa, wa bismillaahi kharajnaa, wa 'alallaahi rabbinaa tawakkalnaa",
    arti: "Dengan nama Allah kami masuk, dengan nama Allah kami keluar, dan kepada Allah Tuhan kami, kami bertawakal",
  },
  tidur: {
    title: "Doa Sebelum Tidur",
    arab: "بِاسْمِكَ اللَّهُمَّ اَحْيَا وَاَمُوْتُ",
    latin: "Bismika Allahumma ahyaa wa amuut",
    arti: "Dengan nama-Mu ya Allah, aku hidup dan aku mati",
  },
  bangun_malam: {
    title: "Doa Bangun Malam (Tahajud)",
    arab: "لاَ اِلٰهَ اِلاَّ اللَّهُ الْوَاحِدُ الْقَهَّارُ رَبُّ السَّمٰوَاتِ وَالْاَرْضِ وَمَا بَيْنَهُمَا الْعَزِيْزُ الْغَفَّارُ",
    latin: "Laa ilaaha illallahul waahidul qahhaar, rabbus samaawaati wal ardhi wa maa bainahumal 'aziizul ghaffaar",
    arti: "Tiada Tuhan selain Allah Yang Maha Esa, Maha Perkasa, Tuhan langit dan bumi dan apa yang ada di antaranya, Yang Maha Perkasa lagi Maha Pengampun",
  },
  bercermin: {
    title: "Doa Bercermin",
    arab: "اَللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِى فَحَسِّنْ خُلُقِى",
    latin: "Allahumma kamaa hassanta khalqii fahassin khuluqii",
    arti: "Ya Allah, sebagaimana Engkau memperbaiki ciptaanku, perbaikilah akhlakku",
  },
  sakit: {
    title: "Doa Sakit",
    arab: "اَللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ وَاشْفِ أَنْتَ الشَّافِى لاَ شِفَاءَ اِلاَّ شِفَاؤُكَ شِفَاءً لاَ يُغَادِرُ سَقَمًا",
    latin: "Allahumma rabbannaasi adzhibil ba'sa wasyfi antasy syaafii laa syifaa'a illaa syifaa'uka syifaa'an laa yughaadiru saqaman",
    arti: "Ya Allah Tuhan manusia, hilangkan penyakit ini dan sembuhkan. Engkau Maha Penyembuh, tidak ada kesembuhan kecuali kesembuhan dari-Mu",
  },
  bepergian: {
    title: "Doa Bepergian",
    arab: "سُبْحَانَ الَّذِى سَخَّرَ لَنَا هٰذَا وَمَا كُنَّا لَهُ مُقْرِنِيْنَ وَاِنَّا اِلٰى رَبِّنَا لَمُنْقَلِبُوْنَ",
    latin: "Subhaanal-ladzii sakhkhara lanaa haadzaa wa maa kunnaa lahu muqriniin, wa innaa ilaa rabbinaa lamunqalibuun",
    arti: "Maha Suci Allah yang menundukkan kendaraan ini untuk kami, padahal kami tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami",
  },
};

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => a.toLowerCase());
  const action = args[0];

  if (!action) {
    let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Niat Sholat:  ┊  ➶\n";
    txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n";
    txt += "*" + sholat.toUpperCase() + "*\n\n";
    txt += "Arab:\n" + niat.arab + "\n\n";
    txt += "Latin:\n" + niat.latin + "\n\n";
    txt += "Arti:\n" + niat.arti;
    return await m.reply(txt);
  }

  // Doa harian
  const doa = DOAS[action];
  if (!doa) {
    return m.reply(claraWrap("niatdoa", "Doa tidak ditemukan!\nKetik .niatdoa buat lihat semua doa."));
  }

  let txt = "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + doa.title.toUpperCase() + "  ┊  ➶\n";
  txt += "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀\n\n";
  txt += "Arab:\n" + doa.arab + "\n\n";
  txt += "Latin:\n" + doa.latin + "\n\n";
  txt += "Arti:\n" + doa.arti;
  return await m.reply(txt);
}

export { pluginConfig as config, handler };
