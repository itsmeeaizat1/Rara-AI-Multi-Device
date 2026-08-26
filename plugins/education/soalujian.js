// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from "axios";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "soalujian",
  alias: ["soalujian", "soal", "ulangan", "quizsekolah", "latihansoal"],
  category: "education",
  description: "Latihan soal ulangan SD/SMP/SMA/SMK - pilihan ganda + essay digabung",
  usage: ".soal <jenjang> <mapel> [jumlah] [mode]",
  example: ".soal sd matematika 5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 2,
  isEnabled: true,
};

// === MC QUESTION BANK ===
const MC_BANK = {
  sd: {
    matematika: [
      { q: "Berapakah hasil dari 24 + 36?", a: "60", o: ["50", "70", "61"] },
      { q: "Berapakah hasil dari 100 - 47?", a: "53", o: ["63", "43", "57"] },
      { q: "Berapakah hasil dari 8 x 7?", a: "56", o: ["54", "64", "48"] },
      { q: "Berapakah hasil dari 81 : 9?", a: "9", o: ["8", "7", "10"] },
      { q: "Bilangan prima antara 1 dan 10 adalah?", a: "2, 3, 5, 7", o: ["1, 3, 5, 7", "2, 4, 6, 8", "1, 2, 3, 5"] },
      { q: "Berapakah hasil dari 15% dari 200?", a: "30", o: ["20", "25", "35"] },
      { q: "Keliling persegi dengan sisi 12 cm adalah?", a: "48 cm", o: ["24 cm", "144 cm", "36 cm"] },
      { q: "Luas persegi panjang dengan panjang 10 cm dan lebar 6 cm adalah?", a: "60 cm²", o: ["16 cm²", "32 cm²", "120 cm²"] },
      { q: "Berapakah nilai dari 3 pangkat 3?", a: "27", o: ["9", "81", "6"] },
      { q: "FPB dari 12 dan 18 adalah?", a: "6", o: ["3", "2", "9"] },
    ],
    ipa: [
      { q: "Organ tubuh manusia untuk bernapas adalah?", a: "Paru-paru", o: ["Jantung", "Ginjal", "Hati"] },
      { q: "Hewan yang mengalami metamorfosis sempurna adalah?", a: "Kupu-kupu", o: ["Cicak", "Ular", "Bebek"] },
      { q: "Sumber energi terbesar di bumi adalah?", a: "Matahari", o: ["Bulan", "Bintang", "Angin"] },
      { q: "Tumbuhan membuat makanan melalui proses?", a: "Fotosintesis", o: ["Respirasi", "Transpirasi", "Fermentasi"] },
      { q: "Air mendidih pada suhu?", a: "100°C", o: ["50°C", "90°C", "212°C"] },
      { q: "Planet terdekat dengan matahari adalah?", a: "Merkurius", o: ["Venus", "Bumi", "Mars"] },
      { q: "Tulang paling panjang di tubuh manusia adalah?", a: "Femur (paha)", o: ["Tulang rusuk", "Tulang belakang", "Tulang lengan"] },
    ],
    bindo: [
      { q: "Sinonim dari kata 'indah' adalah?", a: "Cantik", o: ["Jelek", "Buruk", "Kotor"] },
      { q: "Antonim dari kata 'tinggi' adalah?", a: "Rendah", o: ["Besar", "Panjang", "Lebar"] },
      { q: "Kalimat tanya diakhiri dengan tanda?", a: "Tanda tanya (?)", o: ["Tanda seru (!)", "Tanda titik (.)", "Tanda koma (,)"] },
      { q: "Pokok pembicaraan dalam suatu paragraf disebut?", a: "Ide pokok", o: ["Kalimat", "Paragraf", "Judul"] },
      { q: "Karangan yang menceritakan pengalaman pribadi disebut?", a: "Narasi", o: ["Deskripsi", "Argumentasi", "Persuasi"] },
      { q: "Pantun terdiri dari berapa baris?", a: "4 baris", o: ["2 baris", "3 baris", "8 baris"] },
    ],
    ips: [
      { q: "Ibukota Indonesia adalah?", a: "Jakarta", o: ["Bandung", "Surabaya", "Medan"] },
      { q: "Pulau terbesar di Indonesia adalah?", a: "Kalimantan", o: ["Sumatra", "Jawa", "Sulawesi"] },
      { q: "Proklamasi kemerdekaan Indonesia dibacakan pada?", a: "17 Agustus 1945", o: ["20 Mei 1908", "28 Oktober 1928", "10 November 1945"] },
      { q: "Lambang negara Indonesia adalah?", a: "Garuda Pancasila", o: ["Burung Merpati", "Burung Elang", "Naga"] },
      { q: "Mata uang Indonesia adalah?", a: "Rupiah", o: ["Dolar", "Ringgit", "Yen"] },
    ],
  },
  smp: {
    matematika: [
      { q: "Hasil dari 2x + 5 = 15, nilai x adalah?", a: "5", o: ["3", "7", "10"] },
      { q: "Luas lingkaran dengan jari-jari 7 cm (pi=22/7) adalah?", a: "154 cm²", o: ["44 cm²", "22 cm²", "308 cm²"] },
      { q: "Hasil dari (-3) x (-4) adalah?", a: "12", o: ["-12", "7", "-7"] },
      { q: "Bentuk sederhana dari 3/6 adalah?", a: "1/2", o: ["2/3", "3/2", "1/3"] },
      { q: "Volume kubus dengan sisi 5 cm adalah?", a: "125 cm³", o: ["25 cm³", "75 cm³", "150 cm³"] },
      { q: "Hasil dari 2 pangkat 4 adalah?", a: "16", o: ["8", "32", "24"] },
      { q: "Jumlah sudut segitiga selalu?", a: "180°", o: ["90°", "360°", "270°"] },
      { q: "Pythagoras: sisi miring dengan sisi 3 dan 4 adalah?", a: "5", o: ["6", "7", "12"] },
      { q: "Nilai rata-rata dari 5, 7, 8, 10, 10 adalah?", a: "8", o: ["7", "9", "10"] },
      { q: "Gradien garis y = 2x + 3 adalah?", a: "2", o: ["3", "5", "1"] },
    ],
    ipa: [
      { q: "Rumus kimia untuk air adalah?", a: "H2O", o: ["CO2", "O2", "NaCl"] },
      { q: "Proses tumbuhan mengambil CO2 dan mengeluarkan O2 disebut?", a: "Fotosintesis", o: ["Respirasi", "Transpirasi", "Fermentasi"] },
      { q: "Gaya yang menarik benda ke bumi disebut?", a: "Gravitasi", o: ["Gesek", "Magnet", "Listrik"] },
      { q: "Zat yang mempercepat reaksi kimia tanpa ikut bereaksi disebut?", a: "Katalis", o: ["Pelarut", "Reaktan", "Produk"] },
      { q: "Alat untuk mengukur suhu adalah?", a: "Termometer", o: ["Barometer", "Higrometer", "Anemometer"] },
      { q: "Pencernaan protein dimulai di?", a: "Lambung", o: ["Mulut", "Usus halus", "Usus besar"] },
    ],
    bindo: [
      { q: "Kalimat yang menyatakan perintah disebut?", a: "Kalimat imperatif", o: ["Kalimat deklaratif", "Kalimat interogatif", "Kalimat eksklamatif"] },
      { q: "Pantun memiliki rim a-b-a-b, sedangkan syair memiliki rim?", a: "a-a-a-a", o: ["a-b-a-b", "a-a-b-b", "a-b-c-d"] },
      { q: "Majas yang membandingkan dua hal dengan kata 'seperti' adalah?", a: "Simile", o: ["Metafora", "Personifikasi", "Hiperbola"] },
      { q: "Teks yang berisi langkah-langkah membuat sesuatu disebut?", a: "Teks prosedur", o: ["Teks narasi", "Teks deskripsi", "Teks eksposisi"] },
    ],
    ips: [
      { q: "Negara dengan penduduk terbanyak di dunia adalah?", a: "India", o: ["China", "AS", "Indonesia"] },
      { q: "Pegunungan terpanjang di dunia adalah?", a: "Andes", o: ["Himalaya", "Alpen", "Rocky"] },
      { q: "Selat yang memisahkan Sumatra dan Jawa adalah?", a: "Selat Sunda", o: ["Selat Madura", "Selat Bali", "Selat Karimata"] },
      { q: "Kerajaan Hindu pertama di Indonesia adalah?", a: "Kutai", o: ["Majapahit", "Sriwijaya", "Mataram"] },
      { q: "Pahlawan dari Aceh yang melawan Belanda adalah?", a: "Cut Nyak Dien", o: ["R.A. Kartini", "Dewi Sartika", "Christina Martha Tiahahu"] },
    ],
    inggris: [
      { q: "Past tense dari 'go' adalah?", a: "went", o: ["goed", "gone", "going"] },
      { q: "What is the meaning of 'book' in Indonesian?", a: "Buku", o: ["Meja", "Pena", "Kertas"] },
      { q: "They ___ football every Sunday.", a: "play", o: ["plays", "playing", "played"] },
      { q: "Antonym of 'happy' is?", a: "sad", o: ["glad", "angry", "tired"] },
    ],
  },
  sma: {
    matematika: [
      { q: "Turunan dari f(x) = 3x² + 2x adalah?", a: "f'(x) = 6x + 2", o: ["f'(x) = 3x + 2", "f'(x) = 6x² + 2", "f'(x) = 3x²"] },
      { q: "Nilai dari log 100 adalah?", a: "2", o: ["10", "1", "100"] },
      { q: "Limit x mendekati 0 dari (sin x)/x adalah?", a: "1", o: ["0", "infinity", "tidak terdefinisi"] },
      { q: "Integral dari 2x dx adalah?", a: "x² + C", o: ["2x² + C", "2 + C", "x + C"] },
      { q: "Cos 60° = ?", a: "1/2", o: ["0", "1", "akar 3 / 2"] },
      { q: "Akar-akar persamaan x² - 5x + 6 = 0 adalah?", a: "x = 2 dan x = 3", o: ["x = 1 dan x = 6", "x = -2 dan x = -3", "x = 6 dan x = 1"] },
      { q: "Determinan matriks [[1,2],[3,4]] adalah?", a: "-2", o: ["2", "10", "-10"] },
    ],
    fisika: [
      { q: "Satuan gaya dalam SI adalah?", a: "Newton (N)", o: ["Joule", "Watt", "Pascal"] },
      { q: "Rumus kecepatan adalah?", a: "v = s/t", o: ["v = t/s", "v = s*t", "v = s+t"] },
      { q: "Hukum II Newton: F = ?", a: "m x a", o: ["m + a", "m/a", "m - a"] },
      { q: "Energi kinetik dirumuskan sebagai?", a: "Ek = 1/2 mv²", o: ["Ek = mv", "Ek = mgh", "Ek = 1/2 mv"] },
      { q: "Cepat rambat cahaya?", a: "3 x 10^8 m/s", o: ["3 x 10^6 m/s", "3 x 10^10 m/s", "3 x 10^4 m/s"] },
      { q: "Percepatan gravitasi bumi (g) = ?", a: "9.8 m/s²", o: ["8.9 m/s²", "10 m/s³", "9.8 m/s"] },
    ],
    kimia: [
      { q: "Nomor atom Carbon adalah?", a: "6", o: ["8", "12", "4"] },
      { q: "Ikatan kimia yang terbentuk karena berbagi elektron disebut?", a: "Ikatan kovalen", o: ["Ikatan ion", "Ikatan logam", "Ikatan hidrogen"] },
      { q: "pH larutan asam adalah?", a: "Kurang dari 7", o: ["Lebih dari 7", "Sama dengan 7", "Sama dengan 14"] },
      { q: "Rumus molekul glukosa adalah?", a: "C6H12O6", o: ["C2H5OH", "CH4", "C6H6"] },
      { q: "Gas yang menyebabkan efek rumah kaca utama adalah?", a: "CO2", o: ["O2", "N2", "H2"] },
      { q: "Larutan dengan pH=7 bersifat?", a: "Netral", o: ["Asam", "Basa", "Amfoter"] },
    ],
    biologi: [
      { q: "Unit terkecil kehidupan adalah?", a: "Sel", o: ["Atom", "Molekul", "Jaringan"] },
      { q: "Proses pembelahan sel untuk pertumbuhan disebut?", a: "Mitosis", o: ["Meiosis", "Fertilisasi", "Mutasi"] },
      { q: "DNA memiliki struktur?", a: "Double helix", o: ["Single helix", "Lingkaran", "Linear"] },
      { q: "Ekosistem adalah interaksi antara?", a: "Makhluk hidup dan lingkungan", o: ["Predator dan prey", "Tumbuhan dan hewan", "Manusia dan alam"] },
      { q: "Pembuluh darah yang membawa darah ke jantung adalah?", a: "Vena", o: ["Arteri", "Kapiler", "Aorta"] },
    ],
    sejarah: [
      { q: "Proklamasi Kemerdekaan Indonesia dibacakan oleh?", a: "Soekarno-Hatta", o: ["Soeharto", "Soekarno", "Hatta"] },
      { q: "Sumpah Pemuda diikrarkan pada tanggal?", a: "28 Oktober 1928", o: ["20 Mei 1908", "17 Agustus 1945", "10 November 1945"] },
      { q: "Kerajaan Islam pertama di Indonesia adalah?", a: "Samudra Pasai", o: ["Demak", "Aceh", "Mataram"] },
      { q: "Konferensi Asia Afrika diselenggarakan di?", a: "Bandung, 1955", o: ["Jakarta, 1945", "Surabaya, 1949", "Yogyakarta, 1949"] },
    ],
    geografi: [
      { q: "Indonesia beriklim?", a: "Tropis", o: ["Subtropis", "Sedang", "Kutub"] },
      { q: "Gunung tertinggi di Indonesia adalah?", a: "Puncak Jaya (Papua)", o: ["Semeru", "Kerinci", "Rinjani"] },
      { q: "Jumlah provinsi di Indonesia (2024) adalah?", a: "38", o: ["34", "33", "40"] },
      { q: "Pulau terpadat penduduknya di Indonesia adalah?", a: "Jawa", o: ["Sumatra", "Sulawesi", "Kalimantan"] },
    ],
  },
  smk: {
    tkj: [
      { q: "Kepanjangan dari IP Address adalah?", a: "Internet Protocol Address", o: ["Internal Protocol Address", "Internet Provider Address", "Internal Path Address"] },
      { q: "Subnet mask 255.255.255.0 artinya?", a: "/24 (Class C)", o: ["/16 (Class B)", "/8 (Class A)", "/32 (Single host)"] },
      { q: "Port default untuk HTTP adalah?", a: "80", o: ["443", "21", "22"] },
      { q: "Port default untuk HTTPS adalah?", a: "443", o: ["80", "21", "8080"] },
      { q: "Perintah untuk cek koneksi jaringan adalah?", a: "ping", o: ["tracert", "ipconfig", "netstat"] },
    ],
    rpl: [
      { q: "HTML adalah singkatan dari?", a: "HyperText Markup Language", o: ["High Text Modern Language", "Hyper Tool Modern Language", "Home Tool Markup Language"] },
      { q: "CSS digunakan untuk?", a: "Styling/mendesain halaman web", o: ["Struktur halaman", "Logika program", "Database"] },
      { q: "Dalam OOP, class adalah?", a: "Blueprint/template untuk object", o: ["Instance dari object", "Method program", "Variable"] },
      { q: "Git command untuk mengupload perubahan adalah?", a: "git push", o: ["git pull", "git commit", "git add"] },
      { q: "REST API menggunakan protokol?", a: "HTTP", o: ["FTP", "SMTP", "SSH"] },
      { q: "Database relasional menggunakan bahasa?", a: "SQL", o: ["Python", "Java", "HTML"] },
    ],
    akuntansi: [
      { q: "Persamaan dasar akuntansi adalah?", a: "Aset = Liabilitas + Ekuitas", o: ["Aset = Ekuitas - Liabilitas", "Aset = Liabilitas - Ekuitas", "Aset + Liabilitas = Ekuitas"] },
      { q: "Neraca saldo disiapkan dari?", a: "Buku besar", o: ["Jurnal umum", "Buku pembantu", "Faktur"] },
      { q: "Depresiasi adalah?", a: "Penurunan nilai aset", o: ["Kenaikan nilai aset", "Penjualan aset", "Pembelian aset"] },
      { q: "Laporan laba rugi menunjukkan?", a: "Pendapatan dan beban", o: ["Aset dan kewajiban", "Arus kas", "Ekuitas"] },
    ],
    elektro: [
      { q: "Satuan arus listrik adalah?", a: "Ampere (A)", o: ["Volt (V)", "Watt (W)", "Ohm"] },
      { q: "Hukum Ohm menyatakan V = ?", a: "I x R", o: ["I / R", "R / I", "I + R"] },
      { q: "Satuan daya listrik adalah?", a: "Watt (W)", o: ["Ampere", "Volt", "Ohm"] },
      { q: "Komponen yang menyimpan muatan listrik adalah?", a: "Kapasitor", o: ["Resistor", "Induktor", "Transistor"] },
    ],
    umum: [
      { q: "Fungsi utama sistem operasi adalah?", a: "Mengelola sumber daya komputer", o: ["Membuat dokumen", "Menjelajahi internet", "Bermain game"] },
      { q: "Software open source artinya?", a: "Kode sumber tersedia untuk umum", o: ["Gratis tanpa syarat", "Tidak punya copyright", "Hanya untuk developer"] },
      { q: "Cloud computing adalah?", a: "Layanan komputasi via internet", o: ["Komputasi dengan awan", "Backup data", "Jaringan lokal"] },
      { q: "AI (Artificial Intelligence) adalah?", a: "Kecerdasan buatan yang meniru manusia", o: ["Robot fisik", "Software office", "Jaringan internet"] },
    ],
  },
};

