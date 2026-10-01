// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "soalessay",
  alias: ["soalessay", "essay"],
  category: "education",
  description: "Latihan soal essay/uraian SD/SMP/SMA/SMK - jawab terbuka + kunci jawaban",
  usage: ".essay <jenjang> <mapel> [jumlah]",
  example: ".essay sd ipa 3",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// === ESSAY QUESTION BANK ===
const ESSAY_BANK = {
  sd: {
    matematika: [
      { q: "Jelaskan apa yang dimaksud dengan bilangan prima dan berikan 5 contoh!", a: "Bilangan prima adalah bilangan yang hanya memiliki 2 faktor, yaitu 1 dan dirinya sendiri. Contoh: 2, 3, 5, 7, 11.", keywords: ["hanya", "2 faktor", "1 dan dirinya"] },
      { q: "Sebuah toko menjual 12 kotak pensil, tiap kotak berisi 8 buah. Berapakah total pensil yang dijual? Jelaskan caranya!", a: "12 kotak x 8 pensil = 96 pensil. Cara: kalikan jumlah kotak dengan isi tiap kotak.", keywords: ["12", "8", "96", "kali"] },
      { q: "Jelaskan perbedaan antara keliling dan luas!", a: "Keliling adalah panjang total sisi-sisi suatu bangun datar (mengelilingi). Luas adalah ukuran permukaan di dalam bangun datar (menutupi area).", keywords: ["keliling", "sisi", "luas", "permukaan"] },
      { q: "Pak Budi punya 50.000 rupiah. Dia beli buku 12.000 dan pensil 8.000. Berapa sisa uangnya? Jelaskan!", a: "50.000 - 12.000 - 8.000 = 30.000. Sisa uang Pak Budi adalah 30.000 rupiah.", keywords: ["50.000", "12.000", "8.000", "30.000"] },
      { q: "Jelaskan apa itu pecahan dan berikan contoh!", a: "Pecahan adalah bagian dari keseluruhan yang dibagi menjadi beberapa bagian sama. Ditulis dengan pembilang/penyebut. Contoh: 1/2, 3/4, 2/5.", keywords: ["bagian", "keseluruhan", "pembilang", "penyebut"] },
    ],
    ipa: [
      { q: "Jelaskan proses fotosintesis pada tumbuhan!", a: "Fotosintesis adalah proses pembuatan makanan oleh tumbuhan hijau menggunakan cahaya matahari, air, dan karbon dioksida, menghasilkan glukosa dan oksigen. Terjadi di daun bagian kloroplas yang mengandung klorofil.", keywords: ["cahaya", "matahari", "air", "karbon dioksida", "klorofil"] },
      { q: "Sebutkan 3 sifat benda padat dan jelaskan!", a: "1. Bentuk tetap - benda padat tidak berubah bentuk. 2. Volume tetap - tidak berubah ukuran. 3. Susunan partikel rapat - molekul saling menempel.", keywords: ["bentuk", "tetap", "volume", "partikel"] },
      { q: "Jelaskan perbedaan hewan herbivora, karnivora, dan omnivora!", a: "Herbivora = pemakan tumbuhan (contoh: sapi, kambing). Karnivora = pemakan daging (contoh: harimau, singa). Omnivora = pemakan tumbuhan dan daging (contoh: tikus, ayam).", keywords: ["herbivora", "tumbuhan", "karnivora", "daging", "omnivora"] },
      { q: "Mengapa air bisa berubah menjadi es? Jelaskan!", a: "Air berubah menjadi es karena suhu menurun di bawah 0°C. Molekul air bergerak lebih lambat dan membentuk kristal padat. Proses ini disebut pembekuan.", keywords: ["suhu", "0", "membeku", "pembekuan", "dingin"] },
      { q: "Sebutkan dan jelaskan 3 sumber energi!", a: "1. Matahari - sumber energi terbesar untuk bumi. 2. Air - energi dari aliran air (PLTA). 3. Angin - energi dari gerakan angin (kincir angin).", keywords: ["matahari", "air", "angin", "energi"] },
    ],
    bindo: [
      { q: "Jelaskan apa yang dimaksud dengan ide pokok dalam paragraf!", a: "Ide pokok adalah inti pembicaraan atau gagasan utama dalam suatu paragraf. Biasanya terdapat dalam kalimat utama, bisa di awal, akhir, atau tengah paragraf.", keywords: ["inti", "gagasan", "utama", "paragraf"] },
      { q: "Buatlah kalimat tanya menggunakan kata 'mengapa'!", a: "Contoh: Mengapa hari ini hujan turun sangat deras? Kalimat tanya menggunakan kata tanya untuk meminta penjelasan alasan atau sebab.", keywords: ["mengapa", "tanya", "sebab"] },
      { q: "Jelaskan perbedaan pantun dan syair!", a: "Pantun: 4 baris, rim a-b-a-b, 2 baris pertama isi (sampiran), 2 baris terakhir isi. Syair: 4 baris, rim a-a-a-a, keempat baris berisi satu kesatuan isi.", keywords: ["pantun", "a-b-a-b", "syair", "a-a-a-a", "4 baris"] },
    ],
    ips: [
      { q: "Jelaskan mengapa Indonesia disebut negara kepulauan!", a: "Indonesia disebut negara kepulauan karena terdiri dari ribuan pulau besar dan kecil yang dipisahkan oleh laut. Ada lebih dari 17.000 pulau yang tersebar dari Sabang sampai Merauke.", keywords: ["pulau", "laut", "17.000", "kepulauan"] },
      { q: "Sebutkan 4 sila pertama Pancasila dan jelaskan singkat!", a: "1. Ketuhanan Yang Maha Esa. 2. Kemanusiaan yang adil dan beradab. 3. Persatuan Indonesia. 4. Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan.", keywords: ["ketuhanan", "kemanusiaan", "persatuan", "kerakyatan"] },
      { q: "Jelaskan apa yang terjadi pada saat proklamasi kemerdekaan!", a: "Pada 17 Agustus 1945, Soekarno dan Hatta membacakan teks proklamasi kemerdekaan Indonesia di Jalan Pegangsaan Timur No. 56 Jakarta. Ini menandakan Indonesia merdeka dari penjajahan.", keywords: ["17 agustus", "1945", "soekarno", "hatta", "proklamasi"] },
    ],
  },
  smp: {
    matematika: [
      { q: "Jelaskan cara menyelesaikan persamaan linear 2x + 5 = 15 langkah demi langkah!", a: "1. 2x + 5 = 15. 2. Pindahkan 5 ke ruas kanan: 2x = 15 - 5. 3. 2x = 10. 4. Bagi dengan 2: x = 10/2 = 5. Jadi x = 5.", keywords: ["15", "5", "2", "10", "bagi"] },
      { q: "Jelaskan teorema Pythagoras dan berikan contoh!", a: "Teorema Pythagoras: kuadrat sisi miring = jumlah kuadrat dua sisi lain. Rumus: c² = a² + b². Contoh: segitiga dengan sisi 3 dan 4, sisi miring = √(9+16) = √25 = 5.", keywords: ["c²", "a²", "b²", "sisi miring"] },
      { q: "Jelaskan perbedaan FPB dan KPK!", a: "FPB (Faktor Persekutuan Terbesar) = faktor terbesar yang sama-sama membagi habis dua bilangan. KPK (Kelipatan Persekutuan Terkecil) = kelipatan terkecil yang sama dari dua bilangan. FPB mencari pembagi, KPK mencari kelipatan.", keywords: ["faktor", "kelipatan", "terbesar", "terkecil"] },
      { q: "Sebuah lingkaran berjari-jari 14 cm. Hitung luasnya (π=22/7) dan jelaskan!", a: "Luas = π × r² = 22/7 × 14 × 14 = 22 × 2 × 14 = 616 cm². Cara: kuadratkan jari-jari lalu kalikan dengan π.", keywords: ["22/7", "14", "luas", "r²"] },
    ],
    ipa: [
      { q: "Jelaskan perbedaan gerak lurus beraturan dan gerak lurus berubah beraturan!", a: "GLB (Gerak Lurus Beraturan): kecepatan tetap, tidak ada percepatan. GLBB (Gerak Lurus Berubah Beraturan): kecepatan berubah secara teratur, ada percepatan tetap.", keywords: ["tetap", "berubah", "kecepatan", "percepatan"] },
      { q: "Jelaskan proses pernapasan pada manusia secara singkat!", a: "Inspirasi: udara masuk melalui hidung -> tenggorokan -> paru-paru, diafragma turun, rongga dada membesar. Ekspirasi: udara keluar, diafragma naik, rongga dada mengecil. Pertukaran gas: O2 masuk darah, CO2 keluar.", keywords: ["inspirasi", "ekspirasi", "paru", "diafragma", "O2", "CO2"] },
      { q: "Jelaskan apa itu zat asam, basa, dan garam beserta contoh!", a: "Asam: pH < 7, bersifat masam, contoh asam cuka (cuka). Basa: pH > 7, bersifat licin/pahit, contoh sabun. Garam: pH ≈ 7, netral, contoh garam dapur (NaCl).", keywords: ["asam", "basa", "garam", "pH"] },
      { q: "Jelaskan perbedaan gerak translasi, rotasi, dan vibrasi!", a: "Translasi: gerak lurus dari satu titik ke titik lain. Rotasi: gerak berputar pada suatu sumbu. Vibrasi: gerak bolak-balik melalui titik setimbang. Contoh: mobil (translasi), kipas (rotasi), bandul (vibrasi).", keywords: ["translasi", "rotasi", "vibrasi", "putar"] },
    ],
    bindo: [
      { q: "Jelaskan apa yang dimaksud dengan teks prosedur dan sebutkan strukturnya!", a: "Teks prosedur adalah teks yang berisi langkah-langkah atau cara membuat/melakukan sesuatu. Struktur: 1. Tujuan. 2. Langkah-langkah. 3. Penegasan (opsional). Ciri: menggunakan kata imperatif, urutan langkah.", keywords: ["langkah", "cara", "tujuan", "prosedur"] },
      { q: "Jelaskan perbedaan majas simile, metafora, dan personifikasi!", a: "Simile: perumpamaan menggunakan kata pembanding 'seperti/bagai'. Metafora: perbandingan langsung tanpa kata pembanding. Personifikasi: benda mati seolah-olah hidup seperti manusia.", keywords: ["simile", "metafora", "personifikasi", "perbandingan"] },
    ],
    ips: [
      { q: "Jelaskan dampak positif dan negatif globalisasi di Indonesia!", a: "Positif: kemajuan teknologi, pertukaran budaya, akses informasi, perkembangan ekonomi. Negatif: hilangnya budaya lokal, persaingan ekonomi, gaya hidup konsumtif, ketergantungan teknologi.", keywords: ["teknologi", "budaya", "positif", "negatif", "globalisasi"] },
      { q: "Jelaskan sistem pemerintahan Indonesia secara singkat!", a: "Indonesia menganut sistem presidensial. Presiden kepala negara sekaligus kepala pemerintahan. Ada 3 cabang: Eksekutif (Presiden), Legislatif (DPR/MPR), Yudikatif (MA). Berdasarkan UUD 1945.", keywords: ["presiden", "eksekutif", "legislatif", "yudikatif"] },
    ],
    inggris: [
      { q: "Explain the difference between simple past and present perfect tense with examples!", a: "Simple past: action completed in the past (e.g., 'I went to school yesterday'). Present perfect: action started in past and continues/relevant to present (e.g., 'I have lived here for 5 years').", keywords: ["past", "completed", "present perfect", "continues"] },
      { q: "Explain what a noun is and give 3 types with examples!", a: "A noun is a word that names a person, place, thing, or idea. Types: 1. Common noun (dog, city). 2. Proper noun (Rex, Jakarta). 3. Abstract noun (love, freedom).", keywords: ["person", "place", "thing", "noun"] },
    ],
  },
  sma: {
    matematika: [
      { q: "Jelaskan konsep limit dan berikan contoh sederhana!", a: "Limit adalah nilai yang didekati suatu fungsi saat variabel mendekati nilai tertentu. Contoh: lim x→2 dari (3x+1) = 3(2)+1 = 7. Limit menentukan perilaku fungsi di sekitar titik.", keywords: ["didekati", "fungsi", "variabel", "nilai"] },
      { q: "Jelaskan aturan turunan (differential) untuk fungsi pangkat!", a: "Turunan fungsi f(x) = x^n adalah f'(x) = n × x^(n-1). Contoh: f(x) = x³, maka f'(x) = 3x². Ini adalah aturan pangkat dalam kalkulus diferensial.", keywords: ["pangkat", "n-1", "turunan", "x^n"] },
      { q: "Jelaskan integral tentu dan tak tentu!", a: "Integral tentu: memiliki batas atas dan bawah, menghasilkan nilai numerik (luas di bawah kurva). Integral tak tentu: tanpa batas, menghasilkan fungsi + konstanta C. Integral adalah kebalikan dari turunan.", keywords: ["batas", "luas", "konstanta", "C", "kebalikan"] },
      { q: "Selesaikan dan jelaskan: 2 log 32 = ?", a: "2 log 32 = 2 log (2⁵) = 5. Karena 32 = 2 pangkat 5, maka logaritma basis 2 dari 32 sama dengan 5. Sifat: ᵃlog(aⁿ) = n.", keywords: ["32", "2", "5", "pangkat"] },
    ],
    fisika: [
      { q: "Jelaskan Hukum I Newton dan berikan contoh!", a: "Hukum I Newton (Hukum Kelembaman): benda akan tetap diam atau bergerak lurus beraturan jika tidak ada gaya yang bekerja. Contoh: penumpang terdorong ke depan saat mobil diremendadak. Benda cenderung mempertahankan keadaannya.", keywords: ["kelembaman", "diam", "gaya", "pertahankan"] },
      { q: "Jelaskan perbedaan gelombang transversal dan longitudinal!", a: "Transversal: arah getar tegak lurus arah rambat (contoh: gelombang tali, cahaya). Longitudinal: arah getar sejajar arah rambat (contoh: gelombang suara, pegas). Gelombang transfer energi tanpa transfer materi.", keywords: ["transversal", "longitudinal", "tegak lurus", "sejajar"] },
      { q: "Jelaskan konsep usaha dan energi beserta rumusnya!", a: "Usaha = gaya × perpindahan (W = F × s), satuan Joule. Energi = kemampuan melakukan usaha. Energi kinetik = ½mv². Energi potensial = mgh. Hukum kekekalan energi: energi tidak dapat diciptakan/dimusnahkan, hanya berubah bentuk.", keywords: ["gaya", "perpindahan", "joule", "kinetik", "potensial"] },
    ],
    kimia: [
      { q: "Jelaskan perbedaan ikatan ion dan ikatan kovalen!", a: "Ikatan ion: terbentuk dari serah-terima elektron (contoh: NaCl). Ikatan kovalen: terbentuk dari penggunaan bersama pasangan elektron (contoh: H₂O, CO₂). Ion = transfer elektron, kovalen = sharing elektron.", keywords: ["ion", "kovalen", "serah-terima", "sharing", "elektron"] },
      { q: "Jelaskan konsep mol dan hubungannya dengan jumlah partikel!", a: "1 mol = 6.022 × 10²³ partikel (bilangan Avogadro). Mol menghubungkan massa zat dengan jumlah partikel. Rumus: mol = massa / massa molar. 1 mol gas ideal pada STP = 22.4 L.", keywords: ["mol", "avogadro", "6.022", "partikel", "massa molar"] },
      { q: "Jelaskan apa itu reaksi redoks!", a: "Redoks = reduksi + oksidasi. Oksidasi: melepas elektron (bilangan oksidasi naik). Reduksi: menerima elektron (biloks turun). Reducing agent = yang dioksidasi. Oxidizing agent = yang direduksi.", keywords: ["reduksi", "oksidasi", "elektron", "biloks"] },
    ],
    biologi: [
      { q: "Jelaskan proses mitosis dan meiosis beserta perbedaannya!", a: "Mitosis: pembelahan sel menghasilkan 2 sel anak identik, 1 pembelahan, untuk pertumbuhan. Meiosis: menghasilkan 4 sel anak berbeda, 2 pembelahan, untuk gamet. Meiosis menghasilkan sel haploid, mitosis diploid.", keywords: ["mitosis", "meiosis", "2 sel", "4 sel", "identik", "haploid"] },
      { q: "Jelaskan aliran energi dalam ekosistem!", a: "Energi mengalir dari matahari -> produsen (tumbuhan) -> konsumen primer -> konsumen sekunder -> dekomposer. Hanya 10% energi diteruskan ke trofik berikutnya (hukum 10%). Aliran energi satu arah, tidak siklus.", keywords: ["matahari", "produsen", "konsumen", "dekomposer", "10%"] },
    ],
    sejarah: [
      { q: "Jelaskan latar belakang Proklamasi Kemerdekaan Indonesia!", a: "Jepang kalah perang, vacuum of power setelah Jepang menyerah ke Sekutu. PKI dan pemuda mendesak Soekarno-Hatta memproklamasikan kemerdekaan. Peristiwa Rengasdengklok memaksa Soekarno-Hatta. Teks proklamasi disusun di rumah Laksamana Maeda, dibacakan 17 Agustus 1945.", keywords: ["jepang", "kalah", "rengasdengklok", "17 agustus", "1945"] },
      { q: "Jelaskan apa yang dimaksud dengan Sumpah Pemuda 1928!", a: "Sumpah Pemuda diikrarkan 28 Oktober 1928 oleh Kongres Pemuda II. Berisi 3 ikrar: bertumpah darah satu, berbangsa satu Indonesia, menjunjung bahasa persatuan bahasa Indonesia. Menjadi titik awal nasionalisme Indonesia.", keywords: ["1928", "28 oktober", "satu bangsa", "satu bahasa", "nasionalisme"] },
    ],
  },
  smk: {
    tkj: [
      { q: "Jelaskan perbedaan IP address statik dan dinamis!", a: "IP statik: alamat IP tetap, diatur manual, tidak berubah. Cocok untuk server/printer. IP dinamis: alamat IP berubah, diatur DHCP otomatis. Cocok untuk perangkat klien. DHCP memberi IP secara otomatis.", keywords: ["statik", "dinamis", "DHCP", "manual", "otomatis"] },
      { q: "Jelaskan cara kerja DNS secara singkat!", a: "DNS (Domain Name System) menerjemahkan nama domain (www.google.com) menjadi IP address. Saat user ketik URL, DNS server mencari IP yang sesuai, lalu browser mengakses server tersebut. DNS = buku telepon internet.", keywords: ["domain", "IP", "terjemahkan", "URL"] },
      { q: "Jelaskan perbedaan switch dan router!", a: "Switch: menghubungkan perangkat dalam jaringan lokal (LAN), bekerja di Layer 2 (MAC address). Router: menghubungkan jaringan berbeda (LAN ke internet), bekerja di Layer 3 (IP address). Switch untuk dalam, router untuk antar jaringan.", keywords: ["switch", "router", "LAN", "MAC", "IP", "layer"] },
    ],
    rpl: [
      { q: "Jelaskan konsep OOP (Object Oriented Programming) dan 4 prinsipnya!", a: "OOP adalah paradigma pemrograman berbasis objek. 4 prinsip: 1. Encapsulation - menyembunyikan data. 2. Inheritance - pewarisan dari parent class. 3. Polymorphism - satu nama banyak bentuk. 4. Abstraction - menyembunyikan kompleksitas.", keywords: ["encapsulation", "inheritance", "polymorphism", "abstraction", "objek"] },
      { q: "Jelaskan perbedaan frontend dan backend!", a: "Frontend: bagian yang dilihat user, berjalan di browser (HTML, CSS, JavaScript). Backend: bagian server, mengelola database dan logika (Node.js, Python, PHP). Frontend = tampilan, backend = otak/data. API menghubungkan keduanya.", keywords: ["frontend", "backend", "browser", "server", "database", "API"] },
      { q: "Jelaskan apa itu REST API!", a: "REST API adalah arsitektur komunikasi antar software menggunakan HTTP. Method: GET (ambil), POST (buat), PUT (update), DELETE (hapus). Data biasanya format JSON. Stateless - tiap request independen. Resource diakses via URL.", keywords: ["REST", "HTTP", "GET", "POST", "JSON", "stateless"] },
    ],
    akuntansi: [
      { q: "Jelaskan siklus akuntansi secara berurutan!", a: "1. Transaksi -> 2. Jurnal umum -> 3. Buku besar -> 4. Neraca saldo -> 5. Jurnal penyesuaian -> 6. Neraca saldo setelah penyesuaian -> 7. Laporan keuangan -> 8. Jurnal penutup -> 9. Neraca saldo setelah penutupan.", keywords: ["jurnal", "buku besar", "neraca saldo", "penyesuaian", "penutup"] },
      { q: "Jelaskan perbedaan akun debit dan kredit!", a: "Debit: sisi kiri akun. Untuk aset dan beban, debit menambah. Kredit: sisi kanan akun. Untuk liabilitas, ekuitas, dan pendapatan, kredit menambah. Aset/beban: debit+ kredit-. Liabilitas/ekuitas/pendapatan: kredit+ debit-.", keywords: ["debit", "kredit", "aset", "liabilitas", "ekuitas"] },
    ],
    elektro: [
      { q: "Jelaskan Hukum Ohm dan terapannya!", a: "Hukum Ohm: V = I × R (Voltase = Arus × Resistansi). Dapat diubah: I = V/R atau R = V/I. Aplikasi: menghitung arus, tegangan, atau hambatan dalam rangkaian listrik. Berlaku untuk konduktor ohmik pada suhu konstan.", keywords: ["V", "I", "R", "tegangan", "arus", "hambatan"] },
      { q: "Jelaskan perbedaan arus AC dan DC!", a: "AC (Alternating Current): arah arus berubah-ubah (bolak-balik), contoh PLN 220V 50Hz. DC (Direct Current): arah arus searah, contoh baterai, adaptor. AC untuk transmisi jarak jauh, DC untuk elektronik. Inverter mengubah DC->AC, adaptor AC->DC.", keywords: ["AC", "DC", "bolak-balik", "searah", "PLN", "baterai"] },
    ],
    umum: [
      { q: "Jelaskan apa itu cybersecurity dan 3 ancaman utamanya!", a: "Cybersecurity: praktik melindungi sistem, jaringan, dan data dari serangan digital. 3 ancaman: 1. Malware (virus, ransomware). 2. Phishing (penipuan email/link). 3. DDoS (membanjiri server dengan request). Pencegahan: firewall, enkripsi, 2FA.", keywords: ["malware", "phishing", "DDoS", "firewall", "enkripsi"] },
      { q: "Jelaskan konsep IoT (Internet of Things)!", a: "IoT: jaringan perangkat fisik yang terhubung ke internet untuk saling bertukar data. Contoh: smart home (lampu, AC via HP), smart watch, sensor industri. IoT memungkinkan otomatisasi dan kontrol jarak jauh. Data dikirim ke cloud untuk dianalisis.", keywords: ["internet", "terhubung", "sensor", "smart", "cloud"] },
    ],
  },
};

