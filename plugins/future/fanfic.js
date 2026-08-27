// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "fanfic",
  alias: ["fanfic"],
  category: "future",
  description: "AI Fan Fiction generator - bikin cerita lucu tentang member grup",
  usage: ".fanfic <command>",
  example: ".fanfic gen @user1 @user2",
  isOwner: false,
  isPremium: true,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 2,
  isEnabled: true,
};

const GENRES = [
  { name: "komedi", prompt: "komedi absurd yang bikin ngakak" },
  { name: "romantis", prompt: "romantis cringe tapi manis" },
  { name: "drama", prompt: "drama sekolah yang penuh intrik" },
  { name: "aksi", prompt: "aksi ala film laga yang keren" },
  { name: "horor", prompt: "horor tapi tidak terlalu menyeramkan, lebih ke suspense" },
  { name: "isekai", prompt: "isekai (terlempar ke dunia lain) ala anime" },
];

function getConfig(db, gid) {
  const all = db.setting("fanfic") || {};
  return all[gid] || {};
}

function saveConfig(db, gid, data) {
  const all = db.setting("fanfic") || {};
  all[gid] = data;
  db.setting("fanfic", all);
  db.save();
}

async function generateFanfic(names, genre) {
  try {
    const genreData = GENRES.find(g => g.name === genre) || GENRES[0];
    const prompt = "Buat cerita fan fiction pendek (10-15 kalimat) dalam bahasa Indonesia.\n" +
      "Karakter utama: " + names.join(", ") + "\n" +
      "Genre: " + genreData.prompt + "\n" +
      "Setting: grup WhatsApp yang dijadikan cerita.\n" +
      "Aturan:\n" +
      "- Bikin lucu dan menarik\n" +
      "- Setiap karakter harus bicara minimal 1x\n" +
      "- Ada twist/konflik di tengah\n" +
      "- Ending yang memuaskan\n" +
      "- Gunakan nama panggilan/first name\n" +
      "- Jangan pakai kata-kata kasar\n" +
      "- Format: paragraf pendek, tiap karakter dialog pakai tanda kutip";
    const result = await UnlimitedAI(prompt, "nova-ai");
    return result?.success ? result.response : null;
  } catch {
    return null;
  }
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const gid = m.chat;
  const cfg = getConfig(db, gid);

  if (sub === "gen" || sub === "generate" || sub === "buat") {
    const mentioned = m.mentionedJid && m.mentionedJid.length > 0 ? m.mentionedJid : null;
    if (!mentioned || mentioned.length < 2) {
      await m.reply(claraWrap("Fanfic", "Tag minimal 2 orang.\n💡 *Contoh:* " + prefix + "fanfic gen @user1 @user2 komedi"));
      return { handled: true };
    }
    let genre = (args[args.indexOf("@" + mentioned[0].split("@")[0]) + 1] || "").toLowerCase();
    if (!GENRES.find(g => g.name === genre)) genre = GENRES[Math.floor(Math.random() * GENRES.length)].name;

    const names = mentioned.map(jid => {
      const num = jid.split("@")[0];
      return num.slice(-4);
    });

    await m.react("🕒");
    const story = await generateFanfic(names, genre);
    await m.react("🐣");

    if (!story) {
      await m.reply(claraWrap("Fanfic", "Gagal generate. Coba lagi nanti."));
      return { handled: true };
    }

    // Save to history
    if (!cfg.stories) cfg.stories = [];
    cfg.stories.push({
      names: names.join(", "),
      genre,
      story,
      createdBy: m.sender,
      createdAt: Date.now(),
      id: cfg.stories.length + 1,
    });
    saveConfig(db, gid, cfg);

    await m.reply(claraWrap("Fanfic " + genre, [
      "Karakter: " + names.join(", "),
      "",
      story,
    ].join("\n")), { mentions: mentioned });
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar") {
    if (!cfg.stories || cfg.stories.length === 0) {
      await m.reply(claraWrap("Fanfic", "Belum ada cerita. Ketik " + prefix + "fanfic gen @user1 @user2"));
      return { handled: true };
    }
    const recent = cfg.stories.slice(-5).reverse();
    const list = recent.map(s => "#" + s.id + " [" + s.genre + "] " + s.names + " - " + new Date(s.createdAt).toLocaleDateString("id-ID")).join("\n");
    await m.reply(claraWrap("Fanfic List", "Cerita terakhir:\n" + list));
    return { handled: true };
  }

  if (sub === "read" || sub === "baca") {
    const id = parseInt(args[2] || "0", 10);
    const story = cfg.stories?.find(s => s.id === id) || cfg.stories?.[cfg.stories.length - 1];
    if (!story) {
      await m.reply(claraWrap("Fanfic", "Cerita tidak ditemukan."));
      return { handled: true };
    }
    await m.reply(claraWrap("Fanfic #" + story.id + " [" + story.genre + "]", [
      "Karakter: " + story.names,
      "",
      story.story,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "genres") {
    const list = GENRES.map((g, i) => (i + 1) + ". " + g.name).join("\n");
    await m.reply(claraWrap("Fanfic Genres", "Genre tersedia:\n" + list + "\n\nDefault: random"));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Fanfic", [
      "Total cerita: " + (cfg.stories?.length || 0),
      "",
      prefix + "fanfic gen @user1 @user2 [genre] - generate cerita",
      prefix + "fanfic list - daftar cerita",
      prefix + "fanfic read [id] - baca cerita",
      prefix + "fanfic genres - lihat genre",
      "",
      "Genre: " + GENRES.map(g => g.name).join(", "),
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Fanfic", [
    "AI FAN FICTION GENERATOR",
    "",
    prefix + "fanfic gen @user1 @user2 [genre] - bikin cerita",
    prefix + "fanfic list - daftar cerita",
    prefix + "fanfic read [id] - baca ulang",
    prefix + "fanfic genres - lihat genre",
    "",
    "Genre: " + GENRES.map(g => g.name).join(", "),
    "",
    "Tag minimal 2 orang, AI bikin cerita lucu tentang mereka!",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
