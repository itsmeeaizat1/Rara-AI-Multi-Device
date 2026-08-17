// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { UnlimitedAI } from "../../src/scraper/unlimitedai.js";
import { getPlugin } from "../../src/lib/nova-plugins.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "ai",
  alias: ["assistant", "novaassistant", "assistantv2"],
  category: "ai",
  description: "AI asisten yang bisa menangani semua perintah dengan bahasa natural",
  usage: ".ai <perintah natural>",
  example: ".ai tutup grup",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

// ============================================================
// INTENT MAPPING — maps natural language to bot commands
// ============================================================
const INTENT_MAP = [
  // === GROUP MANAGEMENT ===
  {
    keywords: ["tutup grup", "tutup group", "close grup", "close group", "close gc", "tutup gc", "kunci grup", "kunci group", "grup tutup", "group close", "lock group", "lock grup"],
    command: "close",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
  },
  {
    keywords: ["buka grup", "buka group", "open grup", "open group", "open gc", "buka gc", "buka kunci grup", "grup buka", "group open", "unlock group", "unlock grup"],
    command: "open",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
  },
  {
    keywords: ["kick", "tendang", "keluarkan", "kluarkan", "buang", "keluarin", "remove member", "kick member"],
    command: "kick",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsMention: true,
  },
  {
    keywords: ["promote", "jadiin admin", "jadikan admin", "naikin admin", "naikan admin", "promote member", "adminin"],
    command: "promote",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsMention: true,
  },
  {
    keywords: ["demote", "cabut admin", "hapus admin", "turunin admin", "turunkan admin", "lepas admin", "buang admin"],
    command: "demote",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsMention: true,
  },
  {
    keywords: ["tagall", "tag semua", "tag all", "panggil semua", "panggil all", "mention semua", "mention all", "tag member", "tag semua member"],
    command: "tagall",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: false,
    needsText: true,
  },
  {
    keywords: ["link grup", "link group", "link gc", "linkgc", "link grupnya", "link invite", "invite link", "bagikan link grup", "kirim link grup"],
    command: "linkgc",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
  },
  {
    keywords: ["ganti nama grup", "ganti nama group", "ubah nama grup", "ubah nama group", "ganti name gc", "setname grup", "setnamegc", "ganti namagrup", "rename grup", "rename group", "ubah nama gc", "ganti nama gc"],
    command: "setnamegc",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  {
    keywords: ["ganti deskripsi grup", "ubah deskripsi grup", "ganti deskripsi group", "ganti desc grup", "ganti desc gc", "setdesc grup", "setdeskgc", "ubah deskripsi group", "ubah desc grup", "ganti deskripsi gc"],
    command: "setdeskgc",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  {
    keywords: ["mute grup", "mute group", "mute gc", "matiin bot di grup", "matikan bot di grup", "block bot grup", "bot diam", "diam bot", "mute bot grup"],
    command: "mutegc",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: false,
  },
  {
    keywords: ["unmute grup", "unmute group", "unmute gc", "nyalain bot di grup", "nyalakan bot di grup", "unblock bot grup", "bot aktif grup", "unmute bot grup"],
    command: "unmutegc",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: false,
  },
  {
    keywords: ["info grup", "info group", "groupinfo", "grup info", "cek grup", "data grup", "detail grup", "info gc"],
    command: "groupinfo",
    needsGroup: true,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  {
    keywords: ["list admin", "cek admin", "admin grup", "admin group", "siapa admin", "daftar admin", "listadmin"],
    command: "listadmin",
    needsGroup: true,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  {
    keywords: ["cek online", "siapa online", "list online", "yang online", "member online", "online grup"],
    command: "cekonline",
    needsGroup: true,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  // === GENERAL INFO ===
  {
    keywords: ["menu", "allmenu", "daftar menu", "daftar fitur", "list fitur", "list command", "apa aja fiturnya", "fitur bot", "command bot", "bantuan", "help"],
    command: "allmenu",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  {
    keywords: ["ping", "cek ping", "bot hidup", "bot online", "bot aktif", "cekspeed", "speed bot"],
    command: "ping",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  {
    keywords: ["stats", "statistik bot", "info bot", "statistik", "data bot", "bot stats"],
    command: "stats",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  // === OWNER ===
  {
    keywords: ["add premium", "tambah premium", "jadiin premium", "jadikan premium", "addprem", "prem member", "buat premium"],
    command: "addprem",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
    needsMention: true,
    needsOwner: true,
  },
  {
    keywords: ["hapus premium", "del premium", "delprem", "cabut premium", "buang premium", "stop premium"],
    command: "delprem",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
    needsMention: true,
    needsOwner: true,
  },
  {
    keywords: ["total fitur", "jumlah fitur", "berapa fitur", "hitung fitur"],
    command: "totalfitur",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  {
    keywords: ["donasi", "donate", "support bot", "dukung bot"],
    command: "donasi",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },  // === AFK ===
  {
    keywords: ["afk", "away from keyboard", "brb", "mau pergi", "aku pergi", "offline dulu", "maaf aku pergi"],
    command: "afk",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
    needsText: true,
  },
  // === POLL ===
  {
    keywords: ["polling", "voting", "vote", "survei", "buat poll", "buat voting", "buat survei"],
    command: "poll",
    needsGroup: true,
    needsAdmin: false,
    needsBotAdmin: false,
    needsText: true,
  },
  // === WELCOME ===
  {
    keywords: ["welcome", "sambutan", "set welcome", "atur sambutan", "welcome message", "pesan sambutan"],
    command: "setwelcome",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === GOODBYE ===
  {
    keywords: ["goodbye", "leave message", "set goodbye", "atur goodbye", "pesan perpisahan", "set leave"],
    command: "setgoodbye",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === RULES ===
  {
    keywords: ["atur rules grup", "set rules grup", "set rules", "atur rules", "rules grup", "peraturan grup", "setrulesgrup", "setrules"],
    command: "setrulesgrup",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === ANTILINK ===
  {
    keywords: ["antilink", "anti link", "aktifin antilink", "nyalain antilink", "block link", "larang link"],
    command: "addantilink",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === ANTITOXIC ===
  {
    keywords: ["antitoxic", "anti toxic", "anti kata kasar", "block toxic", "larang kata kasar", "aktifin antitoxic"],
    command: "addtoxic",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === HIDETAG ===
  {
    keywords: ["hidetag", "ht", "hide tag", "tag sembunyi", "tag hidden"],
    command: "hidetag2",
    needsGroup: true,
    needsAdmin: true,
    needsBotAdmin: true,
    needsText: true,
  },
  // === STICKER ===
  {
    keywords: ["sticker", "stiker", "buat sticker", "buat stiker", "convert sticker", "jadikan sticker"],
    command: "sticker",
    needsGroup: false,
    needsAdmin: false,
    needsBotAdmin: false,
  },
  // === CEK ID ===
  {
    keywords: ["cek id grup", "cekidgc", "id grup", "group id", "cek id group", "cekid"],
    command: "cekidgc",
    needsGroup: true,
    needsAdmin: false,
    needsBotAdmin: false,
  },

];

// ============================================================
// HELPER: Extract text after intent keywords
// ============================================================
function extractTextAfterKeyword(input, keywords) {
  for (const kw of keywords) {
    const idx = input.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      let after = input.slice(idx + kw.length).trim();
      // Remove leading connector words
      after = after.replace(/^(jadi|ke|jadi ke|to|menjadi|menjadi ke)\s+/i, "").trim();
      if (after) return after;
    }
  }
  return null;
}

// ============================================================
// HELPER: Match intent from natural language
// ============================================================
function matchIntent(input) {
  const lower = input.toLowerCase().trim();

  // Sort by keyword length (longest first) for more specific matches
  const sorted = [...INTENT_MAP].sort((a, b) => {
    const aMaxLen = Math.max(...a.keywords.map(k => k.length));
    const bMaxLen = Math.max(...b.keywords.map(k => k.length));
    return bMaxLen - aMaxLen;
  });

  for (const intent of sorted) {
    for (const keyword of intent.keywords) {
      if (lower.includes(keyword)) {
        return intent;
      }
    }
  }
  return null;
}

// ============================================================
// HELPER: Check permissions before executing
// ============================================================
function checkAssistantPermission(m, intent, userInput) {
  if (intent.needsOwner && !m.isOwner) {
    return { allowed: false, reason: "Perintah ini hanya untuk *owner bot*." };
  }
  if (intent.needsGroup && !m.isGroup) {
    return { allowed: false, reason: "Perintah ini hanya bisa dipakai di *grup*." };
  }
  if (intent.needsAdmin && !m.isAdmin && !m.isOwner) {
    return { allowed: false, reason: "Perintah ini hanya untuk *admin grup*." };
  }
  if (intent.needsBotAdmin && !m.isBotAdmin && !m.isOwner) {
    return { allowed: false, reason: "Bot harus jadi *admin* untuk perintah ini." };
  }
  if (intent.needsMention && !m.mentionedJid?.length && !m.quoted) {
    return { allowed: false, reason: "Tag user atau reply pesan user yang mau ditindak." };
  }
  if (intent.needsText) {
    const text = extractTextAfterKeyword(userInput, intent.keywords);
    if (!text) {
      return { allowed: false, reason: "Masukkan teksnya. Contoh: *.ai ganti nama grup jadi Grup Keren*" };
    }
  }
  return { allowed: true };
}

// ============================================================
// MAIN HANDLER
// ============================================================
async function handler(m, { sock }) {
  const userInput = m.args.join(" ").trim();

  if (!userInput) {
    return sendReplyWithNav(sock, m, `🤖 *Nova Assistant*\n\n` +
      `Aku bisa bantu kamu ngendaliin bot pakai bahasa natural.\n\n` +
      `*GRUP:*\n` +
      `.ai tutup grup / buka grup\n` +
      `.ai kick @user / promote @user\n` +
      `.ai tagall info meeting\n` +
      `.ai ganti nama grup jadi Grup Keren\n` +
      `.ai link grup / info grup\n` +
      `.ai mute grup / unmute grup\n` +
      `.ai hidetag pengumuman\n` +
      `.ai antilink / antitoxic\n\n` +
      `*UMUM:*\n` +
      `.ai menu / ping / stats\n` +
      `.ai afk lagi makan\n` +
      `.ai polling Makan apa? | Nasi, Mie, Bakso\n` +
      `.ai sticker (reply gambar)\n\n` +
      `*Tanya apapun:*\n` +
      `.ai Apa itu AI?\n` +
      `.ai Cerita lucu dong\n\n` +
      `Tinggal ketik apa yang kamu mau, aku yang eksekusi!`, "ai");
  }

  await m.react("🕐");

  // Step 1: Try local intent matching (fast, no API)
  const intent = matchIntent(userInput);

  if (intent) {
    // Check permissions
    const perm = checkAssistantPermission(m, intent, userInput);
    if (!perm.allowed) {
      return m.reply(claraWrap("Ai", `❌ ${perm.reason}`));
    }

    // Get the plugin
    const plugin = getPlugin(intent.command);
    if (!plugin) {
      return m.reply(claraWrap("Ai", `❌ Command *${intent.command}* tidak ditemukan di bot.`));
    }

    // Override m.command, m.args, m.text for the target plugin
    const originalCommand = m.command;
    const originalArgs = m.args;
    const originalText = m.text;

    m.command = intent.command;
    m.prefix = m.prefix || ".";

    // Handle text extraction for commands that need text args
    if (intent.needsText) {
      const extractedText = extractTextAfterKeyword(userInput, intent.keywords);
      m.args = extractedText ? extractedText.split(" ") : [];
      m.text = extractedText || "";
    } else if (intent.command === "tagall") {
      const tagallText = extractTextAfterKeyword(userInput, intent.keywords);
      m.args = tagallText ? tagallText.split(" ") : ["Tag", "All", "Members"];
      m.text = tagallText || "Tag All Members";
    } else {
      m.args = [];
      m.text = "";
    }

    try {
      // Execute the plugin handler
      await plugin.handler(m, { sock, conn: sock });

      // Restore original m properties
      m.command = originalCommand;
      m.args = originalArgs;
      m.text = originalText;

      await m.react("✅");
    } catch (error) {
      // Restore original m properties
      m.command = originalCommand;
      m.args = originalArgs;
      m.text = originalText;

      await m.reply(claraWrap("Gagal eksekusi", `❌ *Gagal eksekusi*\n\n` +
        `Command: *${intent.command}*\n` +
        `Error: _${error.message}_`));
    }
    return;
  }

  // Step 2: No local match — use AI for general conversation
  try {
    const systemPrompt = `Kamu adalah Nova Assistant, AI asisten untuk WhatsApp bot. Kamu menjawab dalam bahasa Indonesia dengan gaya santai, ramah, dan membantu. Jawab singkat dan jelas. Jika user bertanya hal yang berhubungan dengan mengatur grup/kick/promote/dll, arahkan mereka untuk pakai format .ai <perintah>. Contoh: ".ai tutup grup" untuk menutup grup, ".ai kick @user" untuk mengeluarkan member.`;

    const result = await UnlimitedAI(
      `Pertanyaan: ${userInput}\n\nInstruksi sistem: ${systemPrompt}`,
      "nova-ai"
    );

    if (!result.status) {
      { const __navText = `❌ AI lagi bermasalah. Coba lagi nanti ya.`; return await m.reply(__navText); };
    }

    await m.react("✅");
    const reply = result.answer;
    await m.reply(reply.length > 4096 ? reply.slice(0, 4096) + "..." : reply);
  } catch (e) {
    console.error(e);
    await m.reply(claraWrap(".ai menu", `❌ Maaf, aku gak bisa nangani perintah itu sekarang.\n\n` +
      `Coba ketik *.ai menu* untuk lihat semua yang aku bisa lakukan.`));
  }
}

export { pluginConfig as config, handler };
