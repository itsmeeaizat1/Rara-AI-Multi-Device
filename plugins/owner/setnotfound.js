// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .setnotfound — Not-Found Suggestion Controller (Owner Only)
 *
 * Default saat pairing: mode manual, cooldown 5 detik, suggestion ON
 *
 * Commands:
 *   .setnotfound              — Lihat status & pengaturan
 *   .setnotfound on/off       — Aktifkan/matikan saran command not found
 *   .setnotfound mode manual  — Cooldown statis (semua user sama)
 *   .setnotfound mode smart   — Progressive escalation (makin spam makin lama)
 *   .setnotfound cooldown <s> — Set base cooldown (detik)
 *   .setnotfound reset        — Reset semua tracker user
 */

import { novaReply } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "setnotfound",
  alias: ["setnotfound", "setnf", "notfoundcfg"],
  category: "owner",
  description: "Atur saran command not found: mode manual/smart (owner only)",
  usage: ".setnotfound <on/off/mode/cooldown/reset>",
  example: ".setnotfound mode smart",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = (m.args || []).map((a) => a.toLowerCase());
  const sub = args[0] || "";

  if (!config.features) config.features = {};

  // .setnotfound on
  if (sub === "on") {
    config.features.commandSuggestion = true;
    return await m.reply(novaReply({
      title: "Not Found Suggestion",
      info: [{ label: "Status", value: "ON" }],
      content: "|\n| Saran command not found diaktifkan",
    }));
  }

  // .setnotfound off
  if (sub === "off") {
    config.features.commandSuggestion = false;
    return await m.reply(novaReply({
      title: "Not Found Suggestion",
      info: [{ label: "Status", value: "OFF" }],
      content: "|\n| Saran command not found dimatikan\n| Bot tidak akan reply saat command tidak ditemukan",
    }));
  }

  // .setnotfound mode manual/smart
  if (sub === "mode") {
    const mode = args[1] || "";
    if (mode === "manual") {
      config.features.commandSuggestionSmart = false;
      return await m.reply(novaReply({
        title: "Not Found Mode",
        info: [{ label: "Mode", value: "Manual" }],
        content: "|\n| Cooldown statis untuk semua user\n| Setiap salah command -> cooldown " + (config.features?.commandSuggestionCooldown || 5) + " detik",
      }));
    }
    if (mode === "smart") {
      config.features.commandSuggestionSmart = true;
      const cd = config.features?.commandSuggestionCooldown || 5;
      return await m.reply(novaReply({
        title: "Not Found Mode",
        info: [{ label: "Mode", value: "Smart" }],
        content: [
          "|\n| Progressive escalation aktif:",
          "| \u2022 1-2x salah  = " + cd + "s cooldown",
          "| \u2022 3-4x salah  = " + (cd * 2) + "s + warning",
          "| \u2022 5-7x salah  = " + (cd * 4) + "s + annoyed",
          "| \u2022 8-12x salah = " + (cd * 8) + "s (mute)",
          "| \u2022 13x+ salah  = " + (cd * 12) + "s (smart reply)",
        ].join("\n"),
      }));
    }
    return await m.reply(novaReply({
      title: "Not Found Mode",
      status: "Pilih: manual atau smart",
      content: "|\n| " + m.prefix + "setnotfound mode manual \u2014 cooldown statis\n| " + m.prefix + "setnotfound mode smart \u2014 progressive escalation",
    }));
  }

  // .setnotfound cooldown <s>
  if (sub === "cooldown") {
    const seconds = parseInt(args[1]);
    if (!seconds || seconds < 1 || seconds > 300) {
      return await m.reply(novaReply({
        title: "Not Found Cooldown",
        status: "Masukkan angka 1-300 detik",
        content: "|\n| Contoh: " + m.prefix + "setnotfound cooldown 5",
      }));
    }
    config.features.commandSuggestionCooldown = seconds;
    const isSmart = config.features?.commandSuggestionSmart !== false;
    if (isSmart) {
      return await m.reply(novaReply({
        title: "Not Found Cooldown",
        info: [
          { label: "Base Cooldown", value: seconds + " detik" },
          { label: "Mode", value: "Smart" },
        ],
        content: [
          "|\n| Progressive escalation:",
          "| \u2022 1-2x = " + seconds + "s | 3-4x = " + (seconds * 2) + "s | 5-7x = " + (seconds * 4) + "s",
          "| \u2022 8-12x = " + (seconds * 8) + "s (mute) | 13+ = " + (seconds * 12) + "s",
        ].join("\n"),
      }));
    }
    return await m.reply(novaReply({
      title: "Not Found Cooldown",
      info: [
        { label: "Base Cooldown", value: seconds + " detik" },
        { label: "Mode", value: "Manual" },
      ],
      content: "|\n| Cooldown statis " + seconds + " detik untuk semua user",
    }));
  }

  // .setnotfound reset
  if (sub === "reset") {
    try {
      const { cleanupNotFoundTracker } = await import("../../src/lib/nova-notfound-antispam.js");
      cleanupNotFoundTracker();
    } catch (e) {}
    return await m.reply(novaReply({
      title: "Not Found Tracker",
      info: [{ label: "Status", value: "Reset" }],
      content: "|\n| Semua tracker user di-reset\n| Semua user kembali ke level 0",
    }));
  }

  // Default: status
  const isOn = config.features?.commandSuggestion !== false;
  const isSmart = config.features?.commandSuggestionSmart === true;
  const mode = isSmart ? "Smart" : "Manual";
  const cd = config.features?.commandSuggestionCooldown || 5;

  if (isSmart) {
    return await m.reply(novaReply({
      title: "Not Found Suggestion",
      info: [
        { label: "Suggestion", value: isOn ? "ON" : "OFF" },
        { label: "Mode", value: mode },
        { label: "Base Cooldown", value: cd + " detik" },
      ],
      content: [
        "|\n| Progressive Cooldown:",
        "| \u2022 1-2x salah  = " + cd + "s",
        "| \u2022 3-4x salah  = " + (cd * 2) + "s + warning",
        "| \u2022 5-7x salah  = " + (cd * 4) + "s + annoyed",
        "| \u2022 8-12x salah = " + (cd * 8) + "s (mute)",
        "| \u2022 13x+ salah  = " + (cd * 12) + "s (smart reply)",
        "|",
        "| " + m.prefix + "setnotfound on/off \u2014 toggle",
        "| " + m.prefix + "setnotfound mode manual/smart",
        "| " + m.prefix + "setnotfound cooldown <s>",
        "| " + m.prefix + "setnotfound reset",
      ].join("\n"),
    }));
  }

  return await m.reply(novaReply({
    title: "Not Found Suggestion",
    info: [
      { label: "Suggestion", value: isOn ? "ON" : "OFF" },
      { label: "Mode", value: mode },
      { label: "Cooldown", value: cd + " detik (statis)" },
    ],
    content: [
      "|\n| Mode manual: setiap salah command -> cooldown " + cd + " detik",
      "| Tidak ada escalation, semua user diperlakukan sama",
      "|",
      "| " + m.prefix + "setnotfound on/off \u2014 toggle",
      "| " + m.prefix + "setnotfound mode manual/smart",
      "| " + m.prefix + "setnotfound cooldown <s>",
      "| " + m.prefix + "setnotfound reset",
    ].join("\n"),
  }));
}

export { pluginConfig as config, handler };
