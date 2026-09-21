// Generator bank soal Arena Kuis RPG — output: src/data/arenakuis.json
// Target 2000+ soal: matematika & logika di-GENERATE (pasti benar),
// pengetahuan umum dikurasi (fakta terkenal).
// Jalankan: node test/quizarena-e2e/generate.mjs
import fs from "node:fs";
import path from "node:path";

const RNG = (seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)(20260921);
const ri = (a, b) => a + Math.floor(RNG() * (b - a + 1));
const pick = (arr) => arr[Math.floor(RNG() * arr.length)];

const bank = [];
const add = (cat, lvl, q, a, w) => {
  const seen = new Set([String(a).toLowerCase()]);
  const w2 = [];
  for (const x of w) {
    const k = String(x).toLowerCase();
    if (!seen.has(k)) { seen.add(k); w2.push(x); }
    if (w2.length === 3) break;
  }
  if (w2.length < 3) throw new Error("distraktor kurang: " + q);
  bank.push({ cat, lvl, q, a, w: w2 });
};

// ════════════════ 1. MATEMATIKA (generated, ~750) ════════════════
function wrongNums(ans, spread) {
  const s = new Set();
  while (s.size < 3) {
    const d = ans + ri(-spread, spread) * (RNG() < 0.5 ? 1 : 2);
    if (d !== ans && d > 0) s.add(d);
  }
  return [...s];
}
for (let i = 0; i < 1105; i++) {
  const kind = i % 8;
  let q, a, lvl;
  if (kind === 0) { const a1 = ri(2, 30 + (i % 30) * 2), b1 = ri(2, 30); q = `Berapa hasil ${a1} + ${b1}?`; a = a1 + b1; lvl = a1 + b1 > 40 ? 2 : 1; }
  else if (kind === 1) { const a1 = ri(25, 90), b1 = ri(2, 24); q = `Berapa hasil ${a1} − ${b1}?`; a = a1 - b1; lvl = 2; }
  else if (kind === 2) { const a1 = ri(2, 12), b1 = ri(2, 12); q = `Berapa hasil ${a1} × ${b1}?`; a = a1 * b1; lvl = 3; }
  else if (kind === 3) { const b1 = ri(3, 12), ans = ri(3, 15); q = `Berapa hasil ${b1 * ans} ÷ ${b1}?`; a = ans; lvl = 3; }
  else if (kind === 4) { const a1 = ri(3, 15); q = `Berapa kuadrat dari ${a1} (${a1}²)?`; a = a1 * a1; lvl = 4; }
  else if (kind === 5) { const p = [10, 20, 25, 50, 75][ri(0, 4)], base = ri(2, 20) * 10; q = `Berapa ${p}% dari ${base}?`; a = base * p / 100; lvl = 4; }
  else if (kind === 6) { const n1 = ri(2, 25), n2 = ri(2, 25), n3 = ri(2, 25); const sum = n1 + n2 + n3; if (sum % 3 === 0) { q = `Berapa rata-rata dari ${n1}, ${n2}, dan ${n3}?`; a = sum / 3; lvl = 4; } else { q = `Berapa hasil ${n1} + ${n2} × ${n3}?`; a = n1 + n2 * n3; lvl = 5; } }
  else { const a1 = ri(2, 9), b1 = ri(2, 9), c1 = ri(2, 20); q = `Berapa hasil (${a1} + ${b1}) × ${c1}?`; a = (a1 + b1) * c1; lvl = 5; }
  add("matematika", lvl, q, String(a), wrongNums(a, Math.max(2, Math.round(a * 0.2))).map(String));
}

// ════════════════ 2. LOGIKA DERET (generated, ~220) ════════════════
const seqKinds = [
  (s, d) => { const q = [s, s + d, s + 2 * d, s + 3 * d]; return { text: q.join(", ") + ", …", a: s + 4 * d, lvl: d > 3 ? 2 : 1 }; },
  (s, d) => { const q = [s, s * d, s * d * d]; return { text: q.join(", ") + ", …", a: s * d * d * d, lvl: 3 }; },
  (s) => { const q = [s, s * s, (s + 1) * (s + 1)]; return { text: q.join(", ") + ", …", a: (s + 2) * (s + 2), lvl: 4 }; },
];
// tripel fibonacci kecil (state global lama overflow float 2^53 → wrongNums infinite loop)
const FIB_TRIPLES = [[1,1,2],[1,2,3],[2,3,5],[3,5,8],[5,8,13],[8,13,21],[13,21,34],[21,34,55],[34,55,89],[55,89,144]];
for (let i = 0; i < 350; i++) {
  if (i % 4 === 3) { // fibonacci (tripel kecil aman presisi)
    const [fa, fb, fc] = FIB_TRIPLES[i % FIB_TRIPLES.length];
    add("logika", 5, `Lanjutkan deret: ${fa}, ${fb}, ${fc}, …`, String(fb + fc), wrongNums(fb + fc, 4).map(String));
    continue;
  }
  if (i % 4 === 2) {
    const s = ri(2, 8);
    const a2 = (s + 1) * (s + 1) + 1;
    add("logika", 5, `Lanjutkan deret: ${s}, ${s * s + 1}, ${(s + 1) * (s + 1)}, …`, String(a2), wrongNums(a2, 5).map(String));
    continue;
  }
  const kind = seqKinds[i % 3];
  const { text, a, lvl } = kind(ri(2, 9), ri(2, 5));
  add("logika", lvl, `Lanjutkan deret: ${text}`, String(a), wrongNums(a, Math.max(2, Math.round(a * 0.25))).map(String));
}

