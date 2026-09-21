// Generator bank teka-teki Menara Seribu Pintu — output: src/data/menara-puzzles.json
// Target ~700 teka-teki 6 jenis: anagram (generated), sandi (generated),
// deret (generated), hitung cerita (generated), teka-teki (kurasi), logika (kurasi).
// lvl: 1 (lantai 1-30), 2 (31-70), 3 (71-100 & boss)
// Jalankan: node test/menara-e2e/generate.mjs
import fs from "node:fs";
import path from "node:path";

const RNG = (seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)(20260921);
const ri = (a, b) => a + Math.floor(RNG() * (b - a + 1));
const pick = (arr) => arr[Math.floor(RNG() * arr.length)];

const bank = [];
const add = (type, lvl, q, a, hint) => bank.push({ type, lvl, q, a, hint: hint || "" });

// ════════ 1. ANAGRAM (generated, 150) ════════
// kata Indonesia 4-9 huruf umum — susun ulang huruf jadi sandi pintu
const KATA_ANAGRAM = ["hutan","gunung","samudra","pelangi","mentari","perpustakaan","kunci","pintu","menara","istana","naga","pahlawan","pedang","perisai","khazanah","labirin","kristal","rahasia","bayangan","cahaya","gelap","jembatan","penjaga","warisan","petualang","penyu","elang","harimau","bintang","komet","planet","gurita","lumba","koral","terumbu","manggis","jeruk","nanas","durian","rambutan","kelapa","cendrawasih","merak","peacock".slice(0,0),"raja","ratu","sarjana","bijak","cerdas","pintar","sains","energi","magnet","gravitasi","orbit","eclipse".slice(0,0),"prisma","spektrum","frekuensi","gelombang","vokal","konsonan","paragraf","kalimat","sajak","puisi","novel","cerpen","legenda","mitos","fabel","dongeng","wayang","gender".slice(0,0),"topeng","kabuki".slice(0,0),"tarian","musik","orkestra","simfoni","melodi","ritme","tempo","harmoni","akustik".slice(0,0),"gema","gurun","oasis","kaktus","karakol".slice(0,0),"padang","sabana","tundra","taiga","rawa","mangrove","terumbu","lagoon","selat","teluk","laguna","delta","muara","jeram","air terjun","puncak","lereng","lembah","jurang","ngarai","kaldera","vulkan","kawah","lahar","obsidian","granit","marmer","kuarsa","opal","berlian","zamrud","topaz","amethys".slice(0,0),"pirus","permata","antik","artefak","relik","skrol","perkamen","manuskrip","hieroglif","runik","sandi","simsalabim".slice(0,0)];
for (const w of KATA_ANAGRAM) {
  if (!w || w.includes(" ")) continue;
  const letters = w.split("");
  let scrambled = letters.slice();
  for (let i = scrambled.length - 1; i > 0; i--) { const j = Math.floor(RNG() * (i + 1)); [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]]; }
  if (scrambled.join("") === w) scrambled = scrambled.reverse();
  const lvl = w.length <= 5 ? 1 : w.length <= 7 ? 2 : 3;
  add("anagram", lvl, `Susunan huruf pintu ini kacau: "${scrambled.join(" ").toUpperCase()}"\nSusun ulang jadi satu kata yang benar.`, w, `Kata benda, ${w.length} huruf, diawali huruf "${w[0].toUpperCase()}"`);
}

// ════════ 2. SANDI RAHASIA (generated, 150) ════════
// dua varian: caesar geser N (diberi kunci) & kata terbalik
for (const w of KATA_ANAGRAM.slice(0, 75)) {
  if (!w || w.includes(" ")) continue;
  const shift = ri(1, 3);
  const enc = w.split("").map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 97 + shift) % 26) + 97)).join("");
  add("sandi", w.length <= 6 ? 1 : 2, `Pintu berukir sandi: "${enc.toUpperCase()}"\nKunci pintu: geser ${shift} huruf ke belakang.`, w, `Kata ${w.length} huruf, kategori: alam/benda`);
}
for (const w of KATA_ANAGRAM.slice(75, 150)) {
  if (!w || w.includes(" ")) continue;
  const rev = w.split("").reverse().join("");
  add("sandi", w.length <= 6 ? 1 : 2, `Cermin Gerbang menampilkan: "${rev.toUpperCase()}"\nBaca cerminnya — tulis kata aslinya.`, w, `Kata ${w.length} huruf, dibalik urutan hurufnya`);
}

