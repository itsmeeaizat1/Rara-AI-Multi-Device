// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cekresi.js — Cek resi pengiriman via Binderbyte API (needs API key)
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";
import config from "../../config.js";

const pluginConfig = {
  name: "cekresi",
  alias: ["cekresi"],
  category: "tools",
  description: "Cek resi pengiriman JNE, J&T, SiCepat, AnterAja, dll",
  usage: ".cekresi <kurir> <nomor_resi>",
  example: ".cekresi jne 123456789\n.cekresi jnt JTD123456\n.cekresi sicepat 123456",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 2,
  isEnabled: true,
};

const COURIERS = [
  { code: "jne", name: "JNE" },
  { code: "jnt", name: "J&T Express" },
  { code: "sicepat", name: "SiCepat" },
  { code: "anteraja", name: "AnterAja" },
  { code: "pos", name: "POS Indonesia" },
  { code: "tiki", name: "TIKI" },
  { code: "wahana", name: "Wahana" },
  { code: "ninja", name: "Ninja Xpress" },
];

async function handler(m, { sock, config: botConfig, db }) {
  try {
    const input = m.args || [];

    if (!input.length || input[0] === "list") {
      return m.reply(claraWrap("Cek Resi", [
        "Cek resi pengiriman via Binderbyte",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}cekresi <kurir> <nomor_resi>`,
        "",
        "💡 *Contoh:*",
        `${m.prefix}cekresi jne 123456789`,
        `${m.prefix}cekresi jnt JTD123456`,
        `${m.prefix}cekresi sicepat 123456`,
        "",
        "Kurir tersedia:",
        COURIERS.map(c => `• ${c.code} — ${c.name}`).join("\n"),
      ]));
    }

    const courier = input[0].toLowerCase();
    const awb = input.slice(1).join(" ").trim();

    // Handle "j&t" alias
    const courierCode = courier === "j&t" ? "jnt" : courier;

    if (!awb) {
      await m.react("🐣");
      return m.reply(claraWrap("Cek Resi", `Masukkan nomor resi. Contoh: ${m.prefix}cekresi ${courier} 123456789`));
    }

    const validCourier = COURIERS.find(c => c.code === courierCode);
    if (!validCourier) {
      await m.react("🐣");
      return m.reply(claraWrap("Cek Resi", [
        `Kurir "${courier}" tidak dikenal.`,
        `Lihat daftar kurir: ${m.prefix}cekresi list`,
      ]));
    }

    const apiKey = config.binderbyteKey || config.APIkey?.binderbyte || "";

    if (!apiKey) {
      return m.reply(claraWrap("Cek Resi", [
        "API key Binderbyte belum diset.",
        "",
        "Dapatkan di: https://binderbyte.com",
        "Set di config.js: binderbyteKey: \"YOUR_KEY\"",
      ]));
    }

    await m.react("🕒");

    const res = await fetch(
      `https://api.binderbyte.com/v1/track?api_key=${apiKey}&courier=${courierCode}&awb=${encodeURIComponent(awb)}`
    );

    if (!res.ok) throw new Error(`Binderbyte ${res.status}`);
    const json = await res.json();

    if (json.code !== 200 || !json.data) {
      await m.react("🐣");
      return m.reply(claraWrap("Cek Resi", `Resi tidak ditemukan. Cek kembali kurir & nomor resi.\nKurir: ${validCourier.name}\nResi: ${awb}`));
    }

    const summary = json.data.summary || {};
    const history = json.data.history || [];

    let text = `${validCourier.name} — ${summary.awb || awb}\n\n`;
    text += `Status: ${summary.status || "Unknown"}\n`;
    text += `Service: ${summary.service || "N/A"}\n`;
    text += `Dari: ${summary.origin || "N/A"}\n`;
    text += `Ke: ${summary.destination || "N/A"}\n`;
    if (summary.estimate) text += `Estimasi: ${summary.estimate}\n`;

    if (history.length) {
      text += "\nRiwayat Pelacakan:\n";
      const recent = history.slice(0, 5).reverse();
      for (const h of recent) {
        text += `\n• ${h.date || ""}\n  ${h.desc || ""}\n  ${h.location || ""}`;
      }
    }

    await m.react("🐣");
    return m.reply(claraWrap("Cek Resi", text));
  } catch (e) {
    console.error("[cekresi] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "cekresi");
  }
}

export { pluginConfig as config, handler };
