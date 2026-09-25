// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cowboyduel.js — Game tembak koboy (tebak posisi musuh)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { rollBonus } from "../../src/lib/nova-game-rewards.js";

const pluginConfig = {
  name: "cowboyduel",
  alias: ["koboy", "tembak"],
  category: "game",
  description: "Game tembak koboy — tembak musuh ninja!",
  usage: ".cowboyduel kiri/kanan/tengah",
  example: ".cowboyduel kiri",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 2, isEnabled: true,
};

const positions = ["kiri", "tengah", "kanan"];
const games = new Map();

async function handler(m, { sock }) {
  try {
    const from = m.key.remoteJid;
    const args = m.text?.trim().split(/\s+/) || [];
    const direction = args[0]?.toLowerCase();

    if (!direction || !positions.includes(direction)) {
      return m.reply(claraWrap("koboy", `Pilih arah: kiri, tengah, atau kanan!\n\nContoh: .cowboyduel kiri`, "guide"));
    }

    await m.react("🕒");

    // Init or continue game
    let game = games.get(from);
    if (!game || game.over) {
      game = {
        enemyPos: positions[Math.floor(Math.random() * 3)],
        playerPos: "tengah",
        over: false,
        round: 1,
        hits: 0,
      };
      games.set(from, game);
    }

    // Move player
    game.playerPos = direction;

    const emoji = { kiri: ["🤠", "-", "-", "-", "-"], tengah: ["-", "-", "🤠", "-", "-"], kanan: ["-", "-", "-", "-", "🤠"] };
    const enemy = { kiri: ["🥷", "-", "-", "-", "-"], tengah: ["-", "-", "🥷", "-", "-"], kanan: ["-", "-", "-", "-", "🥷"] };

    let display = enemy[game.enemyPos].join(" ") + "\n\n\n" + emoji[game.playerPos].join(" ");

    if (game.playerPos === game.enemyPos) {
      game.over = true;
      game.hits++;
      await m.react("🐣");
      let msg = "";
      msg += `${display}\n`;
      msg += `
`;
      msg += `🎯 HEADSHOT! Kamu menang!\n`;
      // 💵 uang (semua game ada uang — request owner 8 Sep 2026)
      try {
        const cash = rollBonus(m, "koboy");
        if (cash.gain > 0) msg += `💵 Uang: +${formatRp(cash.gain)} (saldo ${formatRp(cash.saldo)})\n`;
      } catch {}
      msg += `Yuk duel lagi kak, biar refleksmu makin cepat 🤠🥳\n`;
      msg += `Round: ${game.round} | Hits: ${game.hits}\n`;
            games.delete(from);
      return m.reply(msg);
    } else {
      game.round++;
      game.enemyPos = positions[Math.floor(Math.random() * 3)];
      await m.react("🐣");
      let msg = "";
      msg += `${display}\n`;
      msg += `
`;
      msg += `😵 Meleset! Musuh pindah posisi.\n`;
      msg += `Round: ${game.round}\n`;
            return m.reply(msg);
    }
  } catch (err) {
    console.error("koboy error:", err);
    await m.react("❌");
    return m.reply(claraWrap("koboy", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