// === ESSAY QUESTION BANK ===
const ESSAY_BANK = {
  sd: {
    matematika: [
      { q: "Jelaskan apa yang dimaksud dengan bilangan prima dan berikan 5 contoh!", a: "Bilangan prima adalah bilangan yang hanya memiliki 2 faktor, yaitu 1 dan dirinya sendiri. Contoh: 2, 3, 5, 7, 11.", keywords: ["hanya", "2 faktor", "1 dan dirinya"] },
      { q: "Sebuah toko menjual 12 kotak pensil, tiap kotak berisi 8 buah. Berapakah total pensil? Jelaskan caranya!", a: "12 x 8 = 96 pensil. Cara: kalikan jumlah kotak dengan isi tiap kotak.", keywords: ["12", "8", "96", "kali"] },
      { q: "Jelaskan perbedaan antara keliling dan luas!", a: "Keliling adalah panjang total sisi-sisi bangun datar. Luas adalah ukuran permukaan di dalam bangun datar.", keywords: ["keliling", "sisi", "luas", "permukaan"] },
      { q: "Jelaskan apa itu pecahan dan berikan contoh!", a: "Pecahan adalah bagian dari keseluruhan yang dibagi menjadi bagian sama. Ditulis pembilang/penyebut. Contoh: 1/2, 3/4.", keywords: ["bagian", "keseluruhan", "pembilang", "penyebut"] },
    ],
    ipa: [
      { q: "Jelaskan proses fotosintesis pada tumbuhan!", a: "Fotosintesis adalah pembuatan makanan oleh tumbuhan hijau menggunakan cahaya matahari, air, dan CO2, menghasilkan glukosa dan oksigen. Terjadi di kloroplas yang mengandung klorofil.", keywords: ["cahaya", "matahari", "air", "klorofil"] },
      { q: "Jelaskan perbedaan hewan herbivora, karnivora, dan omnivora!", a: "Herbivora = pemakan tumbuhan (sapi). Karnivora = pemakan daging (harimau). Omnivora = pemakan keduanya (tikus).", keywords: ["herbivora", "tumbuhan", "karnivora", "daging", "omnivora"] },
      { q: "Mengapa air bisa berubah menjadi es? Jelaskan!", a: "Air berubah menjadi es karena suhu menurun di bawah 0°C. Molekul bergerak lambat dan membentuk kristal padat. Disebut pembekuan.", keywords: ["suhu", "0", "membeku", "dingin"] },
    ],
    bindo: [
      { q: "Jelaskan apa yang dimaksud dengan ide pokok dalam paragraf!", a: "Ide pokok adalah inti pembicaraan atau gagasan utama dalam paragraf. Biasanya terdapat dalam kalimat utama.", keywords: ["inti", "gagasan", "utama", "paragraf"] },
      { q: "Jelaskan perbedaan pantun dan syair!", a: "Pantun: 4 baris, rim a-b-a-b, 2 baris awal sampiran. Syair: 4 baris, rim a-a-a-a, semua baris satu kesatuan isi.", keywords: ["pantun", "a-b-a-b", "syair", "a-a-a-a"] },
    ],
    ips: [
      { q: "Jelaskan mengapa Indonesia disebut negara kepulauan!", a: "Indonesia disebut negara kepulauan karena terdiri dari ribuan pulau yang dipisahkan laut. Lebih dari 17.000 pulau dari Sabang sampai Merauke.", keywords: ["pulau", "laut", "17.000", "kepulauan"] },
      { q: "Jelaskan apa yang terjadi pada proklamasi kemerdekaan!", a: "17 Agustus 1945, Soekarno-Hatta membacakan teks proklamasi di Jakarta. Menandakan Indonesia merdeka dari penjajahan.", keywords: ["17 agustus", "1945", "soekarno", "proklamasi"] },
    ],
  },
  smp: {
    matematika: [
      { q: "Jelaskan cara menyelesaikan 2x + 5 = 15 langkah demi langkah!", a: "1. 2x + 5 = 15. 2. Pindahkan 5: 2x = 15 - 5. 3. 2x = 10. 4. Bagi 2: x = 5.", keywords: ["15", "5", "2", "10", "bagi"] },
      { q: "Jelaskan teorema Pythagoras dan berikan contoh!", a: "Kuadrat sisi miring = jumlah kuadrat dua sisi lain. c² = a² + b². Contoh: sisi 3 dan 4, miring = 5.", keywords: ["c²", "a²", "b²", "sisi miring"] },
      { q: "Jelaskan perbedaan FPB dan KPK!", a: "FPB = faktor terbesar yang habis membagi dua bilangan. KPK = kelipatan terkecil yang sama dari dua bilangan.", keywords: ["faktor", "kelipatan", "terbesar", "terkecil"] },
    ],
    ipa: [
      { q: "Jelaskan perbedaan gerak lurus beraturan dan berubah beraturan!", a: "GLB: kecepatan tetap, tanpa percepatan. GLBB: kecepatan berubah teratur, ada percepatan tetap.", keywords: ["tetap", "berubah", "kecepatan", "percepatan"] },
      { q: "Jelaskan proses pernapasan pada manusia!", a: "Inspirasi: udara masuk hidung-tenggorokan-paru, diafragma turun. Ekspirasi: udara keluar, diafragma naik. O2 masuk darah, CO2 keluar.", keywords: ["inspirasi", "ekspirasi", "paru", "diafragma"] },
      { q: "Jelaskan apa itu zat asam, basa, dan garam!", a: "Asam: pH < 7, masam (cuka). Basa: pH > 7, licin (sabun). Garam: pH = 7, netral (garam dapur).", keywords: ["asam", "basa", "garam", "pH"] },
    ],
    bindo: [
      { q: "Jelaskan apa itu teks prosedur dan strukturnya!", a: "Teks prosedur berisi langkah-langkah membuat/melakukan sesuatu. Struktur: tujuan, langkah-langkah, penegasan. Ciri: kata imperatif.", keywords: ["langkah", "cara", "tujuan", "prosedur"] },
      { q: "Jelaskan perbedaan majas simile, metafora, dan personifikasi!", a: "Simile: perbandingan dengan 'seperti/bagai'. Metafora: perbandingan langsung tanpa pembanding. Personifikasi: benda mati seolah hidup.", keywords: ["simile", "metafora", "personifikasi", "perbandingan"] },
    ],
    ips: [
      { q: "Jelaskan dampak positif dan negatif globalisasi di Indonesia!", a: "Positif: teknologi, pertukaran budaya, informasi. Negatif: hilang budaya lokal, konsumtif, ketergantungan.", keywords: ["teknologi", "budaya", "positif", "negatif"] },
      { q: "Jelaskan sistem pemerintahan Indonesia!", a: "Sistem presidensial. Presiden kepala negara dan pemerintahan. 3 cabang: Eksekutif (Presiden), Legislatif (DPR/MPR), Yudikatif (MA). UUD 1945.", keywords: ["presiden", "eksekutif", "legislatif", "yudikatif"] },
    ],
    inggris: [
      { q: "Explain simple past vs present perfect with examples!", a: "Simple past: completed action ('I went yesterday'). Present perfect: started in past, continues/relevant now ('I have lived here for 5 years').", keywords: ["past", "completed", "present perfect", "continues"] },
      { q: "Explain what a noun is and give 3 types!", a: "Noun names person, place, thing, or idea. Types: common (dog), proper (Jakarta), abstract (love).", keywords: ["person", "place", "thing", "noun"] },
    ],
  },
  sma: {
    matematika: [
      { q: "Jelaskan konsep limit dan berikan contoh!", a: "Limit adalah nilai yang didekati fungsi saat variabel mendekati nilai tertentu. Contoh: lim x->2 dari 3x+1 = 7.", keywords: ["didekati", "fungsi", "variabel", "nilai"] },
      { q: "Jelaskan aturan turunan untuk fungsi pangkat!", a: "Turunan f(x) = x^n adalah f'(x) = n*x^(n-1). Contoh: f(x)=x³, f'(x)=3x².", keywords: ["pangkat", "n-1", "turunan"] },
      { q: "Jelaskan integral tentu dan tak tentu!", a: "Tentu: ada batas, hasil numerik (luas kurva). Tak tentu: tanpa batas, hasil fungsi + C. Integral kebalikan turunan.", keywords: ["batas", "luas", "konstanta", "kebalikan"] },
    ],
    fisika: [
      { q: "Jelaskan Hukum I Newton dan berikan contoh!", a: "Benda tetap diam/bergerak lurus beraturan jika tidak ada gaya. Contoh: penumpang terdorong saat mobil diremendadak. Disebut hukum kelembaman.", keywords: ["kelembaman", "diam", "gaya", "pertahankan"] },
      { q: "Jelaskan perbedaan gelombang transversal dan longitudinal!", a: "Transversal: arah getar tegak lurus rambat (cahaya). Longitudinal: arah getar sejajar rambat (suara).", keywords: ["transversal", "longitudinal", "tegak lurus", "sejajar"] },
      { q: "Jelaskan konsep usaha dan energi!", a: "Usaha = gaya x perpindahan (W=F*s), satuan Joule. Energi = kemampuan usaha. Kinetik=½mv², potensial=mgh. Energi kekal.", keywords: ["gaya", "perpindahan", "joule", "kinetik"] },
    ],
    kimia: [
      { q: "Jelaskan perbedaan ikatan ion dan kovalen!", a: "Ion: serah-terima elektron (NaCl). Kovalen: sharing elektron (H2O).", keywords: ["ion", "kovalen", "serah-terima", "sharing", "elektron"] },
      { q: "Jelaskan konsep mol dan bilangan Avogadro!", a: "1 mol = 6.022 x 10²³ partikel. Mol = massa/massa molar. 1 mol gas STP = 22.4 L.", keywords: ["mol", "avogadro", "6.022", "partikel"] },
      { q: "Jelaskan apa itu reaksi redoks!", a: "Redoks = reduksi + oksidasi. Oksidasi: melepas elektron (biloks naik). Reduksi: terima elektron (biloks turun).", keywords: ["reduksi", "oksidasi", "elektron", "biloks"] },
    ],
    biologi: [
      { q: "Jelaskan perbedaan mitosis dan meiosis!", a: "Mitosis: 2 sel anak identik, 1 pembelahan, pertumbuhan. Meiosis: 4 sel anak berbeda, 2 pembelahan, gamet, haploid.", keywords: ["mitosis", "meiosis", "2 sel", "4 sel", "haploid"] },
      { q: "Jelaskan aliran energi dalam ekosistem!", a: "Matahari -> produsen -> konsumen primer -> sekunder -> dekomposer. Hanya 10% energi diteruskan ke trofik berikutnya.", keywords: ["matahari", "produsen", "konsumen", "dekomposer", "10%"] },
    ],
    sejarah: [
      { q: "Jelaskan latar belakang Proklamasi Kemerdekaan!", a: "Jepang kalah, vacuum of power. Pemuda mendesak Soekarno-Hatta. Peristiwa Rengasdengklok. Teks disusun di rumah Maeda, dibacakan 17 Agustus 1945.", keywords: ["jepang", "kalah", "rengasdengklok", "17 agustus"] },
      { q: "Jelaskan Sumpah Pemuda 1928!", a: "28 Oktober 1928, Kongres Pemuda II. 3 ikrar: satu darah, satu bangsa Indonesia, satu bahasa Indonesia. Titik awal nasionalisme.", keywords: ["1928", "28 oktober", "satu bangsa", "nasionalisme"] },
    ],
  },
  smk: {
    tkj: [
      { q: "Jelaskan perbedaan IP statik dan dinamis!", a: "Statik: IP tetap, manual, untuk server. Dinamis: IP berubah, DHCP otomatis, untuk klien.", keywords: ["statik", "dinamis", "DHCP", "manual"] },
      { q: "Jelaskan cara kerja DNS!", a: "DNS menerjemahkan nama domain ke IP address. User ketik URL -> DNS cari IP -> browser akses server. DNS = buku telepon internet.", keywords: ["domain", "IP", "terjemahkan", "URL"] },
      { q: "Jelaskan perbedaan switch dan router!", a: "Switch: hubungkan perangkat dalam LAN, Layer 2 (MAC). Router: hubungkan jaringan berbeda, Layer 3 (IP).", keywords: ["switch", "router", "LAN", "MAC", "IP"] },
    ],
    rpl: [
      { q: "Jelaskan OOP dan 4 prinsipnya!", a: "OOP = pemrograman berbasis objek. 4 prinsip: Encapsulation, Inheritance, Polymorphism, Abstraction.", keywords: ["encapsulation", "inheritance", "polymorphism", "abstraction"] },
      { q: "Jelaskan perbedaan frontend dan backend!", a: "Frontend: tampilan user, di browser (HTML/CSS/JS). Backend: server, database, logika (Node/Python). API menghubungkan.", keywords: ["frontend", "backend", "browser", "server", "database"] },
      { q: "Jelaskan apa itu REST API!", a: "REST API: arsitektur komunikasi via HTTP. Method: GET, POST, PUT, DELETE. Format JSON. Stateless.", keywords: ["REST", "HTTP", "GET", "POST", "JSON"] },
    ],
    akuntansi: [
      { q: "Jelaskan siklus akuntansi!", a: "Transaksi -> Jurnal -> Buku besar -> Neraca saldo -> Penyesuaian -> Laporan keuangan -> Penutup.", keywords: ["jurnal", "buku besar", "neraca saldo", "penyesuaian"] },
      { q: "Jelaskan perbedaan debit dan kredit!", a: "Debit: sisi kiri, menambah aset/beban. Kredit: sisi kanan, menambah liabilitas/ekuitas/pendapatan.", keywords: ["debit", "kredit", "aset", "liabilitas", "ekuitas"] },
    ],
    elektro: [
      { q: "Jelaskan Hukum Ohm dan terapannya!", a: "V = I x R. Bisa diubah: I=V/R, R=V/I. Untuk hitung arus, tegangan, hambatan rangkaian. Berlaku konduktor ohmik.", keywords: ["V", "I", "R", "tegangan", "arus", "hambatan"] },
      { q: "Jelaskan perbedaan arus AC dan DC!", a: "AC: arah berubah (PLN 220V 50Hz). DC: arah searah (baterai). AC untuk transmisi jauh, DC untuk elektronik.", keywords: ["AC", "DC", "bolak-balik", "searah", "PLN", "baterai"] },
    ],
    umum: [
      { q: "Jelaskan cybersecurity dan 3 ancaman utamanya!", a: "Cybersecurity: lindungi sistem dari serangan digital. Ancaman: malware, phishing, DDoS. Pencegahan: firewall, enkripsi, 2FA.", keywords: ["malware", "phishing", "DDoS", "firewall"] },
      { q: "Jelaskan konsep IoT!", a: "IoT: perangkat fisik terhubung internet untuk bertukar data. Contoh: smart home, sensor. Data ke cloud untuk analisis.", keywords: ["internet", "terhubung", "sensor", "smart", "cloud"] },
    ],
  },
};

