// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .memwatch — kontrol memory watchdog bot (OWNER ONLY, default OFF).
// Watchdog = fitur yang matiin bot (process.exit) kalau RAM kepake
// kelewat batas — bagus buat panen memory leak, TAPI ganggu .remini
// (Local AI butuh RAM 1-3GB pas render). Makanya default OFF:
//   .memwatch          → liat status (ON/OFF, limit, RAM sekarang)
//   .memwatch on       → nyalain watchdog, limit default 2048MB
//   .memwatch on 1536  → nyalain dengan limit custom (MB)
//   .memwatch off      → matiin watchdog (kembali default)
import { novaBox, novaError } from "../../src/lib/nova-menu-style.js";
import { getState, setState } from "../../src/lib/nova-memory-monitor.js";

const pluginConfig = {
  name: "memwatch",
  alias: ["memwatch", "memlimit", "memorywatch"],
  category: "owner",
  description: "Kontrol memory watchdog bot (default OFF, owner only)",
  usage: ".memwatch — status\n.memwatch on — nyalain (limit 2048MB)\n.memwatch on 1536 — limit custom\n.memwatch off — matiin",
  example: ".memwatch on",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { args }) {
  const state = await getState();
  const arg = String(args?.[0] || "").toLowerCase();
  const mem = process.memoryUsage();
  const rssMB = (mem.rss / 1024 / 1024).toFixed(0);

  if (!arg || arg === "status") {
    const lines = [
      "Status   : " + (state.enabled ? "ON" : "OFF (default)"),
      "Limit    : " + state.limitMB + "MB",
      "RAM now  : " + rssMB + "MB RSS",
      "---",
      "Hint     : .memwatch on / .memwatch on 1536 / .memwatch off",
    ];
    return m.reply(novaBox("Memory Watchdog", lines));
  }

  if (arg === "on") {
    const custom = Number(args?.[1]);
    const limitMB = custom > 256 ? Math.round(custom) : state.limitMB;
    await setState({ enabled: true, limitMB });
    return m.reply(novaBox("Memory Watchdog", [
      "Status   : ON",
      "Limit    : " + limitMB + "MB",
      "RAM now  : " + rssMB + "MB RSS",
      "---",
      "Bot bakal restart otomatis kalau RSS lewat " + limitMB + "MB (di luar render .remini)",
    ]));
  }

  if (arg === "off") {
    await setState({ enabled: false, limitMB: state.limitMB });
    return m.reply(novaBox("Memory Watchdog", [
      "Status   : OFF (kembali default)",
      "Limit    : " + state.limitMB + "MB (kesimpen, kepake kalau on lagi)",
      "---",
      "Watchdog gak akan restart bot lagi sampai .memwatch on",
    ]));
  }

  return m.reply(novaError("memwatch", "Argumen gak dikenal. Pakai: on / off / (kosong)"));
}

export { pluginConfig as config, handler };
