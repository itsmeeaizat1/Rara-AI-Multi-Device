// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import config from "../../config.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setclipdrop",
  alias: ["setclipdrop", "clipdropkey", "setclipdropkey", "clipdropapi"],
  category: "owner",
  description: "Set ClipDrop API key untuk fitur watermark remover (.nowm)",
  usage: ".setclipdrop <key> | .setclipdrop status | .setclipdrop reset",
  example: ".setclipdrop abc123def456",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function updateConfigKey(key, value) {
  try {
    const configPath = path.join(process.cwd(), "config.js");
    let content = fs.readFileSync(configPath, "utf8");

    // Cari pattern clipdropApiKey: "..." di dalam AI config section
    const regex = /clipdropApiKey:\s*["'].*?["']/;
    if (regex.test(content)) {
      content = content.replace(regex, `clipdropApiKey: "${value}"`);
    } else {
      // Kalau belum ada, tambah setelah anthropicApiKey
      const anthRegex = /(anthropicApiKey:\s*["'].*?["']\s*,)/;
      if (anthRegex.test(content)) {
        content = content.replace(
          anthRegex,
          `$1\n    // ClipDrop API key untuk watermark remover (.nowm)\n    clipdropApiKey: "${value}",`,
        );
      } else {
        return false;
      }
    }

    fs.writeFileSync(configPath, content, "utf8");
    return true;
  } catch (e) {
    console.error("[SetClipDrop] Failed to save:", e.message);
    return false;
  }
}

async function handler(m, { sock }) {
  const input = m.text?.trim() || "";

  if (!input) {
    return m.reply( claraWrap("Set ClipDrop API", [
      "Atur ClipDrop API key untuk fitur .nowm (watermark remover).",
      "",
      "CARA PAKAI:",
      m.prefix + "setclipdrop <key> — Set API key",
      m.prefix + "setclipdrop status — Cek status API key",
      m.prefix + "setclipdrop reset — Hapus API key",
      "",
      "DAPAT API KEY:",
      "1. Buka clipdrop.co/apis",
      "2. Login/daftar (gratis 100 credits)",
      "3. Klik 'Get API Key'",
      "4. Copy key, jalankan .setclipdrop <key>",
    ].join("\n")), "setclipdrop");
  }

  const sub = input.toLowerCase().split(" ")[0];

  // Status check
  if (sub === "status") {
    const key = config.ai?.clipdropApiKey || config.clipdropApiKey || "";
    const masked = key ? key.substring(0, 8) + "..." + key.substring(key.length - 4) : "(belum diset)";
    return m.reply(claraWrap("ClipDrop API Status", [
      "API Key: " + masked,
      "Status: " + (key ? "Aktif" : "Belum diset"),
      "Credits: " + (key ? "Cek via .nowm" : "-"),
      "",
      "Tanpa API key, .nowm pakai local mode (hasil lebih kasar).",
      "Dengan API key, .nowm pakai ClipDrop AI (hasil lebih bersih).",
    ].join("\n")));
  }

  // Reset
  if (sub === "reset" || sub === "hapus" || sub === "delete") {
    const ok = updateConfigKey(null, "");
    if (ok) {
      if (config.ai) config.ai.clipdropApiKey = "";
      config.clipdropApiKey = "";
      return m.reply(claraWrap("ClipDrop API", "API key berhasil dihapus. .nowm sekarang pakai local mode."));
    }
    return m.reply(claraWrap("ClipDrop API", "Gagal menghapus API key. Coba lagi."));
  }

  // Set key
  const key = input.split(" ")[0];
  if (!key || key.length < 10) {
    return m.reply(claraWrap("ClipDrop API", "API key tidak valid. Pastikan key benar (minimal 10 karakter)."));
  }

  // Jangan tampilkan key penuh di chat
  const ok = updateConfigKey("clipdropApiKey", key);
  if (ok) {
    // Update runtime config
    if (config.ai) config.ai.clipdropApiKey = key;
    config.clipdropApiKey = key;

    const masked = key.substring(0, 8) + "..." + key.substring(key.length - 4);
    m.react("🐣");
    return m.reply(claraWrap("ClipDrop API", [
      "API key berhasil disimpan!",
      "Key: " + masked,
      "",
      "Sekarang .nowm akan pakai ClipDrop AI untuk hasil yang lebih bersih.",
      "Free credits: 100 gambar (clipdrop.co/apis).",
      "",
      "Coba: reply gambar + .nowm",
    ].join("\n")));
  }

  m.react("❌");
  return m.reply(claraWrap("ClipDrop API", "Gagal menyimpan API key. Pastikan config.js writable."));
}

export { pluginConfig as config, handler };
