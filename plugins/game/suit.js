// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// suit.js — Batu Gunting Kertas vs Bot (single player, no API needed)

import { novaError } from "../../src/lib/nova-menu-style.js";
import { novaGameBox } from "../../src/lib/nova-games.js";
// GUARD FORMAT: pesan berkotak wajib boxLeft() (src/lib/styler.js),
// dilarang nulis "│ " manual — kalimat bebas panjang, wrapText yang motong.
import { boxMessage } from "../../src/lib/styler.js";
import { addExpWithLevelCheck } from "../../src/lib/nova-level.js";
import { formatRp } from "../../src/lib/nova-rpg-service.js";
import { rollBonus } from "../../src/lib/nova-game-rewards.js";
import { getDatabase } from "../../src/lib/nova-database.js";

const pluginConfig = {
  name: "rockpaperscissors",
  alias: ["suit", "batuguntingkertas", "suitor"],
  category: "game",
  description: "Batu Gunting Kertas vs Bot",
  usage: ".rockpaperscissors <batu/gunting/kertas>",
  example: ".rockpaperscissors batu",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

const CHOICES = ["batu", "gunting", "kertas"];
const EMOJI = { batu: "🪨", gunting: "✂️", kertas: "📄" };

function getResult(player, bot) {
  if (player === bot) return "seri";
  const wins = { batu: "gunting", gunting: "kertas", kertas: "batu" };
  return wins[player] === bot ? "menang" : "kalah";
}

async function handler(m, { args, prefix }) {
  const pilihan = (args[0] || "").toLowerCase().trim();

  if (!pilihan) {
    return m.reply(novaGameBox({
      title: "suit",
      icon: "✊",
      flavor: "✊ *SUIT: BATU GUNTING KERTAS!*",
      body: "Lawan bot langsung 1 ronde.\nPilih: batu, gunting, atau kertas",
      cta: "Contoh: .rockpaperscissors batu",
    }));
  }

  if (!CHOICES.includes(pilihan)) {
    return m.reply(novaError("Suit", `Pilihan gak valid nih! Ketik: batu, gunting, atau kertas`));
  }

  // Bot picks random
  const botPick = CHOICES[Math.floor(Math.random() * CHOICES.length)];
  const result = getResult(pilihan, botPick);

  // Info energi kekuras (dari handler setelah pemotongan) — teks polos,
  // prefix "│ " & pemotongan baris dijamin boxLeft(), bukan manual.
  const e = m.energiInfo;
  const energiText = e
    ? (e.unlimited
        ? `⚡ Energi: ∞ (unlimited)`
        : (e.deducted > 0
            ? (e.game ? `⚡ Energi: -${e.deducted} (sisa ${e.sisa}/${e.max})` : `⚡ Energi: -${e.deducted} (sisa ${e.sisa})`)
            : `⚡ Energi: gratis`))
    : null;

  const body = [
    `Kamu: ${EMOJI[pilihan]} ${pilihan}`,
    `Bot: ${EMOJI[botPick]} ${botPick}`,
    ...(energiText ? [energiText] : []),
  ].join("\n");

  let text = "";
  if (result === "menang") {
    const expGain = 5 + Math.floor(Math.random() * 10);
    // FIX 8 Sep 2026: dulu addExpWithLevelCheck(m.sender, expGain, m) —
    // urutan argumen SALAH → EXP gak pernah kebayar. Sekalian 💵 uang.
    let cashRes = { gain: 0, saldo: 0 };
    try {
      const db = getDatabase();
      let user = db?.getUser(m.sender);
      if (db && !user) { db.setUser(m.sender); user = db.getUser(m.sender) || {}; }
      if (db && user) await addExpWithLevelCheck(m, m, db, user, expGain);
    } catch {}
    try { cashRes = rollBonus(m, "suit"); } catch {}
    text = `🎉 Kamu menang!\n\n` + boxMessage("◆ SUIT ◆", body + `\n✨ EXP: +${expGain}\n💵 Uang: +${formatRp(cashRes.gain)} (saldo ${formatRp(cashRes.saldo)})${cashRes.jackpot ? "\n🎰 JACKPOT! Bonus 3x uang!" : ""}`) + `\n\nYuk suit lagi kak, biar tanganmu makin sakti ✊🥳`;
  } else if (result === "kalah") {
    text = `😂 Kamu kalah!\n\n` + boxMessage("◆ SUIT ◆", body) + `\n\nYuk revans kak, pias balik ✊🥳`;
      } else {
    text = `🤝 Seri! Pilih lagi\n\n` + boxMessage("◆ SUIT ◆", body);
      }

  await m.reply(text);
}

export { pluginConfig as config, handler };
