// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// .setmenu = alias semantik .setallmenu (dua-duanya ngatur varian thumbnail
// menu yang sama — menuThumbVariant dipakai sendMenuCard SEMUA menu).
import config from "../../config.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { VARIANTS, parseVariantKey, applyMenuVariant } from "./setallmenu.js";

const pluginConfig = {
  name: "setmenu",
  alias: ["setmenu", "setthumbnailmenu", "setvarianmenu"],
  category: "owner",
  description: "Mengatur varian thumbnail menu — v1 gambar bawaan / v2 video",
  usage: ".setmenu v1\n.setmenu v2\n.setmenu video\n.setmenu gambar",
  example: ".setmenu v2",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock, db }) {
  const args = m.args || [];
  const variant = parseVariantKey(args[0]);

  if (args[0] && !variant) {
    m.reply(raraWrap("Setmenu", `❗ *varian tidak valid*\n\nGunakan: *v1* (gambar) atau *v2* (video)`));
    return;
  }

  if (variant) {
    await applyMenuVariant(m, db, VARIANTS[variant], "setmenu");
    return;
  }

  const current = db.setting("menuThumbVariant") === 2 ? 2 : 1;
  const v = VARIANTS[`v${current}`];
  await m.reply(raraWrap("setmenu", `🖼️🎬 *varian thumbnail menu*\n\n` +
    `Varian aktif saat ini: *V${current} — ${v?.name}* (${v?.desc})\n\n` +
    `Ganti: *.setmenu v1* (gambar) / *.setmenu v2* (video)`));
}

export { pluginConfig as config, handler };
