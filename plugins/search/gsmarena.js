// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import te from "../../src/lib/nova-error.js";
import gsmarena from "gsmarena-api";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "gsmarena",
  alias: ["gsm", "phonespec", "spesifikasi"],
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
    return sendReplyWithNav(sock, m, `📱 *Gsmarena*\n\n` +
        `Cari spesifikasi HP lengkap\n\n` +
        `\`Contoh: ${m.prefix}gsmarena samsung galaxy s25\``, "gsmarena");
  }

  m.react("🕐");

  try {
    const results = await gsmarena.search.search(text);

    if (!results || results.length === 0) {
      return m.reply(claraWrap("gsmarena", `📱 HP tidak ditemukan untuk *${text}*`));
    }

    if (results.length === 1) {
      const device = await gsmarena.catalog.getDevice(results[0].id);
      m.react("✅");
      return m.reply(formatDetail(device));
    }

    m.react("✅");
    return m.reply(formatList(results, text, m.prefix));
  } catch (error) {
    console.log(error);
    m.reply(claraWrap("gsmarena", te(m.prefix, m.command, m.pushName), "error"));
  }
}

function formatList(results, query, prefix) {
  let txt = `📱 *Hasil Pencarian*\n`;
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

  txt += `\n> Ketik \`${prefix}gsmarena <nama lengkap>\` untuk detail`;
  return txt;
}

function formatDetail(device) {
  let txt = `📱 *${device.name}*\n\n`;

  if (device.quickSpec && device.quickSpec.length > 0) {
    txt += `📋 *Ringkasan:*\n`;
    for (const s of device.quickSpec) {
      txt += `🔹 *${s.name}:* ${s.value}\n`;
    }
    txt += "\n";
  }

  if (device.detailSpec && device.detailSpec.length > 0) {
    for (const cat of device.detailSpec.slice(0, 8)) {
      txt += `📌 *${cat.category}:*\n`;
      for (const s of cat.specifications.slice(0, 5)) {
        txt += `• *${s.name}:* ${s.value}\n`;
      }
      txt += "\n";
    }
  }
  return txt;
}

export { pluginConfig as config, handler };
