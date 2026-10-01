// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { setMenuImageMode, getMenuImage } from "../../src/lib/rara-asset-manager.js";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "setmenuimage",
  alias: ["setmenuimage"],
  category: "owner",
  description: "Set gambar preview menu: mode asset atau URL",
  usage: ".setmenuimage <asset|url> [url/link]",
  example: ".setmenuimage url https://example.com/banner.jpg\n.setmenuimage asset\n.setmenuimage asset rara2",
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
    const current = config.bot?.menuImage || { mode: "asset", url: "", asset: "rara" };
    let txt = `Mode saat ini: *${current.mode}*
Asset: *${current.asset || "rara"}*
URL: *${current.url || "(kosong)"}*
「 Cara pakai 」
 1. \`${prefix}setmenuimage asset\` → pakai gambar lokal
 2. \`${prefix}setmenuimage asset rara2\` → ganti key asset
 3. \`${prefix}setmenuimage url https://link-gambar.jpg\` → pakai URL`;
    await m.reply(raraWrap("setmenuimage", txt));
    return;
  }

  if (mode === "asset") {
    const assetKey = args[1] || config.bot?.menuImage?.asset || "rara";
    if (!config.assets?.[assetKey]) {
      await m.reply(
        `❌ Asset key \`${assetKey}\` tidak ditemukan di config\nCek daftar asset di config.js`
      );
      return;
    }
    setMenuImageMode("asset", "", assetKey);
    db.setSetting("menuImageMode", "asset");
    db.setSetting("menuImageAsset", assetKey);
    await db.save();
    await m.reply(
      `✅ Berhasil set menu image!\nMode: *asset*\nAsset: *${assetKey}*\nPath: \`${config.assets[assetKey]}\``
    );
    return;
  }

  if (mode === "url") {
    const url = args.slice(1).join(" ").trim();
    if (!url || !url.startsWith("http")) {
      await m.reply(
        `❌ URL tidak valid\nContoh: \`${prefix}setmenuimage url https://example.com/banner.jpg\``
      );
      return;
    }

    // Test fetch URL
    try {
      const img = await getMenuImage("rara");
      setMenuImageMode("url", url, "");
      db.setSetting("menuImageMode", "url");
      db.setSetting("menuImageUrl", url);
      await db.save();
      await m.reply(
        `✅ Berhasil set menu image!\nMode: *url*\nURL: ${url}\nGambar akan di-cache otomatis`
      );
    } catch (e) {
      await m.reply(
        `❌ Gagal fetch URL: ${e.message}`
      );
    }
    return;
  }
}

export default { config: pluginConfig, handler };
