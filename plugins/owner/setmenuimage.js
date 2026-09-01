// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { setMenuImageMode, getMenuImage } from "../../src/lib/nova-asset-manager.js";
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setmenuimage",
  alias: ["setmenuimage"],
  category: "owner",
  description: "Set gambar preview menu: mode asset atau URL",
  usage: ".setmenuimage <asset|url> [url/link]",
  example: ".setmenuimage url https://example.com/banner.jpg\n.setmenuimage asset\n.setmenuimage asset nova2",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 2,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, db }) {
  const prefix = config.command?.prefix || ".";
  const args = m.args || [];
  const mode = args[0]?.toLowerCase();

  if (!mode || !["asset", "url"].includes(mode)) {
    const current = config.bot?.menuImage || { mode: "asset", url: "", asset: "nova" };
    let txt = `╭─「 *Set Menu Image* 」\n│ Mode saat ini: *${current.mode}*
│ Asset: *${current.asset || "nova"}*
│ URL: *${current.url || "(kosong)"}*
│ 「 Cara pakai 」
│  1. \`${prefix}setmenuimage asset\` → pakai gambar lokal
│  2. \`${prefix}setmenuimage asset nova2\` → ganti key asset
│  3. \`${prefix}setmenuimage url https://link-gambar.jpg\` → pakai URL
╰──────────`;
    await m.reply(claraWrap("setmenuimage", txt));
    return;
  }

  if (mode === "asset") {
    const assetKey = args[1] || config.bot?.menuImage?.asset || "nova";
    if (!config.assets?.[assetKey]) {
      await m.reply(
        `╭─「 *Error* 」\n│ Asset key \`${assetKey}\` tidak ditemukan di config\n│ Cek daftar asset di config.js\n╰──────────`
      );
      return;
    }
    setMenuImageMode("asset", "", assetKey);
    db.setSetting("menuImageMode", "asset");
    db.setSetting("menuImageAsset", assetKey);
    await db.save();
    await m.reply(
      `╭─「 *Berhasil* 」\n│ Mode: *asset*\n│ Asset: *${assetKey}*\n│ Path: \`${config.assets[assetKey]}\`\n╰──────────`
    );
    return;
  }

  if (mode === "url") {
    const url = args.slice(1).join(" ").trim();
    if (!url || !url.startsWith("http")) {
      await m.reply(
        `╭─「 *Error* 」\n│ URL tidak valid\n│ Contoh: \`${prefix}setmenuimage url https://example.com/banner.jpg\`\n╰──────────`
      );
      return;
    }

    // Test fetch URL
    try {
      const img = await getMenuImage("nova");
      setMenuImageMode("url", url, "");
      db.setSetting("menuImageMode", "url");
      db.setSetting("menuImageUrl", url);
      await db.save();
      await m.reply(
        `╭─「 *Berhasil* 」\n│ Mode: *url*\n│ URL: ${url}\n│ Gambar akan di-cache otomatis\n╰──────────`
      );
    } catch (e) {
      await m.reply(
        `╭─「 *Error* 」\n│ Gagal fetch URL: ${e.message}\n╰──────────`
      );
    }
    return;
  }
}

export default { config: pluginConfig, handler };
