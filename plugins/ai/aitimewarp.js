// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "aitimewarp",
  alias: ["aitimewarp", "timewarp"],
  category: "ai",
  description: "Mode Chat Lintas Waktu — AI roleplay dari masa depan/lalu",
  usage: ".timewarp <tahun/era> [pertanyaan] | .timewarp off | .timewarp status",
  example: ".timewarp 2035 | .timewarp 2035 apa itu ikan koi?",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ════ Session storage (per-user, persistent mode) ════
// Key: sender JID -> { era, label, systemPrompt, active, startedAt, messageCount }
const warpSessions = new Map();

// ════ One-shot storage (per-user, single message) ════
// Key: sender JID -> systemPrompt string (consumed by callAI once)
const oneShotPrompts = new Map();

/**
 * Parse user input into a temporal era descriptor.
 * Supports: years (2035), relative (5tahun-depan, 10-tahun-lalu),
 *           era names (zaman-batik, era-colonial, future-utopia)
 */
function parseEra(input) {
  const text = input.trim().toLowerCase().replace(/[-_]/g, " ");

  // Relative future: "5 tahun ke depan", "5 tahun depan", "5tahun ke depan"
  let m = text.match(/(\d+)\s*tahun\s*(?:ke\s*)?depan/);
  if (m) {
    const years = parseInt(m[1], 10);
    const targetYear = new Date().getFullYear() + years;
    return { era: "future", label: `${years} tahun ke depan (${targetYear})`, targetYear };
  }

  // Relative past: "10 tahun lalu", "10 tahun yang lalu"
  m = text.match(/(\d+)\s*tahun\s*(?:yang\s*)?lalu/);
  if (m) {
    const years = parseInt(m[1], 10);
    const targetYear = new Date().getFullYear() - years;
    return { era: "past", label: `${years} tahun yang lalu (${targetYear})`, targetYear };
  }

  // Absolute year: "2035", "1990"
  m = text.match(/^(\d{3,4})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const currentYear = new Date().getFullYear();
    return { era: year > currentYear ? "future" : "past", label: `Tahun ${year}`, targetYear: year };
  }

  // Era keywords
  const eraMap = {
    "zaman batu": { era: "past", label: "Zaman Batu", targetYear: -10000 },
    "zaman kolonial": { era: "past", label: "Zaman Kolonial Belanda", targetYear: 1920 },
    "era colonial": { era: "past", label: "Era Kolonial", targetYear: 1920 },
    "era perang": { era: "past", label: "Era Perang Dunia", targetYear: 1942 },
    "zaman orba": { era: "past", label: "Zaman Orde Baru", targetYear: 1985 },
    "zaman reformasi": { era: "past", label: "Zaman Reformasi", targetYear: 1999 },
    "era 90an": { era: "past", label: "Era 90an", targetYear: 1995 },
    "era 2000an": { era: "past", label: "Era 2000an", targetYear: 2005 },
    "masa depan": { era: "future", label: "Masa Depan Jauh", targetYear: 2050 },
    "future utopia": { era: "future", label: "Future Utopia", targetYear: 2050 },
    "post apocalyptic": { era: "future", label: "Post-Apocalyptic", targetYear: 2080 },
    "post apokaliptik": { era: "future", label: "Post-Apokaliptik", targetYear: 2080 },
    "mars colony": { era: "future", label: "Koloni Mars", targetYear: 2070 },
    "koloni mars": { era: "future", label: "Koloni Mars", targetYear: 2070 },
  };

  for (const [key, val] of Object.entries(eraMap)) {
    if (text.includes(key)) return val;
  }

  return { era: "custom", label: input.trim(), targetYear: null };
}

/**
 * Build the system prompt for the temporal persona.
 */
