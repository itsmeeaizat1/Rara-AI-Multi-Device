// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { bratGen } from "brat-canvas";
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "brat",
  alias: ["brat", "bratimg"],
  category: "sticker",
  description: "Generator sticker brat (lokal canvas — tanpa API)",
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
  { title: "Brat Default", description: "Sticker brat versi biasa", command: "bratimg" },
  { title: "Brat Green", description: "Variant brat warna hijau", command: "bratgreen" },
  { title: "Brat White", description: "Variant brat warna putih", command: "bratwhite" },
  { title: "Brat Anime", description: "Variant brat anime", command: "bratanime" },
  { title: "Brat Cewek", description: "Variant brat cewek", command: "bratcewek" },
  { title: "Brat Bahlil", description: "Variant brat bahlil", command: "bratbahlil" },
  { title: "Brat Patrick", description: "Variant brat Patrick", command: "bratpatrick" },
  { title: "Brat Squidward", description: "Variant brat Squidward", command: "bratsquidward" },
  { title: "Brat HD", description: "Variant brat HD", command: "brathd" },
  { title: "Brat Video", description: "Sticker brat animated", command: "bratvid" },
  { title: "Brat Video V2", description: "Sticker brat video v2", command: "bratvid2" },
  { title: "Brat Gojo", description: "Variant brat Gojo", command: "bratgojo" },
];

function buildVariantRows(prefix, text) {
  return BRAT_VARIANTS.map((item) => ({
    title: item.title,
    description: `${item.description} • .${item.command} ${text}`,
    id: `${prefix}${item.command} ${text}`,
  }));
}

async function sendBratMenu(m, sock, text) {
  const caption = "Pilih variant brat favorit kamu";
  const buttons = [
    {
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: "Pilih Variant Brat",
        sections: [{ title: "Variant Brat", rows: buildVariantRows(m.prefix, text) }],
      }),
    },
  ];
  await sock.sendButton(m.chat, getAssetBuffer("sticker-thumb"), caption, m, {
    buttons,
    footer: "Nova-AI Brat Generator",
  });
}

async function handler(m, { sock }) {
  const text = m.text;

  if (!text) {
    await sendBratMenu(m, sock, text);
    return;
  }

  try {
    await m.react("🕒");
    const pngBuffer = await bratGen(text, { C_BG: "#ffffff", C_TEXT: "#000000" });
    await m.react("🐣");
    await sock.sendImageAsSticker(m.chat, pngBuffer, m, {
      packname: config.sticker.packname,
      author: config.sticker.author,
    });
    await m.reply(novaBerhasil("brat"));
  } catch (error) {
    console.error("[brat] Error:", error.message);
    await m.react("❌");
    m.reply(novaGangguan("brat"));
  }
}

export { pluginConfig as config, handler };
