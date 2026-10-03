// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// buycash.js — Beli uang RPG (cash) satuan — masukin jumlah cash (via factory rara-topup-flow.js)
import { buildTopupPlugin } from "../../src/lib/store/rara-topup-flow.js";

const { pluginConfig, handler } = buildTopupPlugin({
  key: "cash",
  command: "buycash",
  aliases: ['buycash', 'buyuang'],
  description: "Beli uang RPG (cash) satuan — masukin jumlah cash",
  usage: ".buycash <jumlah>",
  example: ".buycash 500000",
});

export { pluginConfig as config, handler };
