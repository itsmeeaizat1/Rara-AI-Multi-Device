// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aitimewarp",
  alias: ["timewarp", "twarp", "lintaswaktu", "timetravel"],
  category: "ai",
  description: "Mode Chat Lintas Waktu — AI roleplay dari masa depan/lalu",
  usage: ".timewarp <tahun/era> | .timewarp off | .timewarp status",
  example: ".timewarp 2035",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ════ Session storage (per-user) ════
// Key: sender JID -> { era, label, systemPrompt, active, startedAt, messageCount }
const warpSessions = new Map();

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
    return {
      era: "future",
      label: `${years} tahun ke depan (${targetYear})`,
      targetYear,
    };
  }

  // Relative past: "10 tahun lalu", "10 tahun yang lalu"
  m = text.match(/(\d+)\s*tahun\s*(?:yang\s*)?lalu/);
  if (m) {
    const years = parseInt(m[1], 10);
    const targetYear = new Date().getFullYear() - years;
    return {
      era: "past",
      label: `${years} tahun yang lalu (${targetYear})`,
      targetYear,
    };
  }

  // Absolute year: "2035", "1990"
  m = text.match(/^(\d{3,4})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const currentYear = new Date().getFullYear();
    return {
      era: year > currentYear ? "future" : "past",
      label: `Tahun ${year}`,
      targetYear: year,
    };
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

  // Default: treat as custom era description
  return {
    era: "custom",
    label: input.trim(),
    targetYear: null,
  };
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
 */
export function getTimewarpPrompt(sender) {
  const session = warpSessions.get(sender);
  if (!session || !session.active) return null;
  return session.systemPrompt;
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

async function handler(m, { sock, db, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  const args = (m.text || "").trim().split(/\s+/);
  const sub = (args[1] || "").toLowerCase();
  const sender = m.sender;

  // ════ OFF — exit time-warp mode
  if (sub === "off" || sub === "stop" || sub === "keluar" || sub === "exit") {
    const session = warpSessions.get(sender);
    if (!session || !session.active) {
      await sendReplyWithNav(sock, m, claraWrap("Time-Warp", "Kamu gak lagi dalam mode lintas waktu."), "aitimewarp");
      return { handled: true };
    }
    warpSessions.delete(sender);
    await sendReplyWithNav(sock, m, claraWrap("Time-Warp", [
      "Mode lintas waktu dinonaktifkan.",
      "",
      "Kamu kembali ke realitas normal.",
      "Semua persona temporal telah direset.",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ STATUS — check current session
  if (sub === "status" || sub === "info") {
    const session = warpSessions.get(sender);
    if (!session || !session.active) {
      await sendReplyWithNav(sock, m, claraWrap("Time-Warp", [
        "Status: TIDAK AKTIF",
        "",
        "Kamu lagi di realitas normal.",
        "",
        "Aktifkan: " + prefix + "timewarp <tahun/era>",
        "Contoh: " + prefix + "timewarp 2035",
        "         " + prefix + "timewarp 5tahun-depan",
        "         " + prefix + "timewarp zaman-kolonial",
      ].join("\n")), "aitimewarp");
      return { handled: true };
    }
    const duration = Math.floor((Date.now() - session.startedAt) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    await sendReplyWithNav(sock, m, claraWrap("Time-Warp", [
      "Status: AKTIF",
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

  // ════ LIST — show available era presets
  if (sub === "list" || sub === "preset" || sub === "era") {
    await sendReplyWithNav(sock, m, claraWrap("Time-Warp Preset", [
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
      "CUSTOM:",
      "  Ketik bebas, contoh:",
      "  " + prefix + "timewarp dimensi-paralel",
      "  " + prefix + "timewarp dunia-sebelum-perang",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // ════ ON — activate time-warp mode
  if (sub === "on" || sub === "start" || sub === "mulai") {
    const eraInput = args.slice(2).join(" ").trim();
    if (!eraInput) {
      await sendReplyWithNav(sock, m, claraWrap("Time-Warp", [
        "Format: " + prefix + "timewarp on <tahun/era>",
        "Contoh: " + prefix + "timewarp on 2035",
      ].join("\n")), "aitimewarp");
      return { handled: true };
    }
    // Fall through to default handler with eraInput
    args[1] = eraInput;
  }

  // ════ DEFAULT — parse era input and activate
  const eraInput = args.slice(1).join(" ").trim();
  if (!eraInput) {
    await sendReplyWithNav(sock, m, claraWrap("Time-Warp", [
      "Mode Chat Lintas Waktu",
      "",
      "Cara pakai:",
      prefix + "timewarp <tahun/era> — masuk mode",
      prefix + "timewarp off — keluar mode",
      prefix + "timewarp status — lihat status",
      prefix + "timewarp list — lihat preset era",
      "",
      "Contoh:",
      prefix + "timewarp 2035",
      prefix + "timewarp 5tahun-depan",
      prefix + "timewarp zaman-kolonial",
      "",
      "Setelah aktif, chat biasa ke bot akan",
      "dijawab dengan persona dari era tersebut.",
      "Bot akan tetap di karakter sampai kamu",
      "ketik " + prefix + "timewarp off",
    ].join("\n")), "aitimewarp");
    return { handled: true };
  }

  // Parse era
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

  // Generate intro message in character
  let introText = "";
  if (parsed.era === "future") {
    introText = `*{Time-Warp Aktif}*\n\nMasuk ke ${parsed.label}...\n\n`;
    const intros = [
      `Halo? Ada yang bisa aku bantu? Aku lagi di sini, di tahun ${parsed.targetYear}. Kenapa kamu hubungi aku?`,
      `Oh, kamu dari masa lalu? ${parsed.targetYear} di sini semuanya beda. Apa yang mau kamu tanya?`,
      `Sinyalnya agak gangguanggara. Aku dari tahun ${parsed.targetYear}. Bicara aja, apa yang terjadi di masamu?`,
      `Wah, kamu dari ${new Date().getFullYear()}? Aku denger tahun itu masa-masa transition. Aku di ${parsed.targetYear} sekarang, cerita aja.`,
    ];
    introText += intros[Math.floor(Math.random() * intros.length)];
  } else if (parsed.era === "past") {
    introText = `*{Time-Warp Aktif}*\n\nMasuk ke ${parsed.label}...\n\n`;
    const intros = [
      `Salam sejahtera. Ada apa kau memanggil aku? Aku sedang di sini, di ${parsed.label}.`,
      `Oh, kau dari masa depan? Sungguh menarik. Apa yang ingin kau tanyakan kepadaku?`,
      `Apa ini? Suara dari masa depan? Bicara saja, aku mendengarkan.`,
      `Kau siapa? Dari mana datangmu? Aku di ${parsed.label} ini belum pernah melihat sepertimu.`,
    ];
    introText += intros[Math.floor(Math.random() * intros.length)];
  } else {
    introText = `*{Time-Warp Aktif}*\n\nMasuk ke ${parsed.label}...\n\n`;
    introText += `Aku di sini. Di ${parsed.label}. Ada yang mau kamu bicarakan?`;
  }

  introText += "\n\n_Ketik " + prefix + "timewarp off untuk kembali normal_";

  await sendReplyWithNav(sock, m, claraWrap("Time-Warp", introText), "aitimewarp");
  return { handled: true };
}

export { pluginConfig as config, handler };