function buildTemporalPrompt(session, senderName) {
  const { era, label, targetYear } = session;
  const currentYear = new Date().getFullYear();

  let prompt = `\n\n[TIME-WARP MODE — AKTIF]\n`;
  prompt += `Kamu sedang dalam mode roleplay lintas waktu. Kamu BUKAN AI biasa. Kamu adalah entitas dari "${label}".\n`;

  if (era === "future") {
    const diff = targetYear - currentYear;
    prompt += `\nKONTEKS TEMPORAL:\n`;
    prompt += `- Kamu berada di tahun ${targetYear}, ${diff} tahun dari sekarang.\n`;
    prompt += `- Kamu sudah mengalami periode ${currentYear}-${targetYear}.\n`;
    prompt += `- Bicaralah seolah kamu sudah hidup di masa depan tersebut.\n`;
    prompt += `- Kamu bisa menyebutkan "peristiwa masa depan" yang terjadi antara ${currentYear} dan ${targetYear} (bikinlah realistis, konsisten, dan dramatis).\n`;
    prompt += `- Kamu tahu teknologi, budaya, dan kondisi dunia di tahun ${targetYear}.\n`;
    prompt += `- Jika user bertanya tentang masa kini (${currentYear}), anggap itu masa LALU bagimu. Bicaralah seperti orang yang mengenang masa lalu.\n`;
    prompt += `- Gunakan referensi teknologi masa depan yang masuk akal (AI canggih, kendaraan terbang, koloni luar angkasa, dll sesuai tahun).\n`;
    prompt += `- Tetap konsisten dengan timeline. Jangan kontradiksi dengan jawaban sebelumnya.\n`;
  } else if (era === "past") {
    const diff = currentYear - (targetYear > 0 ? targetYear : 0);
    prompt += `\nKONTEKS TEMPORAL:\n`;
    prompt += `- Kamu berada di "${label}".\n`;
    if (targetYear > 0) {
      prompt += `- Tahun: ${targetYear}, ${diff} tahun yang lalu dari sekarang.\n`;
    }
    prompt += `- Kamu TIDAK tahu teknologi modern. Sesuaikan bahasa dan referensimu dengan era tersebut.\n`;
    prompt += `- Jika user bertanya tentang masa kini (${currentYear}), anggap itu masa DEPAN bagimu. Kamu belum mengalaminya.\n`;
    prompt += `- Gunakan bahasa yang sesuai era: pilihan kata, sapaan, dan referensi budaya harus konsisten.\n`;
    prompt += `- Jika ada peristiwa sejarah yang terjadi setelah era-mu, jangan spoiler. Kamu belum tahu.\n`;
    prompt += `- Tetap konsisten dengan timeline. Jangan kontradiksi dengan jawaban sebelumnya.\n`;
  } else {
    prompt += `\nKONTEKS TEMPORAL:\n`;
    prompt += `- Kamu berada di "${label}".\n`;
    prompt += `- Sesuaikan persona, bahasa, dan referensi dengan era tersebut.\n`;
    prompt += `- Tetap konsisten dengan timeline. Jangan kontradiksi dengan jawaban sebelumnya.\n`;
  }

  prompt += `\nATURAN ROLEPLAY:\n`;
  prompt += `- JANGAN pernah mengaku sebagai AI atau bot. Kamu adalah orang nyata dari era tersebut.\n`;
  prompt += `- JANGAN pernah keluar dari karakter. Tetap di persona temporal-mu.\n`;
  prompt += `- Kalau user bertanya "kamu siapa", jawab dengan identitas yang konsisten dengan era-mu.\n`;
  prompt += `- Bicaralah dengan emosi dan kepribadian, bukan seperti mesin.\n`;
  prompt += `- Kalau user bilang "kembali ke normal" atau "timewarp off", tetap di karakter dan anggap itu bagian dari obrolan.\n`;
  prompt += `- Gunakan bahasa Indonesia yang sesuai era. Untuk masa depan, boleh ada istilah teknologi fiktif. Untuk masa lalu, gunakan bahasa lebih formal/kuno.\n`;
  prompt += `- Ingat kebiasaan user (nama, gaya bicara) dan incorporate ke dalam roleplay.\n`;
  prompt += `- Jawab dengan panjang sedang (2-5 kalimat). Jangan terlalu panjang, tapi cukup untuk membangun atmosfer.\n`;
  prompt += `- Nama user yang sedang chat: ${senderName || "seseorang"}\n`;
  prompt += `[/TIME-WARP MODE]\n`;

  return prompt;
}

