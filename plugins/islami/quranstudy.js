// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "mengaji",
  alias: ["mengaji"],
  aliases: ["mengaji", "belajarquran", "tajwid", "tadarus"],
  category: "islami",
  description: "Belajar mengaji - dasar tajwid, huruf hijaiyah, hukum bacaan",
  usage: ".mengaji | .mengaji <topik>",
  example: ".mengaji | .mengaji hijaiyah | .mengaji nun | .mengaji mad",
  isGroupOnly: false,
}

const TOPIK = {
  "hijaiyah": {
    judul: "Huruf Hijaiyah (28 Huruf)",
    isi: [
      "Huruf hijaiyah ada 28 (ada yang menyebut 29 dengan hamzah):",
      "",
      "1. Alif (ا) 2. Ba (ب) 3. Ta (ت) 4. Tsa (ث) 5. Jim (ج)",
      "6. Ha (ح) 7. Kha (خ) 8. Dal (د) 9. Dzal (ذ) 10. Ra (ر)",
      "11. Zai (ز) 12. Sin (س) 13. Syin (ش) 14. Shad (ص) 15. Dhad (ض)",
      "16. Tha (ط) 17. Zha (ظ) 18. 'Ain (ع) 19. Ghain (غ) 20. Fa (ف)",
      "21. Qaf (ق) 22. Kaf (ك) 23. Lam (ل) 24. Mim (م) 25. Nun (ن)",
      "26. Wawu (و) 27. Ha (ه) 28. Lam-Alif (لا) 29. Ya (ي)",
      "",
      "Tips: Pelajari makharijul huruf (tempat keluarnya suara) agar bacaan lebih akurat",
    ],
  },
  "harakat": {
    judul: "Harakat (Tanda Baca)",
    isi: [
      "Harakat adalah tanda baca yang menentukan bunyi huruf:",
      "",
      "1. Fathah ( َ ) = bunyi 'a' (contoh: ba = بَ)",
      "2. Kasrah ( ِ ) = bunyi 'i' (contoh: bi = بِ)",
      "3. Dhammah ( ُ ) = bunyi 'u' (contoh: bu = بُ)",
      "4. Fathatain ( ً ) = bunyi 'an' (contoh: ban = بً)",
      "5. Kasratain ( ٍ ) = bunyi 'in' (contoh: bin = بٍ)",
      "6. Dhammatain ( ٌ ) = bunyi 'un' (contoh: bun = بٌ)",
      "7. Sukun ( ْ ) = bunyi mati (contoh: b = بْ)",
      "8. Tasydid ( ّ ) = bunyi dobel/ganda (contoh: bba = بَّ)",
      "",
      "Contoh: Sab-bi = سَبِّ (sin fathah, ba tasydid + kasrah)",
    ],
  },
  "nun": {
    judul: "Hukum Bacaan Nun Mati & Tanwin",
    isi: [
      "4 Hukum Nun Mati/Tanwin:",
      "",
      "1. IDGHAM (memasukkan)",
      "   Jika setelah nun mati/tanwin ada huruf: ي و م ن ل ر (yawmane lam ra)",
      "   - Idgham bighunnah (dengan dengung): ي ن م و",
      "   - Idgham bilaghunnah (tanpa dengung): ل ر",
      "   Contoh: مِنْ يَوْمٍ = miyyawmin",
      "",
      "2. IZHAR (jelas)",
      "   Jika setelahnya ada huruf halqi (6 huruf tenggorokan):",
      "   ء ه ع ح غ خ",
      "   Contoh: مِنْ هَادٍ = min haadin (dibaca jelas)",
      "",
      "3. IQHLAB (membaca jadi mim)",
      "   Jika setelahnya ada huruf BA (ب)",
      "   Contoh: مِنْ بَعْدِ = mimba'di (dibaca 'mim' dgn dengung)",
      "",
      "4. KHAFI (samar/dengung)",
      "   Jika setelahnya ada 15 huruf selain di atas",
      "   Contoh: مِنْ تَابَ = min taaba (dengung samar 2 harakat)",
    ],
  },
  "mim": {
    judul: "Hukum Bacaan Mim Mati",
    isi: [
      "3 Hukum Mim Mati (مْ):",
      "",
      "1. IDGHAM SYAFAWI (memasukkan)",
      "   Jika setelah mim mati ada huruf MIM (م)",
      "   Contoh: مِنْهُمْ مِنْ = minhum min (dibaca dobel mim dengan dengung)",
      "",
      "2. KHAFI SYAFAWI (samar/dengung)",
      "   Jika setelah mim mati ada huruf BA (ب)",
      "   Contoh: تَرْمِيهِمْ بِ = tarmihimbi (dibaca 'mim' dengung samar)",
      "",
      "3. IDZHAR SYAFAWI (jelas)",
      "   Jika setelah mim mati ada huruf selain MIM dan BA",
      "   Contoh: أَمْ لَمْ = alam lam (dibaca jelas, tidak dengung)",
    ],
  },
  "mad": {
    judul: "Hukum Bacaan Mad (Panjang)",
    isi: [
      "Mad = memanjangkan bacaan. Dibagi 2:",
      "",
      "MAD THABI'I (mad asli - 2 harakat):",
      "   Jika ada alif (ا) setelah fathah, ya (ي) setelah kasrah, wawu (و) setelah dhammah",
      "   Contoh: قَالَ = qoola (qo-la = 2 harakat)",
      "   Contoh: قِيلَ = qiila (qi-i-la = 2 harakat)",
      "",
      "MAD FAR'I (mad cabang):",
      "1. Mad Wajib Muttasil: mad + hamzah dalam 1 kata (panjang 5 harakat)",
      "   Contoh: جَاءَ = jaaa-a",
      "2. Mad Jaiz Munfashil: mad + hamzah beda kata (panjang 4-5 harakat)",
      "   Contoh: إِنَّ أَنْتُمْ = inna antum",
      "3. Mad Lin: mad sebelum huruf mati (panjang 2/4/6 harakat)",
      "   Contoh: أَنْتُمْ = antum",
      "4. Mad Aridh Lissukun: sebelum waqaf (berhenti) (panjang 2/4/6 harakat)",
      "   Contoh: الْعَالَمِينْ = 'aalamiin (saat berhenti)",
    ],
  },
  "qalqalah": {
    judul: "Hukum Qalqalah (Memantul)",
    isi: [
      "Qalqalah = bunyi pantulan/echo setelah huruf mati",
      "",
      "5 Huruf Qalqalah: ق ط ب ج د",
      "(QoTho Ba JiDal - tersusun dari kata: قطب جد)",
      "",
      "Jenis Qalqalah:",
      "1. Qalqalah Shughra (kecil) - huruf qalqalah mati di tengah kata",
      "   Contoh: يَقْدِرُ = yaq-dir (pantulan kecil)",
      "",
      "2. Qalqalah Kubra (besar) - huruf qalqalah mati di akhir kata saat waqaf",
      "   Contoh: الْحَقُّ = al-haqq (pantulan besar saat berhenti)",
      "",
      "Tingkat kekuatan: Qalqalah Kubra > Shughra",
      "Paling kuat: QAF dan THA",
      "Paling lemah: DAL dan BA",
    ],
  },
  "waqaf": {
    judul: "Waqaf (Berhenti Bacaan)",
    isi: [
      "Waqaf = berhenti dalam bacaan Al-Quran",
      "",
      "Jenis Waqaf:",
      "1. Waqaf Tam (sempurna) - berhenti di akhir ayat/kalimat lengkap",
      "2. Waqaf Hasan (baik) - berhenti di titik yang maknanya masih nyambung",
      "3. Waqaf Qalil (sedikit) - berhenti tapi masih bisa lanjut",
      "4. Waqaf Qabih (buruk) - berhenti di tempat yang merusak makna (dilarang)",
      "",
      "Tanda Waqaf dalam Al-Quran:",
      "م = waqaf lazim (wajib berhenti)",
      "لا = laa waqaf (jangan berhenti)",
      "حـ = waqaf jaiz (boleh berhenti/lanjut)",
      "صـ = sila waqaf (lebih baik berhenti)",
      "قف = qif (disunnahkan berhenti)",
      "ؕ = waqaf munfasil",
      "",
      "Saat waqaf: baca panjang 6 harakat (mad aridh lissukun) untuk huruf hidup, atau qalqalah kubra untuk huruf qalqalah",
    ],
  },
  "ghunnah": {
    judul: "Ghunnah (Dengung)",
    isi: [
      "Ghunnah = bunyi dengung dari hidung saat membaca",
      "",
      "Wajib Ghunnah (selalu dengung):",
      "1. Nun tasydid (نّ) - contoh: إِنَّ = inna (dengung 2 harakat)",
      "2. Mim tasydid (مّ) - contoh: فَأَمَّا = fa-amma (dengung 2 harakat)",
      "",
      "Jenis Ghunnah berdasarkan tingkat:",
      "1. Ghunnah Akm (paling sempurna) - jika setelahnya ada idgham bighunnah",
      "2. Ghunnah Ashil (sedang) - nun/mim tasydid biasa",
      "3. Ghunnah Naqish (kurang) - iqlab (nun + ba = jadi mim dengung)",
      "",
      "Tips: Latih pernapasan, dengung keluar dari hidung bukan mulut",
      "Durasi: 2 harakat (kira-kira 1-1.5 detik)",
    ],
  },
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "list") {
      let lines = [];
      lines.push("Belajar Mengaji - Dasar Tajwid");
      lines.push(Object.keys(TOPIK).length + " Topik Pembelajaran");
      lines.push("");
      let i = 1;
      for (const [k, v] of Object.entries(TOPIK)) {
        lines.push(i + ". " + k + " (" + v.judul + ")");
        i++;
      }
      lines.push("");
      lines.push("Cara: " + usedPrefix + "mengaji <topik>");
      lines.push("Contoh: " + usedPrefix + "mengaji hijaiyah | " + usedPrefix + "mengaji nun");
      return m.reply(raraWrap("Belajar Mengaji", lines.join("\n")));
    }

    if (!TOPIK[input]) {
      return m.reply(raraWrap("Belajar Mengaji", "Topik tidak ditemukan: " + input + "\nKetik " + usedPrefix + "mengaji list"));
    }

    const t = TOPIK[input];
    return m.reply(raraWrap("Mengaji - " + t.judul, t.isi.join("\n")));
  } catch (e) {
    return m.reply(raraWrap("Belajar Mengaji", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