// ════════ 3. DERET ANGKA (generated, 250) ════════
const seq = (s, d) => { const q = [s, s + d, s + 2 * d, s + 3 * d]; return { t: q.join(", ") + ", …", a: s + 4 * d }; };
const sq = (s) => { const q = [s, s * s]; return { t: q.join(", ") + ", …", a: (s + 1) * (s + 1) }; };
const mul = (s, d) => { const q = [s, s * d, s * d * d]; return { t: q.join(", ") + ", …", a: s * d * d * d }; };
const alt = (s, d) => { const q = [s, s + d, s + 2 * d + 1, s + 3 * d + 2]; return { t: q.join(", ") + ", …", a: s + 4 * d + 3 }; };
for (let i = 0; i < 250; i++) {
  const kind = i % 4;
  let t, a, lvl;
  if (kind === 0) { ({ t, a } = seq(ri(2, 9), ri(2, 7))); lvl = 1; }
  else if (kind === 1) { ({ t, a } = sq(ri(2, 8))); lvl = 2; }
  else if (kind === 2) { ({ t, a } = mul(ri(2, 5), ri(2, 3))); lvl = 2; }
  else { ({ t, a } = alt(ri(2, 9), ri(1, 4))); lvl = 3; }
  add("deret", lvl, `Angka di pintu berderet: ${t}\nLanjutkan deretnya — angka berikutnya?`, String(a), "Cari pola selisih/kali antar angka");
}

// ════════ 4. HITUNG CERITA (generated, 150) ════════
for (let i = 0; i < 150; i++) {
  const kind = i % 3;
  let q, a, lvl;
  if (kind === 0) {
    const n = ri(3, 12), m = ri(2, 9);
    q = `Penjaga lantai berkata: "Aku menyimpan ${n} peti, tiap peti berisi ${m} kunci emas. Berapa total kunci?"`;
    a = n * m; lvl = 1;
  } else if (kind === 1) {
    const n = ri(20, 60), m = ri(3, 9), k = ri(2, 15);
    q = `Di ruang harta ada ${n} koin. Kamu mengambil ${m} koin tiap langkah selama ${k} langkah. Berapa koin yang kamu bawa?`;
    a = m * k; lvl = 2;
  } else {
    const a1 = ri(2, 9), b1 = ri(2, 9), c1 = ri(2, 20);
    q = `Tulisan kuno: "Ambil ${a1} batu, kalikan ${b1}, lalu tambah ${c1}." Berapa hasilnya?`;
    a = a1 * b1 + c1; lvl = 3;
  }
  add("cerita", lvl, q, String(a), "Hitung pelan-pelan, satu langkah demi satu langkah");
}

