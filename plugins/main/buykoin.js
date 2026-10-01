// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buykoin.js — Beli koin satuan — masukin jumlah koin yang mau dibeli (via factory rara-topup-flow.js)
// Harga & validasi terpusat di src/lib/store/rara-store.js
import { buildTopupPlugin } from "../../src/lib/store/rara-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "koin",
  command: "buykoin",
  aliases: ['buykoin'],
  description: "Beli koin satuan — masukin jumlah koin yang mau dibeli",
  usage: ".buykoin <jumlah>",
  example: ".buykoin 50000",
});

export { pluginConfig as config, handler };