const JENJANG_NAMES = { sd: "SD", smp: "SMP", sma: "SMA", smk: "SMK" };

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAvailableSubjects(jenjang) {
  return Object.keys(ESSAY_BANK[jenjang] || {});
}

// Session: sender -> { questions, current, mode, answers }
const essaySessions = new Map();
const _essayAnswerTs = new Map();
const _essaySpamWarn = new Map();
const _essayDailyCount = new Map();

function _essayCheckRate(sender) {
  const now = Date.now();
  const last = _essayAnswerTs.get(sender) || 0;
  if (now - last < 10000) return { allowed: false, waitMs: 10000 - (now - last) };
  _essayAnswerTs.set(sender, now);
  return { allowed: true, waitMs: 0 };
}

function _essayAddSpam(sender) {
  const c = (_essaySpamWarn.get(sender) || 0) + 1;
  _essaySpamWarn.set(sender, c);
  return c;
}

function checkKeywords(userAnswer, keywords) {
  const lower = userAnswer.toLowerCase();
  const found = keywords.filter(k => lower.includes(k.toLowerCase()));
  return {
    found,
    missing: keywords.filter(k => !lower.includes(k.toLowerCase())),
    score: Math.round((found.length / keywords.length) * 100),
  };
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const jenjang = (args[0] || "").toLowerCase();
  const mapel = (args[1] || "").toLowerCase();
  const jumlah = parseInt(args[2]) || 3;

  const session = essaySessions.get(sender);

  // Handle active session - user answering
  if (session && jenjang !== "stop" && jenjang !== "batal" && jenjang !== "cancel" && jenjang !== "skip") {
    // User is answering current question
    const userAnswer = args.join(" ");
    if (userAnswer.length < 5) {
      return m.reply(novaWrap("Soalessay", "Jawaban terlalu pendek! Tulis jawabanmu minimal 5 karakter.\n\nKetik *skip* untuk lewati soal ini."));
    }

    const q = session.questions[session.current];

    // Verify registration still active
    const _regDb = getDatabase();
    if (!_regDb.db.data.eduRegistered || !_regDb.db.data.eduRegistered[sender]) {
      essaySessions.delete(sender);
      return m.reply(novaWrap('Info', '\u2705 Pendaftaran kamu telah dihapus! Essay dibatalkan.\n\nDaftar lagi: ' + m.prefix + 'daftarsiswa <nama>'));
    }
    const _rateChk = _essayCheckRate(sender);
    if (!_rateChk.allowed) {
      const _w = _essayAddSpam(sender);
      if (_w >= 3) {
        essaySessions.delete(sender);
        _essaySpamWarn.delete(sender);
        return m.reply(novaWrap("Soalessay", "Essay quiz dibatalkan karena spam!\n\nBaca soal dulu, jangan asal jawab.\n\nKetik .essay untuk mulai lagi."));
      }
      return m.reply(novaWrap("Info", "\u23f3 Terlalu cepat! Tunggu " + Math.ceil(_rateChk.waitMs / 1000) + " detik.\n\nPeringatan " + _w + "/3 - jangan spam!"));
    }
    _essaySpamWarn.delete(sender);
    const check = checkKeywords(userAnswer, q.keywords);

    let txt = "";
    if (check.score >= 70) {
      txt = `*Bagus!* Skor kata kunci: ${check.score}%\n\n`;
    } else if (check.score >= 40) {
      txt = `*cukup.* Skor kata kunci: ${check.score}%\n\n`;
    } else {
      txt = `*kurang tepat.* Skor kata kunci: ${check.score}%\n\n`;
    }

    txt += `Kunci Jawaban:\n${q.a}\n\n`;

    if (check.found.length > 0) txt += `Kata kunci tepat: ${check.found.join(", ")}\n`;
    if (check.missing.length > 0) txt += `Kata kunci kurang: ${check.missing.join(", ")}\n`;

    session.answers.push({
      question: q.q,
      userAnswer,
      modelAnswer: q.a,
      keywordScore: check.score,
    });

    session.current++;

    if (session.current >= session.questions.length) {
      // Quiz finished
      const total = session.questions.length;
      const avgScore = Math.round(session.answers.reduce((sum, a) => sum + a.keywordScore, 0) / total);
      txt += `\n${"=".repeat(30)}\n`;
      txt += `Quiz Essay Selesai!\n\n`;
      txt += `Jenjang: ${session.jenjang}\n`;
      txt += `Mapel: ${session.mapel}\n`;
      txt += `Total: ${total} soal\n`;
      txt += `Skor rata-rata kata kunci: *${avgScore}/100*\n\n`;
      if (avgScore >= 80) txt += `Predikat: *A - Sangat Baik!*\n`;
      else if (avgScore >= 70) txt += `Predikat: *b - baik*\n`;
      else if (avgScore >= 60) txt += `Predikat: *c - cukup*\n`;
      else if (avgScore >= 50) txt += `Predikat: *d - belajar lagi*\n`;
      else txt += `Predikat: *E - Wajib ulang!*\n`;
      txt += `\n_Skor berdasarkan kata kunci dalam jawabanmu. Tetap pelajari kunci jawaban untuk jawaban yang lebih lengkap._`;
      essaySessions.delete(sender);
      await m.reply(txt);
      return;
    }

    // Next question
    const nextQ = session.questions[session.current];
    txt += `\n${"=".repeat(30)}\n`;
    txt += `Soal Essay ${session.current + 1}/${session.questions.length}\n\n`;
    txt += `${nextQ.q}\n\n`;
    txt += `Tulis jawabanmu atau ketik *skip* untuk lewati`;
    await m.reply(txt);
    return;
  }

  // Skip question
  if (session && (jenjang === "skip" || jenjang === "lewati")) {
    const q = session.questions[session.current];
    let txt = `Soal dilewati.\n\nKunci Jawaban:\n${q.a}\n\n`;
    session.current++;

    if (session.current >= session.questions.length) {
      const total = session.questions.length;
      const answered = session.answers.length;
      txt += `Quiz Essay Selesai!\n\nTotal: ${total} | Dijawab: ${answered} | Dilewati: ${total - answered}`;
      essaySessions.delete(sender);
      await m.reply(txt);
      return;
    }

    const nextQ = session.questions[session.current];
    txt += `\n`;
    txt += `Soal Essay ${session.current + 1}/${session.questions.length}\n\n`;
    txt += `${nextQ.q}\n\n`;
    txt += `Tulis jawabanmu atau ketik *skip* untuk lewati`;
    await m.reply(txt);
    return;
  }

  // Stop quiz
  if (jenjang === "stop" || jenjang === "batal" || jenjang === "cancel") {
    if (session) {
      essaySessions.delete(sender);
      return m.reply(novaWrap("Soalessay", "Quiz essay dibatalkan."));
    }
    return m.reply(novaWrap("Soalessay", "Tidak ada quiz essay yang sedang berjalan."));
  }

  // Help / Menu
  if (!jenjang || jenjang === "help" || jenjang === "menu" || jenjang === "list") {
    if (jenjang === "list" || jenjang === "daftar") {
      let txt = `Daftar Mapel Essay Per Jenjang\n\n`;
      for (const [jenjangKey, jenjangName] of Object.entries(JENJANG_NAMES)) {
        const subjects = getAvailableSubjects(jenjangKey);
        txt += `${jenjangName}: ${subjects.join(", ")}\n`;
      }
      await m.reply(txt);
      return;
    }

    let txt = `Latihan Soal Essay\n\n`;
    txt += `Soal terbuka - jawab dengan kalimatmu sendiri!\nBot akan cek kata kunci & tunjukin kunci jawaban.\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}essay <jenjang> <mapel> <jumlah>\` - Mulai soal essay\n`;
    txt += `2. Saat quiz: tulis jawabanmu langsung\n`;
    txt += `3. Ketik *skip* - lewati soal\n`;
    txt += `4. Ketik *stop* - berhenti quiz\n`;
    txt += `5. \`${m.prefix}essay list\` - Lihat mapel tersedia\n\n`;
    txt += `Jenjang: sd, smp, sma, smk\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}essay sd ipa 3\`\n`;
    txt += `\`${m.prefix}essay sma fisika 5\`\n`;
    txt += `\`${m.prefix}essay smk rpl 2\`\n\n`;
    txt += `_Skor berdasarkan kata kunci dalam jawabanmu_`;
    return await m.reply( txt, { commandName: "soalessay" });
  }

  // Validate jenjang
  if (!JENJANG_NAMES[jenjang]) {
    return m.reply(novaError("SoalEssay", "Jenjang gak valid nih! Pilih: sd, smp, sma, smk"));
  }

  if (jumlah < 1 || jumlah > 10) {
    return m.reply(novaWrap("Soalessay", "Jumlah soal essay 1-10."));
  }
  // Check registration
  const _eduDb = getDatabase();
  if (!_eduDb.db.data.eduRegistered) _eduDb.db.data.eduRegistered = {};
  if (!_eduDb.db.data.eduRegistered[m.sender]) {
    return m.reply("Kamu belum terdaftar sebagai siswa!\n\nDaftar dulu: " + m.prefix + "daftarsiswa <nama>\n\n💡 *Contoh:* " + m.prefix + "daftarsiswa Andi Pratama");
  }
  try {
    const bank = ESSAY_BANK[jenjang]?.[mapel];
    if (!bank || bank.length === 0) {
      const available = getAvailableSubjects(jenjang);
      return m.reply(novaWrap("soalessay", `Mapel "${mapel}" tidak ditemukan untuk ${JENJANG_NAMES[jenjang]}!\n\nTersedia: ${available.join(", ")}`));
    }

    const shuffled = shuffle(bank);
    const questions = shuffled.slice(0, Math.min(jumlah, shuffled.length));

    essaySessions.set(sender, {
      questions,
      current: 0,
      answers: [],
      jenjang: JENJANG_NAMES[jenjang],
      mapel,
      startTime: Date.now(),
    });

    const q = questions[0];
    let txt = `Soal Essay: ${JENJANG_NAMES[jenjang]} - ${mapel.toUpperCase()}\n\n`;
    txt += `${questions.length} soal | tulis jawabanmu langsung\n`;
    txt += `Ketik *skip* untuk lewati, *stop* untuk berhenti\n\n`;
    txt += `Soal 1/${questions.length}\n\n`;
    txt += `${q.q}\n\n`;
    txt += `Tulis jawabanmu di bawah ini`;

    await m.reply(txt);
  } catch (e) {
    console.error("[SOALESSAY] Error:", e.message);
    await m.reply(novaError("SoalEssay", `Gagal bikin soal nih: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
