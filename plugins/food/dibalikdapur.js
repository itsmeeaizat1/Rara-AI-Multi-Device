// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

// === KONVERSI UKURAN DAPUR ===
const CONVERSIONS = {
  "cup": { ml: 240, tbsp: 16, tsp: 48, gram_air: 240, gram_gula: 200, gram_tepung: 120, gram_beras: 200, gram_minyak: 220 },
  "tablespoon": { ml: 15, tsp: 3, cup: 0.0625, gram_air: 15, gram_gula: 12, gram_tepung: 8, gram_garam: 18 },
  "teaspoon": { ml: 5, tbsp: 0.333, cup: 0.0208, gram_air: 5, gram_gula: 4, gram_garam: 6, gram_tepung: 3 },
  "gram": { oz: 0.0353, lb: 0.0022 },
  "kg": { lb: 2.2046, oz: 35.274, gram: 1000 },
  "liter": { ml: 1000, cup: 4.227, quart: 1.057, gallon: 0.2642 },
  "oz": { gram: 28.35, lb: 0.0625 },
  "lb": { gram: 453.6, kg: 0.4536, oz: 16 },
  "pint": { ml: 473.2, cup: 2, liter: 0.4732 },
  "quart": { ml: 946.4, liter: 0.9464, cup: 4 },
  "gallon": { liter: 3.785, ml: 3785 },
  "stick_butter": { gram: 113, tbsp: 8, cup: 0.5 },
};

// === SUBSTITUSI BAHAN ===
const SUBSTITUTIONS = {
  "telur": ["1 telur = 1 sdm biji chia + 3 sdm air (diam 5 menit)", "1 telur = 1 pisang lumat (untuk kue)", "1 telur = 60ml applesauce", "1 telur = 1 sdm flaxseed + 3 sdm air"],
  "mentega": ["1 cup mentega = 3/4 cup minyak sayur", "1 cup mentega = 1 cup margarin", "1 cup mentega = 3/4 cup shortening"],
  "susu": ["1 cup susu = 1/2 cup susu kental + 1/2 cup air", "1 cup susu = 1 sdm susu bubuk + 1 cup air", "1 cup susu = 3/4 cup yogurt + 1/4 cup air"],
  "buttermilk": ["1 cup buttermilk = 1 cup susu + 1 sdm lemon/cuka (diam 5 menit)", "1 cup buttermilk = 1 cup yogurt plain"],
  "krim": ["1 cup krim = 3/4 cup susu + 1/4 cup mentega cair", "1 cup krim = 1 cup susu evaporasi"],
  "gula": ["1 cup gula putih = 1 cup gula merah (rasa lebih karamel)", "1 cup gula = 3/4 cup madu (kurangi cairan lain 1/4 cup)", "1 cup gula = 1 cup stevia (lebih manis)"],
  "tepung": ["1 cup tepung terigu = 1 cup tepung gandum + 1 sdt baking powder", "1 cup tepung terigu = 3/4 cup tepung beras + 1/4 cup tepung tapioka", "1 cup tepung = 1 cup oat flour (gluten free)"],
  "baking powder": ["1 sdt baking powder = 1/4 sdt baking soda + 1/2 sdt cream of tartar", "1 sdt baking powder = 1/4 sdt baking soda + 1 sdm cuka/lemon"],
  "vanila": ["1 sdt vanili = 1 sdt ekstrak almond", "1 sdt vanili = 1 sdm madu", "1 sdt vanili = 1/2 sdt cinnamon + 1/4 sdt nutmeg"],
  "cokelat": ["100g cokelat dark = 3 sdm cocoa + 1 sdm mentega + 3 sdm gula", "1 bar cokelat = 3 sdm cocoa powder + 1 sdm minyak"],
  "kecap": ["Kecap asin = kecap manis + sedikit garam", "Kecap manis = kecap asin + 2 sdm gula merah"],
  "saus tiram": ["Saus tiram = kecap asin + sedikit gula + maizena", "Saus tiram = kecap ikan + gula merah"],
  "tomat": ["1 cup tomat cincang = 1 sdm pasta tomat + 3 sdm air", "1 buah tomat = 6 sdm sari tomat"],
  "bawang putih": ["1 siung bawang putih = 1/4 sdt bawang bubuk", "1 siung bawang putih = 1 sdt bawang putih cincang kalengan"],
  "jahe": ["1 sdt jahe segar = 1/4 sdt jahe bubuk", "1 sdt jahe bubuk = 1 sdm jahe segar parut"],
  "santan": ["1 cup santan = 1/4 cup kelapa parut kering + 3/4 cup air panas (diam 10 menit, saring)", "1 cup santan kental = 3/4 cup yogurt plain + 1/4 cup minyak kelapa"],
  "maizena": ["1 sdm maizena = 2 sdm tepung terigu (sebagai pengental)", "1 sdm maizena = 1 sdm tepung beras", "1 sdm maizena = 1 sdm arrowroot"],
  "ragi": ["1 sdt ragi instan = 1.5 sdt ragi aktif kering", "Ragi instan = ragi aktif (sama-sama, instan langsung campur)"],
  "garam": ["1 sdt garam = 1 sdt garam laut = 1/2 sdt garam halus = 1.5 sdt garam kasar"],
};

