// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import fs from "fs";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "setreply",
  alias: ["setreply"],
  category: "owner",
  description: "Mengatur variant tampilan reply",
  usage: ".setreply <v1-v6>",
  example: ".setreply v1",
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
    name: "FAKE LOCATION",
    desc: "InteractiveMessage + externalAdReply (thumbnail + weather) — desain aktif",
    emoji: "📍",
  },
  v2: {
    id: 2,
    name: "PREMIUM",
    desc: "Document + fake contact quote + thumbnail",
    emoji: "🖼️",
  },
  v3: {
    id: 3,
    name: "TITANIUM",
    desc: "Video GIF + caption",
    emoji: "📨",
  },
  v4: {
    id: 4,
    name: "LV",
    desc: "Link preview dengan thumbnail",
    emoji: "💼",
  },
  v5: {
    id: 5,
    name: "FAKE ORDER",
    desc: "Teks dengan fake quoted order message",
    emoji: "🛒",
  },
  v6: {
    id: 6,
    name: "SIMPLE DOCUMENT",
    desc: "Document + thumbnail tanpa fake contact quote",
    emoji: "📄",
  },
};

async function handler(m, { sock, db }) {
  const variant = m.text

  if (variant) {
    const selected = VARIANTS[variant];
    if (!selected) {
      m.reply(claraWrap("Setreply", `❌ *VARIANT TIDAK VALID*\n\nGunakan: *v1* s/d *v6*`));
      return;
    }

    db.setting("replyVariant", selected.id);
    await db.save();

    await m.reply(claraWrap("setreply", `✅ *REPLY VARIANT DIUBAH*\n\n` +
      `${selected.emoji} *V${selected.id} — ${selected.name}*\n` +
      `_${selected.desc}_`));
    return;
  }

  const current = db.setting("replyVariant") || config.ui?.replyVariant || 1;

  const rows = [];
  for (const [key, val] of Object.entries(VARIANTS)) {
    const mark = val.id === current ? " ✓" : "";
    rows.push({
      title: `${val.emoji} ${key.toUpperCase()}${mark} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setreply ${key}`,
    });
  }
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "💬 Pilih Variant Reply",
        sections: [{ title: "Daftar Variant Reply", rows }],
      }),
    },
  ];

  const bodys =
    `💬📨 *REPLY VARIANT*\n\n` +
    `Atur tampilan balasan bot ketika membalas pesan user 💬✨\n` +
    `Variant aktif saat ini: *V${current} — ${VARIANTS[`v${current}`]?.name || "Unknown"}* 🎯\n\n`

  await sock.sendButton(
    m.chat,
    getAssetBuffer("settings-thumb"),
    bodys,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
