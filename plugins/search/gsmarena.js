// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import gsmarena from "gsmarena-api";
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gsmarena",
  alias: ["gsmarena"],
  category: "search",
  description: "Cari spesifikasi HP di GSMArena",
  usage: ".gsmarena <nama hp>",
  example: ".gsmarena infinix hot 50",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.args.join(" ");
  if (!text) {
    return m.reply( `📱 *gsmarena*\n\n` +
        `Cari spesifikasi HP lengkap\n\n` +
        `\`Contoh: ${m.prefix}gsmarena samsung galaxy s25\``, "gsmarena");
  }
  try {
    const results = await gsmarena.search.search(text);

    if (!results || results.length === 0) {
      return m.reply(novaWrap("gsmarena", `📱 HP tidak ditemukan untuk *${text}*`));
    }

    if (results.length === 1) {
      const device = await gsmarena.catalog.getDevice(results[0].id);
      return m.reply(formatDetail(device));
    }
    return m.reply(formatList(results, text, m.prefix));
  } catch (error) {
    console.log(error);
    m.reply(novaWrap("gsmarena", te(m.prefix, m.command, m.pushName), "error"));
  }
}

function formatList(results, query, prefix) {
  let txt = `📱 *hasil pencarian*\n`;
  txt += `*${query}*\n\n`;

  results.slice(0, 10).forEach((d, i) => {
    txt += `${i + 1}. 📱 *${d.name}*\n`;
    if (d.description) {
      const desc =
        d.description.length > 80
          ? d.description.slice(0, 80) + "..."
          : d.description;
      txt += `${desc}\n`;
    }
  });

  txt += `\nKetik \`${prefix}gsmarena <nama lengkap>\` untuk detail`;
  return txt;
}

function formatDetail(device) {
  let txt = `📱 *${device.name}*\n\n`;

  if (device.quickSpec && device.quickSpec.length > 0) {
    txt += `📋 *ringkasan:*\n`;
    for (const s of device.quickSpec) {
      txt += `🔹 *${s.name}:* ${s.value}\n`;
    }
    txt += "\n";
  }

  if (device.detailSpec && device.detailSpec.length > 0) {
    for (const cat of device.detailSpec.slice(0, 8)) {
      txt += `📌 *${cat.category}:*\n`;
      for (const s of cat.specifications.slice(0, 5)) {
        txt += `*${s.name}:* ${s.value}\n`;
      }
      txt += "\n";
    }
  }
  return txt;
}

export { pluginConfig as config, handler };
