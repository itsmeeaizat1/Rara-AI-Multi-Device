// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "setmenu",
  alias: ["setmenu"],
  category: "owner",
  description: "Mengatur variant tampilan menu",
  usage: ".setmenu v1",
  example: ".setmenu v1",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VARIANTS = {
  v1: {
    id: 1,
    name: "NATIVEFLOW CARD",
    desc: "Thumbnail header + nativeFlow buttons + box-drawing text",
    emoji: "✨",
  },
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = args[0]?.toLowerCase();
  if (variant) {
    const selected = VARIANTS[variant];
    if (!selected) {
      m.reply(claraWrap("Setmenu", `❌ *VARIANT TIDAK VALID*\n\nSatu-satunya variant: *v1*`));
      return;
    }
    db.setting("menuVariant", selected.id);
    await db.save();
    await m.reply(claraWrap("setmenu", `✅ *MENU VARIANT DIUBAH*\n\n` +
      `${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
      `_${selected.desc}_`));
    return;
  }

  const current = db.setting("menuVariant") || config.ui?.menuVariant || 1;

  const rows = [];
  for (const [key, val] of Object.entries(VARIANTS)) {
    const mark = val.id === current ? " ✓" : "";
    rows.push({
      title: `${val.emoji} ${key.toUpperCase()}${mark} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setmenu ${key}`,
    });
  }
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "🎨 Pilih Variant Menu",
        sections: [{ title: "Daftar Variant Menu", rows }],
      }),
    },
  ];

  const bodyText =
    `🎨🖼️ *ᴍᴇɴᴜ ᴠᴀʀɪᴀɴᴛ*\n\n` +
    `Atur tampilan menu utama bot ketika user mengetik perintah menu 📋✨\n` +
    `Variant aktif saat ini: *V${current} — ${VARIANTS[`v${current}`]?.name || "Unknown"}* 🎯\n\n` +
    `Pilih variant menu dari tombol di bawah 👇`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("settings-thumb"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
