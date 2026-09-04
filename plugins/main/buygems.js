// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buygems.js — Beli gems RPG satuan — masukin jumlah gems (via factory nova-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "gems",
  command: "buygems",
  aliases: ['buygems'],
  description: "Beli gems RPG satuan — masukin jumlah gems",
  usage: ".buygems <jumlah>",
  example: ".buygems 25",
});

export { pluginConfig as config, handler };
