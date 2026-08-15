// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { 
  separator,
  tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";
import { DEFAULT_PROVIDERS, resolveProvider } from "../../src/lib/nova-ai-service.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

const pluginConfig = {
  name: "aichat-model",
  alias: ["aichat-model", "aichatmodel", "modelai", "aimodel", "switchmodel"],
  category: "ai",
  description: "Cek atau ganti model AI untuk chat",
  usage: ".aichat-model list | .aichat-model <provider> <model>",
  example: ".aichat-model gemini gemini-1.5-pro",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const providerArg = (parts[1] || "").toLowerCase();
    const modelArg = (parts[2] || "").trim();

    if (!providerArg || providerArg === "list" || providerArg === "daftar") {
      const lines = Object.entries(DEFAULT_PROVIDERS).map(([key, provider]) => {
        const models = (provider.models || []).map((model) => `• ${model}`).join("\n");
        return `${provider.name} (${key})\nDefault: ${provider.defaultModel}\n${models}`;
      });

      const text =
        claraWrap("AI Model", [...lines.flatMap((line, index) => [line, index < lines.length - 1 ? "" : null].join("\n")).filter(Boolean),
        ]) +
        "\n\n" +
        claraWrap("ᴘᴀᴋᴀɪ", [`◦ *${prefix}aichat-model list* — lihat daftar model`, `◦ *${prefix}aichat-model <provider> <model>* — ganti model aktif`, `◦ Contoh: *${prefix}aichat-model gemini gemini-1.5-pro*`].join("\n")) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "aichat-model");
      return { handled: true };
    }

    const provider = resolveProvider(providerArg, {});
    if (!provider) {
      const text =
        claraWrap("Tidak Dikenal", [`◦ Provider *${providerArg}* tidak dikenali.`,
          `◦ Ketik *${prefix}aichat-model list* untuk lihat daftar.`].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await sendReplyWithNav(sock, m, text, "aichat-model");
      return { handled: true };
    }

    if (!modelArg || !(provider.models || []).includes(modelArg)) {
      const text =
        claraWrap("Model Tidak Valid", [`◦ Model *${modelArg || ""}* tidak tersedia untuk provider *${providerArg}*.`,
          `◦ Model tersedia: *${(provider.models || [].join("\n")).join(", ")}*`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Ketik ${prefix}aichat-model list untuk lihat daftar`) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

      await sendReplyWithNav(sock, m, text, "aichat-model");
      return { handled: true };
    }

    if (!m.isOwner) {
      const text =
        claraWrap("Ditolak", ["◦ Status: *Ditolak*",
          "◦ Alasan: *Hanya owner yang bisa mengganti model AI.*"].join("\n")) +
        "\n" +
        tipText(`Ketik ${prefix}menu untuk kembali`);

      await m.reply(text);
      return { handled: true };
    }

    if (!botConfig.aiHelp) botConfig.aiHelp = {};
    botConfig.aiHelp.provider = providerArg;
    botConfig.aiHelp.model = modelArg;

    const text =
      claraWrap("AI Model", [`◦ Provider: *${providerArg}*`,
        `◦ Model: *${modelArg}*`,
        "◦ Perubahan akan berlaku setelah config reload."].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali ke menu utama`);

    await m.reply(text);
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const text =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, text, "aichat-model");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