// === TIPS MEMASAK ===
const COOKING_TIPS = [
  "Cara menyempurnakan nasi: cuci beras 2-3 kali sampai air bening, rendam 30 menit sebelum masak. Hasilnya lebih pulen dan wangi.",
  "Sup terlalu asin? Masukkan kentang potong dadu, rebus 10 menit. Kentang menyerap garam. Buang kentang sebelum sajikan.",
  "Agar ayam goreng renyah: balut ayam dengan buttermilk atau air es + garam 30 menit sebelum digoreng. Keringkan, lalu balut tepung.",
  "Mencegah minyak percik: taburi sedikit garam di wajan sebelum menuang minyak. Garam menyerap kelembaban yang menyebabkan percikan.",
  "Cara membuat telur setengah matang sempurna: rebus air, matikan kompor, masukkan telur, tutup panci. 6 menit untuk kuning telur lembek, 8 menit untuk kuning padat.",
  "Untuk bawang goreng renyah: iris tipis bawang merah, taburi sedikit garam dan tepung beras, goreng dengan minyak panas sedang.",
  "Steak matang sempurna: keluarkan dari kulkas 30 menit sebelum masak. Keringkan permukaan dengan tissue. Panaskan wajan sampai berasap, masak 2-3 menit per sisi.",
  "Cara memotong bawang tanpa menangis: potong pangkal bawang terakhir, atau taruh bawang di freezer 10 menit sebelum dipotong.",
  "Agar mie tidak menggumpal: rebus dengan air mendidih penuh, tambahkan 1 sdt minyak, aduk sesekali. Tiriskan dan bilas dengan air hangat.",
  "Saus pasta lebih kental: tambahkan air rebusan pasta (pasta water) ke saus. Pati dalam air mengentalkan saus dengan natural.",
  "Cara menyimpan daun segar: cuci, keringkan dengan tissue, bungkus dengan tissue dapur, simpan di wadah tertutup di kulkas. Bertahan 1-2 minggu.",
  "Menghilangkan bau ikan: rendam ikan dengan air garam atau jeruk nipis 10 menit sebelum dimasak. Bilas bersih.",
  "Nasi goreng tidak lembek: gunakan nasi dingin (sisa semalam). Panaskan wajan dengan api besar, masak cepat dengan sedikit minyak.",
  "Kue mengembang sempurna: bahan harus suhu ruang (terutama telur dan mentega). Oven dipanaskan dulu 10 menit sebelum masukkan adonan.",
  "Cara menyimpan jahe: kupas, potong kecil, simpan di freezer. Bisa diparut langsung tanpa thawing. Bertahan berbulan-bulan.",
  "Untuk tahu yang tidak hancur saat digoreng: potong tahu, taburi garam, diamkan 15 menit. Keringkan dengan tissue sebelum goreng.",
  "Cara menghilangkan bau langu pada daging: cuci daging dengan air mengalir, rendam dengan jeruk nipis atau cuka 15 menit, bilas.",
  "Agar kentang goreng renyah: potong kentang, rendam air dingin 30 menit, keringkan sempurna, goreng 2x (goreng lembut dulu, lalu goreng renvuh).",
  "Cara membuka kelapa muda: pecahkan dengan punggung pisau besar (bukan mata), putar dan pukul keliling sampai retak. Buka dengan tangan.",
  "Cara memasak sayuran hijau tetap hijau: rebus dengan air mendidih + sedikit garam, jangan tutup panci, masak 2-3 menit, langsung tiriskan dan siram air dingin.",
  "Agar kuah bening: gunakan api kecil, jangan biarkan mendidih terlalu keras. Buang busa/buih yang muncul di permukaan.",
  "Cara membuat sambal lebih nendang: goreng bumbu (cabai, bawang, tomat) dengan sedikit minyak sebelum diulek. Minyak membawa rasa.",
  "Untuk cake yang lembut: jangan over-mix adonan setelah menambahkan tepung. Aduk sampai tepung tercampur saja. Over-mix membuat cake keras.",
];

