// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Story Quest — Story-driven quest chain, narrator, NPC interaction

import { ensureRpg, saveRpg } from "../../src/lib/nova-rpg-service.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { rpgSleep, animQuest } from "../../src/lib/nova-rpg-anim.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "storyquest",
  alias: ["storyquest", "nextquest"],
  category: "rpg",
  description: "Story quest chain, narator, dan interaksi NPC",
  usage: ".storyquest | .nextquest | .narrator | .npc <nama>",
  example: ".storyquest",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, energi: 1, isEnabled: true,
};

const STORY = [
  "🌄 Kamu terbangun di desa terpencil. Seorang tetua menyapamu.",
  "🧙 Penyihir tua memanggilmu untuk misi suci mengambil artefak.",
  "🐉 Kamu mendengar rumor tentang naga di gunung utara.",
  "🏰 Kerajaan membutuhkan pertolonganmu — penyerangan akan datang.",
  "☠️ Makhluk gelap mengintai dunia. Kamu harus menghentikannya.",
  "⚔️ Pertempuran akhir menantimu. Semua yang kamu pelajari akan diuji.",
  "👑 Kamu kembali sebagai pahlawan. Nama akan diukir dalam sejarah.",
];

const NPCS = {
  penjaga: "⚔️ Penjaga: Dunia ini berbahaya... simpan koinmu di bank! Ketik .bankrpg",
  penjual: "🛒 Penjual: Aku punya ramuan langka, coba .shoprpg!",
  penyihir: "🧙 Penyihir: Pelajari skill baru dengan .learnskill, dan lihat treemu dengan .skilltree",
  tavern: "🍺 Tavern Keeper: Butuh istirahat? Ketik .heal untuk pulihkan HP",
  pandita: "📜 Pandita: Roh leluhur memberkati yang tekun. Coba .bless setiap hari!",
};

const NARRATOR_LINES = [
  "Langkahmu baru saja dimulai. Dunia menantimu.",
  "Angin berbisik tentang petualangan yang akan datang...",
  "Bintang-bintang meramalkan kejayaan, tapi juga bahaya.",
  "Dunia ini penuh misteri. Setiap pilihan membentuk takdirmu.",
];

async function handler(m, { sock, text, command }) {
  try {
    const rpg = ensureRpg(m, m.pushName);
    if (!rpg) return m.reply(claraWrap("storyquest", "RPG belum siap. Ketik .daftar dulu.", "error"));

    if (command === "storyquest") {
      const storyIndex = rpg.storyProgress || 0;
      const current = STORY[storyIndex % STORY.length];
      let msg = "";
      msg += "📜 Chapter " + (storyIndex + 1) + "/" + STORY.length + "\n";
      msg += "│\n";
      msg += "" + current + "\n";
      msg += "│\n";
      if (storyIndex < STORY.length - 1) {
        msg += "📌 Ketik .nextquest untuk lanjut cerita\n";
      } else {
        msg += "✅ Kamu telah menyelesaikan semua chapter!\n";
        msg += "📌 Ulangi dengan .nextquest untuk replay\n";
      }
      msg += "";
      return m.reply(msg);
    }

    if (command === "nextquest") {
      const storyIndex = rpg.storyProgress || 0;
      const nextIndex = (storyIndex + 1) % STORY.length;
      await m.react("🕒");
      await animQuest(m, sock, 'story quest');
      rpg.storyProgress = nextIndex;
      const reward = 50 + storyIndex * 20;
      rpg.exp = (rpg.exp || 0) + reward;
      rpg.gold = (rpg.gold || 0) + reward;
      saveRpg(m, rpg);
      await m.react("🐣");
      let msg = "";
      msg += "📜 Chapter " + (nextIndex + 1) + "/" + STORY.length + "\n";
      msg += "│\n";
      msg += "" + STORY[nextIndex] + "\n";
      msg += "│\n";
      msg += "⭐ +" + reward + " EXP | 💰 +" + reward + " Gold\n";
      msg += "";
      return m.reply(msg);
    }

    if (command === "narrator") {
      const line = NARRATOR_LINES[Math.floor(Math.random() * NARRATOR_LINES.length)];
      return m.reply("🎙️ *Narator berbisik...*\n\n\"" + line + "\"\n\n📌 .storyquest untuk menjelajah kisahmu");
    }

    if (command === "npc") {
      const npcName = (text || "").trim().toLowerCase();
      if (!npcName) {
        let msg = "";
        msg += "NPC yang bisa diajak bicara:\n";
        for (const [id, line] of Object.entries(NPCS)) {
          msg += "🔹 " + id + "\n";
        }
        msg += "\n📌 .npc <nama> — bicara dengan NPC\n";
        return m.reply(msg);
      }
      const npc = NPCS[npcName];
      if (!npc) return m.reply(claraWrap("npc", "NPC tidak ditemukan. Tersedia: " + Object.keys(NPCS).join(", "), "guide"));
      return m.reply("" + npc + "");
    }
  } catch (e) {
    console.error("storyquest error:", e.message);
    await m.react("❌");
    return m.reply(claraWrap(m.command || "storyquest", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
