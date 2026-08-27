// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import fs from "fs";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import novaApi from "../../src/lib/nova-apimanager.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "brat",
  alias: ["brat", "bratimg"],
  category: "sticker",
  description: "Generator sticker brat (default latar putih) + menu variant",
  usage: ".brat <text>",
  example: ".brat Hai semua",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const BRAT_VARIANTS = [
  {
    title: "Brat Default",
    description: "Sticker brat versi biasa",
    command: "bratimg",
  },
  {
    title: "Brat Green",
    description: "Variant brat warna hijau",
    command: "bratgreen",
  },
  {
    title: "Brat White",
    description: "Variant brat warna putih",
    command: "bratwhite",
  },
  {
    title: "Brat Anime",
    description: "Variant brat anime",
    command: "bratanime",
  },
  {
    title: "Brat Cewek",
    description: "Variant brat cewek",
    command: "bratcewek",
  },
  {
    title: "Brat Bahlil",
    description: "Variant brat bahlil",
    command: "bratbahlil",
  },
  {
    title: "Brat Patrick",
    description: "Variant brat Patrick",
    command: "bratpatrick",
  },
  {
    title: "Brat Squidward",
    description: "Variant brat Squidward",
    command: "bratsquidward",
  },
  {
    title: "Brat Vermeil",
    description: "Variant brat Vermeil",
    command: "bratvermeil",
  },
  { title: "Brat HD", description: "Variant brat HD", command: "brathd" },
  {
    title: "Brat Video",
    description: "Sticker brat animated",
    command: "bratvid",
  },
  {
    title: "Brat Video V2",
    description: "Sticker brat video v2",
    command: "bratvid2",
  },
  {
    title: "Brat Vermeil Video",
    description: "Variant brat Vermeil video",
    command: "bratvermeilvid",
  },
  {
    title: "Brat Gojo",
    description: "Variant brat Gojo",
    command: "bratgojo",
  },
  {
    title: "Brat Gojo Video",
    description: "Variant brat Gojo video",
    command: "bratgojovid",
  },
];

function buildVariantRows(prefix, text) {
  return BRAT_VARIANTS.map((item) => ({
    title: item.title,
    description: `${item.description} • .${item.command} <text>`,
    id: `${prefix}${item.command} ${text}`,
  }));
}

async function sendBratMenu(m, sock, text) {
  const caption =
    "🌿 *kamu mau buat brat yak, silahkan pilih variant brat tombol dibawah*";
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "🌾 Pilih Variant Brat",
        sections: [
          {
            title: "Variant Brat",
            rows: buildVariantRows(m.prefix, text),
          },
        ],
      }),
    },
  ];

  await sock.sendButton(
    m.chat,
    getAssetBuffer("nova"),
    caption,
    m,
    {
      buttons,
      footer: "Pilih variant brat favorit kamu",
    },
  );
}

async function handler(m, { sock }) {
  const text = m.text;
  const command = String(m.command || "").toLowerCase();

  // .brat tanpa teks -> tampilkan menu variant
  if (!text) {
    await sendBratMenu(m, sock, text);
    return;
  }

  // .brat <text> -> langsung generate brat latar putih (default)
  try {
    const url = novaApi.yupra.url("/api/bratwhite", { text });
    await sock.sendImageAsSticker(m.chat, url, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
  } catch (error) {
    // Fallback ke brat default (green) jika API white gagal
    try {
      const url = novaApi.yupra.url("/api/image/brat", { text });
      await sock.sendImageAsSticker(m.chat, url, m, {
        packname: config.sticker.packname,
        author: config.sticker.author,
      });
    } catch (error2) {
      m.reply(claraWrap("brat", te(m.prefix, m.command, m.pushName), "error"));
    }
  }
}

export { pluginConfig as config, handler };