// === SUHU MASAK INTERNAL ===
const COOKING_TEMPS = {
  "ayam": { temp: 74, note: "Daging paha dan dada, suhu internal 74C. Jangan makan ayam mentah." },
  "daging_sapi_medium": { temp: 63, note: "Steak medium, suhu internal 63C, istirahatkan 5 menit." },
  "daging_sapi_welldone": { temp: 71, note: "Steak well-done, suhu 71C." },
  "daging_sapi_rare": { temp: 52, note: "Steak rare, suhu 52C." },
  "babi": { temp: 71, note: "Daging babi harus matang sempurna, suhu 71C." },
  "ikan": { temp: 63, note: "Ikan matang pada 63C, daging terlihat berlapis." },
  "udang": { temp: 55, note: "Udang berubah warna jadi pink pada 55C, masak cepat." },
  "kalkun": { temp: 74, note: "Kalkun, suhu internal 74C di bagian paha." },
  "telur": { temp: 71, note: "Telur matang pada 71C, kuning telur padat." },
  "domba": { temp: 63, note: "Daging domba medium, suhu 63C." },
};

// === PENYIMPANAN MAKANAN ===
const STORAGE_GUIDE = {
  "beras": { suhu: "Suhu ruang", lama: "6-12 bulan", catatan: "Simpan di wadah kedap udara, jauhkan dari kelembaban." },
  "telur": { suhu: "Kulkas", lama: "3-5 minggu", catatan: "Simpan di rak utama kulkas, bukan di pintu kulkas." },
  "daging_seg_fris": { suhu: "Kulkas (0-4C)", lama: "1-2 hari", catatan: "Simpan di rak paling bawah, bungkus rapat." },
  "daging_be_ku": { suhu: "Freezer (-18C)", lama: "3-6 bulan", catatan: "Bungkus dengan plastik rapat, label tanggal." },
  "ikan_segar": { suhu: "Kulkas (0-2C)", lama: "1-2 hari", catatan: "Bungkus dengan es, masukkan di rak paling bawah." },
  "sayur_hijau": { suhu: "Kulkas", lama: "3-7 hari", catatan: "Bungkus tissue dapur, simpan di wadah tertutup." },
  "tomat": { suhu: "Suhu ruang", lama: "3-5 hari", catatan: "Jangan simpan di kulkas, rasa berubah. Pindah ke kulkas jika sudah matang." },
  "pisang": { suhu: "Suhu ruang", lama: "3-5 hari", catatan: "Jangan simpan di kulkas, kulit menghitam. Bungkus tangkai dengan plastik." },
  "bawang_putih": { suhu: "Suhu ruang", lama: "1-2 bulan", catatan: "Simpan di tempat kering, gelap, dengan ventilasi." },
  "kentang": { suhu: "Suhu ruang", lama: "1-2 bulan", catatan: "Simpan di tempat gelap, kering. Jangan simpan di kulkas." },
  "cabai": { suhu: "Kulkas", lama: "1-2 minggu", catatan: "Simpan di kantong plastik berlubang di laci sayur." },
  "kecap": { suhu: "Suhu ruang", lama: "6-12 bulan", catatan: "Tutup rapat setelah dibuka. Bisa simpan di kulkas untuk awet." },
  "saus_sambal": { suku: "Kulkas setelah dibuka", lama: "6 bulan", catatan: "Gunakan sendok bersih saat mengambil." },
  "minyak_goreng": { suhu: "Suhu ruang", lama: "6-12 bulan", catatan: "Simpan di tempat gelap, jauh dari panas." },
  "madu": { suhu: "Suhu ruang", lama: "Tidak terbatas", catatan: "Jangan simpan di kulkas. Madu tidak pernah basi." },
  "tepung": { suhu: "Suhu ruang", lama: "6-12 bulan", catatan: "Simpan di wadah kedap udara. Bisa simpan di freezer untuk awet." },
  "jahe": { suhu: "Kulkas", lama: "2-3 minggu", catatan: "Bungkus tissue, simpan di kantong plastik berlubang." },
  "daun_bawang": { suhu: "Kulkas", lama: "1-2 minggu", catatan: "Bungkus tissue dapur, simpan di wadah tertutup." },
  "santan": { suhu: "Kulkas", lama: "2-3 hari (segar), 3 bulan (beku)", catatan: "Bekukan dalam wadah ice cube untuk porsi kecil." },
};

