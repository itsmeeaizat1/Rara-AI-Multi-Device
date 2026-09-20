// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .setkey — Set & lihat semua API key dari 1 tempat
// .setkey — Lihat semua status API key
// .setkey <nama> <value> — Set API key
// .setkey <nama> — Hapus API key (kosongkan)
// .setkey list — Sama dengan .setkey (lihat semua)
import { API_KEYS, getApiKey, hasApiKey, setApiKey, getAllKeyStatus, getMaskedKey } from "../../src/lib/nova-api-keys.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap, tipText } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setkey",
  alias: ["setkey"],
  category: "owner",
  description: "Set & lihat semua API key dari 1 tempat",
  usage: ".setkey — Lihat semua status\n.setkey <nama> <value> — Set key\n.setkey <nama> — Hapus key\n.setkey list — Lihat semua",
  example: ".setkey gemini AIzaXxxxxxxx\n.setkey openai sk-xxxx\n.setkey deepai 8da0-xxxx",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const keyName = (args[0] || "").toLowerCase();
    const keyValue = args.slice(1).join(" ").trim();

    // No args or "list" -> show all
    if (!keyName || keyName === "list") {
      const statuses = getAllKeyStatus();

      const lines = [
        "Central API Key Configuration",
        "",
        "Semua API key di 1 tempat.",
        "Set: " + prefix + "setkey <nama> <value>",
        "Hapus: " + prefix + "setkey <nama>",
        "",
      ];

      // Group by status
      const withKey = statuses.filter(s => s.hasKey);
      const withoutKey = statuses.filter(s => !s.hasKey);

      if (withKey.length > 0) {
        lines.push("Terpasang (" + withKey.length + "):");
        withKey.forEach(s => {
          lines.push("  " + s.label + ": " + getMaskedKey(s.name));
        });
        lines.push("");
      }

      if (withoutKey.length > 0) {
        lines.push("Belum diisi (" + withoutKey.length + "):");
        withoutKey.forEach(s => {
          lines.push("  " + s.label + (s.link ? " — " + s.link : ""));
        });
      }

      lines.push("");
      lines.push("Nama key tersedia:");
      lines.push(Object.keys(API_KEYS).map(k => "  " + k).join("\n"));
      lines.push("");
      lines.push(tipText(prefix + "setkey <nama> <value> untuk set key"));
      lines.push("");
      lines.push("PUSAT FILE: src/lib/apikey/apikeys.json — semua key (AI, scraper, fitur) satu file, tiap key ada komentar fiturnya. .setkey simpan di db & menimpa file itu.");;

      const text = claraWrap("API Keys", lines.join("\n"));
      await m.reply( text, "setkey");
      return { handled: true };
    }

    // Check if key name is valid
    if (!API_KEYS[keyName]) {
      const validNames = Object.keys(API_KEYS).join(", ");
      const text = claraWrap("API Keys", [
        "Nama key tidak dikenal: " + keyName,
        "",
        "Key tersedia:",
        validNames,
        "",
        "Ketik " + prefix + "setkey untuk lihat semua status",
      ].join("\n"));
      await m.reply( text, "setkey");
      return { handled: true };
    }

    const keyDef = API_KEYS[keyName];

    // No value -> delete key
    if (!keyValue) {
      setApiKey(keyName, "");
      const text = claraWrap("API Keys", [
        "Key dihapus: " + keyDef.label,
        "",
        "Key " + keyName + " berhasil dihapus dari runtime DB",
        "Untuk set ulang: " + prefix + "setkey " + keyName + " <value>",
      ].join("\n"));
      await m.reply( text, "setkey");
      return { handled: true };
    }

    // Set key
    setApiKey(keyName, keyValue);

    const text = claraWrap("API Keys", [
      "Key disimpan: " + keyDef.label,
      "",
      "Nama: " + keyName,
      "Value: " + keyValue.slice(0, 6) + "..." + keyValue.slice(-4),
      "Deskripsi: " + keyDef.description,
      "",
      "Dipakai oleh:",
      keyDef.usedBy.map(u => "  " + u).join("\n"),
      "",
      "Key tersimpan di runtime DB. Bot restart? Tetap aman.",
      ...(keyDef.getLink() ? ["Daftar key: " + keyDef.getLink()] : []),
    ].join("\n"));

    await m.reply( text, "setkey");
  } catch (e) {
    await m.reply(claraWrap("setkey", "Gagal proses. Coba lagi.", "error"));
  }
  return { handled: true };
}

export { pluginConfig as config, handler };