const OTDB_CATEGORIES = {
  "umum": 9, "sains": 17, "komputer": 18, "matematika": 19,
  "geografi": 22, "sejarah": 23, "politik": 24, "seni": 25, "hewan": 27, "olahraga": 21,
};
const DIFFICULTY_MAP = { sd: "easy", smp: "medium", sma: "hard", smk: "hard" };
const JENJANG_NAMES = { sd: "SD", smp: "SMP", sma: "SMA", smk: "SMK" };

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function decodeHtml(text) {
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&rsquo;": "'", "&ldquo;": '"', "&rdquo;": '"', "&nbsp;": " " };
  return text.replace(/&[a-z0-9#]+;/gi, e => entities[e] || e);
}

function getAvailableSubjects(jenjang) {
  const mc = Object.keys(MC_BANK[jenjang] || {});
  const essay = Object.keys(ESSAY_BANK[jenjang] || {});
  return [...new Set([...mc, ...essay])];
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

const quizSessions = new Map();
const answerTimestamps = new Map();
const dailyQuizCount = new Map();
const spamWarnings = new Map();

const MAX_QUIZ_PER_DAY = 20;
const MIN_ANSWER_INTERVAL = 10000;
const MAX_SPAM_WARNINGS = 3;

function getTodayKey() {
  return new Date().toDateString();
}

function checkDailyLimit(sender) {
  const today = getTodayKey();
  const key = `${sender}:${today}`;
  const count = dailyQuizCount.get(key) || 0;
  if (count >= MAX_QUIZ_PER_DAY) return { allowed: false, remaining: 0, used: count };
  return { allowed: true, remaining: MAX_QUIZ_PER_DAY - count, used: count };
}

function incrementDailyCount(sender) {
  const today = getTodayKey();
  const key = `${sender}:${today}`;
  dailyQuizCount.set(key, (dailyQuizCount.get(key) || 0) + 1);
}

function checkAnswerRate(sender) {
  const now = Date.now();
  const last = answerTimestamps.get(sender) || 0;
  if (now - last < MIN_ANSWER_INTERVAL) {
    return { allowed: false, waitMs: MIN_ANSWER_INTERVAL - (now - last) };
  }
  answerTimestamps.set(sender, now);
  return { allowed: true, waitMs: 0 };
}

function getSpamWarnings(sender) {
  return spamWarnings.get(sender) || 0;
}

function addSpamWarning(sender) {
  const current = (spamWarnings.get(sender) || 0) + 1;
  spamWarnings.set(sender, current);
  return current;
}

function resetSpamWarnings(sender) {
  spamWarnings.delete(sender);
}

function saveQuizScore(sender, name, jenjang, mapel, finalScore, mcCorrect, mcTotal, essayTotal, essayScoreSum, mode) {
  try {
    const db = getDatabase();
    if (!db.db.data.eduScores) db.db.data.eduScores = {};
    if (!db.db.data.eduScores[sender]) {
      db.db.data.eduScores[sender] = {
        name: name || sender.split("@")[0],
        totalQuizzes: 0, totalScore: 0, bestScore: 0,
        mcCorrect: 0, mcTotal: 0, essayTotal: 0, essayScoreSum: 0,
        subjects: {}, jenjang: {}, history: [],
        level: 1, xp: 0, streak: 0, lastQuiz: null,
      };
    }
    const u = db.db.data.eduScores[sender];
    u.name = name || u.name || sender.split("@")[0];
    u.totalQuizzes++;
    u.totalScore += finalScore;
    u.bestScore = Math.max(u.bestScore, finalScore);
    u.mcCorrect += mcCorrect;
    u.mcTotal += mcTotal;
    u.essayTotal += essayTotal;
    u.essayScoreSum += essayScoreSum;
    if (!u.subjects[mapel]) u.subjects[mapel] = { count: 0, totalScore: 0, best: 0 };
    u.subjects[mapel].count++;
    u.subjects[mapel].totalScore += finalScore;
    u.subjects[mapel].best = Math.max(u.subjects[mapel].best, finalScore);
    if (!u.jenjang[jenjang]) u.jenjang[jenjang] = { count: 0, totalScore: 0 };
    u.jenjang[jenjang].count++;
    u.jenjang[jenjang].totalScore += finalScore;
    u.history.push({ date: Date.now(), jenjang, mapel, score: finalScore, mode });
    if (u.history.length > 20) u.history.shift();
    const xpGain = Math.round(finalScore / 10) + 5;
    u.xp += xpGain;
    const xpNeeded = u.level * 100;
    if (u.xp >= xpNeeded) { u.level++; u.xp -= xpNeeded; }
    const today = new Date().toDateString();
    if (u.lastQuiz && new Date(u.lastQuiz).toDateString() === today) {
      u.streak++;
    } else {
      u.streak = 1;
    }
    u.lastQuiz = Date.now();
    db.write();
    return xpGain;
  } catch (e) { console.error("[SOALUJIAN] saveScore:", e.message); return 0; }
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const jenjang = (args[0] || "").toLowerCase();
  const mapel = (args[1] || "").toLowerCase();
  const jumlah = parseInt(args[2]) || 5;
  const mode = (args[3] || "mix").toLowerCase(); // mix, mc, essay

  const session = quizSessions.get(sender);

  // Handle active quiz - answer
  if (session && !["stop", "batal", "cancel", "skip", "lewati"].includes(jenjang)) {
    const q = session.questions[session.current];

    // Verify registration still active
    const _regDb = getDatabase();
    if (!_regDb.db.data.eduRegistered || !_regDb.db.data.eduRegistered[sender]) {
      quizSessions.delete(sender);
      return m.reply('Pendaftaran kamu telah dihapus! Quiz dibatalkan.\n\nDaftar lagi: ' + m.prefix + 'daftarsiswa <nama>');
    }


    // === ANTI-SPAM CHECKS ===
    const rateCheck = checkAnswerRate(sender);
    if (!rateCheck.allowed) {
      const warnings = addSpamWarning(sender);
      if (warnings >= MAX_SPAM_WARNINGS) {
        quizSessions.delete(sender);
        resetSpamWarnings(sender);
        return m.reply(claraWrap("Soalujian", "Quiz dibatalkan karena spam!\n\nJangan asal jawab cepat-cepat. Baca soalnya dulu.\n\nKetik .soal untuk mulai lagi."));
      }
      const waitSec = Math.ceil(rateCheck.waitMs / 1000);
      return m.reply(claraWrap("Soalujian", `Terlalu cepat! Tunggu ${waitSec} detik.\n\nPeringatan ${warnings}/${MAX_SPAM_WARNINGS} - jangan spam jawaban!`));
    }
    resetSpamWarnings(sender);
    if (q.type === "mc") {
      // MC answer
      const answer = jenjang.toUpperCase();
      if (!["A", "B", "C", "D"].includes(answer)) {
        return m.reply(claraWrap("Soalujian", "Pilih *A*, *B*, *C*, atau *D*!\n\nAtau ketik *ꜱᴋɪᴘ* / *ꜱᴛᴏᴘ*."));
      }
      const isCorrect = answer === q.correctLetter;
      session.answers.push({ question: q.question, given: answer, correct: q.correctLetter, isCorrect, type: "mc" });
      if (isCorrect) session.mcCorrect++;
      session.mcTotal++;
    } else {
      // Essay answer
      const userAnswer = args.join(" ");
      if (userAnswer.length < 5) {
        return m.reply(claraWrap("Soalujian", "Jawaban terlalu pendek! Min 5 karakter.\n\nKetik *ꜱᴋɪᴘ* untuk lewati soal ini."));
      }
      const check = checkKeywords(userAnswer, q.keywords);
      session.answers.push({
        question: q.question, userAnswer, modelAnswer: q.a,
        keywordScore: check.score, type: "essay",
      });
      session.essayTotal++;
      session.essayScoreSum += check.score;

      let txt = check.score >= 70 ? `*Bagus!* (${check.score}%)` : check.score >= 40 ? `*ᴄᴜᴋᴜᴘ.* (${check.score}%)` : `*ᴋᴜʀᴀɴɢ ᴛᴇᴘᴀᴛ.* (${check.score}%)`;
      txt += `\n\nKunci: ${q.a}`;
      if (check.found.length > 0) txt += `\nTepat: ${check.found.join(", ")}`;
      if (check.missing.length > 0) txt += `\nKurang: ${check.missing.join(", ")}`;
      await m.reply(txt);
    }

    session.current++;

    if (session.current >= session.questions.length) {
      // Quiz finished
      let txt = `Quiz Selesai!\n\n`;
      txt += `Jenjang: ${session.jenjang} | Mapel: ${session.mapel}\n`;
      txt += `Total: ${session.questions.length} soal\n\n`;

      if (session.mcTotal > 0) {
        txt += `Pilihan Ganda:\n`;
        txt += `  Benar: ${session.mcCorrect}/${session.mcTotal}\n`;
        const mcScore = Math.round((session.mcCorrect / session.mcTotal) * 100);
        txt += `  Skor: ${mcScore}/100\n\n`;
      }

      if (session.essayTotal > 0) {
        const avgEssay = Math.round(session.essayScoreSum / session.essayTotal);
        txt += `Essay:\n`;
        txt += `  Rata-rata kata kunci: ${avgEssay}/100\n\n`;
      }

      // Combined score
      let combined = 0;
      let parts = 0;
      if (session.mcTotal > 0) { combined += Math.round((session.mcCorrect / session.mcTotal) * 100); parts++; }
      if (session.essayTotal > 0) { combined += Math.round(session.essayScoreSum / session.essayTotal); parts++; }
      const finalScore = parts > 0 ? Math.round(combined / parts) : 0;

      txt += `Skor Gabungan: *${finalScore}/100*\n`;
      if (finalScore >= 90) txt += `Predikat: *A - Luar Biasa!*`;
      else if (finalScore >= 80) txt += `Predikat: *B - Bagus!*`;
      else if (finalScore >= 70) txt += `Predikat: *ᴄ - ᴄᴜᴋᴜᴘ*`;
      else if (finalScore >= 60) txt += `Predikat: *ᴅ - ʙᴇʟᴀᴊᴀʀ ʟᴀɢɪ*`;
      else txt += `Predikat: *E - Wajib ulang!*`;

      const xpGain = saveQuizScore(sender, m.pushName, session.jenjang, session.mapel, finalScore, session.mcCorrect, session.mcTotal, session.essayTotal, session.essayScoreSum, session.mode || "mix");
      if (xpGain > 0) { const _eduDb = getDatabase(); const _eduU = _eduDb.db.data.eduScores?.[sender]; txt += `\n+${xpGain} XP | Lv.${_eduU?.level || 1} | Streak ${_eduU?.streak || 1}x`; }
      quizSessions.delete(sender);
      await m.reply(txt);
      await m.react("🐣");
      return;
    }

    // Next question
    const nextQ = session.questions[session.current];
    let txt = `Soal ${session.current + 1}/${session.questions.length}`;
    txt += nextQ.type === "mc" ? ` [Pilihan Ganda]\n\n` : ` [Essay]\n\n`;
    txt += `${nextQ.question}\n\n`;

    if (nextQ.type === "mc") {
      for (let i = 0; i < nextQ.options.length; i++) {
        txt += `${String.fromCharCode(65 + i)}. ${nextQ.options[i]}\n`;
      }
      txt += `\nBalas A/B/C/D`;
    } else {
      txt += `Tulis jawabanmu (min 5 karakter)`;
    }
    txt += `\nKetik *ꜱᴋɪᴘ* untuk lewati, *ꜱᴛᴏᴘ* untuk berhenti`;

    await m.reply(txt);
    await m.react("🐣");
    return;
  }

  // Skip
  if (session && ["skip", "lewati"].includes(jenjang)) {
    const q = session.questions[session.current];
    let txt = `Soal dilewati.\n\n`;
    if (q.type === "mc") {
      txt += `Jawaban: ${q.correctLetter}. ${q.correctAnswer}`;
      session.mcTotal++;
    } else {
      txt += `Kunci: ${q.a}`;
      session.essayTotal++;
    }
    session.current++;

    if (session.current >= session.questions.length) {
      txt += `\n\nQuiz selesai! Total: ${session.questions.length} soal`;
      quizSessions.delete(sender);
      await m.reply(txt);
      await m.react("🐣");
      return;
    }

    const nextQ = session.questions[session.current];
    txt += `\n\nSoal ${session.current + 1}/${session.questions.length}`;
    txt += nextQ.type === "mc" ? ` [Pilihan Ganda]\n\n` : ` [Essay]\n\n`;
    txt += `${nextQ.question}\n\n`;
    if (nextQ.type === "mc") {
      for (let i = 0; i < nextQ.options.length; i++) {
        txt += `${String.fromCharCode(65 + i)}. ${nextQ.options[i]}\n`;
      }
      txt += `\nBalas A/B/C/D`;
    } else {
      txt += `Tulis jawabanmu`;
    }
    txt += `\nskip / stop`;
    await m.reply(txt);
    await m.react("🐣");
    return;
  }

  // Stop
  if (["stop", "batal", "cancel"].includes(jenjang)) {
    if (session) {
      quizSessions.delete(sender);
      await m.react("🐣");
      return m.reply(claraWrap("Soalujian", "Quiz dibatalkan."));
    }
    return m.reply(claraWrap("Soalujian", "Tidak ada quiz berjalan."));
  }

  // Help
  if (!jenjang || jenjang === "help" || jenjang === "menu") {
    let txt = `Latihan Soal Ulangan\n\n`;
    txt += `Soal Pilihan Ganda + Essay dalam satu quiz!\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}soal <jenjang> <mapel> <jumlah> [mode]\` - Mulai quiz\n`;
    txt += `2. \`${m.prefix}soal list\` - Lihat mapel tersedia\n\n`;
    txt += `Mode:\n`;
    txt += `  mix (default) - PG + essay campur\n`;
    txt += `  mc - pilihan ganda saja\n`;
    txt += `  essay - essay saja\n\n`;
    txt += `Jenjang: sd, smp, sma, smk\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}soal sd matematika 5\` (mix)\n`;
    txt += `\`${m.prefix}soal sma fisika 10 mc\` (PG only)\n`;
    txt += `\`${m.prefix}soal smk rpl 3 essay\` (essay only)\n\n`;
    txt += `Saat quiz: balas A/B/C/D (PG) atau tulis jawaban (essay)\nKetik *ꜱᴋɪᴘ* / *ꜱᴛᴏᴘ*\n\nAnti-Spam:\n  - Max 20 quiz/hari\n  - Min 10 detik per jawaban\n  - 3x spam = quiz dibatalkan`;
    return await m.reply( txt, { commandName: "soalujian" });
  }

  // List
  if (jenjang === "list" || jenjang === "daftar") {
    let txt = `Daftar Mapel Per Jenjang\n\n`;
    for (const [k, name] of Object.entries(JENJANG_NAMES)) {
      txt += `${name}: ${getAvailableSubjects(k).join(", ")}\n`;
    }
    await m.reply(txt);
    await m.react("🐣");
    return;
  }

  // Validate
  if (!JENJANG_NAMES[jenjang]) {
    return m.reply(claraWrap("Soalujian", `Jenjang tidak valid! Pilih: sd, smp, sma, smk`));
  }
  if (jumlah < 1 || jumlah > 20) {
    return m.reply(claraWrap("Soalujian", "Jumlah soal 1-20."));
  }

  // Check registration
  const _eduDb = getDatabase();
  if (!_eduDb.db.data.eduRegistered) _eduDb.db.data.eduRegistered = {};
  if (!_eduDb.db.data.eduRegistered[m.sender]) {
    return m.reply("Kamu belum terdaftar sebagai siswa!\n\nDaftar dulu: " + m.prefix + "daftarsiswa <nama>\n\nContoh: " + m.prefix + "daftarsiswa Andi Pratama");
  }

  // Check daily quiz limit
  const dailyCheck = checkDailyLimit(sender);
  if (!dailyCheck.allowed) {
    return m.reply("Kamu sudah main " + MAX_QUIZ_PER_DAY + " quiz hari ini!\n\nKembali besok untuk lanjut belajar.\n\nKetik .edulb untuk lihat ranking");
  }
  await m.react("🕒");

  try {
    let questions = [];
    const mcBank = MC_BANK[jenjang]?.[mapel];
    const essayBank = ESSAY_BANK[jenjang]?.[mapel];

    // Determine split
    let mcCount = 0, essayCount = 0;
    if (mode === "mc") {
      mcCount = jumlah;
    } else if (mode === "essay") {
      essayCount = jumlah;
    } else {
      // mix: roughly 60% MC, 40% essay
      mcCount = Math.ceil(jumlah * 0.6);
      essayCount = jumlah - mcCount;
    }

    // Build MC questions
    if (mcCount > 0 && mcBank && mcBank.length > 0) {
      const shuffled = shuffle(mcBank);
      for (let i = 0; i < Math.min(mcCount, shuffled.length); i++) {
        const q = shuffled[i];
        const allOptions = shuffle([q.a, ...q.o]);
        const correctLetter = String.fromCharCode(65 + allOptions.indexOf(q.a));
        questions.push({ type: "mc", question: q.q, options: allOptions, correctAnswer: q.a, correctLetter });
      }
    } else if (mcCount > 0 && !mcBank) {
      // Try API
      const apiQs = await fetchFromAPI(jenjang, mapel, mcCount);
      questions = questions.concat(apiQs);
      mcCount = apiQs.length;
    }

    // Build essay questions
    if (essayCount > 0 && essayBank && essayBank.length > 0) {
      const shuffled = shuffle(essayBank);
      for (let i = 0; i < Math.min(essayCount, shuffled.length); i++) {
        const q = shuffled[i];
        questions.push({ type: "essay", question: q.q, a: q.a, keywords: q.keywords });
      }
    }

    // If only essay requested but no bank
    if (mode === "essay" && (!essayBank || essayBank.length === 0)) {
      return m.reply(claraWrap("Soalujian", `Soal essay untuk ${mapel} (${JENJANG_NAMES[jenjang]}) tidak tersedia!\n\nTersedia: ${getAvailableSubjects(jenjang).join(", ")}`));
    }

    // If nothing found
    if (questions.length === 0) {
      return m.reply(claraWrap("soalujian", `Mapel "${mapel}" tidak ditemukan untuk ${JENJANG_NAMES[jenjang]}!\n\nTersedia: ${getAvailableSubjects(jenjang).join(", ")}`));
    }

    // Shuffle mixed questions
    if (mode === "mix") questions = shuffle(questions);
    questions = questions.slice(0, jumlah);

    // Start session
    incrementDailyCount(sender);
    quizSessions.set(sender, {
      questions,
      current: 0,
      mcCorrect: 0,
      mcTotal: 0,
      essayTotal: 0,
      essayScoreSum: 0,
      answers: [],
      jenjang: JENJANG_NAMES[jenjang],
      mapel,
      mode,
    });

    // Send first question
    const q = questions[0];
    let txt = `Quiz: ${JENJANG_NAMES[jenjang]} - ${mapel.toUpperCase()}\n`;
    txt += `${questions.length} soal (${mode === "mc" ? "PG" : mode === "essay" ? "Essay" : "Mix"}) | Quiz hari ini: ${dailyCheck.used + 1}/${MAX_QUIZ_PER_DAY}\n\n`;
    txt += `Soal 1/${questions.length}`;
    txt += q.type === "mc" ? ` [Pilihan Ganda]\n\n` : ` [Essay]\n\n`;
    txt += `${q.question}\n\n`;

    if (q.type === "mc") {
      for (let i = 0; i < q.options.length; i++) {
        txt += `${String.fromCharCode(65 + i)}. ${q.options[i]}\n`;
      }
      txt += `\nBalas A/B/C/D`;
    } else {
      txt += `Tulis jawabanmu (min 5 karakter)`;
    }
    txt += `\nKetik *ꜱᴋɪᴘ* / *ꜱᴛᴏᴘ*`;

    await m.reply(txt);
    await m.react("🐣");
  } catch (e) {
    console.error("[SOALUJIAN] Error:", e.message);
    await m.reply(claraWrap("soalujian", `Gagal membuat soal!\n\nError: ${e.message}`));
  }
}

async function fetchFromAPI(jenjang, mapel, count) {
  try {
    const difficulty = DIFFICULTY_MAP[jenjang] || "easy";
    const category = OTDB_CATEGORIES[mapel];
    let url = `https://opentdb.com/api.php?amount=${count}&difficulty=${difficulty}&type=multiple`;
    if (category) url += `&category=${category}`;
    const res = await axios.get(url, { timeout: 15000, validateStatus: () => true, headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.status !== 200 || !res.data?.results) return [];
    return res.data.results.map(q => {
      const correct = decodeHtml(q.correct_answer);
      const incorrect = q.incorrect_answers.map(decodeHtml);
      const allOptions = shuffle([correct, ...incorrect]);
      const correctLetter = String.fromCharCode(65 + allOptions.indexOf(correct));
      return { type: "mc", question: decodeHtml(q.question), options: allOptions, correctAnswer: correct, correctLetter, source: "api" };
    });
  } catch (e) { return []; }
}

export { pluginConfig as config, handler };
