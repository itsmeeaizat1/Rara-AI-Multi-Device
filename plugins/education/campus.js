// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "kampuskampus",
  alias: ["kampuskampus", "kamus"],
  category: "education",
  description: "Kamus istilah akademik kampus - cari arti istilah perkuliahan",
  usage: ".kamus <istilah>",
  example: ".kamus sks",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const GLOSSARY = {
  // Akademik Umum
  "sks": "Satuan Kredit Semester - satuan ukur besarnya beban studi mahasiswa. 1 SKS = 1700 menit/tugas/minggu (50 menit kuliah + 60 menit mandiri).",
  "ipk": "Indeks Prestasi Kumulatif - rata-rata nilai seluruh mata kuliah dari semester 1 sampai akhir. Skala 0-4.0.",
  "ips": "Indeks Prestasi Semester - rata-rata nilai satu semester. Berbeda dengan IPK yang kumulatif.",
  "krs": "Kartu Rencana Studi - daftar mata kuliah yang diambil mahasiswa pada semester berjalan.",
  "khs": "Kartu Hasil Studi - slip nilai resmi per semester yang berisi nilai semua mata kuliah semester tersebut.",
  "transkrip": "Transkrip Nilai - dokumen resmi berisi seluruh nilai dari semua semester. Sering disebut transkrip sementara (belum lulus) atau transkrip nilai (sudah lulus).",
  "yudisium": "Rapat dewan dosen untuk menentukan kelulusan mahasiswa berdasarkan IPK dan kelengkapan akademik.",
  "wisuda": "Upacara resmi penyampaian ijazah kepada lulusan setelah dinyatakan lulus dalam yudisium.",
  "predikat": "Predikat kelulusan berdasarkan IPK: Cumlaude (3.51-4.00), Sangat Memuaskan (3.01-3.50), Memuaskan (2.76-3.00), Cukup (2.00-2.75).",
  "cumlaude": "Predikat kelulusan dengan IPK >= 3.51 (beberapa kampus >= 3.5). Syarat tambahan: lulus tepat waktu, minimal nilai B, skripsi minimal A/B+.",
  "ujian": "Proses evaluasi pembelajaran, bisa berupa UTS, UAS, quiz, atau ujian akhir program (sidang).",
  "uts": "Ujian Tengah Semester - evaluasi di pertengahan semester, biasanya minggu 7-8.",
  "uas": "Ujian Akhir Semester - evaluasi di akhir semester, biasanya minggu 14-16.",
  "quiz": "Kuis - evaluasi singkat untuk menguji pemahaman materi, biasanya tidak panjang.",
  "tugas": "Penugasan dari dosen, bisa individu maupun kelompok, berbobot nilai.",
  "makalah": "Karya tulis ilmiah tentang topik tertentu, format umum akademik dengan struktur pendahuluan-penutup.",
  "essay": "Esai - tulisan dengan gaya argumentatif atau naratif tentang topik tertentu.",
  "proposal": "Dokumen usulan penelitian yang berisi latar belakang, rumusan masalah, tujuan, metode, dan rencana kerja.",
  "skripsi": "Karya tulis ilmiah wajib untuk lulus S1, berdasarkan hasil penelitian mandiri di bawah bimbingan dosen.",
  "thesis": "Tesis - karya tulis untuk lulus S2 (magister), lebih mendalam dari skripsi, berkontribusi orisinal.",
  "disertasi": "Karya tulis untuk lulus S3 (doktoral), menemukan teori/konsep baru, level tertinggi karya akademik.",
  "jurnal": "Publikasi ilmiah peer-reviewed, berisi artikel hasil penelitian. Terindeks SINTA, Scopus, dll.",
  "paper": "Artikel ilmiah, bisa conference paper atau journal article.",
  "plagiarisme": "Tindakan menyalin karya orang lain tanpa menyebut sumber. Disebut plagiasi. Dicek dengan Turnitin.",
  "turnitin": "Software pengecek similarity/plagiarisme. Threshold umum <20-25%.",
  "sitasi": "Pengakuan atas sumber referensi dalam karya tulis. Format: APA, MLA, IEEE, dll.",
  "referensi": "Daftar sumber yang dirujuk dalam karya ilmiah, diletakkan di akhir dokumen.",
  "bibliografi": "Daftar pustaka - kumpulan referensi lengkap di akhir karya tulis.",
  "abstract": "Abstrak - ringkasan singkat penelitian (200-300 kata), berisi tujuan, metode, hasil, kesimpulan.",
  "keyword": "Kata kunci - 3-5 kata penting dari penelitian, diletakkan setelah abstrak.",
  "literatur": "Kajian pustaka - bagian yang membahas teori dan penelitian sebelumnya yang relevan.",
  "metodologi": "Bagian penelitian yang menjelaskan cara/metode yang digunakan untuk mendapatkan data.",
  "responden": "Subjek penelitian yang memberikan data/respon, biasanya untuk penelitian kuantitatif.",
  "informan": "Subjek penelitian yang memberikan informasi mendalam, biasanya untuk penelitian kualitatif.",
  "kualitatif": "Metode penelitian yang menghasilkan data deskriptif (teks, observasi, wawancara). Tidak angka.",
  "kuantitatif": "Metode penelitian yang menghasilkan data angka/statistik. Menggunakan kuesioner, eksperimen.",
  "variabel": "Atribut/sifat yang diteliti, bisa independen (bebas) atau dependen (terikat).",
  "hipotesis": "Dugaan sementara tentang hubungan antar variabel yang akan diuji kebenarannya.",
  "populasi": "Keseluruhan subjek penelitian. Sampel = bagian dari populasi yang diteliti.",
  "sample": "Sampel - bagian representatif dari populasi yang dijadikan subjek penelitian.",
  "kuesioner": "Daftar pertanyaan untuk mengumpulkan data dari responden.",
  "observasi": "Pengamatan langsung terhadap objek penelitian.",
  "wawancara": "Pengumpulan data melalui tanya jawab dengan informan/responden.",
  "analisis": "Proses mengolah dan menafsirkan data untuk menjawab rumusan masalah.",
  "inferensial": "Statistik inferensial - uji statistik untuk menarik kesimpulan dari sampel ke populasi (t-test, ANOVA, dll).",
  "deskriptif": "Statistik deskriptif - menggambarkan data (mean, median, modus, standar deviasi).",
  "spss": "Software Package for Social Sciences - software statistik untuk analisis data.",
  "peerreview": "Proses review karya ilmiah oleh ahli sebelum dipublikasi, untuk memastikan kualitas.",
  "scopus": "Database jurnal internasional, lebih bergengsi dari SINTA. Punya Q1-Q4 (quartile).",
  "sinta": "Science and Technology Index - indeks jurnal nasional Indonesia. Level S1-S6.",
  "impactfactor": "Metrik untuk mengukur frekuensi sitasi rata-rata artikel dalam jurnal.",
  "doi": "Digital Object Identifier - ID unik permanen untuk dokumen digital (paper, jurnal).",
  "isbn": "International Standard Book Number - ID unik untuk buku.",
  "issn": "International Standard Serial Number - ID unik untuk publikasi berkala (jurnal).",
  "praktikum": "Pembelajaran praktik di lab/lapangan, melengkapi teori kelas.",
  "magang": "Kerja praktik di perusahaan/instansi untuk pengalaman langsung dunia kerja.",
  "kp": "Kerja Praktik - sama dengan magang. Mata kuliah wajib di banyak kampus.",
  "klp": "Kelompok - tim kerja untuk tugas atau praktikum.",
  "absensi": "Pencatatan kehadiran. Minimum kehadiran biasanya 75% dari total pertemuan.",
  "cuti": "Izin tidak kuliah selama 1-2 semester. Tidak bisa > 2 semester berturut-turut.",
  "drop": "Drop mata kuliah - membatalkan pengambilan mata kuliah pada semester berjalan (sebelum batas waktu).",
  "remedial": "Mengulang mata kuliah yang tidak lulus. Bisa remedial nilai (perbaikan) atau remedial penuh (ulang).",
  "sidang": "Ujian terakhir untuk skripsi/thesis/disertasi di depan dosen penguji.",
  "seminar": "Presentasi penelitian. Seminar proposal (saat mengajukan), seminar hasil (saat selesai).",
  "kompre": "Ujian Komprehensif - ujian seluruh mata kuliah wajib sebelum sidang, biasanya untuk S2/S3.",
  "dosen": "Pengajar di perguruan tinggi. Dosen Wali = pembimbing akademik mahasiswa.",
  "pembimbing": "Dosen yang membimbing penelitian/skripsi. Dibagi pembimbing 1 dan 2.",
  "penguji": "Dosen yang menguji dalam sidang. Bisa penguji utama atau anggota.",
  "dekan": "Kepala fakultas. Di bawah rektor, di atas ketua program studi.",
  "rektor": "Kepala universitas.",
  "kaprodi": "Ketua Program Studi - pengelola akademik di level program studi.",
  "fakultas": "Unit akademik di bawah universitas, terdiri dari beberapa program studi.",
  "prodi": "Program Studi - unit akademik terkecil, contoh: Teknik Informatika, Hukum, Manajemen.",
  "akreditasi": "Penilaian kualitas prodi/institusi. Ban-PT (nasional) atau lembaga internasional. Grade A/B/C/unggul.",
  "semester": "Periode kuliah, biasanya 6 bulan. Ganjil (Sep-Feb), Genap (Mar-Agu).",
  "spp": "Sumbersumber Pembangunan Pendidikan - biaya kuliah per semester. Bisa UKT atau BCM.",
  "ukt": "Uang Kuliah Tunggal - sistem pembayaran SPP tunggal yang sudah digabung.",
  "beasiswa": "Bantuan biaya pendidikan, bisa penuh atau parsial. Ada Bidikmisi, KIP, LPDP, dll.",
  "krs-online": "Pengisian KRS via sistem akademik online (SIAKAD/SIMAK).",
  "siakad": "Sistem Informasi Akademik - portal online untuk KRS, KHS, transkrip, jadwal.",
  "lulus": "Status setelah memenuhi syarat: lulus semua matkul, skripsi lulus, minimum SKS terpenuhi.",
  "do": "Drop Out - keluar dari kampus karena IPK < batas minimum (biasanya 2.0) atau tidak lulus-lulus.",
  "cuti-akademik": "Status tidak aktif sementara, maksimal 2 semester.",
  "transfer": "Pindah kampus/program studi. Transfer kredit mengikuti ketentuan kampus tujuan.",
  "konversi": "Penyesuaian nilai/SKS dari kampus asal ke kampus tujuan (untuk transfer).",
  "ekstensional": "Mata kuliah pilihan di luar jurusan, untuk menambah SKS bebas.",
  "minat": "Peminatan/konsentrasi dalam prodi, contoh: Teknik Informatika - minat Data Science.",
  "lab": "Laboratorium - ruang praktikum dengan peralatan khusus.",
  "mpls": "Masa Pengenalan Lingkungan Sekolah - orientasi mahasiswa baru, sebelum kuliah mulai.",
  "ospek": "Orientasi Studi Pengenalan Kampus - sama dengan MPLS, istilah lama.",
  "bem": "Badan Eksekutif Mahasiswa - organisasi mahasiswa tingkat universitas/fakultas.",
  "hmj": "Himpunan Mahasiswa Jurusan - organisasi mahasiswa tingkat program studi.",
  "senat": "Senat Mahasiswa - badan legislatif mahasiswa, mengawasi BEM.",
  "skpi": "Surat Keterangan Pendamping Ijazah - dokumen yang menjelaskan kompetensi lulusan selain ijazah.",
  "merdeka-belajar": "Program Kemdikbud untuk fleksibilitas akademik: magang, pertukaran, studi independen.",
  "kampus-merdeka": "Program pertukaran/kredit silang antar kampus. SKS bisa diakui dari kampus lain.",
  "iras": "Inter-Rencana Studi - sistem pengambilan matkul lintas prodi/fakultas dalam kampus.",
};

