// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { DEFAULT_PROVIDERS } from "../../src/lib/nova-ai-service.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginConfig = {
  name: "ai-addprovider",
  alias: ["ai-addprovider", "addprovider", "addai", "tambahprovider", "newai"],
  category: "ai",
  description: "Tambah provider AI custom lewat chat",
  usage: ".ai-addprovider <nama> <endpoint> <model> <apiKey?>",
  example: ".ai-addprovider myai https://example.com/chat gpt-4o-mini sk-xxx",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function getCustomProviders() {
  try {
    const db = getDatabase();
    const data = db.get("aiCustomProviders");
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function setCustomProviders(providers) {
  try {
    const db = getDatabase();
    db.set("aiCustomProviders", providers);
  } catch (e) { console.error('[ai-addprovider.js]:', e.message); }
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const action = (parts[1] || "").toLowerCase();

    if (!action || action === "list" || action === "daftar") {
      const custom = getCustomProviders();
      const builtinLines = Object.entries(DEFAULT_PROVIDERS).map(([key, provider]) => {
        const models = (provider.models || []).slice(0, 3).join(", ");
        return `• ${provider.name} (${key})\n  Model: ${models}\n  Default: ${provider.defaultModel}`;
      });

      const customLines = Object.keys(custom).length
        ? Object.entries(custom).map(([key, provider]) => {
            const models = Array.isArray(provider.models) ? provider.models.slice(0, 3).join(", ") : provider.model || "-";
            return `• ${provider.name || key} (${key})\n  Model: ${models}\n  Default: ${provider.defaultModel || provider.model || "-"}`;
          })
        : ["• (belum ada provider custom)"];

      const text = claraWrap("AI Providers",
        "🤖 BAWAAN:\n" + builtinLines.join("\n") +
        "\n\n➕ CUSTOM:\n" + customLines.join("\n") +
        "\n\n📋 PAKAI:\n" +
        `  ┊  ➶ *${prefix}ai-addprovider list* — lihat semua provider\n` +
        `  ┊  ➶ *${prefix}ai-addprovider <nama> <endpoint> <model> [apiKey]* — tambah provider\n` +
        `  ┊  ➶ Contoh: *${prefix}ai-addprovider myai https://example.com/chat gpt-4o-mini sk-xxx*\n` +
        `  ┊  ➶ Untuk hapus: *${prefix}ai-addprovider delete <nama>*`
      );

      await m.reply(text);
      return { handled: true };
    }

    if (action === "delete" || action === "del" || action === "remove") {
      const key = String(parts[2] || "").trim().toLowerCase();
      if (!key) {
        const text =
          claraWrap("Hapus Provider", [`  ┊  ➶ Nama provider tidak boleh kosong.`,
            `  ┊  ➶ Contoh: *${prefix}ai-addprovider delete myai*`].join("\n")) +
          "\n" +
          tipText(`Ketik ${prefix}menu untuk kembali`);

        await m.reply(text);
        return { handled: true };
      }

      const custom = getCustomProviders();
      if (!custom[key]) {
        const text =
          claraWrap("Tidak Ditemukan", [`  ┊  ➶ Provider *${key}* tidak ditemukan.`,
            `  ┊  ➶ Ketik *${prefix}ai-addprovider list* untuk lihat daftar.`].join("\n")) +
          "\n" +
          tipText(`Ketik ${prefix}menu untuk kembali`);

        await m.reply(text);
        return { handled: true };
      }

      delete custom[key];
      setCustomProviders(custom);

      const text =
        claraWrap("AI Providers", [`  ┊  ➶ Provider *${key}* sudah dihapus.`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}ai-addprovider list untuk cek sisa provider`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

      await m.reply(text);
      return { handled: true };
    }

    const name = String(action).trim();
    const endpoint = String(parts[2] || "").trim();
    const model = String(parts[3] || "").trim();
    const apiKey = String(parts[4] || "").trim();

    if (!name || !endpoint || !model) {
      const text =
        claraWrap("Cara Pakai", [`  ┊  ➶ Penggunaan: *${prefix}ai-addprovider <nama> <endpoint> <model> [apiKey]*`,
          `  ┊  ➶ Contoh: *${prefix}ai-addprovider myai https://example.com/chat gpt-4o-mini sk-xxx*`,
          `  ┊  ➶ Lihat daftar: *${prefix}ai-addprovider list*`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text);
      return { handled: true };
    }

    const custom = getCustomProviders();
    custom[name.toLowerCase()] = {
      name: name,
      endpoint,
      model,
      apiKey,
      defaultModel: model,
      models: [model],
      supportsVision: false,
      supportsSystem: true,
    };
    setCustomProviders(custom);

    const text =
      claraWrap("AI Providers", [`  ┊  ➶ Nama: *${name}*`,
        `  ┊  ➶ Endpoint: *${endpoint}*`,
        `  ┊  ➶ Model: *${model}*`,
        `  ┊  ➶ API Key: *${apiKey ? "Tersimpan" : "Kosong"}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}multi-ai ${name} <pesan> untuk mencoba`) +
      "\n" +
      tipText(`Ketik ${prefix}ai-addprovider list untuk lihat semua provider`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`  ┊  ➶ Status: *Gagal*`,
        `  ┊  ➶ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await m.reply(text);
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