// ════════════════ 3. IBU KOTA NEGARA + BENUA (110) ════════════════
// [negara, ibukota, benua]
const NEGARA = [
  ["Indonesia", "Jakarta", "Asia"], ["Malaysia", "Kuala Lumpur", "Asia"], ["Singapura", "Singapura", "Asia"],
  ["Thailand", "Bangkok", "Asia"], ["Filipina", "Manila", "Asia"], ["Vietnam", "Hanoi", "Asia"],
  ["Brunei", "Bandar Seri Begawan", "Asia"], ["Kamboja", "Phnom Penh", "Asia"], ["Myanmar", "Naypyidaw", "Asia"],
  ["Laos", "Vientiane", "Asia"], ["Jepang", "Tokyo", "Asia"], ["Korea Selatan", "Seoul", "Asia"],
  ["Korea Utara", "Pyongyang", "Asia"], ["Tiongkok", "Beijing", "Asia"], ["India", "New Delhi", "Asia"],
  ["Pakistan", "Islamabad", "Asia"], ["Bangladesh", "Dhaka", "Asia"], ["Nepal", "Kathmandu", "Asia"],
  ["Sri Lanka", "Colombo", "Asia"], ["Afghanistan", "Kabul", "Asia"], ["Iran", "Teheran", "Asia"],
  ["Irak", "Bagdad", "Asia"], ["Arab Saudi", "Riyadh", "Asia"], ["Uni Emirat Arab", "Abu Dhabi", "Asia"],
  ["Turki", "Ankara", "Asia"], ["Qatar", "Doha", "Asia"], ["Yordania", "Amman", "Asia"],
  ["Kazakhstan", "Astana", "Asia"], ["Rusia", "Moskow", "Eropa"], ["Jerman", "Berlin", "Eropa"],
  ["Prancis", "Paris", "Eropa"], ["Inggris", "London", "Eropa"], ["Italia", "Roma", "Eropa"],
  ["Spanyol", "Madrid", "Eropa"], ["Portugal", "Lisbon", "Eropa"], ["Belanda", "Amsterdam", "Eropa"],
  ["Belgia", "Brusel", "Eropa"], ["Swiss", "Bern", "Eropa"], ["Austria", "Wina", "Eropa"],
  ["Swedia", "Stockholm", "Eropa"], ["Norwegia", "Oslo", "Eropa"], ["Finlandia", "Helsinki", "Eropa"],
  ["Denmark", "Kopenhagen", "Eropa"], ["Polandia", "Warsawa", "Eropa"], ["Ceko", "Praha", "Eropa"],
  ["Yunani", "Athena", "Eropa"], ["Irlandia", "Dublin", "Eropa"], ["Ukraina", "Kyiv", "Eropa"],
  ["Hongaria", "Budapest", "Eropa"], ["Kroasia", "Zagreb", "Eropa"], ["Rumania", "Bukares", "Eropa"],
  ["Mesir", "Kairo", "Afrika"], ["Nigeria", "Abuja", "Afrika"], ["Kenya", "Nairobi", "Afrika"],
  ["Afrika Selatan", "Pretoria", "Afrika"], ["Maroko", "Rabat", "Afrika"], ["Ethiopia", "Addis Ababa", "Afrika"],
  ["Ghana", "Accra", "Afrika"], ["Tanzania", "Dodoma", "Afrika"], ["Aljazair", "Aljir", "Afrika"],
  ["Senegal", "Dakar", "Afrika"], ["Libya", "Tripoli", "Afrika"], ["Sudan", "Khartum", "Afrika"],
  ["Amerika Serikat", "Washington D.C.", "Amerika"], ["Kanada", "Ottawa", "Amerika"],
  ["Meksiko", "Mexico City", "Amerika"], ["Brasil", "Brasilia", "Amerika"], ["Argentina", "Buenos Aires", "Amerika"],
  ["Chili", "Santiago", "Amerika"], ["Peru", "Lima", "Amerika"], ["Kolombia", "Bogota", "Amerika"],
  ["Venezuela", "Caracas", "Amerika"], ["Uruguay", "Montevideo", "Amerika"], ["Bolivia", "Sucre", "Amerika"],
  ["Ekuador", "Quito", "Amerika"], ["Paraguay", "Asuncion", "Amerika"], ["Kuba", "Havana", "Amerika"],
  ["Jamaika", "Kingston", "Amerika"], ["Panama", "Panama City", "Amerika"], ["Australia", "Canberra", "Oseania"],
  ["Selandia Baru", "Wellington", "Oseania"], ["Fiji", "Suva", "Oseania"], ["Papua Nugini", "Port Moresby", "Oseania"],
];
const negNames = NEGARA.map((n) => n[0]);
const kotaList = NEGARA.map((n) => n[1]);
const otherBenua = ["Asia", "Eropa", "Afrika", "Amerika", "Oseania"];
for (const [neg, kota, benua] of NEGARA) {
  add("geografi", 2, `Apa ibukota negara ${neg}?`, kota, [pick(kotaList), pick(kotaList), pick(kotaList), pick(kotaList), pick(kotaList), pick(kotaList)]);
  add("geografi", 2, `Negara manakah yang beribukota di ${kota}?`, neg, [pick(negNames), pick(negNames), pick(negNames), pick(negNames), pick(negNames), pick(negNames)]);
  add("geografi", 3, `${neg} terletak di benua apa?`, benua, otherBenua.filter((b) => b !== benua));
}

// ════════════════ 4. IBU KOTA PROVINSI INDONESIA (38) ════════════════
const PROV = [
  ["Aceh", "Banda Aceh"], ["Sumatera Utara", "Medan"], ["Sumatera Barat", "Padang"], ["Riau", "Pekanbaru"],
  ["Jambi", "Jambi"], ["Sumatera Selatan", "Palembang"], ["Bengkulu", "Bengkulu"], ["Lampung", "Bandar Lampung"],
  ["Bangka Belitung", "Pangkalpinang"], ["Kepulauan Riau", "Tanjung Pinang"], ["DKI Jakarta", "Jakarta"],
  ["Jawa Barat", "Bandung"], ["Jawa Tengah", "Semarang"], ["DI Yogyakarta", "Yogyakarta"], ["Jawa Timur", "Surabaya"],
  ["Banten", "Serang"], ["Bali", "Denpasar"], ["Nusa Tenggara Barat", "Mataram"], ["Nusa Tenggara Timur", "Kupang"],
  ["Kalimantan Barat", "Pontianak"], ["Kalimantan Tengah", "Palangkaraya"], ["Kalimantan Selatan", "Banjarmasin"],
  ["Kalimantan Timur", "Samarinda"], ["Kalimantan Utara", "Tanjung Selor"], ["Sulawesi Utara", "Manado"],
  ["Sulawesi Tengah", "Palu"], ["Sulawesi Selatan", "Makassar"], ["Sulawesi Tenggara", "Kendari"],
  ["Sulawesi Barat", "Mamuju"], ["Gorontalo", "Gorontalo"], ["Maluku", "Ambon"], ["Maluku Utara", "Sofifi"],
  ["Papua", "Jayapura"], ["Papua Barat", "Manokwari"], ["Papua Tengah", "Nabire"], ["Papua Pegunungan", "Wamena"],
  ["Papua Selatan", "Merauke"], ["Papua Barat Daya", "Sorong"],
];
const provKotaList = PROV.map((p) => p[1]);
for (const [prov, kota] of PROV) {
  add("indonesia", 2, `Apa ibukota provinsi ${prov}?`, kota, [pick(provKotaList), pick(provKotaList), pick(provKotaList), pick(provKotaList), pick(provKotaList), pick(provKotaList)]);
}

