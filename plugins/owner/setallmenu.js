// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "setallmenu",
  alias: ["setallmenu"],
  category: "owner",
  description: "Mengatur variant tampilan allmenu",
  usage: ".setallmenu v1",
  example: ".setallmenu v1",
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
    name: "ALLMENU NATIVEFLOW",
    desc: "Thumbnail header + nativeFlow buttons + box-drawing text (single variant)",
    emoji: "✨",
  },
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = args[0]?.toLowerCase();

  if (variant) {
    const selected = VARIANTS[variant];
    if (!selected) {
      m.reply(claraWrap("Setallmenu", `❌ *VARIANT TIDAK VALID*\n\nSatu-satunya variant: *v1*`));
      return;
    }

    db.setting("allmenuVariant", selected.id);
    await db.save();

    await m.reply(claraWrap("setallmenu", `✅ *ALLMENU VARIANT DIUBAH*\n\n` +
      `${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
      `_${selected.desc}_`));
    return;
  }

  const current = db.setting("allmenuVariant") || config.ui?.allmenuVariant || 1;

  const rows = [];
  for (const [key, val] of Object.entries(VARIANTS)) {
    const mark = val.id === current ? " ✓" : "";
    rows.push({
      title: `${val.emoji} ${key.toUpperCase()}${mark} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setallmenu ${key}`,
    });
  }
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "📋 Pilih Variant Allmenu",
        sections: [{ title: "Daftar Variant Allmenu", rows }],
      }),
    },
  ];

  const bodyText =
    `📋📑 *ᴀʟʟᴍᴇɴᴜ ᴠᴀʀɪᴀɴᴛ*\n\n` +
    `Atur tampilan allmenu yang menampilkan seluruh daftar perintah bot dalam satu halaman 📖✨\n` +
    `Variant aktif saat ini: *V${current} — ${VARIANTS[`v${current}`]?.name || "Unknown"}* 🎯\n\n` +
    `Pilih variant allmenu dari tombol di bawah 👇`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("settings-thumb"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
