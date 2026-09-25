// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";

const pluginConfig = {
  name: "podcast",
  alias: ["podcast"],
  category: "smart",
  description: "AI Podcast generator - script podcast 2 menit dari topik",
  usage: ".podcast <command>",
  example: ".podcast gen Teknologi AI di Indonesia",
  isOwner: false,
  isPremium: true,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 3,
  isEnabled: true,
};

function getConfig(db, gid) {
  const all = db.setting("podcast") || {};
  if (!all[gid]) {
    all[gid] = { episodes: [], totalGenerated: 0 };
    db.setting("podcast", all);
  }
  return all[gid];
}

function saveConfig(db, gid, data) {
  const all = db.setting("podcast") || {};
  all[gid] = data;
  db.setting("podcast", all);
  db.save();
}

async function generateScript(topic) {
  try {
    const prompt = "Buat script podcast singkat (2 menit baca) dalam bahasa Indonesia dengan topik: \"" + topic + "\".\n" +
      "Format:\n" +
      "[INTRO] (10 detik) - Sambutan pembawa acara\n" +
      "[SEGMENT 1] (30 detik) - Pengenalan topik\n" +
      "[SEGMENT 2] (40 detik) - Pembahasan utama / fakta menarik\n" +
      "[SEGMENT 3] (30 detik) - Opini / take pembawa acara\n" +
      "[OUTRO] (10 detik) - Penutup & call to action\n\n" +
      "Tulis dengan gaya bicara natural, bukan formal. Gunakan bahasa santai tapi informatif.";
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
    const topic = args.slice(2).join(" ").trim();
    if (!topic) {
      await m.reply(claraWrap("Podcast", "Format: " + prefix + "podcast gen <topik>\n💡 *Contoh:* " + prefix + "podcast gen Teknologi AI di Indonesia"));
      return { handled: true };
    }
    const script = await generateScript(topic);
    if (!script) {
      await m.reply(novaError("Podcast", "Gagal generate nih, coba lagi ya"));
      return { handled: true };
    }

    cfg.episodes.push({ topic, script, createdBy: m.sender, createdAt: Date.now(), id: cfg.episodes.length + 1 });
    cfg.totalGenerated++;
    saveConfig(db, gid, cfg);

    await m.reply(claraWrap("Podcast: " + topic, [
      "Durasi: ~2 menit",
      "Episode #" + cfg.episodes.length,
      "",
      script,
    ].join("\n")));
    return { handled: true };
  }

  if (sub === "list" || sub === "daftar") {
    if (cfg.episodes.length === 0) {
      await m.reply(claraWrap("Podcast", "Belum ada episode. Ketik " + prefix + "podcast gen <topik>."));
      return { handled: true };
    }
    const recent = cfg.episodes.slice(-5).reverse();
    const list = recent.map(e => "#" + e.id + " " + e.topic + " - " + new Date(e.createdAt).toLocaleDateString("id-ID")).join("\n") || "(kosong)";
    await m.reply(claraWrap("Podcast", "Episode terakhir:\n" + list));
    return { handled: true };
  }

  if (sub === "play" || sub === "tonton" || sub === "baca") {
    const id = parseInt(args[2] || "0", 10);
    const ep = cfg.episodes.find(e => e.id === id) || cfg.episodes[cfg.episodes.length - 1];
    if (!ep) {
      await m.reply(claraWrap("Podcast", "Episode tidak ditemukan."));
      return { handled: true };
    }
    await m.reply(claraWrap("Podcast #" + ep.id + ": " + ep.topic, ep.script));
    return { handled: true };
  }

  if (sub === "stats" || sub === "cek" || !sub) {
    await m.reply(claraWrap("Podcast", [
      "Total episode: " + cfg.episodes.length,
      "Total generated: " + cfg.totalGenerated,
      "",
      prefix + "podcast gen <topik> - generate baru",
      prefix + "podcast list - daftar episode",
      prefix + "podcast play [id] - baca episode",
    ].join("\n")));
    return { handled: true };
  }

  await m.reply(claraWrap("Podcast", [
    "AI PODCAST GENERATOR",
    "",
    prefix + "podcast gen <topik> - generate script",
    prefix + "podcast list - daftar episode",
    prefix + "podcast play [id] - baca episode",
    prefix + "podcast stats - statistik",
    "",
    "Script: Intro + 3 Segment + Outro (~2 menit)",
  ].join("\n")));
  return { handled: true };
}

export { pluginConfig as config, handler };