// ════════════════ 5. SAINS (kurasi) ════════════════
const SAINS = [
  ["Berapa suhu air mendidih dalam Celcius?", "100°C", ["90°C", "120°C", "50°C"]],
  ["Berapa suhu air membeku dalam Celcius?", "0°C", ["−10°C", "5°C", "−4°C"]],
  ["Planet terbesar di tata surya?", "Jupiter", ["Saturnus", "Neptunus", "Bumi"]],
  ["Planet terdekat dengan Matahari?", "Merkurius", ["Venus", "Mars", "Bumi"]],
  ["Planet yang dikenal sebagai planet merah?", "Mars", ["Jupiter", "Venus", "Merkurius"]],
  ["Planet dengan cincin paling terkenal?", "Saturnus", ["Uranus", "Jupiter", "Neptunus"]],
  ["Planet terpanas di tata surya?", "Venus", ["Merkurius", "Mars", "Jupiter"]],
  ["Planet terjauh dari Matahari?", "Neptunus", ["Uranus", "Pluto", "Saturnus"]],
  ["Satelit alami Bumi disebut?", "Bulan", ["Matahari", "Phobos", "Titan"]],
  ["Berapa kecepatan cahaya?", "300.000 km/detik", ["150.000 km/detik", "1 juta km/detik", "3.000 km/detik"]],
  ["Gas yang manusia hirup untuk bernapas?", "Oksigen", ["Karbondioksida", "Nitrogen", "Helium"]],
  ["Gas yang tumbuhan serap untuk fotosintesis?", "Karbondioksida", ["Oksigen", "Nitrogen", "Metana"]],
  ["Simbol kimia oksigen?", "O", ["Ox", "O2", "Os"]],
  ["Simbol kimia emas?", "Au", ["Ag", "Go", "Gd"]],
  ["Simbol kimia perak?", "Ag", ["Au", "Si", "Sr"]],
  ["Simbol kimia besi?", "Fe", ["Ir", "B", "Fi"]],
  ["Rumus kimia air?", "H2O", ["CO2", "O2", "H2O2"]],
  ["Rumus kimia garam dapur?", "NaCl", ["KCl", "NaOH", "CaCl"]],
  ["Organ yang memompa darah?", "Jantung", ["Paru-paru", "Hati", "Ginjal"]],
  ["Jantung manusia punya berapa ruang (bilik/serambi)?", "4", ["2", "3", "6"]],
  ["Organ menyaring darah dan menghasilkan urin?", "Ginjal", ["Hati", "Lambung", "Limpa"]],
  ["Organ yang menghasilkan insulin?", "Pankreas", ["Hati", "Ginjal", "Tiroid"]],
  ["Organ pernapasan utama manusia?", "Paru-paru", ["Trakea", "Bronkus", "Hidung"]],
  ["Berapa jumlah gigi orang dewasa normal?", "32", ["28", "30", "34"]],
  ["Berapa jumlah tulang manusia dewasa?", "206", ["300", "180", "150"]],
  ["Tulang terpanjang di tubuh manusia?", "Femur (tulang paha)", ["Tibia", "Radius", "Tulang belakang"]],
  ["Zat yang membuat darah berwarna merah?", "Hemoglobin", ["Klorofil", "Melanin", "Plasma"]],
  ["Bagian sel yang menjadi 'otak' sel?", "Inti sel (nukleus)", ["Membran", "Sitoplasma", "Mitokondria"]],
  ["Organel penghasil energi sel?", "Mitokondria", ["Nukleus", "Ribosom", "Vakuola"]],
  ["Proses tumbuhan membuat makanan dengan cahaya?", "Fotosintesis", ["Respirasi", "Transpirasi", "Digesti"]],
  ["Hewan menyusui disebut?", "Mamalia", ["Reptil", "Amfibi", "Aves"]],
  ["Hewan berdarah dingin yang berganti kulit?", "Ular", ["Kucing", "Ayam", "Kambing"]],
  ["Serangga yang menghasilkan madu?", "Lebah", ["Semut", "Kupu-kupu", "Laba-laba"]],
  ["Hewan tercepat di darat?", "Cheetah", ["Singa", "Kuda", "Rusa kutub"]],
  ["Hewan terbesar di dunia?", "Paus biru", ["Gajah afrika", "Hiu putih", "Paus orca"]],
  ["Hewan tertinggi di dunia?", "Jerapah", ["Gajah", "Zebra", "Unta"]],
  ["Amfibi yang bernapas dengan kulit dan paru-paru?", "Katak", ["Ikan", "Ular", "Buaya"]],
  ["Benda langit yang mengelilingi planet?", "Satelit", ["Komet", "Asteroid", "Meteor"]],
  ["Bintang terdekat dengan Bumi?", "Matahari", ["Sirius", "Alpha Centauri", "Bintang Utara"]],
  ["Galaksi tempat Bumi berada?", "Bima Sakti", ["Andromeda", "Sombrero", "Whirlpool"]],
  ["Alat ukur suhu?", "Termometer", ["Barometer", "Higrometer", "Anemometer"]],
  ["Alat ukur tekanan udara?", "Barometer", ["Termometer", "Anemometer", "Dinamometer"]],
  ["Satuan gaya dalam fisika?", "Newton", ["Joule", "Watt", "Pascal"]],
  ["Satuan daya listrik?", "Watt", ["Volt", "Ampere", "Ohm"]],
  ["Satuan hambatan listrik?", "Ohm", ["Watt", "Volt", "Coulomb"]],
  ["Satuan energi?", "Joule", ["Newton", "Pascal", "Ampere"]],
  ["Gaya yang membuat benda jatuh ke bumi?", "Gravitasi", ["Magnet", "Gesek", "Sentripetal"]],
  ["Perubahan wujud gas menjadi cair disebut?", "Kondensasi", ["Evaporasi", "Sublimasi", "Membeku"]],
  ["Perubahan wujud padat menjadi gas langsung?", "Sublimasi", ["Kondensasi", "Meleleh", "Mengental"]],
  ["Pelangi terbentuk karena peristiwa?", "Pembiasan cahaya", ["Pantulan bunyi", "Getaran", "Konduksi"]],
  ["Suara tidak bisa merambat lewat?", "Ruang hampa", ["Air", "Udara", "Besi"]],
  ["Cahaya merambat paling cepat lewat?", "Ruang hampa", ["Air", "Kaca", "Berlian"]],
  ["Vitamin yang banyak terdapat pada jeruk?", "Vitamin C", ["Vitamin A", "Vitamin B12", "Vitamin D"]],
  ["Vitamin yang dihasilkan kulit dengan bantuan sinar matahari?", "Vitamin D", ["Vitamin C", "Vitamin A", "Vitamin E"]],
  ["Penyakit kekurangan vitamin C?", "Skurvi", ["Rakhitis", "Beri-beri", "Pellagra"]],
  ["Molekul pembawa informasi genetik?", "DNA", ["RNA", "ATP", "Protein"]],
  ["Ilmu yang mempelajari tubuh manusia?", "Anatomi", ["Botani", "Ekologi", "Genetika"]],
  ["Ilmu yang mempelajari tumbuhan?", "Botani", ["Zoologi", "Fisika", "Kimia"]],
  ["Ilmu yang mempelajari hewan?", "Zoologi", ["Botani", "Anatomi", "Astronomi"]],
  ["Ilmu yang mempelajari bintang dan planet?", "Astronomi", ["Geologi", "Biologi", "Meteorologi"]],
  ["Ilmu yang mempelajari cuaca?", "Meteorologi", ["Astronomi", "Geologi", "Oseanografi"]],
  ["Bagian tumbuhan yang menyerap air dari tanah?", "Akar", ["Daun", "Batang", "Bunga"]],
  ["Bagian tumbuhan tempat fotosintesis utama?", "Daun", ["Akar", "Batang", "Biji"]],
  ["Gas penyebab efek rumah kaca utama dari pembakaran bahan bakar?", "Karbondioksida", ["Oksigen", "Nitrogen", "Argon"]],
  ["Lapisan atmosfer yang melindungi dari radiasi UV?", "Ozon", ["Troposfer", "Ionosfer", "Eksosfer"]],
];
for (const [q, a, w] of SAINS) add("sains", q.includes("Berapa") ? 2 : 3, q, a, w);

