// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "flashcard",
  alias: ["kartubelajar", "flashcards", "kartu", "quizdiri"],
  category: "education",
  description: "Flashcard study tool - buat kartu belajar, quiz diri sendiri",
  usage: ".flashcard <command>",
  example: ".flashcard create",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 3,
  energi: 1,
  isEnabled: true,
};

// Store: sender -> { decks: { name: [{ q, a }] }, activeDeck, quiz: { idx, order, correct, total } }
const userStore = new Map();

function getUser(sender) {
  if (!userStore.has(sender)) userStore.set(sender, { decks: {}, activeDeck: null, quiz: null, createSession: null });
  return userStore.get(sender);
}

async function handler(m, { sock, args }) {
  const sender = m.sender;
  const cmd = (args[0] || "").toLowerCase();
  const cmdArgs = args.slice(1);
  const user = getUser(sender);

  if (!cmd || cmd === "help" || cmd === "menu") {
    let txt = `Flashcard Study Tool\n\n`;
    txt += `Perintah:\n`;
    txt += `1. \`${m.prefix}flashcard create <nama deck>\` - Buat deck baru (input interaktif)\n`;
    txt += `2. \`${m.prefix}flashcard add <nama deck> | <pertanyaan> | <jawaban>\` - Tambah kartu\n`;
    txt += `3. \`${m.prefix}flashcard list\` - Lihat semua deck\n`;
    txt += `4. \`${m.prefix}flashcard show <nama deck>\` - Lihat isi deck\n`;
    txt += `5. \`${m.prefix}flashcard quiz <nama deck>\` - Mulai quiz\n`;
    txt += `6. \`${m.prefix}flashcard del <nama deck>\` - Hapus deck\n`;
    txt += `7. \`${m.prefix}flashcard delcard <nama deck> <nomor>\` - Hapus 1 kartu\n\n`;
    txt += `Saat quiz: balas *A*, *B*, *C*, dst atau ketik *flip* untuk lihat jawaban\n`;
    txt += `Ketik *stop* untuk berhenti quiz`;
    return await sendReplyWithNav(m, sock, txt, { commandName: "flashcard" });
  }

  await m.react("🕐");

  try {
    // === CREATE (interactive) ===
    if (cmd === "create" || cmd === "buat") {
      const deckName = cmdArgs.join(" ").trim().toLowerCase();

      if (!user.decks[deckName]) user.decks[deckName] = [];
      user.createSession = { deckName, count: 0 };
      user.activeDeck = deckName;

      let txt = `Deck "${deckName}" dibuat!\n\n`;
      txt += `Kirim kartu dengan format:\n`;
      txt += `<pertanyaan> | <jawaban>\n\n`;
      txt += `Contoh: \`Apa ibukota Indonesia? | Jakarta\`\n\n`;
      txt += `Ketik *done* untuk selesai\n`;
      txt += `Ketik *cancel* untuk batal`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === ADD (one-liner) ===
    else if (cmd === "add" || cmd === "tambah") {
      const input = cmdArgs.join(" ");
      const parts = input.split("|").map(s => s.trim());
      if (parts.length < 3) {
        return m.reply(claraWrap("flashcard", "Format salah!\n\nContoh: `.flashcard add Biologi | Apa fungsi jantung? | Memompa darah`\n\nFormat: <nama deck> | <pertanyaan> | <jawaban>"));
      }
      const deckName = parts[0].toLowerCase();
      const q = parts[1];
      const a = parts[2];

      if (!user.decks[deckName]) user.decks[deckName] = [];
      user.decks[deckName].push({ q, a });
      user.activeDeck = deckName;

      await m.reply(claraWrap("Flashcard", `Kartu ditambahkan ke deck "${deckName}"!\n\nQ: ${q}\nA: ${a}\n\nTotal kartu: ${user.decks[deckName].length}`));
      await m.react("✅");
    }

    // === LIST DECKS ===
    else if (cmd === "list" || cmd === "decks" || cmd === "daftar") {
      const deckNames = Object.keys(user.decks);
      if (deckNames.length === 0) {
        return m.reply(claraWrap("flashcard", "Belum ada deck. Ketik `.flashcard create <nama>` untuk buat."));
      }
      let txt = `Daftar Deck Flashcard\n\n`;
      for (let i = 0; i < deckNames.length; i++) {
        const name = deckNames[i];
        const count = user.decks[name].length;
        txt += `${i + 1}. ${name} (${count} kartu)\n`;
      }
      txt += `\nKetik \`${m.prefix}flashcard quiz <nama deck>\` untuk mulai quiz`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === SHOW DECK ===
    else if (cmd === "show" || cmd === "lihat" || cmd === "isi") {
      const deckName = cmdArgs.join(" ").trim().toLowerCase();
      const deck = user.decks[deckName];

      let txt = `Deck: ${deckName} (${deck.length} kartu)\n\n`;
      for (let i = 0; i < deck.length; i++) {
        txt += `${i + 1}. Q: ${deck[i].q}\n   A: ${deck[i].a}\n\n`;
      }
      await m.reply(txt);
      await m.react("✅");
    }

    // === QUIZ ===
    else if (cmd === "quiz" || cmd === "start" || cmd === "mulai") {
      const deckName = cmdArgs.join(" ").trim().toLowerCase();
      const deck = user.decks[deckName];

      // Shuffle order
      const order = [...Array(deck.length).keys()].sort(() => Math.random() - 0.5);
      user.quiz = { deckName, order, idx: 0, correct: 0, total: deck.length, flipped: false, shown: false };

      const firstCard = deck[order[0]];
      let txt = `Quiz: ${deckName}\n\n`;
      txt += `> ${deck.length} kartu - ketik *flip* untuk jawaban\n\n`;
      txt += `Kartu 1/${deck.length}\n\n`;
      txt += `Q: ${firstCard.q}\n\n`;
      txt += `Balas:\n`;
      txt += `*flip* - lihat jawaban\n`;
      txt += `*benar* - aku tahu jawabannya\n`;
      txt += `*salah* - aku tidak tahu\n`;
      txt += `*stop* - berhenti quiz`;
      await m.reply(txt);
      await m.react("✅");
    }

    // === DELETE DECK ===
    else if (cmd === "del" || cmd === "hapus") {
      const deckName = cmdArgs.join(" ").trim().toLowerCase();
      delete user.decks[deckName];
      await m.reply(claraWrap("Flashcard", `Deck "${deckName}" dihapus!`));
      await m.react("✅");
    }

    // === DELETE CARD ===
    else if (cmd === "delcard" || cmd === "hapuskartu") {
      const deckName = cmdArgs[0]?.toLowerCase();
      const cardNum = parseInt(cmdArgs[1]);
      const deck = user.decks[deckName];
      const removed = deck.splice(cardNum - 1, 1)[0];
      await m.reply(claraWrap("Flashcard", `Kartu dihapus!\n\nQ: ${removed.q}`));
      await m.react("✅");
    }

    // === CLEAR ALL ===
    else if (cmd === "clear" || cmd === "reset") {
      userStore.set(sender, { decks: {}, activeDeck: null, quiz: null, createSession: null });
      await m.reply(claraWrap("Flashcard", "Semua deck flashcard dihapus!"));
      await m.react("✅");
    }

    else {
      await m.reply(`Perintah tidak ditemukan!\n\nKetik \`${m.prefix}flashcard help\` untuk bantuan.`);
    }
  } catch (e) {
    console.error("[FLASHCARD] Error:", e.message);
    await m.reply(claraWrap("flashcard", `Error: ${e.message}`));
  }
}

export { pluginConfig as config, handler };
