// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import { normalizeMode } from "../../src/lib/rara-thumb-asset.js";

const pluginConfig = {
  name: "setusagethumb",
  alias: ["setusagethumb", "usagethumb", "setnotifthumb", "notifthumb"],
  category: "owner",
  description: "Ganti mode thumbnail kartu usage / notif: auto, gambar, atau gif-video",
  usage: ".setusagethumb auto|gambar|video\n.setnotifthumb auto|gambar|video",
  example: ".setusagethumb video",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const LABEL = {
  auto: "Otomatis (gif/video kalau ada, kalau tidak gambar)",
  image: "Gambar saja (jpg/png/webp)",
  video: "GIF/Video saja (gif/mp4/webm), fallback gambar",
};

async function handler(m, { db }) {
  const cmd = String(m.command || "").toLowerCase();
  const kind = cmd.includes("notif") ? "notif" : "usage";
  const key = kind === "notif" ? "notifThumbMode" : "usageThumbMode";
  const folder = kind === "notif" ? "assets/image/notif/system/<nama>" : "assets/image/usage/<kategori>/<nama>";
  const arg = (m.args || [])[0];
  const current = normalizeMode(db.setting(key)) || "auto";

  if (!arg) {
    return m.reply(raraWrap(`Thumbnail ${kind}`,
      `Mode aktif: *${current}*\n${LABEL[current]}\n\n` +
      `Ganti: ${m.prefix}${cmd} auto | gambar | video\n\n` +
      `Taruh file di ${folder}.jpg / .png / .webp / .gif / .mp4`));
  }
  const mode = normalizeMode(arg);
  if (!mode) {
    return m.reply(raraWrap(`Thumbnail ${kind}`, `Mode tidak valid.\nPakai: auto, gambar, atau video`));
  }
  db.setting(key, mode);
  await db.save();
  return m.reply(raraWrap(`Thumbnail ${kind}`, `Mode thumbnail ${kind} diubah ke *${mode}*\n${LABEL[mode]}`));
}

export { pluginConfig as config, handler };