// ════════════════ 6. GEOGRAFI FISIK (kurasi) ════════════════
const GEO = [
  ["Gunung tertinggi di dunia?", "Everest", ["K2", "Semeru", "Denali"]],
  ["Gunung tertinggi di Indonesia?", "Puncak Jaya (Cartenz)", ["Semeru", "Kerinci", "Rinjani"]],
  ["Gunung tertinggi di Pulau Jawa?", "Semeru", ["Merapi", "Bromo", "Sindoro"]],
  ["Gunung berapi meletus terkenal tahun 1883 di Indonesia?", "Krakatau", ["Merapi", "Tambora", "Agung"]],
  ["Gunung berapi aktif paling terkenal di Yogyakarta?", "Merapi", ["Merbabu", "Sumbing", "Lawu"]],
  ["Gunung tertinggi di Pulau Sumatera?", "Kerinci", ["Sinabung", "Dempo", "Sibayak"]],
  ["Danau terbesar di Indonesia?", "Toba", ["Maninjau", "Singkarak", "Sentani"]],
  ["Sungai terpanjang di Indonesia?", "Kapuas", ["Musi", "Mahakam", "Bengawan Solo"]],
  ["Sungai terpanjang di dunia?", "Nil", ["Amazon", "Yangtze", "Mississippi"]],
  ["Palung laut terdalam di dunia?", "Palung Mariana", ["Palung Sunda", "Palung Jawa", "Palung Puerto Riko"]],
  ["Danau terluas di dunia (berbatasan darat)?", "Laut Kaspia", ["Danau Toba", "Danau Victoria", "Danau Superior"]],
  ["Samudra terbesar di dunia?", "Pasifik", ["Atlantik", "Hindia", "Arktik"]],
  ["Samudra di antara Indonesia dan Afrika?", "Hindia", ["Pasifik", "Atlantik", "Arktik"]],
  ["Benua terbesar di dunia?", "Asia", ["Afrika", "Amerika", "Eropa"]],
  ["Benua terkecil di dunia?", "Australia", ["Eropa", "Antartika", "Amerika Selatan"]],
  ["Gurun panas terbesar di dunia?", "Sahara", ["Gobi", "Kalahari", "Arab"]],
  ["Negara dengan penduduk terbanyak di dunia?", "India", ["Tiongkok", "AS", "Indonesia"]],
  ["Negara kepulauan terbesar di dunia?", "Indonesia", ["Filipina", "Jepang", "Maldives"]],
  ["Pulau terbesar di dunia?", "Greenland", ["Madagaskar", "Borneo", "Papua"]],
  ["Pulau terbesar di Indonesia?", "Kalimantan", ["Sumatera", "Papua", "Jawa"]],
  ["Selat antara Sumatera dan Kalimantan?", "Selat Karimata", ["Selat Sunda", "Selat Bali", "Selat Alas"]],
  ["Selat antara Sumatera dan Jawa?", "Selat Sunda", ["Selat Karimata", "Selat Makassar", "Selat Lombok"]],
  ["Selat antara Bali dan Lombok?", "Selat Lombok", ["Selat Sunda", "Selat Bali", "Selat Alas"]],
  ["Indonesia terletak di benua?", "Asia", ["Eropa", "Afrika", "Oseania"]],
  ["Jumlah samudra menurut versi terbaru?", "5", ["4", "6", "3"]],
  ["Batas waktu Indonesia Barat (WIB) dari GMT?", "GMT+7", ["GMT+8", "GMT+9", "GMT+6"]],
  ["Kota yang dijuluki Kota Kembang?", "Bandung", ["Surabaya", "Semarang", "Medan"]],
  ["Kota yang dijuluki Kota Pahlawan?", "Surabaya", ["Bandung", "Semarang", "Yogyakarta"]],
  ["Kota yang dijuluki Kota Pelajar?", "Yogyakarta", ["Bandung", "Solo", "Malang"]],
  ["Kota yang dijuluki Kota Buaya?", "Jakarta", ["Medan", "Palembang", "Makassar"]],
  ["Jembatan terkenal penghubung Jawa-Madura?", "Jembatan Suramadu", ["Jembatan Golden Gate", "Jembatan Ampera", "Jembatan Barelang"]],
];
for (const [q, a, w] of GEO) add("geografi", 2, q, a, w);