/**
 * Get the time-warp system prompt for a sender (called by callAI).
 * Checks persistent session first, then one-shot.
 */
export function getTimewarpPrompt(sender) {
  // Check persistent session
  const session = warpSessions.get(sender);
  if (session && session.active) {
    session.messageCount++;
    return session.systemPrompt;
  }
  // Check one-shot
  const oneShot = oneShotPrompts.get(sender);
  if (oneShot) {
    oneShotPrompts.delete(sender); // Consume one-shot
    return oneShot;
  }
  return null;
}

/**
 * Check if a sender has an active time-warp session.
 */
export function isTimewarpActive(sender) {
  const session = warpSessions.get(sender);
  return session && session.active;
}

/**
 * Get session info for status display.
 */
export function getTimewarpSession(sender) {
  return warpSessions.get(sender) || null;
}

/**
 * Check if sender already has a persistent session (for non-owner gate).
 */
export function hasPersistentSession(sender) {
  const session = warpSessions.get(sender);
  return session && session.active;
}

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const sender = m.sender;
  const isOwner = m.isOwner;

  // ════ OFF — exit time-warp mode (OWNER ONLY)
  if (sub === "off" || sub === "stop" || sub === "keluar" || sub === "exit") {
    if (!isOwner) {
      await m.reply(claraWrap("Time-Warp", "Off hanya bisa dipakai owner."), "aitimewarp");
      return { handled: true };
    }
    const session = warpSessions.get(sender);
    if (!session || !session.active) {
      await m.reply(claraWrap("Time-Warp", "Kamu gak lagi dalam mode lintas waktu."), "aitimewarp");
      return { handled: true };
    }
    warpSessions.delete(sender);
    await m.reply( claraWrap("Time-Warp", [
      "Mode lintas waktu dinonaktifkan.",
      "",
      "Kamu kembali ke realitas normal.",
      "Semua persona temporal telah direset.",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ STATUS — check current session (ALL USERS)
  if (sub === "status" || sub === "info") {
    const session = warpSessions.get(sender);
    if (!session || !session.active) {
      await m.reply( claraWrap("Time-Warp", [
        "Status: TIDAK AKTIF",
        "",
        "Kamu lagi di realitas normal.",
        "",
        "Cara pakai:",
        prefix + "timewarp <tahun/era> — one-shot (semua user)",
        prefix + "timewarp <tahun/era> on — persistent (owner)",
        "",
        "Contoh one-shot:",
        prefix + "timewarp 2035 apa itu ikan koi?",
        prefix + "timewarp 1990 gimana sekolah dulu?",
      ].join("\n")), "aitimewarp");
      return { handled: true };
    }
    const duration = Math.floor((Date.now() - session.startedAt) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    await m.reply( claraWrap("Time-Warp", [
      "Status: AKTIF (persistent)",
      "",
      "Era: " + session.label,
      "Tipe: " + session.era.toUpperCase(),
      "Pesan dalam mode: " + session.messageCount,
      "Durasi: " + mins + "m " + secs + "s",
      "",
      "Ketik " + prefix + "timewarp off untuk kembali normal",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ LIST — show available era presets (ALL USERS)
  if (sub === "list" || sub === "preset" || sub === "era") {
    await m.reply( claraWrap("Time-Warp Preset", [
      "Era yang tersedia:",
      "",
      "MASA DEPAN:",
      "  2035, 2050, 2100",
      "  5tahun-depan, 10tahun-depan",
      "  masa-depan, koloni-mars, post-apokaliptik",
      "",
      "MASA LALU:",
      "  1990, 2000, 1965",
      "  10tahun-lalu, 20tahun-lalu",
      "  zaman-kolonial, era-90an, zaman-orba",
      "  zaman-reformasi, era-perang",
      "",
      "CUSTOM: ketik bebas, contoh:",
      "  " + prefix + "timewarp dimensi-paralel",
      "  " + prefix + "timewarp dunia-sebelum-perang",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ ON — activate persistent mode (OWNER ONLY)
  // Format: .timewarp <era> on
  // Detect "on" as last argument
  if (sub === "on" || sub === "start" || sub === "mulai") {
    if (!isOwner) {
      await m.reply(claraWrap("Time-Warp", "Mode persistent (on) hanya untuk owner."), "aitimewarp");
      return { handled: true };
    }
    // Re-parse: args[1] is "on", era is args[2]+
    const eraInput = args.slice(2).join(" ").trim();
    if (!eraInput) {
      await m.reply( claraWrap("Time-Warp", [
        "Format: " + prefix + "timewarp on <tahun/era>",
        "Contoh: " + prefix + "timewarp on 2035",
      ].join("\n")), "aitimewarp");
      return { handled: true };
    }
    const parsed = parseEra(eraInput);
    const senderName = m.pushName || m.senderNumber || "seseorang";
    const session = {
      era: parsed.era,
      label: parsed.label,
      targetYear: parsed.targetYear,
      active: true,
      startedAt: Date.now(),
      messageCount: 0,
      systemPrompt: "",
    };
    session.systemPrompt = buildTemporalPrompt(session, senderName);
    warpSessions.set(sender, session);

    await m.reply( claraWrap("Time-Warp", [
      "Persistent mode AKTIF",
      "",
      "Era: " + parsed.label,
      "Tipe: " + parsed.era.toUpperCase(),
      "",
      "Sekarang semua chat biasa ke bot akan",
      "dijawab dengan persona dari era ini.",
      "Bot tetap di karakter sampai kamu ketik",
      prefix + "timewarp off",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ DEFAULT — parse era + optional question
  // Owner: .timewarp 2035 (persistent), .timewarp 2035 <question> (one-shot)
  // User: .timewarp 2035 <question> (one-shot only)
  // If owner types just ".timewarp 2035" with no question -> persistent mode
  // If anyone types ".timewarp 2035 <question>" -> one-shot answer

  const eraInput = args.slice(1).join(" ").trim();
  if (!eraInput) {
    await m.reply( claraWrap("Time-Warp", [
      "Mode Chat Lintas Waktu",
      "",
      "Cara pakai:",
      prefix + "timewarp <tahun> <pertanyaan> — one-shot",
      prefix + "timewarp on <tahun/era> — persistent (owner)",
      prefix + "timewarp off — keluar mode (owner)",
      prefix + "timewarp status — lihat status",
      prefix + "timewarp list — lihat preset era",
      "",
      "Contoh one-shot:",
      prefix + "timewarp 2035 apa itu ikan koi?",
      prefix + "timewarp 1990 gimana sekolah dulu?",
      "",
      "Contoh persistent (owner):",
      prefix + "timewarp on 2035",
      prefix + "timewarp on zaman-kolonial",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // Try to separate era from question
  // Known era keywords that might be followed by a question
  const eraKeywords = [
    "zaman batu", "zaman kolonial", "era colonial", "era perang",
    "zaman orba", "zaman reformasi", "era 90an", "era 2000an",
    "masa depan", "future utopia", "post apocalyptic", "post apokaliptik",
    "mars colony", "koloni mars",
  ];

  const fullInput = eraInput;
  let eraPart = "";
  let questionPart = "";

  // Try absolute year first: "2035 apa itu ikan?" -> era="2035", question="apa itu ikan?"
  const yearMatch = fullInput.match(/^(\d{3,4})\s+(.+)/);
  if (yearMatch) {
    eraPart = yearMatch[1];
    questionPart = yearMatch[2];
  } else {
    // Try relative: "5tahun-depan apa itu?" or "5 tahun depan apa itu?"
    const relMatch = fullInput.match(/^(\d+\s*tahun\s*(?:ke\s*)?depan)\s+(.+)/i);
    if (relMatch) {
      eraPart = relMatch[1];
      questionPart = relMatch[2];
    } else {
      const relPastMatch = fullInput.match(/^(\d+\s*tahun\s*(?:yang\s*)?lalu)\s+(.+)/i);
      if (relPastMatch) {
        eraPart = relPastMatch[1];
        questionPart = relPastMatch[2];
      } else {
        // Try era keywords
        let found = false;
        for (const kw of eraKeywords) {
          if (fullInput.toLowerCase().startsWith(kw)) {
            eraPart = fullInput.substring(0, kw.length);
            questionPart = fullInput.substring(kw.length).trim();
            found = true;
            break;
          }
        }
        if (!found) {
          // Can't determine era vs question split
          // If owner and no question detected -> persistent mode
          // If not owner -> treat entire input as era, no question
          eraPart = fullInput;
          questionPart = "";
        }
      }
    }
  }

  const parsed = parseEra(eraPart);
  const senderName = m.pushName || m.senderNumber || "seseorang";

  // If there's a question -> one-shot mode (ALL USERS)
  if (questionPart) {
    const session = {
      era: parsed.era,
      label: parsed.label,
      targetYear: parsed.targetYear,
      active: false,
      startedAt: Date.now(),
      messageCount: 0,
      systemPrompt: "",
    };
    session.systemPrompt = buildTemporalPrompt(session, senderName);
    oneShotPrompts.set(sender, session.systemPrompt);

    // Set global sender for callAI to pick up
    global.__novaMoodSender = sender;

    // Use UnlimitedAI for one-shot answer
    try {
    await m.react("🕒");
      const { default: UnlimitedAI } = await import("../../src/scraper/unlimitedai.js");
      const result = await UnlimitedAI(questionPart, "nova-ai");
      if (result) {
        await m.reply( claraWrap("Time-Warp", [
          "Era: " + parsed.label,
          "",
          result,
        ].join("\n")), "aitimewarp");
      } else {
        await m.reply(novaError("AITimeWarp", "Gagal dapet respon AI nih, coba lagi ya"));
      }
    } catch (e) {
      await m.react("🐣");
      await m.reply(claraWrap("Time-Warp", "Error: " + e.message));
    }
    // Clean up one-shot
    oneShotPrompts.delete(sender);
    return { handled: true };
  }

  // No question detected:
  // Owner -> persistent mode
  // Non-owner -> tell them to add a question
  if (isOwner) {
    const session = {
      era: parsed.era,
      label: parsed.label,
      targetYear: parsed.targetYear,
      active: true,
      startedAt: Date.now(),
      messageCount: 0,
      systemPrompt: "",
    };
    session.systemPrompt = buildTemporalPrompt(session, senderName);
    warpSessions.set(sender, session);

    await m.reply( claraWrap("Time-Warp", [
      "Persistent mode AKTIF",
      "",
      "Era: " + parsed.label,
      "Tipe: " + parsed.era.toUpperCase(),
      "",
      "Sekarang semua chat biasa ke bot akan",
      "dijawab dengan persona dari era ini.",
      "Bot tetap di karakter sampai kamu ketik",
      prefix + "timewarp off",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  } else {
    // Non-owner without question -> one-shot instruction
    await m.reply( claraWrap("Time-Warp", [
      "Mode persistent hanya untuk owner.",
      "",
      "Kamu bisa pakai one-shot:",
      prefix + "timewarp <tahun/era> <pertanyaan>",
      "",
      "Contoh:",
      prefix + "timewarp 2035 apa itu ikan koi?",
      prefix + "timewarp 1990 gimana sekolah dulu?",
      prefix + "timewarp zaman-kolonial apa itu telegram?",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }
}

export { pluginConfig as config, handler };
