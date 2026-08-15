// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import te from "../../src/lib/nova-error.js";
import { sendToolsPreview, saluranCtx } from "../../src/lib/nova-context.js";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
  name: "ipwho",
  alias: ["ip", "iplookup", "ipinfo"],
  category: "tools",
  description: "Lookup informasi IP address",
  usage: ".ipwho <ip>",
  example: ".ipwho 8.8.8.8",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const ip = m.args?.[0];

  if (!ip) {
    return sendReplyWithNav(sock, m, `⚠️ *CARA PAKAI*\n\n` +
        `> \`${m.prefix}ipwho <ip>\`\n\n` +
        `> Contoh:\n` +
        `> \`${m.prefix}ipwho 8.8.8.8\``, "ipwho");
  }

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    return m.reply(`❌ *ғORMAT TIDAK VALID*\n\n> Contoh: \`8.8.8.8\``);
  }

  await m.react("🕐");
  await m.reply(claraWrap("Ipwho", `🕕 *MENCARI INFO IP...*`));

  try {
    const res = await fetch(`https://ipwho.is/${ip}`);
    const data = await res.json();

    if (!data.success) {
      return m.reply(claraWrap("Ipwho", `❌ *IP TIDAK DITEMUKAN*\n\n> IP ${ip} tidak valid`));
    }

    if (data.latitude && data.longitude) {
      await sock.sendMessage(
        m.chat,
        {
          location: {
            degreesLatitude: data.latitude,
            degreesLongitude: data.longitude,
          },
        },
        { quoted: m },
      );
    }

    const text =
      `🌐 *IP LOOKUP*\n\n` +
      `╔┈┈「 📍 *LOKAsI* 」\n` +
      `╎❏ 🔢 IP: ${data.ip}\n` +
      `╎❏ 🌍 Country: ${data.country} ${data.country_code}\n` +
      `╎❏ 🏙️ City: ${data.city || "-"}\n` +
      `╎❏ 📍 Region: ${data.region || "-"}\n` +
      `╎❏ 🌐 Continent: ${data.continent || "-"}\n` +
      `╎❏ 📮 Postal: ${data.postal || "-"}\n` +
      `╎❏ ⏰ Timezone: ${data.timezone?.id || "-"}\n` +
      `╰┈┈┈┈┈┈┈┈❖\n\n` +
      `╔┈┈「 🔌 *KONEKsI* 」\n` +
      `╎❏ 🏢 ISP: ${data.connection?.isp || "-"}\n` +
      `╎❏ 🌐 ORG: ${data.connection?.org || "-"}\n` +
      `╎❏ 📡 ASN: ${data.connection?.asn || "-"}\n` +
      `╰┈┈┈┈┈┈┈┈❖\n\n` +
      `╔┈┈「 🛡️ *sECURITY* 」\n` +
      `╎❏ 🔒 VPN: ${data.security?.vpn ? "✅ Yes" : "❌ No"}\n` +
      `╎❏ 🌐 Proxy: ${data.security?.proxy ? "✅ Yes" : "❌ No"}\n` +
      `╎❏ 🤖 Tor: ${data.security?.tor ? "✅ Yes" : "❌ No"}\n` +
      `╰┈┈┈┈┈┈┈┈❖`;

    await m.react("✅");
    await sendToolsPreview(sock, m.chat, text, "🌐 *IP LOOKUP*", data.country, {
      quoted: m,
    });
  } catch (e) {
    m.reply(claraWrap("ipwho", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