// ════════════════ 7. SEJARAH (kurasi) ════════════════
const SEJ = [
  ["Indonesia merdeka pada tanggal?", "17 Agustus 1945", ["1 Juni 1945", "28 Oktober 1928", "17 Agustus 1950"]],
  ["Presiden pertama Indonesia?", "Soekarno", ["Mohammad Hatta", "Soeharto", "Sukarno Hatta"]],
  ["Wakil presiden pertama Indonesia?", "Mohammad Hatta", ["Soekarno", "Sutan Sjahrir", "Amir Sjarifuddin"]],
  ["Tokoh pencetus Sumpah Pemuda?", "Muhammad Yamin", ["Soekarno", "Hatta", "Bung Tomo"]],
  ["Sumpah Pemuda diperingati setiap?", "28 Oktober", ["17 Agustus", "1 Juni", "20 Mei"]],
  ["Lagu Indonesia Raya digubah oleh?", "W.R. Supratman", ["Ismail Marzuki", "Cornel Simanjuntak", "Kusbini"]],
  ["Kerajaan Hindu-Buddha terbesar di Jawa Timur?", "Majapahit", ["Sriwijaya", "Mataram Kuno", "Kediri"]],
  ["Kerajaan maritim besar di Sumatera?", "Sriwijaya", ["Majapahit", "Demak", "Samudra Pasai"]],
  ["Mahapatih terkenal Majapahit?", "Gajah Mada", ["Hayam Wuruk", "Raden Wijaya", "Airlangga"]],
  ["Raja pendiri Majapahit?", "Raden Wijaya", ["Gajah Mada", "Hayam Wuruk", "Brawijaya"]],
  ["Penyebar agama Islam pertama di Nusantara diperkirakan lewat?", "Pedagang Gujarat", ["Budha dari Tiongkok", "Portugis", "Belanda"]],
  ["Serangan Umum 1 Maret terjadi tahun?", "1949", ["1945", "1948", "1950"]],
  ["Supersemar terjadi tahun?", "1966", ["1965", "1967", "1970"]],
  ["Presiden Indonesia ke-3?", "B.J. Habibie", ["Gus Dur", "Megawati", "SBY"]],
  ["Presiden Indonesia ke-4?", "Abdurrahman Wahid (Gus Dur)", ["Megawati", "Habibie", "SBY"]],
  ["Presiden Indonesia ke-6?", "Susilo Bambang Yudhoyono", ["Jokowi", "Megawati", "Gus Dur"]],
  ["Reformasi 1998 menuntut mundur?", "Soeharto", ["Suharto Hatta", "Habibie", "Megawati"]],
  ["Organisasi pemuda pendukung kemerdekaan tahun 1945?", "Peta", ["BO", "KNIP", "BKR"]],
  ["Perang Dunia II berlangsung tahun?", "1939-1945", ["1914-1918", "1930-1939", "1945-1950"]],
  ["Perang Dunia I berlangsung tahun?", "1914-1918", ["1939-1945", "1900-1914", "1918-1920"]],
  ["Manusia pertama mendarat di Bulan tahun?", "1969", ["1959", "1979", "1961"]],
  ["Astronot pertama mendarat di Bulan?", "Neil Armstrong", ["Yuri Gagarin", "Buzz Aldrin", "Michael Collins"]],
  ["Tembok Berlin jatuh tahun?", "1989", ["1979", "1991", "1985"]],
  ["Kapal mewah yang tenggelam tahun 1912?", "Titanic", ["Lusitania", "Britannic", "Queen Mary"]],
  ["Revolusi Prancis terjadi tahun?", "1789", ["1776", "1848", "1815"]],
  ["Amerika Serikat merdeka tahun?", "1776", ["1789", "1812", "1800"]],
  ["Kompas pertama ditemukan bangsa?", "Tiongkok", ["Arab", "Romawi", "Mesir"]],
  ["Mesin uap memicu zaman?", "Revolusi Industri", ["Renaisans", "Reformasi", "Kolonialisme"]],
  ["Bom atom pertama dijatuhkan di kota?", "Hiroshima", ["Tokyo", "Osaka", "Nagasaki"]],
  ["Organisasi PBB didirikan setelah?", "Perang Dunia II", ["Perang Dunia I", "Perang Dingin", "Perang Vietnam"]],
];
for (const [q, a, w] of SEJ) add("sejarah", 3, q, a, w);

