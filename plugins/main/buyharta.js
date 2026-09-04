// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buyharta.js — Beli harta karun (gold RPG) satuan — masukin jumlah gold (via factory nova-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "harta",
  command: "buyharta",
  aliases: ['buyharta', 'buygold', 'buyhartakarun'],
  description: "Beli harta karun (gold RPG) satuan — masukin jumlah gold",
  usage: ".buyharta <jumlah>",
  example: ".buyharta 2500",
});

export { pluginConfig as config, handler };