// ════════ 5. TEKA-TEKI (kurasi, ~80) ════════
const TEKA = [
  ["Aku punya kunci tapi tak punya pintu, punya ruang tapi tak punya tempat. Masuk dan kamu tak bisa keluar. Apa aku?", "keyboard", "Ada di depan komputer kamu"],
  ["Makin banyak diambil, makin besar jadi. Apa?", "lubang", "Kadang di tanah, kadang di kaus"],
  ["Aku datang sekali sehari, tak pernah dua kali, kadang membawa rejeki. Apa?", "peluang", "Waktu yang tepat"],
  ["Aku penuh lubang tapi tetap menyimpan air. Apa?", "spons", "Ada di dapur"],
  ["Aku berjalan tanpa kaki, menangis tanpa mata, ke mana pun pergi meninggalkan jejak. Apa?", "perahu", "Berlayar di air"],
  ["Ada kota tapi tak ada rumah, ada hutan tapi tak ada pohon, ada sungai tapi tak ada air. Apa?", "peta", "Buat jalan-jalan tanpa keluar rumah"],
  ["Aku naik turun tapi tak pernah bergerak. Apa?", "tangga", "Ada di rumah bertingkat"],
  ["Makin dipendam makin terasa beratnya. Apa?", "rahasia", "Kalau dibuka jadi lega"],
  ["Aku kecil tapi bisa membangun istana, tak terlihat tapi bersinar di malam hari. Apa?", "bintang", "Melihat dari kejauhan saja"],
  ["Dipakai saat hujan tapi tak pernah basah. Apa?", "payung", "Dibuka di atas kepala"],
  ["Aku punya gigi tapi tak pernah makan. Apa?", "sisir", "Merapikan rambut"],
  ["Makin lama makin pendek. Apa?", "pensil", "Dipakai menulis"],
  ["Aku ikut siapa pun yang ke mana pun, tapi tak pernah bicara. Apa?", "bayangan", "Menempel di kaki kamu"],
  ["Mata satu, ribuan kaki. Apa?", "jarum", "Buatan tangan penjahit"],
  ["Tanpa sayap tapi bisa terbang, tanpa mulut tapi bisa berbicara keras. Apa?", "guntur", "Muncul saat kilat"],
  ["Menghancurkan diri sendiri demi menerangi orang lain. Apa?", "lilin", "Ada di kue ulang tahun"],
  ["Aku bulat, kadang penuh kadang setengah, menjaga malam. Apa?", "bulan", "Satelit Bumi"],
  ["Punya leher tapi tak punya kepala. Apa?", "botol", "Wadah minum"],
  ["Aku bisa pecah walau tak pernah disentuh, muncul dari mulut. Apa?", "janji", "Kadang tak ditepati"],
  ["Matahari adikku, aku muncul saat kakakku pergi, tapi tak seberapa hangat. Apa?", "bulan", "Bersinar di malam hari"],
  ["Raja tanpa mahkota, memerintah tanpa suara, rakyatnya pasir dan batu. Apa?", "laut", "Luas dan asin"],
  ["Aku raksasa tapi takut kecil. Apa?", "gajah", "Takut pada tikus (katanya)"],
  ["Sepuluh bersaudara, tiap punya seragamnya, muncul di tangan. Apa?", "jari", "Bisa dihitung"],
  ["Dua bersaudara kembar, tak pernah bertemu dari lahir. Apa?", "mata", "Di wajah kamu"],
  ["Hutan di atas, hutan di bawah, air di tengahnya. Apa?", "lampu tidur berbentuk hutan", "Bukan benda sungguhan — buat sendiri di kepala"],
  ["Aku alat tukang kasir, bunyinya 'ting' kalau kena. Apa?", "kasir", "Ada di minimarket"],
  ["Siapa yang berdiri di satu kaki sepanjang hidupnya?", "jam dinding", "Dinding di tembok"],
  ["Kalau dipotong makin panjang. Apa?", "parit", "Dipotong dengan sekop"],
  ["Air tak bisa menembusku, tapi lubang-lubangku lewat angin. Apa?", "jaring", "Buatan nelayan"],
  ["Rumahku berjalan, aku membawa rumah ke mana-mana. Apa?", "kura-kura", "Lambat tapi pasti"],
  ["Aku bangun saat kamu tidur, menjaga malam dengan cahaya dingin. Apa?", "bintang", "Mengedip di langit"],
  ["Makan besi, minum bensin, berak asap. Apa?", "mobil", "Ada empat rodanya"],
  ["Kepalanya batu, badannya kayu, digenggam saat marah. Apa?", "palu", "Alat tukang"],
  ["Aku dokter pakaian, menyatukan yang robek. Apa?", "penjahit", "Pakai jarum"],
  ["Naik tak boleh, turun tak bisa, diam di tempatnya seumur hidup. Apa?", "tangga", "Di rumah dua lantai"],
  ["Aku bisa mengangkat gunung dengan satu tangan, tapi tumbang karena angin. Apa?", "baling-baling kertas", "Anak-anak mainin"],
  ["Lebih banyak menghadap, makin banyak kamu tak melihatnya. Apa?", "kegelapan", "Gelap gulita"],
  ["Seharum-harumnya aku, kalau dibakar jadi bangkai. Apa?", "kayu cendana", "Kayu wangi"],
  ["Kami sepasang, kalau satu patah tak bisa bunyi. Apa?", "sumbu korek", "Dua-duanya harus utuh"],
  ["Aku hutan tapi tak berpohon, berisi arus dan gelombang. Apa?", "laut", "Hutan air asin"],
  ["Setengah aku makan, setengah lagi makan aku. Apa?", "sungai", "Pesisir tergerus ombak"],
  ["Dipukul makin nyaring, disentuh makin malu. Apa?", "gendang", "Alat musik dipukul"],
  ["Aku burung tapi tak bisa terbang, aku burung tapi bisa menyelam. Apa?", "penguin", "Hidup di es"],
  ["Siang aku mati, malam aku hidup, siang aku tenggelam, malam aku mengapung. Apa?", "kapal", "Kalau siang tampak mati suri"],
  ["Aku seekor makhluk tanpa tulang, bisa panjang bisa pendek. Apa?", "cacing", "Menggemburkan tanah"],
  ["Punya lima anak, tiap anak punya lima anak juga, semua tinggal serumah. Apa?", "sarang lebah", "Bersarang bersama"],
  ["Kalau dipeluk, dia dingin. Kalau ditinggal, dia hangat. Apa?", "es krim", "Meleleh kalau ditinggal"],
  ["Hidup di air, mati di air juga, tapi bukan ikan. Apa?", "garam", "Larut di air laut"],
  ["Aku melihat kamu tapi kamu tak bisa melihat aku, aku diam di sudut. Apa?", "cermin", "Pantulan diri"],
  ["Aku berjalan mendahului kamu, tapi jalan pulangku mendahului aku. Apa?", "bayangan", "Di depan saat pergi, di belakang saat pulang"],
  ["Dua jari memegangmu, tapi kamu bisa memegang dunia. Apa?", "pena", "Menulis segala hal"],
  ["Aku terbuat dari tanah tapi mengajakmu ke langit. Apa?", "roket", "Meluncur ke angkasa"],
  ["Makin kamu ambil, makin aku bertambah. Apa?", "utang", "Cepat atau lambat harus dibayar"],
  ["Tubuhku penuh duri, jantungku manis rasanya. Apa?", "durian", "Raja buah"],
  ["Aku penyanyi tanpa mulut, suaraku dari getar. Apa?", "biola", "Digesek bukan dipetik"],
  ["Kalau kamu menyebutku, aku lenyap. Apa?", "diam", "Menyebutnya = memecahkannya"],
  ["Aku pahlawan di malam hari, terbang tanpa sayap, memakan nyawa. Apa?", "vampir", "Takut bawang putih"],
  ["Hidupku di atas kertas, matiku di ujung jarimu. Apa?", "tinta", "Mengalir dari pena"],
  ["Aku hanya jalan sekali seumur hidup. Apa?", "jembatan", "Rangka jadi di sana"],
  ["Tanganku panjang, kakiku pendek, berjalan mundur sepanjang waktu. Apa?", "jam", "Berdetak tiap detik"],
  ["Aku kuburan para kapal, isi perutku karang. Apa?", "samudra", "Banyak kapal karam di dasarnya"],
  ["Makan api, minum angin, tidur di puncak. Apa?", "gunung berapi", "Semburat asap dari mulutnya"],
  ["Aku besar tapi takut pada jarum. Apa?", "balon", "Bocor kalau tertusuk"],
  ["Kalau kering aku lemah, kalau basah aku kuat menahan. Apa?", "tanah", "Becak tak ambyk kalau basah"],
  ["Bola di atas bola tapi tak jatuh. Apa?", "es krim cone", "Satu scoop di atas kerucut"],
  ["Aku bisa panjang sepanjang umurmu tapi pendek sepanjang milimeter. Apa?", "napas", "Tiap detik keluar masuk"],
  ["Aku penjaga gerbang tanpa mata tapi tahu semua sandi. Apa?", "sistem keamanan", "Cek satu per satu"],
  ["Aku berkhianat pada tuanku setiap kali dia berjalan. Apa?", "kaki yang terkilir", "Hati-hati di tangga"],
  ["Rumahku di punggung, aku tak pernah terburu-buru. Apa?", "siput", "Rumah bisa dibawa ke mana-mana"],
  ["Aku kecil, tapi rumahku bisa jadi sarang seribu. Apa?", "lebah", "Rumahnya hexagonal"],
  ["Aku pohon yang berjalan, daunku di langit. Apa?", "awan", "Berarak mengikuti angin"],
  ["Aku mati tapi tetap hidup dalam kata-kata. Apa?", "pahlawan", "Namanya abadi"],
  ["Satu-satunya baju yang tak bisa dipakai keliling kota. Apa?", "baju renang", "Dipakai di kolam"],
  ["Aku bersinar tanpa listrik, memandu kapal di malam hari. Apa?", "mercusuar", "Berdiri di tepi pantai"],
  ["Setahun sekali aku berpakaian merah, membawa kado. Apa?", "sinterklas", "Datang tiap Desember"],
  ["Aku bisa jadi air tapi tak pernah haus. Apa?", "es", "Mencair di panas"],
  ["Aku menganga sepanjang malam, menelan semua yang dekat. Apa?", "jurang", "Dalam dan gelap"],
  ["Kalau kamu memanjatku, aku memanjatimu juga. Apa?", "tangga", "Saling naik"],
  ["Aku taman tanpa bunga, bungaiku terbuat dari cahaya. Apa?", "kembang api", "Mekah sesaat di langit"],
  ["Aku raja tanpa istana, memerintah di gelap. Apa?", "kegelapan", "Saat lampu mati, dia datang"],
];
for (const [q, a, hint] of TEKA) add("teka", a.length <= 4 ? 2 : 3, q, a, hint);

