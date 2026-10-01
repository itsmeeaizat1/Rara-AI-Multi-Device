// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import { raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";
import { raraWrap } from '../../src/lib/rara-menu-style.js'

const pluginConfig = {
  name: "kisahnabi",
  alias: ["kisahnabi"],
  aliases: ["kisahnabi", "nabi", "storynabi", "kisahrasul"],
  category: "islami",
  description: "Kisah 25 Nabi & Rasul (API gratis kisahnabi.vercel.app)",
  usage: ".kisahnabi <nama nabi> | .kisahnabi list",
  example: ".kisahnabi adam | .kahnabi muhammad | .kisahnabi list",
  isGroupOnly: false,
}

const API_URL = "https://kisahnabi.vercel.app/api/kisah";

const NABI_LIST = [
  "adam", "idris", "nuh", "hud", "shaleh", "ibrahim", "lut", "ismail",
  "ishaq", "yaqub", "yusuf", "ayyub", "syuaib", "musa", "harun",
  "dzulkifli", "daud", "sulaiman", "ilyas", "ilyasa", "yunus",
  "zakariya", "yahya", "isa", "muhammad"
];

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (!input || input === "list") {
      return m.reply(raraWrap("Kisah Nabi", [
        "Kisah 25 Nabi & Rasul",
        "",
        NABI_LIST.map((n, i) => (i + 1) + ". " + n.charAt(0).toUpperCase() + n.slice(1)).join("\n"),
        "",
        "Cara: " + usedPrefix + "kisahnabi <nama>",
        "Contoh: " + usedPrefix + "kisahnabi adam",
      ].join("\n")));
    }

    if (!NABI_LIST.includes(input)) {
      return m.reply(raraWrap("Kisah Nabi", "Nama nabi tidak ditemukan: " + input + "\nKetik " + usedPrefix + "kisahnabi list untuk lihat semua."));
    }

    const res = await axios.get(API_URL + "/" + input, { timeout: 10000 });

    if (!res.data || !res.data.nabi) {
      return m.reply(raraWrap("Kisah Nabi", "Gagal ambil nih kisah."));
    }

    const d = res.data.nabi;
    let lines = [
      "Kisah Nabi " + d.nama,
      "",
      "Tahun Kelahiran: " + (d.tahun_kelahiran || "N/A"),
      "Tempat: " + (d.tmp || "N/A"),
      "Usia: " + (d.usia || "N/A"),
      "",
      d.kisah || "Tidak ada kisah tersedia.",
    ];

    return m.reply(raraWrap("Kisah Nabi " + d.nama, lines.join("\n")));
  } catch (e) {
    console.error("kisahnabi error:", e.message);
    return m.reply(raraWrap("Kisah Nabi", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
