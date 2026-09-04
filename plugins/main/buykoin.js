// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// buykoin.js — Beli koin satuan — masukin jumlah koin yang mau dibeli (via factory nova-topup-flow.js)
// Harga & validasi terpusat di src/lib/store/nova-store.js
import { buildTopupPlugin } from "../../src/lib/store/nova-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "koin",
  command: "buykoin",
  aliases: ['buykoin'],
  description: "Beli koin satuan — masukin jumlah koin yang mau dibeli",
  usage: ".buykoin <jumlah>",
  example: ".buykoin 50000",
});

export { pluginConfig as config, handler };