// === KOMPATIBILITAS BAHAN ===
const PAIRING_TIPS = {
  "ayam": ["Pasar dengan: lemon, rosemary, thyme, bawang putih, paprika", "Bumbu terbaik: kunyit, ketumbar, lengkuas, daun jeruk", "Saus cocok: kecap manis, saus tiram, madu, BBQ"],
  "daging_sapi": ["Pasangan dengan: lada hitam, rosemary, bawang, mustard", "Bumbu terbaik: pala, kayu manis, thyme, bawang putih", "Saus cocok: BBQ, kecap, Worcestershire, truffle"],
  "ikan": ["Pasangan dengan: lemon, dill, bawang putih, jahe", "Bumbu terbaik: kunyit, ketumbar, asam jawa, daun jeruk", "Saus cocok: saus tiram, kecap asin, tartar, chili"],
  "udang": ["Pasangan dengan: bawang putih, lemon, cabai, parsley", "Bumbu terbaik: ketumbar, kunyit, lada, paprika", "Saus cocok: saus tiram, mayo, chili sauce, butter"],
  "sayuran": ["Pasangan dengan: bawang putih, lada, oregano, keju parmesan", "Bumbu terbaik: rosemary, thyme, basil, paprika", "Saus cocok: vinaigrette, keju, butter, sesame"],
  "nasi": ["Pasangan dengan: bawang merah, bawang putih, daun pandan", "Bumbu terbaik: kunyit, serai, daun jeruk, santan", "Sajian: nasi goreng, nasi lemak, nasi uduk, biryani"],
  "mie": ["Pasangan dengan: bawang putih, daun bawang, cabai", "Bumbu terbaik: kecap, minyak wijen, saus tiram", "Sajian: mie goreng, ramen, laksa, kwetiau"],
  "tahu": ["Pasangan dengan: bawang putih, jahe, kecap, cabai", "Bumbu terbaik: tauco, kecap manis, saus tiram", "Sajian: tahu goreng, mapo tofu, tahu isi, tahu campur"],
  "tempe": ["Pasangan dengan: bawang merah, cabai, kecap", "Bumbu terbaik: ketumbar, kunyit, asam jawa", "Sajian: tempe goreng, tempe mendoan, tempe orek, sambal terasi"],
  "telur": ["Pasangan dengan: bawang merah, daun bawang, tomat", "Bumbu terbaik: garam, lada, kecap", "Sajian: telur dadar, telur ceplok, telur asin, telur balado"],
};