// ════════════════ 8. SINONIM BAHASA (kurasi) ════════════════
const SIN = [
  ["Sinonim dari 'pandai'?", "cerdas", ["bodoh", "malas", "lelah"]],
  ["Sinonim dari 'indah'?", "elok", ["buruk", "kusut", "gelap"]],
  ["Sinonim dari 'gembira'?", "riang", ["sedih", "muram", "bosan"]],
  ["Sinonim dari 'letih'?", "lelah", ["segar", "kuat", "ringan"]],
  ["Sinonim dari 'rajin'?", "tekun", ["malas", "lambat", "ceroboh"]],
  ["Sinonim dari 'takut'?", "gentar", ["berani", "sombong", "tenang"]],
  ["Sinonim dari 'marah'?", "murka", ["senang", "tenang", "rendah hati"]],
  ["Sinonim dari 'sedih'?", "muram", ["ceria", "riang", "girang"]],
  ["Sinonim dari 'tua'?", "lanjut usia", ["muda", "bocah", "remaja"]],
  ["Sinonim dari 'besar'?", "raksasa", ["kecil", "mungil", "tipis"]],
  ["Sinonim dari 'kuat'?", "perkasa", ["lemah", "rapuh", "lunak"]],
  ["Sinonim dari 'bersih'?", "murni", ["kotor", "berdebu", "kusam"]],
  ["Sinonim dari 'ramai'?", "riuh", ["sunyi", "sepi", "hening"]],
  ["Sinonim dari 'murah'?", "hemat", ["mahal", "mewah", "boros"]],
  ["Sinonim dari 'mudah'?", "gampang", ["sukar", "sulit", "susah"]],
  ["Sinonim dari 'rapi'?", "tertib", ["berantakan", "kacau", "acak"]],
  ["Sinonim dari 'jujur'?", "tulus", ["dusta", "licik", "munafik"]],
  ["Sinonim dari 'cantik'?", "elok", ["jelek", "buruk", "kusut"]],
  ["Sinonim dari 'tampan'?", "gagah", ["buruk", "kurus", "lemah"]],
  ["Sinonim dari 'kaya'?", "berada", ["fakir", "miskin", "papa"]],
  ["Sinonim dari 'miskin'?", "fakir", ["kaya", "berada", "sugih"]],
  ["Sinonim dari 'bijaksana'?", "arif", ["bodoh", "keras kepala", "lalai"]],
  ["Sinonim dari 'baik hati'?", "dermawan", ["kikir", "pelit", "iri"]],
  ["Sinonim dari 'cepat'?", "gesit", ["lambat", "lelet", "lamban"]],
  ["Sinonim dari 'pelan'?", "lamban", ["cepat", "gesit", "kilat"]],
  ["Sinonim dari 'sehat'?", "bugar", ["sakit", "lemah", "pucat"]],
  ["Sinonim dari 'pelit'?", "kikir", ["dermawan", "royal", "boros"]],
  ["Sinonim dari 'kaku'?", "beku", ["lentur", "luwes", "lincah"]],
  ["Sinonim dari 'sabar'?", "tabah", ["gegas", "emosi", "ceroboh"]],
  ["Sinonim dari 'sombong'?", "angkuh", ["rendah hati", "santun", "perkasa"]],
  ["Sinonim dari 'rendah hati'?", "sederhana", ["angkuh", "sombong", "bermegah"]],
  ["Sinonim dari 'pemberani'?", "berani", ["penakut", "cemas", "gentar"]],
  ["Sinonim dari 'penakut'?", "gentar", ["pemberani", "tegas", "perkasa"]],
  ["Sinonim dari 'gagah'?", "perkasa", ["lemah", "kurus", "rapuh"]],
  ["Sinonim dari 'sunyi'?", "hening", ["riuh", "ramai", "bising"]],
  ["Sinonim dari 'bising'?", ["riuh"], ["hening", "sunyi", "tenang"]],
  ["Sinonim dari 'gemuk'?", "montok", ["kurus", "kempis", "ramping"]],
  ["Sinonim dari 'kurus'?", ["ramping"], ["montok", "gemuk", "tegap"]],
  ["Sinonim dari 'susah'?", "sukar", ["gampang", "mudah", "ringan"]],
  ["Sinonim dari 'rusak'?", "bobrok", ["utuh", "bagus", "sempurna"]],
  ["Sinonim dari 'awet'?", "tahan lama", ["cepat rusak", "keropos", "rentan"]],
  ["Sinonim dari 'hemat'?", "cermat", ["boros", "mubazir", "royal"]],
  ["Sinonim dari 'boros'?", "mubazir", ["hemat", "cermat", "irit"]],
  ["Sinonim dari 'tanda'?", "lambang", ["bunyi", "rasa", "warna"]],
  ["Sinonim dari 'wajah'?", "muka", ["tubuh", "kepala", "tangan"]],
  ["Sinonim dari 'pikiran'?", "akal", ["perasaan", "badan", "tenaga"]],
  ["Sinonim dari 'guru'?", "pendidik", ["murid", "pengawas", "siswa"]],
  ["Sinonim dari 'obor'?", "suluh", ["lampu neon", "lilin elektrik", "senter"]],
  ["Sinonim dari 'akhir'?", "ujung", ["awal", "pangkal", "mulai"]],
  ["Sinonim dari 'awal'?", "pangkal", ["akhir", "ujung", "penutup"]],
];
for (const [q, a, w] of SIN) {
  const ans = Array.isArray(a) ? a[0] : a;
  add("bahasa", 2, q, ans, w.map((x) => (Array.isArray(x) ? x[0] : x)));
}

