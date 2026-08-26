// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Photo Filter — 15 filter foto via sharp (local, no API needed)
// Efek: grayscale, sepia, invert, blur, sharpen, vintage, cold, warm, dark, bright, neon, vintage2, dramatik, pastel, noir
import sharp from "sharp";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "photofilter",
  alias: ["photofilter"],
  category: "tools",
  description: "Photo Filter — 15 efek foto langsung dari HP, no API, lokal",
  usage: ".photofilter <efek> (reply gambar)\n.photofilter list — Lihat semua efek",
  example: ".photofilter sepia (reply gambar)\n.photofilter vintage (reply gambar)",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const FILTERS = {
  grayscale: { label: "Grayscale", desc: "Hitam putih klasik" },
  sepia: { label: "Sepia", desc: "Nuansa coklat retro" },
  invert: { label: "Invert", desc: "Warna terbalik (negatif)" },
  blur: { label: "Blur", desc: "Efek blur halus" },
  sharpen: { label: "Sharpen", desc: "Tajamkan detail" },
  vintage: { label: "Vintage", desc: "Nuansa retro tahun 70an" },
  cold: { label: "Cold", desc: "Tone dingin kebiruan" },
  warm: { label: "Warm", desc: "Tone hangat kekuningan" },
  dark: { label: "Dark", desc: "Gelap dramatik" },
  bright: { label: "Bright", desc: "Terang cerah" },
  neon: { label: "Neon", desc: "Efek neon glow" },
  dramatik: { label: "Dramatik", desc: "Kontras tinggi dramatik" },
  pastel: { label: "Pastel", desc: "Lembut pastel" },
  noir: { label: "Noir", desc: "Film noir hitam putih" },
  cyberpunk: { label: "Cyberpunk", desc: "Tone neon cyberpunk" },
};