async function handler(m, { sock, args }) {
  const query = args.join(" ").trim().toLowerCase();

  if (!query) {
    let txt = `Kamus Istilah Kampus\n\n`;
    txt += `Cari arti istilah akademik/kampus.\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}kamus <istilah>\` - Cari arti istilah\n`;
    txt += `2. \`${m.prefix}kamus list\` - Daftar semua istilah\n\n`;
    txt += `Contoh:\n`;
    txt += `\`${m.prefix}kamus sks\`\n`;
    txt += `\`${m.prefix}kamus skripsi\`\n`;
    txt += `\`${m.prefix}kamus ipk\`\n\n`;
    txt += `_${Object.keys(GLOSSARY).length} istilah tersedia_`;
    return await m.reply( txt, { commandName: "kampuskampus" });
  }
  try {
    if (query === "list" || query === "daftar" || query === "all") {
      const keys = Object.keys(GLOSSARY).sort();
      let txt = `Daftar Istilah Kampus (${keys.length})\n\n`;
      for (let i = 0; i < keys.length; i++) {
        txt += `${i + 1}. ${keys[i]}\n`;
      }
      txt += `\nKetik \`${m.prefix}kamus <istilah>\` untuk lihat arti.`;
      await m.reply(txt);
      return;
    }

    // Direct match
    if (GLOSSARY[query]) {
      let txt = `${query.toUpperCase()}\n\n`;
      txt += `${GLOSSARY[query]}`;
      await m.reply(txt);
      return;
    }

    // Fuzzy search
    const matches = Object.keys(GLOSSARY).filter(k =>
      k.includes(query) || query.includes(k) ||
      k.replace(/[-_]/g, "").includes(query.replace(/[-_]/g, ""))
    );

    if (matches.length === 1) {
      let txt = `${matches[0].toUpperCase()}\n\n`;
      txt += `${GLOSSARY[matches[0]]}`;
      await m.reply(txt);
      return;
    }

    if (matches.length > 1) {
      let txt = `Istilah yg cocok dengan "${query}":\n\n`;
      for (let i = 0; i < Math.min(matches.length, 10); i++) {
        txt += `${i + 1}. ${matches[i]}\n`;
      }
      txt += `\nKetik \`${m.prefix}kamus <istilah>\` untuk lihat arti.`;
      await m.reply(txt);
      return;
    }

    // No match
    await m.reply(`Istilah "${query}" tidak ditemukan!\n\nKetik \`${m.prefix}kamus list\` untuk daftar semua istilah.`);
  } catch (e) {
    console.error("[KAMUS] Error:", e.message);
    await m.reply(raraWrap("kampuskampus", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
