// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buytokens.js — Beli tokens RPG satuan — masukin jumlah tokens (via factory nova-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "tokens",
  command: "buytokens",
  aliases: ['buytokens'],
  description: "Beli tokens RPG satuan — masukin jumlah tokens",
  usage: ".buytokens <jumlah>",
  example: ".buytokens 500",
});

export { pluginConfig as config, handler };