// Apply filter using sharp
async function applyFilter(buffer, filterKey) {
  let img = sharp(buffer, { failOn: "none" });
  const meta = await img.metadata();

  switch (filterKey) {
    case "grayscale":
      img = img.grayscale().modulate({ brightness: 1.05 });
      break;

    case "sepia":
      img = img.recombine([
        { alpha: 0.393, R: 0.393, G: 0.769, B: 0.189 },
        { alpha: 0.349, R: 0.349, G: 0.686, B: 0.168 },
        { alpha: 0.272, R: 0.272, G: 0.534, B: 0.131 },
      ]).modulate({ brightness: 1.05, saturation: 0.8 });
      break;

    case "invert":
      img = img.negate();
      break;

    case "blur":
      img = img.blur(8);
      break;

    case "sharpen":
      img = img.sharpen({ sigma: 2, m1: 1, m2: 2 });
      break;

    case "vintage":
      img = img
        .modulate({ brightness: 1.1, saturation: 0.75 })
        .tint({ r: 255, g: 230, b: 200 })
        .blur({ sigma: 0.3 })
        .recombine([
          { alpha: 1, R: 0.9, G: 0.85, B: 0.75 },
          { alpha: 1, R: 0.85, G: 0.88, B: 0.8 },
          { alpha: 1, R: 0.75, G: 0.8, B: 0.9 },
        ]);
      break;

    case "cold":
      img = img.modulate({ brightness: 0.95, saturation: 1.1 }).tint({ r: 200, g: 220, b: 255 });
      break;

    case "warm":
      img = img.modulate({ brightness: 1.05, saturation: 1.15 }).tint({ r: 255, g: 220, b: 180 });
      break;

    case "dark":
      img = img.modulate({ brightness: 0.65, saturation: 1.1 }).clahe({ width: 3, height: 3 });
      break;

    case "bright":
      img = img.modulate({ brightness: 1.35, saturation: 1.05 });
      break;

    case "neon":
      img = img
        .modulate({ brightness: 1.1, saturation: 1.8 })
        .tint({ r: 180, g: 100, b: 255 })
        .sharpen({ sigma: 1.5 });
      break;

    case "dramatik":
      img = img
        .modulate({ brightness: 0.9, saturation: 1.3 })
        .clahe({ width: 5, height: 5 })
        .sharpen({ sigma: 1.5, m1: 2, m2: 1 });
      break;

    case "pastel":
      img = img.modulate({ brightness: 1.15, saturation: 0.55 }).tint({ r: 255, g: 245, b: 250 });
      break;

    case "noir":
      img = img
        .grayscale()
        .modulate({ brightness: 0.95 })
        .clahe({ width: 4, height: 4 })
        .sharpen({ sigma: 1.5 });
      break;

    case "cyberpunk":
      img = img
        .modulate({ brightness: 0.95, saturation: 1.6 })
        .tint({ r: 150, g: 80, b: 255 })
        .recombine([
          { alpha: 1, R: 1.1, G: 0.9, B: 1.2 },
          { alpha: 1, R: 0.95, G: 1, B: 1 },
          { alpha: 1, R: 0.8, G: 0.9, B: 1.15 },
        ]);
      break;

    default:
      throw new Error("Filter tidak ditemukan: " + filterKey);
  }

  return await img
    .png({ quality: 90 })
    .toBuffer();
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const input = (args[0] || "").toLowerCase().trim();

    if (input === "list" || !input || input === "help") {
      const lines = [
        "15 FILTER FOTO (Local, no API)",
        "Gratis, cepat, langsung dari HP",
        "",
      ];
      let i = 1;
      for (const [key, f] of Object.entries(FILTERS)) {
        lines.push(i + ". " + f.label + " (" + key + ")");
        lines.push("   " + f.desc);
        i++;
      }
      lines.push("");
      lines.push("CARA PAKAI:");
      lines.push("Reply gambar lalu ketik:");
      lines.push(usedPrefix + "photofilter <efek>");
      lines.push("");
      lines.push("Contoh: " + usedPrefix + "photofilter vintage");
      return m.reply(claraWrap("Photo Filter", lines, "info"));
    }

    // Validate filter
    if (!FILTERS[input]) {
      const available = Object.keys(FILTERS).join(", ");
      return m.reply(claraWrap("Photo Filter", [
        "Efek tidak ditemukan: " + input,
        "",
        "Tersedia: " + available,
        "",
        "Ketik " + usedPrefix + "photofilter list untuk lihat semua",
      ], "warn"));
    }

    // Get image from reply
    const q = m.quoted || m;
    const mime = q.message?.[Object.keys(q.message)[0]]?.mimetype || "";
    if (!mime || !mime.startsWith("image/")) {
      return m.reply(claraWrap("Photo Filter", [
        "Reply gambar dulu, lalu ketik:",
        usedPrefix + "photofilter " + input,
        "",
        "Filter yang dipilih: " + FILTERS[input].label,
      ], "warn"));
    }

    // Download image
    m.reply(claraWrap("Photo Filter", "Sedang processing " + FILTERS[input].label + "..."));

    const imgBuffer = await q.download();
    if (!imgBuffer || imgBuffer.length === 0) {
      return m.reply(claraWrap("Photo Filter", "Gagal download gambar. Coba lagi.", "warn"));
    }

    // Apply filter
    const result = await applyFilter(imgBuffer, input);

    if (!result || result.length === 0) {
      return m.reply(claraWrap("Photo Filter", "Gagal processing filter. Format gambar tidak didukung.", "warn"));
    }

    // Send result
    await conn.sendMessage(
      m.key.remoteJid,
      {
        image: result,
        caption: claraWrap("Photo Filter", [
          "Filter: " + FILTERS[input].label,
          "Efek: " + input,
          "Powered by sharp (local)",
        ], "info"),
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("[PhotoFilter]", e);
    m.reply(claraWrap("Photo Filter", [
      "Error: " + e.message,
      "",
      "Kemungkinan:",
      "1. Format gambar tidak didukung",
      "2. Ukuran terlalu besar (max 10MB)",
      "3. Coba gambar lain",
    ], "warn"));
  }
}

export { pluginConfig as config, handler };
