import { mediaResultCard, probeBuffer } from "../../src/lib/rara-media-result.js";
// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "barcode",
  alias: ["barcode"],
  category: "tools",
  description: "Generate barcode (CODE128, EAN13, EAN8, UPC, ITF, MSI, codabar)",
  usage: ".barcode <teks/angka>  atau  .barcode <type> <data>",
  example: ".barcode 1234567890128  atau  .barcode code128 Hello World",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const SUPPORTED_TYPES = {
  code128: { name: "CODE128", desc: "Teks/ASCII apa saja", validate: (t) => t.length > 0 },
  ean13: { name: "EAN-13", desc: "13 digit angka", validate: (t) => /^\d{12,13}$/.test(t) },
  ean8: { name: "EAN-8", desc: "8 digit angka", validate: (t) => /^\d{7,8}$/.test(t) },
  ean5: { name: "EAN-5", desc: "5 digit angka", validate: (t) => /^\d{5}$/.test(t) },
  ean2: { name: "EAN-2", desc: "2 digit angka", validate: (t) => /^\d{2}$/.test(t) },
  upc: { name: "UPC-A", desc: "11-12 digit angka", validate: (t) => /^\d{11,12}$/.test(t) },
  itf: { name: "ITF", desc: "Digit angka genap", validate: (t) => /^\d+$/.test(t) && t.length % 2 === 0 },
  msi: { name: "MSI", desc: "Digit angka", validate: (t) => /^\d+$/.test(t) },
  codabar: { name: "Codabar", desc: "Angka + A/B/C/D", validate: (t) => /^[0-9ABCD\-$:/.]+$/i.test(t) },
  pharmacode: { name: "Pharmacode", desc: "Angka 3-131070", validate: (t) => /^\d+$/.test(t) && parseInt(t) >= 3 && parseInt(t) <= 131070 },
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      const typeList = Object.entries(SUPPORTED_TYPES)
        .map(([k, v]) => k + " (" + v.desc + ")")
        .join("\n");
      return m.reply(
        raraWrap("barcode", prefix + "barcode <data>\n" +
        prefix + "barcode <type> <data>\n\n" +
        "Type tersedia:\n" + typeList + "\n\n" +
        "Default type: code128\n\n" +
        "Contoh:\n" +
        prefix + "barcode 1234567890128\n" +
        prefix + "barcode code128 Hello World\n" +
        prefix + "barcode ean13 123456789012\n" +
        prefix + "barcode upc 12345678901", "guide"),
        { title: "Barcode Generator" }
      );
    }

    // Parse type and data
    let type = "code128";
    let data = text;

    const firstWord = text.split(/\s+/)[0].toLowerCase();
    if (SUPPORTED_TYPES[firstWord]) {
      type = firstWord;
      data = text.substring(firstWord.length).trim();
    }

    // Auto-detect EAN13 if data is 12-13 digits and type is code128
    if (type === "code128" && /^\d{12,13}$/.test(data)) {
      type = "ean13";
    }

    if (!data) {
      return m.reply(raraWrap("Barcode", "Data tidak boleh kosong!"));
    }

    // Validate data for type
    const typeInfo = SUPPORTED_TYPES[type];
    if (!typeInfo) {
      return m.reply(raraWrap("Barcode", "Type tidak dikenal!\nKetik " + prefix + "barcode untuk lihat daftar type"));
    }

    if (!typeInfo.validate(data)) {
      return m.reply(raraWrap("Barcode", "Data tidak valid untuk type " + typeInfo.name + "!\n" + typeInfo.desc));
    }
    // Generate barcode via QuickChart API
    const apiUrl = "https://quickchart.io/barcode?type=" + type +
      "&text=" + encodeURIComponent(data) +
      "&format=png&width=400&height=150&displayValue=true&textAlign=center&fontSize=20&margin=10";

    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error("API error: " + res.status);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Verify it's a valid PNG
    if (buffer.length < 100) {
      throw new Error("Buffer too small, mungkin data invalid");
    }
    // Send barcode image
    let card = "";
    try {
      const info = await probeBuffer(buffer);
      card = mediaResultCard({
        header: "barcode",
        type: "gambar",
        request: [["Type", typeInfo.name], ["Data", String(data).slice(0, 80)]],
        size: info.size, mime: info.mime, width: info.width, height: info.height,
      });
    } catch { /* best-effort */ }
    const oldCap = "Type: " + typeInfo.name + " | Data: " + (data.length > 40 ? data.substring(0, 40) + "..." : data);
    await sock.sendMessage(m.chat, {
      image: buffer,
      caption: (card || oldCap),
    }, { quoted: m });

    const out = raraWrap("Barcode Generator", [
      "Type: " + typeInfo.name,
      "Data: " + (data.length > 50 ? data.substring(0, 50) + "..." : data),
      "Format: PNG",
      "Status: Berhasil",
    ].join("\n")) +
    "\n" + tipText(prefix + "barcode <type> <data> untuk type lain");

    await m.react("🐣");
    await sock.sendMessage(m.chat, { text: out });
    return { handled: true };
  } catch (e) {
    await m.react("❌");
    console.error("barcode error:", e);
    return m.reply(raraWrap("Barcode", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
