// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "doh",
  alias: ["doh"],
  category: "tools",
  description: "DNS over HTTPS query (resolve domain via Cloudflare/Google DoH)",
  usage: ".doh <domain>  atau  .doh <type> <domain>  atau  .doh <provider> <domain>",
  example: ".doh google.com  atau  .doh MX github.com  atau  .doh cloudflare google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const PROVIDERS = {
  cloudflare: { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", accept: "application/dns-json" },
  google: { name: "Google", url: "https://dns.google/resolve", accept: "application/dns-json" },
  quad9: { name: "Quad9", url: "https://dns.quad9.net:5053/dns-query", accept: "application/dns-json" },
};

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "PTR", "SRV", "CAA"];

async function dohQuery(domain, type, provider) {
  const p = PROVIDERS[provider] || PROVIDERS.cloudflare;
  const url = p.url + "?name=" + encodeURIComponent(domain) + "&type=" + type;

  const res = await fetch(url, {
    headers: {
      "Accept": p.accept,
      "User-Agent": "Mozilla/5.0 (Rara Bot)",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error("DoH error: " + res.status);
  }

  const data = await res.json();
  return { data, provider: p.name };
}

function formatAnswer(record) {
  const parts = [];
  if (record.name) parts.push("Name: " + record.name);
  if (record.type) {
    const typeNum = typeof record.type === "number" ? record.type : null;
    parts.push("Type: " + record.type);
  }
  if (record.TTL) parts.push("TTL: " + record.TTL + "s");
  if (record.data) parts.push("Data: " + record.data);
  if (record.preference !== undefined) parts.push("Priority: " + record.preference);
  return parts.join(" | ");
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        raraWrap("doh", prefix + "doh <domain>\n" +
        prefix + "doh <type> <domain>\n" +
        prefix + "doh <provider> <domain>\n\n" +
        "Type: A, AAAA, CNAME, MX, NS, TXT, SOA, PTR, SRV, CAA\n" +
        "Provider: cloudflare, google, quad9 (default: cloudflare)\n" +
        "Default type: A\n\n" +
        "Contoh:\n" +
        prefix + "doh google.com\n" +
        prefix + "doh MX github.com\n" +
        prefix + "doh google example.com\n" +
        prefix + "doh cloudflare NS cloudflare.com", "guide"),
        { title: "DNS over HTTPS" }
      );
    }

    const parts = text.split(/\s+/);
    let provider = "cloudflare";
    let type = "A";
    let domain = "";

    // Parse: check if first word is provider
    if (parts.length >= 2 && PROVIDERS[parts[0].toLowerCase()]) {
      provider = parts[0].toLowerCase();
      parts.shift();
    }

    // Check if first remaining word is a record type
    if (parts.length >= 2 && RECORD_TYPES.includes(parts[0].toUpperCase())) {
      type = parts[0].toUpperCase();
      parts.shift();
    }

    domain = parts.join(" ").trim();

    if (!domain) {
      return m.reply(raraWrap("DoH", "Domain tidak boleh kosong!"));
    }

    // Clean domain
    domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
    const { data, provider: provName } = await dohQuery(domain, type, provider);

    const lines = [
      "Domain: " + domain,
      "Type: " + type,
      "Provider: " + provName,
      "Status: " + (data.Status === 0 ? "OK (NOERROR)" : "Error (" + data.Status + ")"),
      "",
    ];

    if (data.Answer && data.Answer.length > 0) {
      lines.push("Answer (" + data.Answer.length + " records):");
      for (const ans of data.Answer) {
        lines.push("  " + formatAnswer(ans));
      }
    } else {
      lines.push("Answer: Tidak ada record");
    }

    if (data.Authority && data.Authority.length > 0) {
      lines.push("");
      lines.push("Authority (" + data.Authority.length + " records):");
      for (const auth of data.Authority.slice(0, 5)) {
        lines.push("  " + formatAnswer(auth));
      }
    }

    if (data.Comment) {
      lines.push("");
      lines.push("Note: " + data.Comment);
    }
    await m.react("🐣");
    return m.reply(raraWrap("DoH Query: " + domain, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("doh error:", e);
    return m.reply(raraWrap("DoH", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
