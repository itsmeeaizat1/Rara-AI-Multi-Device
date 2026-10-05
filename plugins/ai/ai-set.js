// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .ai-set (alias .ai) — panel pengaturan AI.
// REWORK DESAIN 2026-09-11 (owner: "fitur .ai berantakan keliatannya"):
// - panel = raraInfoSections (「 ✦ section ✦ 」 label smallcaps : value verbatim)
// - konfirmasi = raraBox 「 ✦ AI Settings ✦ 」 + "Berhasil kak 🥳"
// - salah pemakaian/value kosong = raraSalah (singkat, tanpa box)
// - aksi owner ditolak / error = raraError
import {
  raraError, raraSalah, raraBerhasil,
  raraInfoSections, raraBox, toSC,
} from "../../src/lib/rara-menu-style.js";
import { sendUsageCard } from "../../src/lib/rara-menu-card.js";
import { DEFAULT_PROVIDERS, resolveProvider } from "../../src/lib/rara-ai-service.js";
import { getDatabase } from "../../src/lib/rara-database.js";

const pluginConfig = {
  name: "ai-set",
  alias: ["ai-set", "ai"],
  category: "ai",
  description: "Set pengaturan AI lewat chat (apiKey, endpoint, model, provider)",
  usage: ".ai-set — panel status & daftar perintah\n.ai-set provider <nama> — ganti provider\n.ai-set model <model> — ganti model\n.ai-set apiKey [openai|gemini|anthropic] <key> — set API key\n.ai-set endpoint <url> — set endpoint\n.ai-set prompt <teks> — set system prompt\n.ai-set on/off — nyalakan/matikan AI\n.ai-set browsing on/off — auto-browsing AI satuan\n.ai-set mode offline/online — ganti mode",
  example: ".ai-set provider gemini\n.ai-set model gpt-4o-mini\n.ai-set apiKey openai sk-xxx",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// ─── Konfirmasi sukses: 「 ✦ AI Settings ✦ 」 + label : value + Berhasil ───
function okBox(lines) {
  return raraBox("AI Settings", [...lines, "", raraBerhasil()]);
}

// ─── Panel utama: status + key + provider tersedia + daftar perintah ───
function buildStatusPanel(prefix, aiHelpConfig = {}) {
  const enabled = aiHelpConfig.enabled !== false;
  const apiKey = String(aiHelpConfig.apiKey || "");
  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : "Belum diisi";
  const prompt = String(aiHelpConfig.systemPrompt || "-");
  const promptShort = prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt;
  const keyStatus = (k) => (aiHelpConfig[`${k}ApiKey`] ? "Terpasang ✅" : "Belum ❌");

  const info = [
    "AI Settings",
    { label: "Status", value: enabled ? "ON ✅" : "OFF ❌" },
    { label: "Provider", value: String(aiHelpConfig.provider || "openai") },
    { label: "Model", value: String(aiHelpConfig.model || "gpt-4o-mini") },
    { label: "Mode", value: String(aiHelpConfig.mode || "online") },
    { label: "Endpoint", value: String(aiHelpConfig.apiEndpoint || "https://api.openai.com/v1/chat/completions") },
    { label: "API Key", value: maskedKey },
    { label: "System Prompt", value: promptShort },
    "Key Terpasang",
    { label: "OpenAI", value: keyStatus("openai") },
    { label: "Gemini", value: keyStatus("gemini") },
    { label: "Anthropic", value: keyStatus("anthropic") },
    "Provider Tersedia",
    ...Object.entries(DEFAULT_PROVIDERS).map(([key, p]) => ({
      label: key,
      value: `${p.name} — ${p.defaultModel}`,
    })),
  ];

  const cmdLines = [
    `${prefix}ai-set provider <nama> — ganti provider aktif`,
    `${prefix}ai-set model <model> — ganti model`,
    `${prefix}ai-set apiKey <key> — set API key fallback`,
    `${prefix}ai-set apiKey openai|gemini|anthropic <key> — set key per provider`,
    `${prefix}ai-set endpoint <url> — set endpoint`,
    `${prefix}ai-set prompt <teks> — set system prompt`,
    `${prefix}ai-set on/off — nyalakan/matikan AI`,
    `${prefix}ai-set mode offline/online — ganti mode`,
    `${prefix}ai-addprovider — tambah provider custom`,
  ];

  // raraInfoSections udah diakhiri \n — cukup 1 \n biar cuma 1 baris kosong pemisah
  return raraInfoSections(info) + "\n" + raraBox("Perintah", cmdLines);
}

async function handler(m, { sock, config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const raw = (m.text || "").trim();
    const parts = raw.split(/[ \t]+/).filter(Boolean);
    const action = (parts[1] || "").toLowerCase();
    const value = parts.slice(2).join(" ").trim();

    if (!action || action === "list" || action === "daftar" || action === "status") {
      await m.react("🐣");
      await m.reply(buildStatusPanel(prefix, botConfig.aiHelp || {}));
      return { handled: true };
    }

    if (action === "provider") {
      const providerArg = String(value || "").toLowerCase();
      const provider = resolveProvider(providerArg, {});
      if (!provider) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "provider gak dikenal — ketik .ai-set list buat lihat daftarnya"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.provider = providerArg;
      botConfig.aiHelp.model = provider.defaultModel;
      await m.react("🐣");
      await m.reply(okBox([
        `${toSC("Provider")} : ${providerArg}`,
        `${toSC("Model")} : ${provider.defaultModel}`,
      ]));
      return { handled: true };
    }

    if (action === "model") {
      const modelArg = String(value || "").trim();
      if (!modelArg) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "modelnya belum ditulis"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.model = modelArg;
      await m.react("🐣");
      await m.reply(okBox([`${toSC("Model")} : ${modelArg}`]));
      return { handled: true };
    }

    if (action === "apikey") {
      // Support: .ai-set apiKey <key>  OR  .ai-set apiKey openai <key>
      const valueParts = String(value || "").trim().split(/[ \t]+/);
      let fmtKey = null;
      let apiKey = value;

      if (valueParts.length >= 2 && ["openai", "gemini", "anthropic"].includes(valueParts[0].toLowerCase())) {
        fmtKey = valueParts[0].toLowerCase();
        apiKey = valueParts.slice(1).join(" ").trim();
      }

      if (!apiKey) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "api key-nya belum ditulis"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      if (fmtKey) {
        botConfig.aiHelp[`${fmtKey}ApiKey`] = apiKey;
      } else {
        botConfig.aiHelp.apiKey = apiKey;
      }
      const keyLabel = fmtKey ? `${fmtKey.charAt(0).toUpperCase() + fmtKey.slice(1)} API Key` : "API Key";
      await m.react("🐣");
      await m.reply(okBox([`${toSC(keyLabel)} : disembunyikan 🔒`]));
      return { handled: true };
    }

    if (action === "endpoint") {
      const endpoint = String(value || "").trim();
      if (!endpoint) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "endpoint-nya belum ditulis"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.apiEndpoint = endpoint;
      await m.react("🐣");
      await m.reply(okBox([`${toSC("Endpoint")} : ${endpoint}`]));
      return { handled: true };
    }

    if (action === "prompt") {
      const prompt = String(value || "").trim();
      if (!prompt) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "prompt-nya belum ditulis"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.systemPrompt = prompt;
      const shown = prompt.length > 100 ? `${prompt.slice(0, 100)}...` : prompt;
      await m.react("🐣");
      await m.reply(okBox([`${toSC("System Prompt")} : ${shown}`]));
      return { handled: true };
    }

    // AI SATUAN RICH (owner 21 Sep 2026): toggle auto-browsing buat AI satuan
    if (action === "browsing") {
      if (!m.isOwner) {
        await m.reply(raraError("ai-set", "khusus owner — hanya owner yang bisa mengatur browsing"));
        return { handled: true };
      }
      const v = String(value || "").toLowerCase();
      if (v !== "on" && v !== "off") {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "nilai-nya cuma on atau off — contoh: " + prefix + "ai-set browsing off"), { name: "ai-set" });
        return { handled: true };
      }
      const db = getDatabase();
      db.setting("aiSatuanBrowse", v === "on");
      db.save?.();
      await m.react("🐣");
      await m.reply(okBox([
        `${toSC("Fitur")} : Auto-browsing AI satuan`,
        `${toSC("Status")} : ${v.toUpperCase()}`,
        "",
        v === "off"
          ? "Pertanyaan berita/terbaru gak otomatis browsing — flag --search tetap jalan."
          : "Pertanyaan berita/terbaru/jadwal otomatis ditambah hasil browsing.",
      ]));
      return { handled: true };
    }

    if (action === "on" || action === "off") {
      if (!m.isOwner) {
        await m.reply(raraError("ai-set", "khusus owner — hanya owner yang bisa menyalakan/mematikan AI"));
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.enabled = action === "on";
      await m.react("🐣");
      await m.reply(okBox([`${toSC("Status")} : ${action.toUpperCase()}`]));
      return { handled: true };
    }

    if (action === "mode") {
      if (!m.isOwner) {
        await m.reply(raraError("ai-set", "khusus owner — hanya owner yang bisa mengganti mode AI"));
        return { handled: true };
      }
      const newMode = String(value || "").toLowerCase();
      if (!["offline", "online"].includes(newMode)) {
        await await sendUsageCard(sock, m, raraSalah("ai-set", "mode-nya cuma offline atau online"), { name: "ai-set" });
        return { handled: true };
      }
      if (!botConfig.aiHelp) botConfig.aiHelp = {};
      botConfig.aiHelp.mode = newMode;
      await m.react("🐣");
      await m.reply(okBox([`${toSC("Mode")} : ${newMode.toUpperCase()}`]));
      return { handled: true };
    }

    await await sendUsageCard(sock, m, raraSalah("ai-set", `aksi ${action} gak dikenal`), { name: "ai-set" });
  } catch (error) {
    await m.reply(raraError("ai-set", error.message));
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