// === NUTRITION GRADE ===
const NUTRI_GRADE = {
  a: { label: "A - Sangat Sehat", color: "🟢", note: "Kandungan nutrisi sangat baik, rendah garam, gula, lemak jenuh." },
  b: { label: "B - Sehat", color: "🟢", note: "Kandungan nutrisi baik, pilihan yang sehat." },
  c: { label: "C - Cukup", color: "🟡", note: "Sebatas cukup, perhatikan kandungan gula dan garam." },
  d: { label: "D - Kurang Sehat", color: "🟠", note: "Tinggi gula, garam, atau lemak. Konsumsi secukupnya." },
  e: { label: "E - Tidak Sehat", color: "🔴", note: "Tinggi gula, garam, lemak jenuh. Hindari konsumsi sering." },
};

const pluginConfig = {
  name: "dibalikdapur",
  alias: ["dapur", "tipsdapur", "kitchentips", "dapurtips"],
  category: "food",
  description: "Tips dapur, konversi ukuran, substitusi bahan, suhu masak, penyimpanan makanan, scan barcode produk",
  usage: ".dapur <subkomandan>",
  example: ".dapur tips | .dapur konversi | .dapur sub <bahan> | .dapur suhu <daging> | .dapur simpan <bahan> | .dapur scan <barcode>",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock, args }) {
  const sub = (args[0] || "").toLowerCase();
  const query = args.slice(1).join(" ").trim();

  // === HELP ===
  if (!sub || sub === "help" || sub === "menu") {
    let txt = `Dibalik Dapur\n\n`;
    txt += `Panduan dapur lengkap: tips, konversi, substitusi, suhu, penyimpanan, dan scanner produk.\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}dapur tips\` - Tips memasak random\n`;
    txt += `2. \`${m.prefix}dapur konversi <angka> <dari> <ke>\` - Konversi ukuran\n`;
    txt += `3. \`${m.prefix}dapur sub <bahan>\` - Substitusi bahan\n`;
    txt += `4. \`${m.prefix}dapur suhu <daging>\` - Suhu masak internal\n`;
    txt += `5. \`${m.prefix}dapur simpan <bahan>\` - Panduan penyimpanan\n`;
    txt += `6. \`${m.prefix}dapur pasangan <bahan>\` - Kompatibilitas bahan\n`;
    txt += `7. \`${m.prefix}dapur scan <barcode>\` - Scan produk barcode\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}dapur tips\`\n`;
    txt += `\`${m.prefix}dapur konversi 1 cup ml\`\n`;
    txt += `\`${m.prefix}dapur sub telur\`\n`;
    txt += `\`${m.prefix}dapur suhu ayam\`\n`;
    txt += `\`${m.prefix}dapur simpan beras\`\n`;
    txt += `\`${m.prefix}dapur pasangan ayam\`\n`;
    txt += `\`${m.prefix}dapur scan 3017620422003\``;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === TIPS RANDOM ===
  if (sub === "tips" || sub === "tip") {
    const tip = COOKING_TIPS[Math.floor(Math.random() * COOKING_TIPS.length)];
    let txt = `Tips Dapur\n\n`;
    txt += `${tip}\n\n`;
    txt += `Ketik \`${m.prefix}dapur tips\` untuk tips lainnya`;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === KONVERSI UKURAN ===
  if (sub === "konversi" || sub === "convert") {
    if (!query) {
      let txt = `Konversi Ukuran Dapur\n\n`;
      txt += `Format: \`${m.prefix}dapur konversi <angka> <dari> <ke>\`\n\n`;
      txt += `Satuan tersedia:\n`;
      txt += `1. cup, tablespoon (sdm), teaspoon (sdt)\n`;
      txt += `2. gram, kg, oz, lb\n`;
      txt += `3. liter, ml, pint, quart, gallon\n`;
      txt += `4. stick_butter (batang mentega)\n\n`;
      txt += `Contoh:\n`;
      txt += `\`${m.prefix}dapur konversi 1 cup ml\`\n`;
      txt += `\`${m.prefix}dapur konversi 500 gram oz\`\n`;
      txt += `\`${m.prefix}dapur konversi 2 cup gram_air\`\n\n`;
      txt += `Catatan: gram_air, gram_gula, gram_tepung, gram_beras, gram_minyak untuk konversi cup/tbsp/tsp ke gram berdasarkan bahan.`;
      return await m.reply( txt, { commandName: "dibalikdapur" });
    }

    const parts = query.toLowerCase().split(/\s+/);
    if (parts.length < 3) {
      return m.reply(`Format salah!\n\nGunakan: \`${m.prefix}dapur konversi <angka> <dari> <ke>\`\nContoh: \`${m.prefix}dapur konversi 1 cup ml\``);
    }

    const amount = parseFloat(parts[0]);
    const from = parts[1];
    const to = parts[2];

    if (isNaN(amount)) return m.reply(claraWrap("Dibalikdapur", `Angka tidak valid: "${parts[0]}"`));

    const conv = CONVERSIONS[from];
    if (!conv) return m.reply(`Satuan "${from}" tidak ditemukan.\n\nKetik \`${m.prefix}dapur konversi\` untuk lihat daftar satuan.`);

    const factor = conv[to];
    if (factor === undefined) return m.reply(`Tidak bisa konversi dari "${from}" ke "${to}".\n\nKetik \`${m.prefix}dapur konversi\` untuk lihat daftar.`);

    const result = (amount * factor).toFixed(2);
    const unitLabel = to.replace(/_/g, " ");

    let txt = `Konversi Ukuran\n\n`;
    txt += `${amount} ${from.replace(/_/g, " ")} = ${result} ${unitLabel}\n`;

    // Show all conversions for this unit
    txt += `\nKonversi lain untuk ${amount} ${from.replace(/_/g, " ")}:\n`;
    for (const [unit, val] of Object.entries(conv)) {
      if (unit !== to) {
        txt += `  ${(amount * val).toFixed(2)} ${unit.replace(/_/g, " ")}\n`;
      }
    }

    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === SUBSTITUSI BAHAN ===
  if (sub === "sub" || sub === "substitusi") {
    if (!query) {
      let txt = `Substitusi Bahan\n\n`;
      txt += `Cari pengganti bahan yang tidak tersedia di dapur.\n\n`;
      txt += `Format: \`${m.prefix}dapur sub <bahan>\`\n\n`;
      txt += `Bahan tersedia:\n`;
      txt += `telur, mentega, susu, buttermilk, krim, gula, tepung, baking powder, vanila, cokelat, kecap, saus tiram, tomat, bawang putih, jahe, santan, maizena, ragi, garam\n\n`;
      txt += `Contoh: \`${m.prefix}dapur sub telur\``;
      return await m.reply( txt, { commandName: "dibalikdapur" });
    }

    const key = query.toLowerCase().replace(/\s+/g, "_");
    const subs = SUBSTITUTIONS[query.toLowerCase()] || SUBSTITUTIONS[key];

    if (!subs) {
      return m.reply(`Substitusi untuk "${query}" tidak ditemukan.\n\nKetik \`${m.prefix}dapur sub\` untuk lihat daftar bahan.`);
    }

    let txt = `Substitusi: ${query}\n\n`;
    subs.forEach((s, i) => {
      txt += `${i + 1}. ${s}\n`;
    });
    txt += `\nTips: gunakan substitusi yang paling mirip tekstur dan rasa`;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === SUHU MASAK ===
  if (sub === "suhu" || sub === "termometer") {
    if (!query) {
      let txt = `Suhu Masak Internal\n\n`;
      txt += `Suhu aman untuk berbagai jenis daging dan protein.\n\n`;
      txt += `Format: \`${m.prefix}dapur suhu <bahan>\`\n\n`;
      txt += `Bahan tersedia:\n`;
      txt += `ayam, daging_sapi_rare, daging_sapi_medium, daging_sapi_welldone, babi, ikan, udang, kalkun, telur, domba\n\n`;
      txt += `Contoh: \`${m.prefix}dapur suhu ayam\``;
      return await m.reply( txt, { commandName: "dibalikdapur" });
    }

    const key = query.toLowerCase().replace(/\s+/g, "_");
    const temp = COOKING_TEMPS[query.toLowerCase()] || COOKING_TEMPS[key];

    if (!temp) {
      return m.reply(`Suhu untuk "${query}" tidak ditemukan.\n\nKetik \`${m.prefix}dapur suhu\` untuk lihat daftar.`);
    }

    let txt = `Suhu Masak: ${query}\n\n`;
    txt += `Suhu internal aman: ${temp.temp}C (${Math.round(temp.temp * 9/5 + 32)}F)\n`;
    txt += `Catatan: ${temp.note}\n\n`;
    txt += `Gunakan termometer dapur untuk akurasi`;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === PENYIMPANAN MAKANAN ===
  if (sub === "simpan" || sub === "penyimpanan" || sub === "storage") {
    if (!query) {
      let txt = `Panduan Penyimpanan Makanan\n\n`;
      txt += `Cara menyimpan bahan makanan dengan benar.\n\n`;
      txt += `Format: \`${m.prefix}dapur simpan <bahan>\`\n\n`;
      txt += `Bahan tersedia:\n`;
      txt += `beras, telur, daging_seg_fris, daging_be_ku, ikan_segar, sayur_hijau, tomat, pisang, bawang_putih, kentang, cabai, kecap, saus_sambal, minyak_goreng, madu, tepung, jahe, daun_bawang, santan\n\n`;
      txt += `Contoh: \`${m.prefix}dapur simpan tomat\``;
      return await m.reply( txt, { commandName: "dibalikdapur" });
    }

    const key = query.toLowerCase().replace(/\s+/g, "_");
    const guide = STORAGE_GUIDE[query.toLowerCase()] || STORAGE_GUIDE[key];

    if (!guide) {
      return m.reply(`Panduan penyimpanan untuk "${query}" tidak ditemukan.\n\nKetik \`${m.prefix}dapur simpan\` untuk lihat daftar.`);
    }

    let txt = `Penyimpanan: ${query}\n\n`;
    txt += `Suhu: ${guide.suhu || guide.suku || "N/A"}\n`;
    txt += `Daya tahan: ${guide.lama}\n`;
    txt += `Catatan: ${guide.catatan}\n\n`;
    txt += `Simpan dengan benar agar makanan tetap segar dan aman`;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === PASANGAN BAHAN ===
  if (sub === "pasangan" || sub === "pairing" || sub === "cocok") {
    if (!query) {
      let txt = `Kompatibilitas Bahan\n\n`;
      txt += `Cari bahan dan bumbu yang cocok dipadukan.\n\n`;
      txt += `Format: \`${m.prefix}dapur pasangan <bahan>\`\n\n`;
      txt += `Bahan tersedia:\n`;
      txt += `ayam, daging_sapi, ikan, udang, sayuran, nasi, mie, tahu, tempe, telur\n\n`;
      txt += `Contoh: \`${m.prefix}dapur pasangan ayam\``;
      return await m.reply( txt, { commandName: "dibalikdapur" });
    }

    const key = query.toLowerCase().replace(/\s+/g, "_");
    const pair = PAIRING_TIPS[query.toLowerCase()] || PAIRING_TIPS[key];

    if (!pair) {
      return m.reply(`Pasangan untuk "${query}" tidak ditemukan.\n\nKetik \`${m.prefix}dapur pasangan\` untuk lihat daftar.`);
    }

    let txt = `Pasangan Bahan: ${query}\n\n`;
    pair.forEach((p) => {
      txt += `${p}\n\n`;
    });
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // === SCAN BARCODE ===
  if (sub === "scan" || sub === "barcode" || sub === "cekproduk") {
    if (!query) {
      return m.reply(`Format: \`${m.prefix}dapur scan <barcode>\`\n\nContoh: \`${m.prefix}dapur scan 3017620422003\`\n\nSumber: Open Food Facts (gratis, jutaan produk)`);
    }

    await m.react("🕒");
    try {
      const res = await axios.get(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}?fields=product_name,brands,nutriscore_grade,nutriments,ingredients_text,quantity,allergens,image_url,quantity,countries`);

      if (!res.data || res.data.status !== 1 || !res.data.product) {
        return m.reply(`Produk dengan barcode "${query}" tidak ditemukan di database Open Food Facts.\n\nCoba barcode lain atau ketik \`${m.prefix}dapur scan\` untuk info.`);
      }

      const p = res.data.product;
      const n = p.nutriments || {};

      let txt = `Hasil Scan: ${query}\n\n`;
      txt += `${p.product_name || "N/A"}\n`;
      if (p.brands) txt += `Brand: ${p.brands}\n`;
      if (p.quantity) txt += `Isi: ${p.quantity}\n`;

      // Nutrition grade
      if (p.nutriscore_grade) {
        const grade = NUTRI_GRADE[p.nutriscore_grade];
        if (grade) {
          txt += `Nutri-Score: ${grade.color} ${grade.label}\n`;
        }
      }

      // Nutrition info
      const kcal = n["energy-kcal_100g"] || n["energy-kcal_value"] || n["energy-kcal"];
      if (kcal) txt += `\nNilai Gizi (per 100g):\n`;
      if (kcal) txt += `  Kalori: ${kcal} kcal\n`;
      if (n.fat_100g) txt += `  Lemak: ${n.fat_100g}g\n`;
      if (n["saturated-fat_100g"]) txt += `  Lemak Jenuh: ${n["saturated-fat_100g"]}g\n`;
      if (n.carbohydrates_100g) txt += `  Karbohidrat: ${n.carbohydrates_100g}g\n`;
      if (n.sugars_100g) txt += `  Gula: ${n.sugars_100g}g\n`;
      if (n.proteins_100g) txt += `  Protein: ${n.proteins_100g}g\n`;
      if (n.salt_100g) txt += `  Garam: ${n.salt_100g}g\n`;
      if (n.fiber_100g) txt += `  Serat: ${n.fiber_100g}g\n`;

      // Allergens
      if (p.allergens) {
        const allergens = p.allergens.replace(/en:/g, "").trim();
        if (allergens) txt += `\nAlergen: ${allergens}\n`;
      }

      // Ingredients
      if (p.ingredients_text) {
        const ingredients = p.ingredients_text.substring(0, 300);
        txt += `\nBahan: ${ingredients}${p.ingredients_text.length > 300 ? "..." : ""}\n`;
      }

      txt += `\nSumber: Open Food Facts`;
      await m.react("🐣");
      return await m.reply( txt, { commandName: "dibalikdapur" });
    } catch (e) {
      return m.reply("Error scan barcode: " + e.message);
    }
  }

  // === DAFTAR KONVERSI cepat ===
  if (sub === "daftar" || sub === "list") {
    let txt = `Tabel Konversi Cepat\n\n`;
    txt += `1 cup = 240ml = 16 sdm = 48 sdt\n`;
    txt += `1 sdm = 15ml = 3 sdt\n`;
    txt += `1 sdt = 5ml\n\n`;
    txt += `1 cup tepung terigu = 120g\n`;
    txt += `1 cup gula pasir = 200g\n`;
    txt += `1 cup gula merah = 220g\n`;
    txt += `1 cup mentega = 227g\n`;
    txt += `1 cup beras = 200g\n`;
    txt += `1 cup minyak = 220g\n\n`;
    txt += `1 kg = 2.2 lb = 35.3 oz\n`;
    txt += `500g = 1.1 lb = 17.6 oz\n`;
    txt += `1 liter = 4.2 cup = 1000ml\n`;
    txt += `1 pint = 2 cup = 473ml\n\n`;
    txt += `1 batang mentega = 113g = 8 sdm = 1/2 cup\n`;
    txt += `1 siung bawang putih = 1 sdt bubuk\n`;
    txt += `1 ruas jahe (2.5cm) = 1 sdt bubuk\n`;
    return await m.reply( txt, { commandName: "dibalikdapur" });
  }

  // Unknown subcommand
  return m.reply(`Subkomandan tidak dikenal: "${sub}"\n\nKetik \`${m.prefix}dapur\` untuk lihat daftar perintah.`);
}

export { pluginConfig as config, handler };
