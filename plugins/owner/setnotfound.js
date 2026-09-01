// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
/**
 * .setnotfound — Smart Anti-Spam Not-Found Controller (Owner Only)
 *
 * Commands:
 *   .setnotfound              — Lihat status & pengaturan
 *   .setnotfound on/off       — Aktifkan/matikan saran command not found
 *   .setnotfound cooldown <s> — Set base cooldown (detik)
 *   .setnotfound smart on/off — Aktifkan/matikan progressive escalation
 *   .setnotfound reset        — Reset semua tracker user
 */

import { novaReply, toSC } from "../../src/lib/nova-menu-style.js";
import config from "../../config.js";

const pluginConfig = {
  name: "setnotfound",
  alias: ["setnotfound", "setnf", "notfoundcfg"],
  category: "owner",
  description: "Atur smart anti-spam untuk command not found (owner only)",
  usage: ".setnotfound <on/off/cooldown/smart/reset>",
  example: ".setnotfound cooldown 3",
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

  // Pastikan config.features ada
  if (!config.features) config.features = {};

  if (sub === "on") {
    config.features.commandSuggestion = true;

    const msg = novaReply({
      title: "Not Found Suggestion",
      info: [{ label: "Status", value: "ON" }],
      content: "|\n| Saran command not found diaktifkan\n| Smart anti-spam aktif dengan progressive cooldown",
    });
    return await m.reply(msg);
  }

  if (sub === "off") {
    config.features.commandSuggestion = false;

    const msg = novaReply({
      title: "Not Found Suggestion",
      info: [{ label: "Status", value: "OFF" }],
      content: "|\n| Saran command not found dimatikan\n| Bot tidak akan reply saat command tidak ditemukan",
    });
    return await m.reply(msg);
  }

  if (sub === "cooldown") {
    const seconds = parseInt(args[1]);
    if (!seconds || seconds < 1 || seconds > 300) {
      const msg = novaReply({
        title: "Not Found Cooldown",
        status: "Masukkan angka 1-300 detik",
        content: "|\n| Contoh: " + m.prefix + "setnotfound cooldown 5",
      });
      return await m.reply(msg);
    }

    config.features.commandSuggestionCooldown = seconds;

    const msg = novaReply({
      title: "Not Found Cooldown",
      info: [
        { label: "Base Cooldown", value: seconds + " detik" },
        { label: "Escalation", value: "5x > 10x > 20x > 40x > 60x" },
      ],
      content: "|\n| Progressive: 1-2x = " + seconds + "s | 3-4x = " + (seconds * 2) + "s | 5-7x = " + (seconds * 4) + "s | 8-12x = " + (seconds * 8) + "s | 13+ = " + (seconds * 12) + "s",
    });
    return await m.reply(msg);
  }

  if (sub === "smart") {
    const mode = args[1] || "";
    if (mode === "on") {
      config.features.commandSuggestionSmart = true;
      const msg = novaReply({
        title: "Smart Anti-Spam",
        info: [{ label: "Status", value: "ON" }],
        content: "|\n| Progressive escalation aktif\n| Makin sering spam, makin lama cooldown",
      });
      return await m.reply(msg);
    }
    if (mode === "off") {
      config.features.commandSuggestionSmart = false;
      const msg = novaReply({
        title: "Smart Anti-Spam",
        info: [{ label: "Status", value: "OFF" }],
        content: "|\n| Cooldown statis (tanpa escalation)\n| Semua user pakai base cooldown yang sama",
      });
      return await m.reply(msg);
    }

    const msg = novaReply({
      title: "Smart Anti-Spam",
      status: "Pilih on atau off",
      content: "|\n| Contoh: " + m.prefix + "setnotfound smart on",
    });
    return await m.reply(msg);
  }

  if (sub === "reset") {
    // Dynamic import untuk reset tracker
    try {
      const { cleanupNotFoundTracker } = await import("../../src/lib/nova-notfound-antispam.js");
      cleanupNotFoundTracker();
    } catch (e) {}

    const msg = novaReply({
      title: "Not Found Tracker",
      info: [{ label: "Status", value: "Reset" }],
      content: "|\n| Semua tracker user di-reset\n| Semua user kembali ke level 0",
    });
    return await m.reply(msg);
  }

  // Default: tampilkan status
  const isOn = config.features?.commandSuggestion !== false;
  const isSmart = config.features?.commandSuggestionSmart !== false;
  const cd = config.features?.commandSuggestionCooldown || 5;

  const msg = novaReply({
    title: "Not Found Suggestion",
    info: [
      { label: "Suggestion", value: isOn ? "ON" : "OFF" },
      { label: "Smart Escalation", value: isSmart ? "ON" : "OFF" },
      { label: "Base Cooldown", value: cd + " detik" },
    ],
    content: [
      "|\n| Progressive Cooldown:",
      "| \u2022 1-2x salah  = " + cd + "s cooldown",
      "| \u2022 3-4x salah  = " + (cd * 2) + "s cooldown",
      "| \u2022 5-7x salah  = " + (cd * 4) + "s cooldown",
      "| \u2022 8-12x salah = " + (cd * 8) + "s (mute)",
      "| \u2022 13x+ salah  = " + (cd * 12) + "s (smart reply)",
      "|",
      "| " + m.prefix + "setnotfound on/off \u2014 toggle",
      "| " + m.prefix + "setnotfound cooldown <s> \u2014 set base",
      "| " + m.prefix + "setnotfound smart on/off \u2014 escalation",
      "| " + m.prefix + "setnotfound reset \u2014 reset tracker",
    ].join("\n"),
  });
  return await m.reply(msg);
}

export { pluginConfig as config, handler };