// ════════════════ 9. OLAHRAGA (kurasi) ════════════════
const ORA = [
  ["Jumlah pemain sepak bola satu tim di lapangan?", "11", ["9", "10", "12"]],
  ["Durasi normal pertandingan sepak bola?", "2 × 45 menit", ["2 × 30 menit", "2 × 60 menit", "3 × 30 menit"]],
  ["Piala Dunia FIFA digelar tiap berapa tahun?", "4 tahun", ["2 tahun", "5 tahun", "3 tahun"]],
  ["Negara juara Piala Dunia 2022?", "Argentina", ["Prancis", "Brasil", "Jerman"]],
  ["Pencetak gol terbanyak sepanjang sejarah Piala Dunia?", "Miroslav Klose", ["Pele", "Maradona", "Ronaldo"]],
  ["Pemain dengan Ballon d'Or terbanyak?", "Lionel Messi", ["Cristiano Ronaldo", "Pele", "Ronaldinho"]],
  ["Poin kemenangan dalam bulu tangkis?", "21", ["15", "25", "20"]],
  ["Turnamen bulu tangkis beregu putra dunia?", "Thomas Cup", ["Uber Cup", "Sudirman Cup", "All England"]],
  ["Turnamen bulu tangkis beregu putri dunia?", "Uber Cup", ["Thomas Cup", "Sudirman Cup", "India Open"]],
  ["Turnamen bulu tangkis beregu campuran?", "Sudirman Cup", ["Thomas Cup", "Uber Cup", "Asia Games"]],
  ["Pemain bulu tangkis Indonesia legendaris juara All England 8 kali?", "Rudy Hartono", ["Taufik Hidayat", "Liem Swie King", "Susi Susanti"]],
  ["Juara bulu tangkis Olimpiade 2004 nomor tunggal putra?", "Taufik Hidayat", ["Rudy Hartono", "Liem Swie King", "Jonatan Christie"]],
  ["Jumlah pemain basket satu tim di lapangan?", "5", ["6", "7", "4"]],
  ["Jumlah pemain voli satu tim di lapangan?", "6", ["5", "7", "8"]],
  ["Olimpiade modern pertama digelar di?", "Athena 1896", ["Paris 1900", "London 1908", "Tokyo 1964"]],
  ["Olimpiade digelar tiap berapa tahun?", "4 tahun", ["2 tahun", "3 tahun", "5 tahun"]],
  ["Pemenang lari 100m putra tercepat dunia?", "Usain Bolt", ["Tyson Gay", "Yohan Blake", "Carl Lewis"]],
  ["Rekor lari 100m dunia?", "9,58 detik", ["9,69 detik", "9,74 detik", "9,85 detik"]],
  ["Klub sepak bola Spanyol berjuluk El Real?", "Real Madrid", ["Barcelona", "Atletico Madrid", "Sevilla"]],
  ["Klub sepak bola Inggris berjuluk The Red Devils?", "Manchester United", ["Liverpool", "Arsenal", "Chelsea"]],
  ["Pertandingan tenis Wimbledon dimainkan di lapangan?", "Rumput", ["Tanah liat", "Hard court", "Karpet"]],
  ["Olahraga berasal dari Jepang yang berpedang?", "Kendo", ["Judo", "Aikido", "Karate"]],
  ["Olahraga bela diri asli Korea?", "Taekwondo", ["Karate", "Kungfu", "Judo"]],
  ["Pencak silat adalah olahraga bela diri asli?", "Indonesia", ["Malaysia", "Thailand", "Filipina"]],
  ["Kota tuan rumah Olimpiade 2020 (digelar 2021)?", "Tokyo", ["Paris", "Beijing", "Rio"]],
  ["Kota tuan rumah Olimpiade 2024?", "Paris", ["Tokyo", "Los Angeles", "London"]],
  ["Liga Champions Eropa adalah kompetisi olahraga?", "Sepak bola", ["Basket", "Bola voli", "Tenis"]],
  ["Waktu istirahat antar babak sepak bola?", "15 menit", ["10 menit", "20 menit", "5 menit"]],
];
for (const [q, a, w] of ORA) add("olahraga", 2, q, a, w);

// ════════════════ 10. TEKNOLOGI (kurasi) ════════════════
const TEK = [
  ["Siapa pendiri Microsoft bersama Paul Allen?", "Bill Gates", ["Steve Jobs", "Elon Musk", "Mark Zuckerberg"]],
  ["Siapa pendiri Apple bersama Steve Wozniak?", "Steve Jobs", ["Bill Gates", "Jeff Bezos", "Larry Page"]],
  ["Siapa pendiri Facebook?", "Mark Zuckerberg", ["Jack Dorsey", "Evan Spiegel", "Larry Page"]],
  ["Siapa CEO Tesla dan SpaceX?", "Elon Musk", ["Jeff Bezos", "Tim Cook", "Sundar Pichai"]],
  ["Siapa pencipta World Wide Web?", "Tim Berners-Lee", ["Vint Cerf", "Bill Gates", "Alan Turing"]],
  ["Siapa pencipta sistem operasi Linux?", "Linus Torvalds", ["Bill Gates", "Steve Jobs", "Ken Thompson"]],
  ["Bahasa pemrograman Java diciptakan oleh?", "James Gosling", ["Dennis Ritchie", "Guido van Rossum", "Bjarne Stroustrup"]],
  ["Bahasa C diciptakan oleh?", "Dennis Ritchie", ["Ken Thompson", "James Gosling", "Bjarne Stroustrup"]],
  ["Python diciptakan oleh?", "Guido van Rossum", ["Dennis Ritchie", "Linus Torvalds", "Larry Wall"]],
  ["Google didirikan tahun?", "1998", ["1995", "2000", "2004"]],
  ["Facebook diluncurkan tahun?", "2004", ["2001", "2006", "2008"]],
  ["iPhone pertama diluncurkan tahun?", "2007", ["2005", "2009", "2010"]],
  ["YouTube didirikan tahun?", "2005", ["2003", "2007", "2000"]],
  ["Komputer pribadi pertama yang sukses massal dari Apple?", "Apple II", ["Macintosh", "iMac", "iPhone"]],
  ["Kepanjangan WWW?", "World Wide Web", ["World Web Wide", "Wide World Web", "Web World Wide"]],
  ["Kepanjangan HTML?", "HyperText Markup Language", ["HyperText Machine Language", "HighText Markup Language", "HyperTool Multi Language"]],
  ["Kepanjangan CPU?", "Central Processing Unit", ["Computer Personal Unit", "Central Program Utility", "Core Processing Unit"]],
  ["Kepanjangan RAM?", "Random Access Memory", ["Read Access Memory", "Rapid Access Module", "Run Access Memory"]],
  ["Kepanjangan URL?", "Uniform Resource Locator", ["Universal Reference Link", "Uniform Reference Locator", "Unique Resource Link"]],
  ["Asisten suara buatan Apple disebut?", "Siri", ["Alexa", "Cortana", "Google Assistant"]],
  ["Satuan data terbesar?", "Terabyte", ["Gigabyte", "Megabyte", "Kilobyte"]],
  ["Satu byte terdiri dari berapa bit?", "8", ["4", "16", "32"]],
  ["Perusahaan induk Android?", "Google", ["Apple", "Microsoft", "Samsung"]],
  ["Browser buatan Google?", "Chrome", ["Firefox", "Safari", "Edge"]],
  ["Browser buatan Mozilla?", "Firefox", ["Chrome", "Opera", "Safari"]],
  ["Mesin pencari nomor satu di dunia?", "Google", ["Bing", "Yahoo", "DuckDuckGo"]],
  ["Aplikasi panggilan video milik Microsoft?", "Skype", ["Slack", "Snapchat", "Spotify"]],
  ["Aplikasi musik streaming terbesar dari Swedia?", "Spotify", ["Apple Music", "Joox", "Deezer"]],
];
for (const [q, a, w] of TEK) add("teknologi", 3, q, a, w);

