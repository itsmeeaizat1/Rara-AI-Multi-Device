import {
  alyaHeader,
  bracketBox,
  separator,
  tipText,
} from "../../src/lib/nova-menu-style.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import config from "../../config.js";

const pluginConfig = {
  name: "aigrup",
  alias: ["aig"],
  category: "ai",
  description: "Toggle AI grup - bot nimbrung otomatis di grup (atur dari DM)",
  usage: ".aigrup on/off/status",
  example: ".aigrup on\n.aigrup off\n.aigrup status",
  isOwner: false,
  isPremium: false,
  isGroup: false,  // Hanya bisa dari DM
  isPrivate: true,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const args = (m.text || "").replace(/^\.aigrup\s+/i, "").replace(/^\.aig\s+/i, "").trim().split(/[ \t]+/).filter(Boolean);
    const subcmd = (args[0] || "").toLowerCase();

    const db = getDatabase();
    if (!db?.db?.data) return m.reply("❌ Database belum siap.");
    if (!db.db.data.aigrup) db.db.data.aigrup = { enabled: false, groups: {}, probability: 20 };

    const aigrup = db.db.data.aigrup;
    const aiHelp = botConfig.aiHelp || {};
    const apiKey = aiHelp.openaiApiKey || aiHelp.apiKey || process.env.OPENAI_API_KEY || "";

    // ═══ status ═══
    if (subcmd === "status" || !subcmd) {
      const enabledGroups = Object.entries(aigrup.groups || {}).filter(([, v]) => v).map(([k]) => k);
      const text =
        alyaHeader("AI Grup Status", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ꜱᴛᴀᴛᴜꜱ", [
          `◦ Global: *${aigrup.enabled ? "ON ✅" : "OFF ❌"}*`,
          `◦ Grup aktif: *${enabledGroups.length}*`,
          `◦ Probability: *${aigrup.probability}%*`,
          `◦ API Key: *${apiKey ? "Terpasang ✅" : "Belum ❌"}*`,
          `◦ Model: *${aiHelp.openaiModel || aiHelp.model || "deepseek-v4-flash:free"}*`,
        ]) +
        "\n\n" +
        bracketBox("📋", "ᴄᴏᴍᴍᴀɴᴅ", [
          `◦ *${prefix}aigrup on* — aktifkan nimbrung`,
          `◦ *${prefix}aigrup off* — matikan nimbrung`,
          `◦ *${prefix}aigrup prob <0-100>* — atur probability`,
          `◦ *${prefix}aigrup list* — lihat grup aktif`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText("Atur ini hanya dari chat pribadi, bukan di grup");
      await m.reply(text);
      return { handled: true };
    }

    // ═══ ON ═══
    if (subcmd === "on") {
      // Cek apakah ini dari grup → tolak
      if (m.isGroup) {
        const text =
          alyaHeader("Ditolak", "🚫") +
          "\n\n" +
          bracketBox("🚫", "ᴇʀʀᴏʀ", [
            `◦ Toggle AI Grup hanya bisa dari *chat pribadi*`,
            `◦ Bukan dari dalam grup`,
            `◦ Alasan: keamanan agar tidak sembarang orang mengaktifkan`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      if (!apiKey) {
        const text =
          alyaHeader("API Key Belum Diisi", "⚠️") +
          "\n\n" +
          bracketBox("⚠️", "ᴇʀʀᴏʀ", [
            `◦ API Key belum di-set di config`,
            `◦ Set di config.js: aiHelp.openaiApiKey`,
            `◦ Atau: aiHelp.apiKey (fallback)`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      aigrup.enabled = true;
      db.save();

      const text =
        alyaHeader("AI Grup Aktif", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴀᴋᴛɪꜰ", [
          `◦ Status: *ON*`,
          `◦ Bot akan nimbrung di semua grup`,
          `◦ Probability: *${aigrup.probability}%*`,
          `◦ Model: *${aiHelp.openaiModel || aiHelp.model || "deepseek-v4-flash:free"}*`,
          `◦ Bot selalu respon kalau di-tag/reply`,
        ]) +
        "\n\n" +
        bracketBox("💡", "ᴄᴀʀᴀ ᴋᴇʀᴊᴀ", [
          `◦ Bot baca semua pesan di grup`,
          `◦ ${aigrup.probability}% chance ikut nimbrung`,
          `◦ 100% respon kalau di-tag atau di-reply`,
          `◦ Pakai API key dari config (OpenAI format)`,
        ]) +
        "\n\n" +
        separator("━", 22) +
        "\n" +
        tipText(`Matikan: ${prefix}aigrup off`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ OFF ═══
    if (subcmd === "off") {
      if (m.isGroup) {
        const text =
          alyaHeader("Ditolak", "🚫") +
          "\n\n" +
          bracketBox("🚫", "ᴇʀʀᴏʀ", [
            `◦ Toggle AI Grup hanya bisa dari *chat pribadi*`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }

      aigrup.enabled = false;
      db.save();

      const text =
        alyaHeader("AI Grup Nonaktif", "✅") +
        "\n\n" +
        bracketBox("✅", "ᴅɪᴍᴀᴛɪᴋᴀɴ", [
          `◦ Status: *OFF*`,
          `◦ Bot tidak akan nimbrung lagi`,
          `◦ Bot tetap respon command biasa`,
        ]) +
        "\n\n" + separator("━", 22) +
        "\n" + tipText(`Aktifkan: ${prefix}aigrup on`);
      await m.reply(text);
      return { handled: true };
    }

    // ═══ probability ═══
    if (subcmd === "prob" || subcmd === "probability") {
      if (m.isGroup) {
        await m.reply("🚫 Atur probability hanya dari chat pribadi!");
        return { handled: true };
      }
      const prob = parseInt(args[1] || "0", 10);
      if (isNaN(prob) || prob < 0 || prob > 100) {
        const text =
          alyaHeader("Probability", "⚙️") +
          "\n\n" +
          bracketBox("⚙️", "ᴄᴀʀᴀ", [
            `◦ *${prefix}aigrup prob 30* — 30% chance nimbrung`,
            `◦ Range: 0-100`,
            `◦ Saat ini: *${aigrup.probability}%*`,
          ]) +
          "\n\n" + separator("━", 22);
        await m.reply(text);
        return { handled: true };
      }
      aigrup.probability = prob;
      db.save();
      await m.reply(`✅ Probability diatur ke *${prob}%*`);
      return { handled: true };
    }

    // ═══ list ═══
    if (subcmd === "list") {
      const groups = Object.entries(aigrup.groups || {}).filter(([, v]) => v);
      const text =
        alyaHeader("Grup AI Aktif", "🤖") +
        "\n\n" +
        bracketBox("🤖", "ɪɴꜰᴏ", [
          `◦ Global: *${aigrup.enabled ? "ON" : "OFF"}*`,
          `◦ Grup terdaftar: *${groups.length}*`,
          ...(groups.length ? groups.map(([gid]) => `◦ ${gid}`) : ["◦ (kosong)"]),
        ]) +
        "\n\n" + separator("━", 22);
      await m.reply(text);
      return { handled: true };
    }

    // Unknown subcommand
    await m.reply(`❌ Subcommand tidak dikenal.\n\nKetik *${prefix}aigrup status* untuk lihat panduan.`);
    return { handled: true };
  } catch (error) {
    console.error("[aigrup]", error);
    await m.reply(`❌ Error: ${error.message || "Unknown"}`);
  }

  return { handled: true };
}

export { pluginConfig as config, handler };
