// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import { setMenuImageMode, getMenuImage } from "../../src/lib/nova-asset-manager.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setmenuimage",
  alias: ["setimgmenu", "setimg"],
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
  await m.react("🕐");
  const prefix = config.command?.prefix || ".";
  const args = m.args || [];
  const mode = args[0]?.toLowerCase();

  if (!mode || !["asset", "url"].includes(mode)) {
    const current = config.bot?.menuImage || { mode: "asset", url: "", asset: "nova" };
    let txt = `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Set Menu Image
┊
  ┊  ➶ Mode saat ini: *${current.mode}*
  ┊  ➶ Asset: *${current.asset || "nova"}*
  ┊  ➶ URL: *${current.url || "(kosong)"}*
┊
  ┊  ➶ Cara pakai:
┊  1. \`${prefix}setmenuimage asset\` → pakai gambar lokal
┊  2. \`${prefix}setmenuimage asset nova2\` → ganti key asset
┊  3. \`${prefix}setmenuimage url https://link-gambar.jpg\` → pakai URL
❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`;
    await m.reply(claraWrap("setmenuimage", txt));
    await m.react("✅");
    return;
  }

  if (mode === "asset") {
    const assetKey = args[1] || config.bot?.menuImage?.asset || "nova";
    if (!config.assets?.[assetKey]) {
      await m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Error\n┊\n  ┊  ➶ Asset key \`${assetKey}\` tidak ditemukan di config\n  ┊  ➶ Cek daftar asset di config.js\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      await m.react("❌");
      return;
    }
    setMenuImageMode("asset", "", assetKey);
    db.setSetting("menuImageMode", "asset");
    db.setSetting("menuImageAsset", assetKey);
    await db.save();
    await m.reply(
      `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Berhasil\n┊\n  ┊  ➶ Mode: *asset*\n  ┊  ➶ Asset: *${assetKey}*\n  ┊  ➶ Path: \`${config.assets[assetKey]}\`\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
    );
    await m.react("✅");
    return;
  }

  if (mode === "url") {
    const url = args.slice(1).join(" ").trim();
    if (!url || !url.startsWith("http")) {
      await m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Error\n┊\n  ┊  ➶ URL tidak valid\n  ┊  ➶ Contoh: \`${prefix}setmenuimage url https://example.com/banner.jpg\`\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      await m.react("❌");
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
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Berhasil\n┊\n  ┊  ➶ Mode: *url*\n  ┊  ➶ URL: ${url}\n  ┊  ➶ Gambar akan di-cache otomatis\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      await m.react("✅");
    } catch (e) {
      await m.reply(
        `❀°˖✧◝(⁰▿⁰)◜✧˖°❀ Error\n┊\n  ┊  ➶ Gagal fetch URL: ${e.message}\n❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀`
      );
      await m.react("❌");
    }
    return;
  }
}

export default { config: pluginConfig, handler };