// ════════════════ 11. HIBURAN (kurasi) ════════════════
const HIB = [
  ["Film James Cameron tentang planet Pandora?", "Avatar", ["Titanic", "Terminator", "Aliens"]],
  ["Film James Cameron tentang kapal tenggelam?", "Titanic", ["Avatar", "The Abyss", "True Lies"]],
  ["Sutradara film Inception dan Interstellar?", "Christopher Nolan", ["James Cameron", "Steven Spielberg", "Ridley Scott"]],
  ["Sutradara film Jurassic Park dan E.T.?", "Steven Spielberg", ["George Lucas", "James Cameron", "Martin Scorsese"]],
  ["Studio animasi pembuat Toy Story?", "Pixar", ["DreamWorks", "Ghibli", "Disney"]],
  ["Studio animasi Jepang pimpinan Hayao Miyazaki?", "Studio Ghibli", ["Toei", "Madhouse", "Sunrise"]],
  ["Film animasi Ghibli tentang penyihir muda di atas sapu?", "Kiki's Delivery Service", ["Totoro", "Howl's Moving Castle", "Spirited Away"]],
  ["Film Ghibli pemenang Oscar tentang dunia roh Jepang?", "Spirited Away", ["Totoro", "Ponyo", "Princess Mononoke"]],
  ["Manga One Piece digambar oleh?", "Eiichiro Oda", ["Masashi Kishimoto", "Akira Toriyama", "Tite Kubo"]],
  ["Manga Naruto digambar oleh?", "Masashi Kishimoto", ["Eiichiro Oda", "Akira Toriyama", "Hirohiko Araki"]],
  ["Manga Dragon Ball digambar oleh?", "Akira Toriyama", ["Eiichiro Oda", "Masashi Kishimoto", "Osamu Tezuka"]],
  ["Robot kucing biru dari masa depan di manga terkenal?", "Doraemon", ["Nobita", "Atre", "Shinchan"]],
  ["Luffy adalah protagonis manga?", "One Piece", ["Naruto", "Bleach", "Fairy Tail"]],
  ["Naruto berasal dari desa?", "Konoha (Daun)", ["Suna (Pasir)", "Kiri (Kabut)", "Batu"]],
  ["Superhero Marvel kaya dengan baju besi?", "Iron Man", ["Thor", "Captain America", "Hulk"]],
  ["Superhero Marvel dengan perisai?", "Captain America", ["Iron Man", "Thor", "Hawkeye"]],
  ["Perusahan fiksi Marvel yang tim Avengers lawan?", "HYDRA", ["AIM", "SWORD", "SHIELD"]],
  ["Novel Laskar Pelangi ditulis oleh?", "Andrea Hirata", ["Habiburrahman", "Tere Liye", "Dee Lestari"]],
  ["Novel Dilan karya?", "Pidi Baiq", ["Andrea Hirata", "Tere Liye", "Ahmad Fuadi"]],
  ["Novel Bumi Manusia karya?", "Pramoedya Ananta Toer", ["Andrea Hirata", "Chairil Anwar", "Sutan Takdir"]],
  ["Penyanyi lagu 'Shape of You'?", "Ed Sheeran", ["Justin Bieber", "Bruno Mars", "Sam Smith"]],
  ["Penyanyi lagu 'Blinding Lights'?", "The Weeknd", ["Drake", "Bruno Mars", "Post Malone"]],
  ["Grup musik legendaris dari Liverpool?", "The Beatles", ["Queen", "Rolling Stones", "Pink Floyd"]],
  ["Grup musik yang menyanyikan Bohemian Rhapsody?", "Queen", ["The Beatles", "Led Zeppelin", "Guns N' Roses"]],
  ["Grup musik asal Korea dengan lagu Dynamite?", "BTS", ["Blackpink", "EXO", "Twice"]],
  ["Penyanyi lagu 'Kartini' yang viral (2017)?", "Fiersa Besari", ["Tulus", "Raisa", "Isyana"]],
  ["Penyanyi Indonesia dengan lagu 'Hati-Hati di Jalan'?", "Tulus", ["Glenn Fredly", "Raisa", "Yovie"]],
  ["Band Indonesia dengan lagu 'Demi Waktu'?", "Ungu", ["Dewa 19", "Peterpan", "Sheila on 7"]],
  ["Band Indonesia dengan lagu 'Separuh Nafas'?", "Dewa 19", ["Ungu", "Peterpan", "Slank"]],
];
for (const [q, a, w] of HIB) add("hiburan", 3, q, a, w);

// ════════════════ tulis file ════════════════
bank.forEach((it, i) => { it.id = i + 1; });
const byCat = {};
for (const it of bank) byCat[it.cat] = (byCat[it.cat] || 0) + 1;
const out = path.resolve(process.cwd(), "src/data/arenakuis.json");
fs.writeFileSync(out, JSON.stringify(bank));
console.log("total soal:", bank.length, "| per kategori:", byCat);
