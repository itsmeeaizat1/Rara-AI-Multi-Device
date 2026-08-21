// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import {
  getAllPlugins,
  getPluginInfo,
  getCategories,
  getCommandsByCategory,
} from "../../src/lib/nova-plugins.js";
import { callOnlineAI, DEFAULT_ENDPOINT } from "../../src/lib/nova-aihelp-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aihelp",
  alias: ["aihelp", "bantuanai", "aiassistant"],
  category: "ai",
  description: "Asisten offline/online untuk mencari fitur dan cara pakai command",
  usage: ".aihelp <pertanyaan> | .aihelp on/off",
  example: ".aihelp cara download tiktok",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function tokenize(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function matchScore(queryTokens, targetTokens) {
  let score = 0;
  for (const q of queryTokens) {
    for (const t of targetTokens) {
      if (t === q) score += 3;
      else if (t.startsWith(q) || q.startsWith(t)) score += 1;
    }
  }
  return score;
}

function buildCandidateTokens(plugin) {
  const cfg = plugin.config || {};
  const parts = [
    cfg.name,
    ...(cfg.alias || []),
    cfg.category,
    cfg.description,
    cfg.usage,
    cfg.example,
  ];
  return tokenize(parts.join(" "));
}

function findBestMatches(query, limit = 5) {
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];

  const plugins = getAllPlugins().filter((p) => p?.config?.isEnabled !== false);
  const scored = plugins
    .map((plugin) => {
      const tokens = buildCandidateTokens(plugin);
      const score = matchScore(queryTokens, tokens);
      return { plugin, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((item) => item.plugin);
}

function buildPluginInstructionCard(plugin, prefix) {
  const cfg = plugin.config || {};
  const name = cfg.name || "unknown";
  const alias = Array.isArray(cfg.alias) && cfg.alias.length
    ? cfg.alias.slice(0, 3).join(", ")
    : "-";
  const category = cfg.category || "uncategorized";
  const description = cfg.description || "Tidak ada deskripsi.";
  const usage = cfg.usage || "-";
  const example = cfg.example || "-";
  const owner = cfg.isOwner ? "Ya" : "Tidak";
  const premium = cfg.isPremium ? "Ya" : "Tidak";
  const group = cfg.isGroup ? "Ya" : "Tidak";
  const privateChat = cfg.isPrivate ? "Ya" : "Tidak";
  const cooldown = cfg.cooldown ?? 0;

  const steps = [];
  steps.push(`  ┊  ➶ Buka chat grup atau private`);
  steps.push(`  ┊  ➶ Ketik: *${usage}*`);
  if (example && example !== "-") {
    steps.push(`  ┊  ➶ Contoh: *${example}*`);
  }
  steps.push(`  ┊  ➶ Tunggu bot memproses...`);

  return claraWrap([
    `  ┊  ➶ Kategori: *${category}*`, `  ┊  ➶ Alias: *${alias}*`,
    `  ┊  ➶ Deskripsi: *${description}*`,
    ...steps,
    `  ┊  ➶ Owner only: *${owner}*`,
    `  ┊  ➶ Premium: *${premium}*`,
    `  ┊  ➶ Cooldown: *${cooldown}s*`,
  ]);
}

function buildNoResultHint(prefix) {
  const suggestions = [
    `Ketik ${prefix}menu untuk lihat semua kategori`,
    `Ketik ${prefix}allmenu untuk lihat semua command`,
    `Ketik ${prefix}daftar untuk lihat kategori`,
  ];
  return suggestions.join("\n");
}

const INTENT_RULES = [
  {
    keywords: ["download", "yt", "youtube", "tiktok", "spotify", "soundcloud", "facebook", "instagram", "twitter", "x", "terabox", "wallpaper", "sticker", "videy", "wink", "top", "toptop", "sfile"],
    response: (prefix) => `Gunakan command download sesuai platform:\n• YouTube: ${prefix}yt <link>\n• TikTok: ${prefix}tiktok <link>\n• Spotify: ${prefix}spotify <link>\n• Instagram: ${prefix}instagram <link>\n• Facebook: ${prefix}facebook <link>\n• Wallpaper: ${prefix}wallpaper <query>`,
  },
  {
    keywords: ["rpg", "game", "main", "petualangan", "battle", "boss", "gacha", "dungeon", "inventory", "equipment", "upgrade", "rank", "level"],
    response: (prefix) => `Bot ini punya sistem RPG lengkap:\n• ${prefix}rpgmenu - lihat menu RPG\n• ${prefix}daily - klaim hadiah harian\n• ${prefix}shop - beli item\n• ${prefix}inventory - lihat inventory\n• ${prefix}battle - melawan monster\n• ${prefix}boss - tantang boss`,
  },
  {
    keywords: ["menu", "daftar", "list", "command", "perintah", "cara pakai bot", "bantuan"],
    response: (prefix) => `Gunakan:\n• ${prefix}menu - menu utama\n• ${prefix}allmenu - semua command\n• ${prefix}daftar - daftar kategori\n• ${prefix}aihelp <pertanyaan> - cari fitur`,
  },
  {
    keywords: ["owner", "pemilik", "creator", "developer", "kontak owner"],
    response: (prefix) => `Info owner:\n• ${prefix}owner - lihat info owner\n• ${prefix}setbio - ganti bio bot (owner only)\n• ${prefix}setppbot - ganti foto bot (owner only)\n• ${prefix}bc - broadcast pesan (owner only)`,
  },
  {
    keywords: ["group", "grup", "admin", "antilink", "antidelete", "welcome", "goodbye", "tagall", "kickall", "mute", "ban", "warn"],
    response: (prefix) => `Fitur grup/admin:\n• ${prefix}antilink - anti link grup\n• ${prefix}antidelete - anti delete pesan\n• ${prefix}welcome - pesan welcome\n• ${prefix}tagall - tag semua member\n• ${prefix}groupinfo - info grup\n• ${prefix}antiraid - proteksi anti raid`,
  },
  {
    keywords: ["ai", "gpt", "chatbot", "simi", "tanya", "pertanyaan", "cerdas", "pintar"],
    response: (prefix) => `Fitur AI yang tersedia:\n• ${prefix}ai - tanya jawab AI\n• ${prefix}simi - chat dengan Simi\n• ${prefix}aihelp - bantuan fitur bot (offline)\n• ${prefix}ask - tanya apa saja`,
  },
  {
    keywords: ["transfer", "give", "trade", "bank", "deposit", "withdraw", "dompet", "uang", "koin", "gold", "balance"],
    response: (prefix) => `Fitur ekonomi:\n• ${prefix}balance - cek saldo\n• ${prefix}bank - rekening bank\n• ${prefix}transfer <jumlah> <@user> - kirim uang\n• ${prefix}give <jumlah> <@user> - beri uang\n• ${prefix}deposit - deposit ke bank\n• ${prefix}withdraw - tarik uang`,
  },
  {
    keywords: ["quote", "kata", "bijak", "motivasi", "quotes"],
    response: (prefix) => `Fitur kata-kata:\n• ${prefix}quote - quote acak\n• ${prefix}quotes - koleksi quotes\n• ${prefix}kata - kata-kata bijak\n• ${prefix}motivasi - quotes motivasi`,
  },
  {
    keywords: ["tebak", "game", "quiz", "soal", "math", "mtk", "matematika", "tanya jawab", "trivia"],
    response: (prefix) => `Fitur game/tebakan:\n• ${prefix}tebak - tebakan umum\n• ${prefix}mathquiz - quiz matematika\n• ${prefix}trivia - quiz trivia\n• ${prefix}tod - truth or dare\n• ${prefix}kuis - kuis umum\n• ${prefix}tebakgambar - tebak gambar`,
  },
  {
    keywords: ["translate", "terjemah", "tl", "trans", "artinya", "bahasa"],
    response: (prefix) => `Fitur bahasa:\n• ${prefix}translate <teks> - terjemahkan teks\n• ${prefix}tl <teks> - alias translate\n• ${prefix}kbbi <kata> - cari arti kata KBBI`,
  },
  {
    keywords: ["cuaca", "weather", "ramalan", "forecast", "suhu", "hujan"],
    response: (prefix) => `Fitur cuaca:\n• ${prefix}weather <kota> - cek cuaca\n• ${prefix}cuaca <kota> - alias weather\n• Contoh: ${prefix}weather Jakarta\n• Data dari Open-Meteo (gratis)`,
  },
  {
    keywords: ["kalkulator", "hitung", "calculator", "calc", "matematika"],
    response: (prefix) => `Fitur kalkulator:\n• ${prefix}calc <ekspresi> - hitung matematika\n• Contoh: ${prefix}calc 25 * 4 + 10\n• Contoh: ${prefix}calc (100 / 5) * 3`,
  },
  {
    keywords: ["qr", "qrcode", "barcode", "generateqr"],
    response: (prefix) => `Fitur QR:\n• ${prefix}qrcode <teks> - buat QR code\n• ${prefix}qr <teks> - alias qrcode\n• Contoh: ${prefix}qrcode https://google.com`,
  },
  {
    keywords: ["pendek", "shorturl", "short", "urlshort", "pendekin link"],
    response: (prefix) => `Fitur pendek URL:\n• ${prefix}short <link> - pendekkan URL\n• ${prefix}shorturl <link> - alias short\n• Contoh: ${prefix}short https://google.com`,
  },
];

function matchIntent(query) {
  const tokens = tokenize(query);
  let best = null;
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    const score = matchScore(tokens, rule.keywords);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }

  return bestScore > 0 ? best : null;
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = m.text?.trim() || "";
    const query = raw.replace(/^\.aihelp\s+/i, "").trim();

    const aiHelpConfig = botConfig.aiHelp || {};
    const mode = String(aiHelpConfig.mode || "offline").toLowerCase();
    const enabled = aiHelpConfig.enabled !== false;
    const apiKey = String(aiHelpConfig.apiKey || "");
    const apiEndpoint = String(aiHelpConfig.apiEndpoint || DEFAULT_ENDPOINT);
    const model = String(aiHelpConfig.model || "gpt-4o-mini");
    const systemPrompt = String(aiHelpConfig.systemPrompt || "Kamu adalah asisten bot WhatsApp yang membantu mencari fitur dan cara pakai command.");

    if (!enabled && !m.isOwner) {
      const text =
        claraWrap("AI Help", ["  ┊  ➶ Status: *Nonaktif*",
          "  ┊  ➶ Info: *AI Help sedang dimatikan oleh owner.*"].join("\n")) +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    const toggleArgs = raw.replace(/^\.aihelp\s+/i, "").trim().toLowerCase();
    if (toggleArgs === "on" || toggleArgs === "off") {
      if (!m.isOwner) {
        const text =
          claraWrap("Ditolak", ["  ┊  ➶ Status: *Ditolak*",
            "  ┊  ➶ Alasan: *Hanya owner yang bisa menyalakan/mematikan AI Help.*"].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      const newState = toggleArgs === "on";
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.enabled = newState;
      if (!botConfig.aiHelp.mode) botConfig.aiHelp.mode = "offline";

      const text =
        claraWrap("AI Help", [`  ┊  ➶ Mode: *${String(botConfig.aiHelp.mode || "offline").toUpperCase()}*`,
          `  ┊  ➶ Status: *${newState ? "ON" : "OFF"}*`,
          `  ┊  ➶ Pengaturan: *${prefix}aihelp mode online|offline*`].join("\n")) +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    const modeArgs = raw.replace(/^\.aihelp\s+/i, "").trim().toLowerCase();
    if (modeArgs === "mode online" || modeArgs === "mode offline") {
      if (!m.isOwner) {
        const text =
          claraWrap("Ditolak", ["  ┊  ➶ Status: *Ditolak*",
            "  ┊  ➶ Alasan: *Hanya owner yang bisa mengganti mode AI Help.*"].join("\n")) +
          "\n" ;

        await m.reply(text);
        return { handled: true };
      }

      const newMode = modeArgs.replace("mode ", "");
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.mode = newMode;

      const text =
        claraWrap("Mode AI Help", [`  ┊  ➶ Mode: *${newMode.toUpperCase()}*`,
          `  ┊  ➶ API Key: *${apiKey ? "Terpasang" : "Kosong"}*`,
          `  ┊  ➶ Endpoint: *${apiEndpoint || DEFAULT_ENDPOINT}*`,
          `  ┊  ➶ Model: *${model}*`].join("\n")) +
        "\n" ;

      await m.reply(text);
      return { handled: true };
    }

    if (!query) {
      const helpCard = claraWrap("Ai Help", [`  ┊  ➶ Mode: *${mode.toUpperCase()}*`, `  ┊  ➶ Status: *${enabled ? "ON" : "OFF"}*`, `  ┊  ➶ Ketik ${prefix}aihelp <pertanyaan>`, `  ┊  ➶ Contoh: ${prefix}aihelp cara download tiktok`, `  ┊  ➶ Owner: ${prefix}aihelp on/off`, `  ┊  ➶ Owner: ${prefix}aihelp mode online/offline`].join("\n"));

      const text = claraWrap("Asisten Fitur", "🤖") + helpCard;

      await sendReplyWithNav(sock, m, text, "aihelp");
      return { handled: true };
    }

    if (mode === "online" && enabled) {
      const onlineResult = await callOnlineAI({
        prompt: query,
        apiKey,
        endpoint: apiEndpoint,
        model,
        systemPrompt,
      });

      if (onlineResult.ok) {
        const card = claraWrap("Online", [`  ┊  ➶ Pertanyaan: *${query}*`, ``, ...onlineResult.text.split("\n").map((line) => `┃ ${line}`)].join("\n"));

        const text = claraWrap("Online AI", "🤖") + card + "\n";

        await m.reply(text);
        return { handled: true };
      }

      const text = claraWrap("Fallback", [`  ┊  ➶ Alasan: *${onlineResult.reason || "unknown"}*`, "  ┊  ➶ Status: *Menggunakan offline match*"].join("\n")) + "\nMaaf, AI online sedang tidak dapat diakses. Saya bantu pakai mode offline dulu ya.";

      await m.reply(text);
    }

    const matchedIntent = matchIntent(query);

    if (matchedIntent) {
      const intentText = matchedIntent.response(prefix);
      const card = claraWrap("InꜱTrukꜱI", [`  ┊  ➶ Pertanyaan: *${query}*`, `  ┊  ➶ Kategori: *${("intent match")}*`, ``, ...intentText.split("\n").map((line) => `┃ ${line}`)].join("\n"));

      const text = claraWrap("Instruksi", "📋") + card + "\n";

      await m.reply(text);
      return { handled: true };
    }

    const matches = findBestMatches(query, 5);

    let text = "";

    if (matches.length === 0) {
      text += claraWrap("Pencarian",
        `Status: *Tidak ditemukan*\n` +
        `Query: *${query}*\n` +
        `Saran: *Coba kata kunci lain / lebih spesifik*`,
        "error"
      );
    } else {
      for (const plugin of matches) {
        text += buildPluginInstructionCard(plugin, prefix) + "\n\n";
      }
    }

    await m.reply(claraWrap(`Hasil: ${query}`, text));
  } catch (error) {
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n"),
      "error"
    );

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
