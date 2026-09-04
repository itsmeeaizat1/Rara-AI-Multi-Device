// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buycinta.js — Beli affection (RPG Cinta) — masukin jumlah affection (via factory nova-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "affection",
  command: "buycinta",
  aliases: ['buycinta', 'buyaffection'],
  description: "Beli affection (RPG Cinta) — masukin jumlah affection",
  usage: ".buycinta <jumlah>",
  example: ".buycinta 300",
});

export { pluginConfig as config, handler };
