// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraHeader,
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "rpgdashboardglobal",
  alias: ["db", "dashboard", "dashboardglobal", "rpgdb", "rpgdashboardv2", "rpgdbv2"],
  category: "rpg",
  description: "Dashboard global RPG — semua kategori",
  usage: ".dashboard",
  example: ".dashboard",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// All RPG commands organized by category
const RPG_CATEGORIES = [
  {
    key: "profile",
    name: "PROFILE",
    emoji: "👤",
    dashCmd: "dbprofile",
    commands: [
      { cmd: "profile", desc: "Lihat profil RPG kamu" },
      { cmd: "rank", desc: "Cek rank/level dan naik level" },
      { cmd: "inventory", desc: "Cek inventory RPG kamu" },
      { cmd: "equipment", desc: "Lihat dan pasang equipment" },
      { cmd: "leaderboards", desc: "Lihat peringkat player RPG" },
      { cmd: "stamina", desc: "Cek dan pulihkan stamina" },
      { cmd: "achievement", desc: "Lihat achievement RPG kamu" },
    ],
  },
  {
    key: "economy",
    name: "ECONOMY",
    emoji: "💰",
    dashCmd: "dbeconomy",
    commands: [
      { cmd: "balance", desc: "Cek saldo gold kamu" },
      { cmd: "bank", desc: "Bank system - simpan uang aman" },
      { cmd: "deposit", desc: "Simpan gold ke bank" },
      { cmd: "withdraw", desc: "Tarik gold dari bank" },
      { cmd: "daily", desc: "Klaim hadiah harian + streak" },
      { cmd: "dailyv2", desc: "Daily v2 - lucky roll, milestone" },
      { cmd: "hourly", desc: "Klaim hadiah per jam" },
      { cmd: "weekly", desc: "Klaim hadiah mingguan" },
      { cmd: "shop", desc: "Beli item di shop RPG" },
      { cmd: "buy", desc: "Beli item dari shop" },
      { cmd: "sell", desc: "Jual item untuk dapat gold" },
      { cmd: "sellall", desc: "Jual semua item sekaligus" },
      { cmd: "transfer", desc: "Kirim gold ke player lain" },
      { cmd: "give", desc: "Berikan gold/item ke player lain" },
      { cmd: "trade", desc: "Tukar item dengan player lain" },
      { cmd: "reward", desc: "Klaim hadiah harian/mingguan" },
      { cmd: "claim", desc: "Klaim hadiah atau bounty" },
      { cmd: "job", desc: "Ganti pekerjaan RPG" },
      { cmd: "buykoin", desc: "Tukar EXP menjadi Koin" },
      { cmd: "darkmarket", desc: "Pasar gelap eksklusif 􂐎" },
    ],
  },
  {
    key: "action",
    name: "ACTION",
    emoji: "⚔️",
    dashCmd: "dbaction",
    commands: [
      { cmd: "hunt", desc: "Berburu monster untuk gold & exp" },
      { cmd: "mine", desc: "Tambang resource untuk gold & exp" },
      { cmd: "adventure", desc: "Ikuti petualangan untuk exp & gold" },
      { cmd: "boss", desc: "Serang boss bersama di grup" },
      { cmd: "battle", desc: "Bertarung dengan monster" },
      { cmd: "duel", desc: "Duel PvP dengan player lain" },
      { cmd: "dungeon", desc: "Masuk dungeon untuk loot langka" },
      { cmd: "explore", desc: "Jelajahi dunia dan dapat hadiah" },
      { cmd: "fishing", desc: "Memancing untuk dapat ikan" },
      { cmd: "woodcut", desc: "Menebang pohon untuk kayu" },
      { cmd: "mining", desc: "Menambang untuk ore & gems" },
      { cmd: "training", desc: "Latihan untuk tingkatkan stats" },
      { cmd: "meditation", desc: "Istirahat untuk pulihkan HP" },
      { cmd: "heal", desc: "Sembuhkan HP kamu" },
      { cmd: "treasure", desc: "Buka treasure chest untuk hadiah" },
      { cmd: "quest", desc: "Ambil dan selesaikan quest" },
      { cmd: "expedition", desc: "Kirim ekspedisi otomatis" },
      { cmd: "enchant", desc: "Enchant equipment untuk bonus stats" },
      { cmd: "upgrade", desc: "Upgrade stats RPG kamu" },
      { cmd: "use", desc: "Gunakan item consumable" },
      { cmd: "craft", desc: "Craft item dari materials" },
      { cmd: "blacksmith", desc: "Tempa senjata dan armor" },
      { cmd: "autohunt", desc: "Auto berburu 5x berturut-turut 􂐎" },
      { cmd: "kingdom", desc: "Bangun dan kelola kerajaan RPG 􂐎" },
    ],
  },
  {
    key: "social",
    name: "SOCIAL",
    emoji: "💑",
    dashCmd: "dbsocial",
    commands: [
      { cmd: "jadian", desc: "Tembak seseorang buat jadian" },
      { cmd: "mau", desc: "Terima confession jadian" },
      { cmd: "engga", desc: "Tolak confession jadian" },
      { cmd: "putus", desc: "Putus sama pacar" },
      { cmd: "marry", desc: "Lamar nikah (bisa langsung)" },
      { cmd: "terima", desc: "Terima lamaran nikah" },
      { cmd: "tolak", desc: "Tolak lamaran nikah" },
      { cmd: "divorce", desc: "Bercerai dari pasangan" },
      { cmd: "couple", desc: "Lihat status hubungan" },
      { cmd: "gift", desc: "Beri hadiah ke pasangan" },
      { cmd: "guild", desc: "Buat/kelola guild RPG" },
      { cmd: "team", desc: "Buat atau kelola tim/guild" },
      { cmd: "guildwar", desc: "Sistem perang antar guild" },
      { cmd: "pet", desc: "Adopsi dan kelola pet RPG" },
      { cmd: "petshop", desc: "Beli pet dari toko" },
      { cmd: "breeding", desc: "Breeding pets untuk pet baru" },
      { cmd: "petevolve", desc: "Evolusi pet ke tier lebih tinggi 􂐎" },
      { cmd: "soulmatch", desc: "Cek compatibility dengan member" },
      { cmd: "dashboardcouple", desc: "Leaderboard pasangan terlama 💑" },
    ],
  },
  {
    key: "game",
    name: "GAME",
    emoji: "🎲",
    dashCmd: "dbgame",
    commands: [
      { cmd: "gacha", desc: "Tarik gacha untuk item langka" },
      { cmd: "gamble", desc: "Taruh gold untuk menang lebih banyak" },
      { cmd: "slot", desc: "Main slot machine gambling" },
      { cmd: "coinflip", desc: "Gambling coin flip" },
      { cmd: "casino", desc: "Bermain casino untuk judi" },
      { cmd: "dice", desc: "Lempar dadu untuk gambling" },
      { cmd: "lottery", desc: "Gacha/lottery untuk hadiah random" },
      { cmd: "lucky", desc: "Coba peruntunganmu" },
      { cmd: "event", desc: "Lihat event RPG yang berlangsung" },
      { cmd: "arena", desc: "Arena PVP leaderboard mingguan" },
      { cmd: "leveluprpg", desc: "Toggle notifikasi level up" },
    ],
  },
  {
    key: "job",
    name: "JOB & MINI-GAME",
    emoji: "💼",
    dashCmd: "dbjob",
    commands: [
      { cmd: "work", desc: "Bekerja untuk dapat uang" },
      { cmd: "beg", desc: "Mengemis untuk uang receh" },
      { cmd: "ngemis", desc: "Ngemis di jalanan" },
      { cmd: "ngojek", desc: "Ngojek untuk mendapat uang" },
      { cmd: "nyapu", desc: "Nyapu jalan, siapa tau nemu barang" },
      { cmd: "mulung", desc: "Memulung untuk kumpulkan barang" },
      { cmd: "parkir", desc: "Jadi tukang parkir minimarket" },
      { cmd: "ngamen", desc: "Ngamen di jalanan" },
      { cmd: "kurir", desc: "Nganter paket orang" },
      { cmd: "jualan", desc: "Dagang asongan keliling" },
      { cmd: "nambalban", desc: "Buka jasa tambal ban" },
      { cmd: "nulis", desc: "Nulis cerpen untuk royalti" },
      { cmd: "freelance", desc: "Kerjakan project online" },
      { cmd: "streamer", desc: "Live streaming dapet donasi" },
      { cmd: "maling", desc: "Mencopet orang di pasar" },
      { cmd: "steal", desc: "Mencuri dari NPC untuk gold" },
      { cmd: "heist", desc: "Rampok bank dengan risiko tinggi" },
      { cmd: "crime", desc: "Aksi kriminal untuk dapat gold" },
      { cmd: "rob", desc: "Rampok pemain lain" },
    ],
  },
  {
    key: "farm",
    name: "FARM & COOK",
    emoji: "🌾",
    dashCmd: "dbfarm",
    commands: [
      { cmd: "berladang", desc: "Berladang untuk hasil panen" },
      { cmd: "garden", desc: "Berkebun dan panen tanaman" },
      { cmd: "coopfarm", desc: "Kebun kooperatif grup" },
      { cmd: "marketfarm", desc: "Pasar hasil panen, harga naik turun" },
      { cmd: "cook", desc: "Memasak makanan untuk HP" },
      { cmd: "cooking", desc: "Masak untuk stamina dan HP" },
      { cmd: "cookfarm", desc: "Masak hasil panen jadi makanan bonus" },
      { cmd: "alchemy", desc: "Buat potion dan ramuan" },
      { cmd: "merchant", desc: "Jual beli item ke NPC merchant" },
    ],
  },
];

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";

    // Readmore trick
    const more = String.fromCharCode(8206);
    const readMore = more.repeat(4001);

    let text = claraWrap("RPG Dashboard", "⚔️") + "\n\n";

    // Summary section (visible before readmore)
    text += claraWrap("STATS", [`◦ Total Kategori: *${RPG_CATEGORIES.length}*`, `◦ Total Command: *${RPG_CATEGORIES.reduce((a, c) => a + c.commands.length, 0)}*`].join("\n")) + "\n\n";

    text += "Dashboard per kategori:\n\n";

    for (const cat of RPG_CATEGORIES) {
      text += `${cat.emoji} *${cat.name}*\n`;
      text += `${prefix}${cat.dashCmd} — ${cat.commands.length} command\n\n`;
    }

    text += separator("─", 25) + "\n";
    text += "Dashboard per fitur premium:\n\n";
    text += "\xF0\x9F\x8E\xAF " + prefix + "dbautohunt — Auto hunt\n";
    text += "\xF0\x9F\x8F\xB0 " + prefix + "dbkingdom — Kingdom\n";
    text += "\xF0\x9F\x94\xAE " + prefix + "dbdarkmarket — Darkmarket\n";
    text += "\xF0\x9F\x90\x89 " + prefix + "dbpetevolve — Pet evolve\n\n";

    // Readmore — below this is the full detailed list
    text += readMore + "\n";

    text += separator("━", 30) + "\n";
    text += "DAFTAR LENGKAP SEMUA COMMAND\n";
    text += separator("━", 30) + "\n\n";

    for (const cat of RPG_CATEGORIES) {
      text += `${cat.emoji} *${cat.name}*\n`;
      text += separator("─", 25) + "\n";

      let num = 1;
      for (const item of cat.commands) {
        text += `${num}. ${prefix}${item.cmd}\n`;
        text += `   ${item.desc}\n`;
        num++;
      }
      text += "\n";
    }

    text += separator("━", 30) + "\n";
    text += tipText(`Ketik ${prefix}menu untuk kembali`);

    await sendReplyWithNav(sock, m, text, "rpgdashboardglobal");
  } catch (error) {
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(claraWrap("rpgdashboardglobal", text));
  }

  return { handled: true };
}

export { pluginConfig as config, handler, RPG_CATEGORIES };
