// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from '../../src/lib/nova-menu-style.js'

const pluginConfig = {
  name: "doaharian",
  alias: ["doaharian"],
  aliases: ["doaharian", "doasehari", "doaharapan", "doahariini"],
  category: "islami",
  description: "Kumpulan doa sehari-hari (masuk rumah, makan, tidur, keluar rumah, dll)",
  usage: ".doaharian | .doaharian <nomor>",
  example: ".doaharian | .doaharian 1",
  isGroupOnly: false,
}

const DOA = [
  { no: 1, nama: "Doa Masuk Rumah", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلِجِ وَخَيْرَ الْمَخْرَجِ", latin: "Allaahumma innii as'aluka khairal mawliji wa khairal makhraji", arti: "Ya Allah, aku memohon kepada-Mu kebaikan tempat masuk dan kebaikan tempat keluar" },
  { no: 2, nama: "Doa Keluar Rumah", arab: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", latin: "Bismillaahi tawakkaltu 'alallaah, laa haula wa laa quwwata illaa billaah", arti: "Dengan nama Allah, aku bertawakal kepada Allah. Tidak ada daya dan kekuatan kecuali dengan Allah" },
  { no: 3, nama: "Doa Sebelum Makan", arab: "اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allaahumma baarik lanaa fiimaa razaqtanaa wa qinaa 'adzaabin naar", arti: "Ya Allah, berkahilah kami dalam rezeki yang Engkau berikan dan peliharalah kami dari azab neraka" },
  { no: 4, nama: "Doa Sesudah Makan", arab: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ", latin: "Alhamdulillaahil ladzii ath'amanaa wa saqaanaa wa ja'alanaa muslimiin", arti: "Segala puji bagi Allah yang memberi kami makan dan minum serta menjadikan kami muslim" },
  { no: 5, nama: "Doa Sebelum Tidur", arab: "بِاسْمِكَ اللَّهُمَّ أَحْيَا وَأَمُوتُ", latin: "Bismika Allaahumma ahyaa wa amuut", arti: "Dengan nama-Mu Ya Allah, aku hidup dan aku mati" },
  { no: 6, nama: "Doa Bangun Tidur", arab: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", latin: "Alhamdulillaahil ladzii ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur", arti: "Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan" },
  { no: 7, nama: "Doa Masuk Kamar Mandi", arab: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", latin: "Allaahumma innii a'uudzu bika minal khubutsi wal khabaa'its", arti: "Ya Allah, aku berlindung kepada-Mu dari godaan setan laki-laki dan perempuan" },
  { no: 8, nama: "Doa Keluar Kamar Mandi", arab: "غُفْرَانَكَ الْحَمْدُ لِلَّهِ الَّذِي أَذْهَبَ عَنِّي الْأَذَى وَعَافَانِي", latin: "Ghufranaka, alhamdulillaahil ladzii adzhaba 'annil adzaa wa 'aafaanii", arti: "Aku memohon ampunan-Mu. Segala puji bagi Allah yang menghilangkan kotoran dariku dan menyehatkanku" },
  { no: 9, nama: "Doa Naik Kendaraan", arab: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ", latin: "Subhaanal ladzii sakhkhara lanaa haadzaa wa maa kunnaa lahu muqriniin, wa innaa ilaa rabbinaa lamunqalibuun", arti: "Maha Suci Allah yang menundukkan kendaraan ini bagi kami, padahal kami tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami" },
  { no: 10, nama: "Doa Bepergian", arab: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى", latin: "Allaahumma innaa nas'aluka fii safariinaa haadzal birra wat taqwaa, wamal 'amala maa yurdhika, Allaahumma hawwin 'alainaa safaranaa haaadzaa watwi 'annaa bu'dah", arti: "Ya Allah, kami memohon kepada-Mu dalam perjalanan ini kebaikan dan ketaqwaan, serta amal yang Engkau ridhai. Ya Allah, mudahkanlah perjalanan kami ini dan dekatkanlah jaraknya" },
  { no: 11, nama: "Doa Untuk Kedua Orang Tua", arab: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", latin: "Rabbighfirlii wa liwaalidayya warhamhumaa kamaa rabayaaanii shaghiiraa", arti: "Ya Tuhanku, ampunilah aku dan kedua orang tuaku, dan sayangilah keduanya sebagaimana mereka menyayangiku di waktu kecil" },
  { no: 12, nama: "Doa Selamat", arab: "اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي", latin: "Allaahummahfazhnii min bayni yadayya wa min khalfii wa 'an yamiinii wa 'an syimaalii wa min fawqii wa a'uudzu bika 'azhmatika an ughtaala min tahtii", arti: "Ya Allah, lindungilah aku dari depan, belakang, kanan, kiri, dan atas. Aku berlindung dengan kebesaran-Mu dari dibenamkan ke bawah" },
  { no: 13, nama: "Doa Memohon Ilmu", arab: "رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا", latin: "Rabbi zidnii 'ilmaa warzuqnii fahmaa", arti: "Ya Tuhanku, tambahkanlah ilmu kepadaku dan berilah aku pemahaman" },
  { no: 14, nama: "Doa Saat Marah", arab: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", latin: "A'uudzu billaahi minasy syaithaanir rajiim", arti: "Aku berlindung kepada Allah dari godaan setan yang terkutuk" },
  { no: 15, nama: "Doa Saat Susah/Galau", arab: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ", latin: "Allaahumma innii a'uudzu bika minal hammi wal hazan, wal 'ajzi wal kasal, wal bukhli wal jubn, wa dala'id dayni wa ghala batir rijaal", arti: "Ya Allah, aku berlindung kepada-Mu dari rasa gelisah dan sedih, dari lemah dan malas, dari kikir dan penakut, dari belit hutang dan tekanan manusia" },
  { no: 16, nama: "Doa Saat Sakit", arab: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ", latin: "As'alullaahal 'azhiima rabbal 'arsyil 'azhiimi an yasyfiyaka (7x)", arti: "Aku memohon kepada Allah Yang Maha Agung, Tuhan 'Arsy yang agung, agar menyembuhkanmu (dibaca 7x)" },
  { no: 17, nama: "Doa Memakai Pakaian", arab: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", latin: "Alhamdulillaahil ladzii kasaanii haadzaa wa razaqniihi min ghairi hawlin minnii wa laa quwwah", arti: "Segala puji bagi Allah yang memberi pakaian ini kepadaku dan memberi rezeki tanpa daya dan kekuatan dariku" },
  { no: 18, nama: "Doa Bercermin", arab: "اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي", latin: "Allaahumma kamaa hassanta khalqii fahassin khuluqii", arti: "Ya Allah, sebagaimana Engkau memperbaiki ciptaanku, perbaikilah akhlakku" },
  { no: 19, nama: "Doa Masuk Masjid", arab: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", latin: "Allaahummaftahlii abwaaba rahmatik", arti: "Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu" },
  { no: 20, nama: "Doa Keluar Masjid", arab: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ", latin: "Allaahumma innii as'aluka min fadhlik", arti: "Ya Allah, aku memohon kepada-Mu dari karunia-Mu" },
  { no: 21, nama: "Doa Untuk Orang Sakit", arab: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ", latin: "As'alullaahal 'azhiima rabbal 'arsyil 'azhiimi an yasyfiyaka (7x)", arti: "Aku memohon kepada Allah Yang Maha Agung, Tuhan 'Arsy yang agung, agar menyembuhkanmu (baca 7x untuk orang sakit)" },
  { no: 22, nama: "Doa Memohon Rezeki", arab: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", latin: "Allaahumma akfinii bi halaalika 'an haroomik, wa aghninii bi fadhlika 'amman siwaak", arti: "Ya Allah, cukupkanlah aku dengan yang halal dari yang haram, dan kayakanlah aku dengan karunia-Mu dari selain-Mu" },
  { no: 23, nama: "Doa Membaca Al-Quran", arab: "رَبِّ افْتَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي", latin: "Rabbiftahlii shadrii wa yassirlii amrii, wahlul 'uqdatam mil lisaani yafqahu qawlii", arti: "Ya Tuhanku, lapangkanlah dadaku, mudahkanlah urusanku, dan lepaskanlah kekakuan dari lidahku agar mereka mengerti perkataanku" },
  { no: 24, nama: "Doa Mendapat Kesulitan", arab: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", latin: "Laa ilaaha illaa anta subhaanaka innii kuntu minadh dhaalimiin", arti: "Tidak ada Tuhan selain Engkau, Maha Suci Engkau, sesungguhnya aku termasuk orang-orang yang zalim (doa Nabi Yunus AS)" },
  { no: 25, nama: "Doa Hujan", arab: "اللَّهُمَّ صَيِّبًا نَافِعًا", latin: "Allaahumma sayyiban naafi'an", arti: "Ya Allah, (jadikanlah) hujan yang bermanfaat" },
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = parseInt(args[0]);

    if (!input || isNaN(input) || input < 1 || input > DOA.length) {
      let lines = [];
      lines.push("Doa Sehari-hari - " + DOA.length + " Doa");
      lines.push("");
      DOA.forEach(d => {
        lines.push(d.no + ". " + d.nama);
      });
      lines.push("");
      lines.push("Cara: " + usedPrefix + "doaharian <nomor>");
      lines.push("Contoh: " + usedPrefix + "doaharian 11");
      return m.reply(novaWrap("Doa Sehari-hari", lines.join("\n")));
    }

    const d = DOA[input - 1];
    return m.reply(novaWrap("Doa - " + d.nama, [
      "Teks Arab:",
      d.arab,
      "",
      "Latin:",
      d.latin,
      "",
      "Arti:",
      d.arti,
    ].join("\n")));
  } catch (e) {
    return m.reply(novaWrap("Doa Sehari-hari", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
