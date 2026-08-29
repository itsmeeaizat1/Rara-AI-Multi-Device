// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "subdomain",
  alias: ["subdomain"],
  category: "tools",
  description: "Enumerasi subdomain dari domain (passive via Certificate Transparency)",
  usage: ".subdomain <domain>",
  example: ".subdomain google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function getSubdomains(domain) {
  // Use crt.sh Certificate Transparency API
  const url = "https://crt.sh/?q=%25." + encodeURIComponent(domain) + "&output=json";

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error("crt.sh error: " + res.status);
  }

  const data = await res.json();
  const subdomains = new Set();

  for (const entry of data) {
    const names = entry.name_value.split("\n");
    for (let name of names) {
      name = name.trim().toLowerCase();
      // Filter wildcards and keep only matching domain
      if (name.endsWith("." + domain) || name === domain) {
        const clean = name.replace(/^\*\./, "");
        subdomains.add(clean);
      }
    }
  }

  return [...subdomains].sort();
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "subdomain <domain>\n\n" +
        "Enumerasi subdomain via Certificate Transparency (crt.sh)\n" +
        "No active scanning, 100% passive lookup\n\n" +
        "Contoh:\n" +
        prefix + "subdomain google.com\n" +
        prefix + "subdomain github.com",
        { title: "Subdomain Enumerator" }
      );
    }

    const domain = text.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim();
    if (!domain) {
      return m.reply(claraWrap("Subdomain", "Domain tidak boleh kosong!"));
    }
    const subdomains = await getSubdomains(domain);

    if (subdomains.length === 0) {
      return m.reply(claraWrap("Subdomain: " + domain, "Tidak ada subdomain ditemukan"));
    }

    let lines = [
      "Domain: " + domain,
      "Total: " + subdomains.length + " subdomain",
      "",
    ];

    // Show up to 40 subdomains
    const limit = Math.min(subdomains.length, 40);
    for (let i = 0; i < limit; i++) {
      lines.push((i + 1) + ". " + subdomains[i]);
    }

    if (subdomains.length > 40) {
      lines.push("... +" + (subdomains.length - 40) + " lagi");
    }
    return m.reply(claraWrap("Subdomain: " + domain, lines.join("\n")));
  } catch (e) {
    console.error("subdomain error:", e);
    return m.reply(claraWrap("Subdomain", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
