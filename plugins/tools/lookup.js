// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import te from "../../src/lib/rara-error.js";
import { sendToolsPreview } from "../../src/lib/rara-context.js";
import { raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";
const pluginConfig = {
  name: "lookup",
  alias: ["lookup"],
  category: "tools",
  description: "DNS Lookup untuk domain",
  usage: ".lookup <domain>",
  example: ".lookup google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  let domain = m.args?.[0];

  if (!domain) {
    return m.reply(raraWrap("lookup", [
      `📌 Format:`,
      `${m.prefix}lookup <domain>`,
      `💡 Contoh:`,
      `${m.prefix}lookup google.com`
    ]));
  }

  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/.test(domain)
  ) {
    { const __navText = `❌ *ғORMAT TIDAK VALID*\n\n💡 *Contoh:* \`google.com`; return await m.reply(__navText); };
  }
  await m.react("🕒");

  try {
    const [dnsRes, whoisRes] = await Promise.allSettled([
      fetch(`https://api.hackertarget.com/dnslookup/?q=${domain}`).then((r) =>
        r.text(),
      ),
      fetch(`https://api.hackertarget.com/whois/?q=${domain}`).then((r) =>
        r.text(),
      ),
    ]);

    const dnsData = dnsRes.status === "fulfilled" ? dnsRes.value : null;
    const whoisData = whoisRes.status === "fulfilled" ? whoisRes.value : null;

    if (!dnsData && !whoisData) {
      return m.reply(raraWrap("Lookup", `❌ *gagal*\n\nTidak dapat memproses domain`));
    }

    let text = `🔍 *dns lookup*\n\n`;
    text += `Domain: \`${domain}\`\n\n`;

    if (dnsData && !dnsData.includes("error")) {
      const lines = dnsData.split("\n").filter((l) => l.trim());
      const records = {};

      lines.forEach((line) => {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const type = parts[parts.length - 2] || "OTHER";
          const value = parts[parts.length - 1];
          if (!records[type]) records[type] = [];
          records[type].push(value);
        }
      });

            if (records["A"])
        text += `🅰️ A: ${records["A"].slice(0, 3).join(", ")}\n`;
      if (records["AAAA"])
        text += `🔢 AAAA: ${records["AAAA"].slice(0, 2).join(", ")}\n`;
      if (records["MX"])
        text += `📧 MX: ${records["MX"].slice(0, 2).join(", ")}\n`;
      if (records["NS"])
        text += `🌐 NS: ${records["NS"].slice(0, 3).join(", ")}\n`;
      if (records["TXT"])
        text += `📝 TXT: ${records["TXT"].length} records\n`;
      text += `---\n\n`;
    }

    if (whoisData && !whoisData.includes("error") && whoisData.length < 2000) {
      const registrar = whoisData.match(/Registrar:\s*(.+)/i)?.[1] || "-";
      const created = whoisData.match(/Creation Date:\s*(.+)/i)?.[1] || "-";
      const expires = whoisData.match(/Expir.*Date:\s*(.+)/i)?.[1] || "-";
      const nameservers =
        whoisData
          .match(/Name Server:\s*(.+)/gi)
          ?.slice(0, 2)
          .map((ns) => ns.split(":")[1]?.trim()) || [];

            text += `🏢 Registrar: ${registrar.slice(0, 35)}\n`;
      text += `📅 Created: ${created.slice(0, 20)}\n`;
      text += `⏰ Expires: ${expires.slice(0, 20)}\n`;
      if (nameservers.length > 0)
        text += `🌐 NS: ${nameservers.join(", ")}\n`;
      text += `---`;
    }
    await sendToolsPreview(sock, m.chat, text, "🔍 *dns lookup*", domain, {
      quoted: m,
    });
  } catch (e) {
    m.reply(raraWrap("lookup", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
