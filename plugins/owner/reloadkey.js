// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// .reloadkey — Reload SEMUA API key dari pusat file apikeys.json
//   tanpa restart bot. PUSAT KEY (request owner 17 Sep 2026):
//   src/lib/apikey/apikeys.json — tiap key ada komentar _note_<nama>
//   yang jelasin dipakai fitur apa (haidar, ikyy, zelapi, dll).
// .reloadkey — reload key tanpa restart
// .reloadkey status — cek key mana yang aktif (masked)
import { reloadKeys } from "../../src/lib/config/env-loader.js";
import { getAllKeyStatus, getMaskedKey } from "../../src/lib/rara-api-keys.js";
import { raraError, raraWrap, tipText } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "reloadkey",
  alias: ["reloadkey", "refreshkey"],
  category: "owner",
  description: "Reload API key dari apikeys.json tanpa restart bot",
  usage: ".reloadkey — Reload key\n.reloadkey status — Cek key aktif (masked)",
  example: ".reloadkey",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { config: botConfig }) {
  const prefix = botConfig.command?.prefix || ".";
  try {
    const args = (m.text || "").trim().split(/\s+/);
    const sub = (args[0] || "").toLowerCase();

    if (sub === "status") {
      const statuses = getAllKeyStatus();
      const withKey = statuses.filter((s) => s.hasKey);
      const lines = [
        "API Key Aktif (" + withKey.length + "/" + statuses.length + ")",
        "",
        ...withKey.map((s) => "  " + s.label + ": " + getMaskedKey(s.name)),
        "",
        "File pusat: src/lib/apikey/apikeys.json",
      ];
      return m.reply(raraWrap(lines.join("\n")));
    }

    reloadKeys();
    return m.reply(
      raraWrap(
        "Semua API key di-reload dari src/lib/apikey/apikeys.json.\n\n" +
          "Fitur AI/downloader langsung pakai key baru — tanpa restart.\n\n" +
          tipText(prefix + "reloadkey status — lihat key aktif")
      )
    );
  } catch (err) {
    return m.reply(raraError("reload key", err?.message || String(err)));
  }
}

export { pluginConfig as config, handler };
export default { pluginConfig, handler };
