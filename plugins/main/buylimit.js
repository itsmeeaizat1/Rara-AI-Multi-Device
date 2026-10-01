// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// buylimit.js — Beli limit fitur satuan — masukin angka yang mau ditambah (via factory rara-topup-flow.js)
// Harga & validasi terpusat di src/lib/store/rara-store.js
import { buildTopupPlugin } from "../../src/lib/store/rara-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "limit",
  command: "buylimit",
  aliases: ['buylimit'],
  description: "Beli limit fitur satuan — masukin angka yang mau ditambah",
  usage: ".buylimit <jumlah>",
  example: ".buylimit 200",
});

export { pluginConfig as config, handler };
