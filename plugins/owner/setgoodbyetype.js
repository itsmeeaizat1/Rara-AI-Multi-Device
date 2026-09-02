// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "setgoodbyetype",
  alias: ["setgoodbyetype"],
  category: "owner",
  description: "Mengatur variant tampilan goodbye message",
  usage: ".setgoodbyetype",
  example: ".setgoodbyetype",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const VARIANTS = {
  1: { name: "Text Only", desc: "Pesan teks biasa tanpa gambar", emoji: "📝" },
  2: { name: "Canvas Hexagon", desc: "Gambar canvas lokal dengan hexagon avatar (dark red)", emoji: "🎨" },
  3: { name: "API Thumbnail", desc: "Background autoresbot API + PP user + sisa member (vertical layout)", emoji: "🖼️" },
  4: { name: "Glassmorphism", desc: "Glass card style dengan foto profil bulat", emoji: "✨" },
  5: { name: "Simple", desc: "Pesan teks simple + foto profile", emoji: "📄" },
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = args[0]?.toLowerCase();
  const current = db.setting("goodbyeType") || 1;

  if (variant && /^v?[1-5]$/.test(variant)) {
    const id = parseInt(variant.replace("v", ""));
    db.setting("goodbyeType", id);
    await db.save();
    await m.reply(claraWrap("GOODBYE TYPE", `✅ *GOODBYE TYPE DIUBAH*\n\n` +
        `${VARIANTS[id].emoji} *V${id} — ${VARIANTS[id].name}*\n` +
        `_${VARIANTS[id].desc}_`));
    return;
  }

  const rows = [];
  for (const [id, val] of Object.entries(VARIANTS)) {
    const mark = parseInt(id) === current ? " ✓" : "";
    rows.push({
      title: `${val.emoji} V${id}${mark} — ${val.name}`,
      description: val.desc,
      id: `${m.prefix}setgoodbyetype v${id}`,
    });
  }

  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Pilih Tipe Goodbye",
        sections: [{ title: "Daftar Tipe Goodbye", rows }],
      }),
    },
  ];

  const bodyText =
    `🎨 *ɢᴏᴏᴅʙʏᴇ ᴛʏᴘᴇ*\n\n` +
    `Atur tampilan pesan goodbye saat member keluar dari grup\n` +
    `Tipe aktif: *V${current} — ${VARIANTS[current]?.name || "Text"}*\n\n` +
    `*V1 Text Only* 📝 — Pesan teks biasa tanpa gambar\n\n` +
    `*V2 Canvas Hexagon* 🎨 — Gambar canvas lokal dengan hexagon avatar, dark red style\n\n` +
    `*V3 API Thumbnail* 🖼️ — Background dari autoresbot API, layout vertikal: judul → "Telah keluar dari (group)" → PP user di tengah → "Sisa Member: total" di bawah\n\n` +
    `*V4 Glassmorphism* ✨ — Glass card style dengan foto profil bulat\n\n` +
    `*V5 Simple* 📄 — Pesan teks simple + foto profile\n\n` +
    `Pilih tipe goodbye dari tombol di bawah`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("settings-thumb"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
