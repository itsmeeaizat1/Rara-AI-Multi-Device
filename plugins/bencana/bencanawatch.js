// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// bencanawatch.js — Langganan auto-alert bencana per chat (opt-in, default OFF)
//   • Gempa Indonesia baru M >= 5.0 (BMKG)   — poll 60 dtk
//   • Gempa global baru M >= 6.0 (USGS)      — poll 5 mnt
//   • Bencana GDACS baru level SIAGA/AWAS    — poll 5 mnt
// Monitor lazy: timer cuma jalan kalau ada >= 1 subscriber.

import {
  addWatcher, removeWatcher, getWatchersSafe, syncBencanaMonitor, watcherCount,
} from "../../src/lib/nova-bencana.js";
import { novaBox, novaError, novaGuide } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "bencanawatch",
  alias: ["bencanawatch"],
  category: "bencana",
  description: "Langganan auto-alert bencana realtime di chat ini (gempa BMKG M5+, gempa global M6+, GDACS Siaga/Awas)",
  usage: ".bencanawatch <on/off/status>",
  example: ".bencanawatch on",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, energi: 0, isEnabled: true,
};

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    const action = args[0] || "";
    const chatId = m.chat;

    if (action === "on") {
      await addWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana aktif di chat ini.",
        "---",
        "• Gempa Indonesia baru M 5.0+ (BMKG)",
        "• Gempa global baru M 6.0+ (USGS)",
        "• Bencana GDACS level SIAGA / AWAS",
        "---",
        "Matikan dengan .bencanawatch off",
      ]));
    }

    if (action === "off") {
      await removeWatcher(chatId);
      syncBencanaMonitor(sock);
      await m.react("🐣");
      return m.reply(novaBox("Bencana Watch", [
        "Auto-alert bencana dimatikan di chat ini.",
      ]));
    }

    if (action === "status" || action === "") {
      const subs = await getWatchersSafe();
      const active = subs[chatId]
        ? `AKTIF sejak ${subs[chatId].since.slice(0, 10)}`
        : "TIDAK AKTIF di chat ini";
      return m.reply(novaBox("Bencana Watch", [
        `Status  : ${active}`,
        `Total   : ${Object.keys(subs).length} chat berlangganan`,
        "Sumber  : BMKG, USGS, GDACS",
        ...(subs[chatId] ? [] : ["---", "Aktifkan dengan .bencanawatch on"]),
      ]));
    }

    return m.reply(novaGuide("Bencana Watch", "Gunakan on, off, atau status", ".bencanawatch on"));
  } catch (err) {
    console.error("[bencanawatch]", err);
    await m.react("❌");
    return m.reply(novaError("Bencana Watch"));
  }
}

export { pluginConfig as config, handler };
