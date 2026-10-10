// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
/**
 * Nama Plugin: Ua (User-Agent Parser)
 * Fitur: .ua <string> — parse User-Agent jadi kartu info lengkap
 *        (browser, engine, OS, device, CPU) pakai UAParser.js v1.0.39 (MIT,
 *        vendored src/lib/vendor/ua-parser-1.0.39.cjs dari faisalman/ua-parser-js).
 *        Parser & pool UA yang sama dipakai rara-http.js buat rotasi UA
 *        semua request bot (anti-block) — jadi fitur ini beneran kepakai.
 *        Catatan: ua-parser-js v2.x = AGPL, makanya pakai line 1.x (MIT).
 */
import { parseUA, getRandomUserAgent, getUaPoolSize } from "../../src/lib/rara-ua.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "ua",
  alias: ["useragent", "uaparse", "cekuaset"],
  category: "tools",
  description: "Parse User-Agent jadi info browser, engine, OS, device & CPU — plus UA acak siap pakai",
  usage: ".ua <string user-agent>\n.ua acak",
  example: ".ua Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/131\n.ua acak",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 1,
  isEnabled: true,
};

function uaCard(r) {
  const line = (label, val) => `▪ *${label}:* ${val || "—"}`;
  return raraWrap("User Agent", [
    "🔎 *HASIL PARSE*",
    "",
    line("Browser", [r.browser?.name, r.browser?.version].filter(Boolean).join(" ")),
    line("Engine", [r.engine?.name, r.engine?.version].filter(Boolean).join(" ")),
    line("OS", [r.os?.name, r.os?.version].filter(Boolean).join(" ")),
    line("Device", [r.device?.vendor, r.device?.model, r.device?.type].filter(Boolean).join(" ")),
    line("CPU", r.cpu?.architecture),
    "",
    `_string asli (siap copy):_`,
    `\`\`\`${r.raw}\`\`\``,
  ]);
}

function usageCard(prefix) {
  return raraWrap("User Agent", [
    "📱 *Panduan*",
    "",
    `ᯓ \`${prefix}ua <string user-agent>\` — parse UA lengkap`,
    `ᯓ \`${prefix}ua acak\` — UA modern random siap pakai`,
    `ᯓ reply pesan yang ada UA-nya, ketik \`${prefix}ua\` — auto-parse`,
    "",
    `_parser: UAParser.js v1.0.39 (MIT) — UA pool yang sama dipakai rotasi header semua request bot_`,
  ]);
}

export async function handler(m, { config: botConfig } = {}) {
  const prefix = botConfig?.command?.prefix || m.prefix || ".";
  const args = m.args || [];
  const sub = String(args[0] || "").toLowerCase();

  // ── acak ──
  if (sub === "acak" || sub === "random") {
    const ua = getRandomUserAgent();
    const r = parseUA(ua);
    return m.reply(raraWrap("User Agent", [
      "🎲 *UA ACAK (MODERN)*",
      "",
      uaCard(r).split("\n").slice(2, -4).join("\n"),
      "",
      `_string siap copy (pool ${getUaPoolSize()} UA):_`,
      `\`\`\`${ua}\`\`\``,
    ]));
  }

  // ── dari args / reply ──
  let uaStr = args.join(" ").trim();
  if (!uaStr && m.quoted?.text) uaStr = String(m.quoted.text).trim();
  if (!uaStr) return m.reply(usageCard(prefix));

  // potong command nyasar di depan kalau kebawa (mis. ".uaMozilla...")
  uaStr = uaStr.replace(/^\.?ua\s+/i, "").trim();

  const r = parseUA(uaStr);
  if (!r) return m.reply(usageCard(prefix));

  const known = r.browser?.name || r.os?.name || r.device?.type;
  if (!known) {
    return m.reply(raraWrap("User Agent", [
      "🤔 *Gak kedeteksi apapun*",
      "",
      "String ini gak dikenali sebagai User-Agent yang valid.",
      "",
      `Contoh valid: \`${prefix}ua acak\` buat liat bentuk UA modern.`,
    ]));
  }

  return m.reply(uaCard(r));
}

export { pluginConfig as config };
