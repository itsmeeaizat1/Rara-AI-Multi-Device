// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "pantun",
  alias: ["pantun"],
  category: "fun",
  description: "Generator pantun acak (pembuka, teka-teki, galau, gaul, lucu)",
  usage: ".pantun — Pantun acak\n.pantun <tema> — Tema: pembuka, teka-teki, galau, gaul, lucu, cinta",
  example: ".pantun\n.pantun galau\n.pantun teka-teki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const PANTUN_DB = {
  pembuka: [
    "Burung pipit hinggap di dahan\nDatang dari kota Melaka\nMari kita mulai bicara\nDengan salam dan kata",
    "Hari pagi buta-buta\nMembawa bekal secangkir kopi\nMari kita mulai obrolan ini\nDengan penuh sopan dan hati",
    "Jalan jalan ke kota Merauke\nSinggah sebentar membeli rempah\nMari kita mulai obrolan ini\nDengan sopan dan penuh senyum manis",
    "Bunga melati tumbuh di taman\nHarum semerbak di pagi hari\nSalam sejahtera buat semua\nSemoga hari penuh ceria",
  ],
  "teka-teki": [
    "Buluh runcing buluh betung\nBuluh betung dibuat galah\nBinatang apa kalau minum langsung mati\nJawabnya: Nyamuk",
    "Pucuk pauh dilepuk layang\nTerbang melayang di angkasa\nApa binatang yang selalu berbohong\nJawabnya: Kepiting (dia jalan mundur)",
    "Anak ayam turun sepuluh\nMati satu tinggal sembilan\nBendernya apa di balik dinding\nJawabnya: Kunci (kunci pintu)",
    "Ke hulu sungai mendayung sampan\nSinggah sebentar mencari ikan\nApa benda yang semakin dipenuhi semakin ringan\nJawabnya: Lubang",
  ],
  galau: [
    "Ke hulu sungai mencari ikan\nIkan tidak dapat batu pun hilang\nHati ini ingin merenungkan\nKenangan lama tak bisa dilupakan",
    "Bunga mawar berwarna merah\nDipetuk satu di taman raya\nAku menunggu hingga tua\nTapi kamu tak kunjung datang",
    "Burung merpati terbang melayang\nHinggap sebentar di atas dahan\nPatah hati ku pasrahkan\nTakdir menentukan jodoh kita",
    "Pucuk pauh di tepian sungai\nDibuah ombak terus hanyut\nDemi cinta aku rela dihukum\nAsal kamu bahagia aku pasrah",
  ],
  gaul: [
    "Ke pasar jumat beli baju\nBaju sobek dibawa pulang\nJomblo tak perlu merasa malu\nBisa nongkrong sambil rebahan",
    "Bunga melati di tepi jalan\nDipetuk satu sama mak nenek\nJangan suka nge-gas terus\nBanding-bandingin nanti ketahuan",
    "Hari minggu makan ketoprak\nKetopraknya enak dan murah\nGak punya pacar bukan masalah\nYang penting happy dan jangan galau",
    "Pergi ke kafe buat ngopi\nNggak punya duit nitip dulu\nJangan sok keren terus kamu\nIngat kita cuma manusia",
  ],
  lucu: [
    "Beli ketupat di pasar pagi\nBawa pulang di dalam plastik\nDikira ganteng ternyata jelek\nMasa aku yang kena getah",
    "Jalan jalan ke bukit tinggi\nBeli kain tenun untuk mertua\nSudah bekerja keras ternyata\nGajinya cuma cukup makan",
    "Pergi ke pasar buah\nBeli durian langsung makan\nDikira tampan rupanyakan\nTolong cermin dulu dong",
    "Bunga melati di tepi jalan\nHarum semerbak di pagi hari\nCari duit sampai tua nanti\nNyi-puh dulu yang utang",
  ],
  cinta: [
    "Bunga mawar tumbuh di taman\nWangi semerbak di pagi hari\nEngkau gadis pujaan hati\nSelalu di hati tak pernah dilupakan",
    "Pergi melaut mencari ikan\nIkan bandeng bawa pulang\nHati ini tertambat padamu\nTak bisa lepaskan kamu",
    "Bintang terang di langit malam\nBulan purnama menerangi bumi\nDemi cinta ku rela menanti\nWalau lama tak bisa berpaling",
    "Ke hulu sungai mendayung sampan\nSinggah sebentar menambat perahu\nKamu cantik ku tak boleh bohong\nHatiku terpaut padamu",
  ],
};

const THEMES = Object.keys(PANTUN_DB);

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    await m.react("🕒");
    const theme = args[0]?.toLowerCase();

    if (theme && !PANTUN_DB[theme]) {
      return m.reply(novaWrap("Pantun", "Tema tidak ditemukan!\n\nTersedia: " + THEMES.join(", "), "warn"));
    }

    const selectedTheme = theme || THEMES[Math.floor(Math.random() * THEMES.length)];
    const pool = PANTUN_DB[selectedTheme];
    const pantun = pool[Math.floor(Math.random() * pool.length)];

    await m.react("🐣");
    return m.reply(novaWrap("Pantun", [
      "Tema: " + selectedTheme,
      "",
      pantun,
      "",
      usedPrefix + "pantun <tema> untuk tema lain",
    ], "info"));
  } catch (e) {
    await m.react("❌");
    return m.reply(novaWrap("Pantun", "Error: " + e.message, "error"));
  }
}

export { pluginConfig as config, handler };