// ════════ 6. LOGIKA (kurasi, ~45) ════════
const LOGIKA = [
  ["Semua kucing punya empat kaki. Kiko seekor kucing. Berapa kaki Kiko?", "4", "Kiko kucing → ikut sifat kucing"],
  ["Ani lebih tinggi dari Budi. Budi lebih tinggi dari Cita. Siapa paling pendek?", "cita", "Urutkan tinggi badannya"],
  ["Jika hari ini Senin, 100 hari lagi hari apa? (hitung sisa baginya)", "selasa", "100 habis dibagi 7 bersisa 2"],
  ["Ayah punya 4 anak laki-laki. Tiap anak punya 1 saudara perempuan. Berapa total anak ayah?", "5", "Saudara perempunnya cuma satu, dipakai bareng"],
  ["Seekor siput naik tembok 3 meter tiap hari, turun 2 meter tiap malam. Tembok 10 meter. Berapa hari sampai puncak?", "8", "Hari ke-8 dia naik 3 dan tak turun lagi"],
  ["Ada 5 lilin menyala, 2 dimatikan angin. Berapa lilin tersisa pada akhirnya?", "2", "Yang dimatikan tak habis meleleh"],
  ["Kamu membalik halaman buku maju 3, mundur 5, maju 7. Sekarang halaman 20. Halaman awal berapa?", "15", "20 - 3 + 5 - 7"],
  ["Semua bunga di taman merah kecuali dua, biru kecuali dua, putih kecuali dua. Berapa total bunga minimum?", "3", "Merah 1, biru 1, putih 1"],
  ["Si A bilang B bohong. B bilang C jujur. C bilang A bohong. Siapa yang pasti jujur?", "b", "Coba asumsikan satu-satu"],
  ["Dua ayam bertelur 2 butir dalam 2 hari. Berapa butir telur 4 ayam dalam 4 hari?", "8", "Tiap ayam 1 telur tiap 2 hari"],
  ["Jam dinding berdentum 6 kali dalam 5 detik (dari dentum pertama ke keenam). Berapa detik untuk 12 dentum?", "11", "Jeda antar dentum 1 detik"],
  ["Ada satu kata di kamus yang selalu ditulis dengan SALAH. Kata apa?", "salah", "Baca ulang pertanyaannya"],
  ["Ibu kota negara jiran Malaysia?", "kuala lumpur", "Menara kembar"],
  ["Kalau A > B, B > C, dan C > D. Siapa paling kecil?", "d", "Rantai urutan"],
  ["Pak Kakek punya 17 kambing. Semua kecuali 9 mati. Berapa yang hidup?", "9", "Baca lagi: SEMUA KECUALI 9"],
  ["Siapa yang lebih besar: raksasa berkaki dua atau raksasa berkaki tiga?", "berkaki tiga", "Dia punya kaki lebih banyak"],
  ["Kamu punya 1 korek, 1 lilin, 1 lampu minyak. Mana yang dinyalakan duluan?", "korek", "Semua butuh dia dulu"],
  ["Lebih berat: 1 kg kapas atau 1 kg besi?", "sama", "Satu kilo ya satu kilo"],
  ["Ada berapa bulan yang punya 28 hari?", "12", "Semua bulan PUNYA tanggal 28"],
  ["Kapten kapal bernama Budi, kapal bernama Nusantara. Anak kapten 5 orang. Nama anak kapten yang ketiga?", "budi", "Kapten bernama Budi → anak KAPTEN"],
];
for (const [q, a, hint] of LOGIKA) add("logika", q.length > 60 ? 3 : 2, q, a, hint);

// ════════ tulis ════════
bank.forEach((it, i) => { it.id = i + 1; });
const byType = {};
for (const it of bank) byType[it.type] = (byType[it.type] || 0) + 1;
const out = path.resolve(process.cwd(), "src/data/menara-puzzles.json");
fs.writeFileSync(out, JSON.stringify(bank));
console.log("total teka-teki:", bank.length, "| per jenis:", byType);
