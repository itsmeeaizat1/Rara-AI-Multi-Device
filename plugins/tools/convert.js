// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .convert — konversi satuan via mathjs (16 Sep 2026, request owner: audit
// dependencies → mathjs unit conversion fitur baru). Panjang/berat/suhu/
// data/waktu/kecepatan — alias Indonesia di-map otomatis. Tanpa API.

import { evaluate, format } from "mathjs";
import {
  raraError, raraCaption, raraWrap, tipText,
} from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "convert",
  alias: ["convert", "konversi", "satuan"],
  category: "tools",
  description: "Konversi satuan (panjang, berat, suhu, data, waktu, kecepatan)",
  usage: ".convert <nilai> <dari> ke <ke>",
  example: ".convert 5 km ke mil",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// alias satuan Indonesia → token mathjs
const UNIT_ALIAS = {
  mil: "miles", mile: "miles",
  km: "km", kilometer: "km", kilometerpersegi: "km^2",
  m: "m", meter: "m", cm: "cm", inci: "inch", kaki: "feet", yard: "yard",
  kg: "kg", pon: "lb", lbs: "lb", pound: "lb", gram: "gram", g: "gram",
  ton: "tonne", tonasi: "tonne",
  liter: "liter", l: "liter", ml: "ml",
  jam: "hour", menit: "minute", detik: "second", hari: "day", minggu: "week",
  mb: "MB", gb: "GB", kb: "kB", tb: "TB", byte: "byte",
  kmh: "km/h", kmjam: "km/h", mps: "m/s", knot: "knot",
  c: "celsius", celcius: "celsius", f: "fahrenheit", k: "kelvin",
  rp: "IDR", usd: "USD",
};

// nama unit hasil → tampilan Indonesia
const DISPLAY_ALIAS = {
  miles: "mil", mile: "mil",
  hour: "jam", hours: "jam", minute: "menit", minutes: "menit",
  second: "detik", seconds: "detik", day: "hari", days: "hari",
  week: "minggu", weeks: "minggu",
  feet: "kaki", foot: "kaki", inch: "inci", tonne: "ton",
  poundmass: "pon",
};

function toExpr(raw) {
  // "5 km ke mil" → "5 km to miles" | "80 kg -> lb" → "80 kg to lb"
  let s = raw.replace(/\s*(?:->|→|=)\s*/g, " to ").replace(/\s+ke\s+/gi, " to ");
  return s
    .split(/\s+/)
    .map((tok) => {
      const lower = tok.toLowerCase().replace(/[^a-z0-9/^]/g, "");
      return UNIT_ALIAS[lower] ?? tok;
    })
    .join(" ")
    .replace(/\s+to\s+/gi, " to ");
}

async function handler(m, { config: botConfig, prefix: cmdPrefix }) {
  const prefix = cmdPrefix || botConfig?.command?.prefix || ".";
  try {
    await m.react("🧠");
    const raw = (m.text || "").trim();

    if (!raw) {
      const text =
        raraCaption({
          emoji: "📐",
          name: "convert",
          description: "Konversi satuan apa pun — panjang, berat, suhu, data, waktu, kecepatan",
          usage: `${prefix}convert <nilai> <dari> ke <ke>`,
          example: `${prefix}convert 5 km ke mil\n${prefix}convert 80 kg ke pon\n${prefix}convert 30 celsius ke fahrenheit\n${prefix}convert 2 gb ke mb`,
        }) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
      await m.reply(text, "convert");
      return { handled: true };
    }

    if (!/to|ke|->|→|=/i.test(raw) || !/\d/.test(raw)) {
      const text =
        raraWrap("Convert", [
          `Input: *${raw}*`,
          "Status: *format salah*",
          "",
          `Format: ${prefix}convert <nilai> <dari> ke <ke>`,
          `Contoh: ${prefix}convert 5 km ke mil`,
        ].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}convert 5 km ke mil untuk contoh`);
      await m.reply(text, "convert");
      return { handled: true };
    }

    const expr = toExpr(raw);
    const hasil = evaluate(expr); // sandboxed parser mathjs
    const pretty = format(hasil, { precision: 8 }).replace(
      /\b(miles?|hours?|minutes?|seconds?|days?|weeks?|feet|foot|inch|tonne|poundmass)\b/gi,
      (u) => DISPLAY_ALIAS[u.toLowerCase()] || u,
    );

    const text =
      raraWrap("Convert", [
        `📐 *${raw}*`,
        `Hasil : *${pretty}*`,
      ].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}convert <nilai> <dari> ke <ke> untuk konversi lagi`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);
    await m.react("🐣");
    await m.reply(text, "convert");
  } catch (error) {
    await m.react("❌");
    const msg = String(error?.message || error || "");
    let teks;
    if (/undefined unit|undefined symbol|unit.*not found|unit .* not/i.test(msg)) {
      teks = raraError("Convert", `Satuan tidak dikenal — contoh yang didukung: km, mil, m, kg, pon, liter, celsius, fahrenheit, gb, mb, jam, menit, kmh`);
    } else if (/dimension mismatch|quantit.*dimension|units do not match/i.test(msg)) {
      teks = raraError("Convert", "Jenis satuan tidak cocok — panjang ke panjang, berat ke berat (misal km ke mil, bukan km ke kg)");
    } else {
      teks = raraError("Convert", `Gagal konversi: ${msg.slice(0, 120)}`);
    }
    await m.reply(teks, "convert");
  }
  return { handled: true };
}

export { pluginConfig as config, handler }
export default { pluginConfig, handler, command: pluginConfig.alias }
