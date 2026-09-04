// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buydiamond.js — Beli diamond RPG satuan — masukin jumlah yang mau ditambah (via factory nova-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "diamond",
  command: "buydiamond",
  aliases: ['buydiamond'],
  description: "Beli diamond RPG satuan — masukin jumlah yang mau ditambah",
  usage: ".buydiamond <jumlah>",
  example: ".buydiamond 25",
});

export { pluginConfig as config, handler };
