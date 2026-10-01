// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import { novaWrap, novaLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "setallmenu",
  alias: ["setallmenu", "varianmenu", "variantmenu", "menuthumbvarian"],
  category: "owner",
  description: "Mengatur varian thumbnail menu — v1 gambar bawaan / v2 video",
  usage: ".setallmenu v1\n.setallmenu v2\n.setallmenu video\n.setallmenu gambar",
  example: ".setallmenu v2",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

// ── VARIAN THUMBNAIL MENU (request owner 11 Sep 2026: "menu thumbnail versi
// video jadi varian 2, yg varian 1 bawaan kayak thumbnail gambar bawaan"):
// v1 = header GAMBAR statis bawaan (jpg menu) — default
// v2 = header VIDEO yang gerak (assets/video/menu/menuthumbnail.mp4, ala script Elaina)
const VARIANTS = {
  v1: {
    id: 1,
    name: "THUMBNAIL GAMBAR",
    desc: "Header menu gambar statis bawaan (thumbnail jpg)",
    emoji: "🖼️",
    asset: "ASSET: /image/menu/*.jpg",
  },
  v2: {
    id: 2,
    name: "THUMBNAIL VIDEO",
    desc: "Header menu video yang gerak (menuthumbnail.mp4 ala script Elaina)",
    emoji: "🎬",
    asset: "ASSET: /video/menu/menuthumbnail.mp4",
  },
};

// parser longgar: v1/v2, 1/2, gambar/video, image/foto, vid/clip
function parseVariantKey(raw) {
  const v = (raw || "").toLowerCase().trim();
  if (["gambar", "image", "foto", "picture"].includes(v)) return "v1";
  if (["video", "vid", "clip", "mp4"].includes(v)) return "v2";
  const n = v.replace(/^v/, "");
  if (n === "1") return "v1";
  if (n === "2") return "v2";
  return null;
}

// inti bersama — dipakai juga plugins/owner/setmenu.js biar dua command
// ngatur SATU setting yang sama (menuThumbVariant dipakai sendMenuCard semua menu)
async function applyMenuVariant(m, db, selected, cmdLabel) {
  db.setting("menuThumbVariant", selected.id);
  await db.save();

  await m.reply(novaWrap(cmdLabel || "setallmenu", `✅ *varian thumbnail menu diubah*\n\n` +
    `${selected.emoji} *V${selected.id} — ${selected.name}*\n\n` +
    `${selected.asset}`));
}

export { VARIANTS, parseVariantKey, applyMenuVariant };

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = parseVariantKey(args[0]);

  if (args[0] && !variant) {
    m.reply(novaWrap("Setallmenu", `❗ *varian tidak valid*\n\nGunakan: *v1* (gambar) atau *v2* (video)`));
    return;
  }

  if (variant) {
    await applyMenuVariant(m, db, VARIANTS[variant], "setallmenu");
    return;
  }

  const current = db.setting("menuThumbVariant") === 2 ? 2 : 1;

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
        title: "📋 Pilih Varian Thumbnail Menu",
        sections: [{ title: "Daftar Varian Thumbnail", rows }],
      }),
    },
  ];

  const bodyText =
    `📋📑 *varian thumbnail menu*\n\n` +
    `Atur tampilan header/thumbnail SEMUA menu (menu, allmenu, popup kategori, dll) 🖼️🎬\n` +
    `Varian aktif saat ini: *V${current} — ${VARIANTS[`v${current}`]?.name}* 🎯\n\n` +
    `Pilih varian dari tombol di bawah 👇`;

  await sock.sendButton(
    m.chat,
    getAssetBuffer("settings-thumb"),
    bodyText,
    m,
    { buttons },
  );
}

export { pluginConfig as config, handler };
