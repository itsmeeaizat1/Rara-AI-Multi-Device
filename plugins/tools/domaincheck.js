// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "domaincheck",
  alias: ["domaincheck"],
  category: "tools",
  description: "Cek ketersediaan domain (com, net, id, org, io, dll) via RDAP",
  usage: ".domaincheck <domain>",
  example: ".domaincheck google.com  atau  .domaincheck mynewproject.id",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

// RDAP bootstrap for common TLDs
const RDAP_BOOTSTRAP = "https://rdap.org/domain/";

async function checkDomain(domain) {
  // Try RDAP first — if it returns data, domain is REGISTERED
  try {
    const res = await fetch(RDAP_BOOTSTRAP + encodeURIComponent(domain), {
      headers: { "Accept": "application/rdap+json", "User-Agent": "Mozilla/5.0 (Nova Bot)" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 200) {
      const data = await res.json();
      return { available: false, registered: true, data };
    }
    if (res.status === 404) {
      return { available: true, registered: false };
    }
  } catch (e) {
    // RDAP failed, try DNS fallback
  }

  // Fallback: DNS lookup
  const dns = await import("dns").then((d) => d.promises);
  try {
    const records = await dns.resolveAny(domain);
    return { available: false, registered: true, dnsRecords: records };
  } catch (e) {
    if (e.code === "ENOTFOUND" || e.code === "NXDOMAIN") {
      return { available: true, registered: false };
    }
  }

  return { available: false, registered: true, note: "Could not determine" };
}

function parseRdapDates(data) {
  const result = { created: null, updated: null, expiry: null };
  if (data.events) {
    for (const ev of data.events) {
      const date = ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("id-ID") : null;
      if (ev.eventAction === "registration") result.created = date;
      else if (ev.eventAction === "last changed") result.updated = date;
      else if (ev.eventAction === "expiration") result.expiry = date;
    }
  }
  return result;
}

function getRegistrar(data) {
  if (!data.entities) return "N/A";
  for (const ent of data.entities) {
    if (ent.roles && ent.roles.includes("registrar")) {
      const name = ent.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3];
      return name || "Unknown";
    }
  }
  return "N/A";
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "domaincheck <domain>\n\n" +
        "Cek ketersediaan domain via RDAP\n" +
        "Support: com, net, org, io, id, dev, app, xyz, dll\n\n" +
        "Contoh:\n" +
        prefix + "domaincheck google.com\n" +
        prefix + "domaincheck mynewproject.id\n" +
        prefix + "domaincheck test123456.xyz",
        { title: "Domain Availability Checker" }
      );
    }

    const domain = text.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim();
    if (!domain || !domain.includes(".")) {
      return m.reply(novaWrap("DomainCheck", "Domain tidak valid!\n💡 *Contoh:* " + prefix + "domaincheck example.com"));
    }
    const result = await checkDomain(domain);
    const tld = domain.split(".").pop();

    const lines = ["Domain: " + domain, "TLD: ." + tld, ""];

    if (result.available) {
      lines.push("Status: AVAILABLE");
      lines.push("");
      lines.push("Domain ini belum terdaftar dan bisa diregistrasi!");
      lines.push("");
      lines.push("Cek registrar populer:");
      lines.push("  Namecheap: namecheap.com");
      lines.push("  Cloudflare: cloudflare.com/products/registrar");
      lines.push("  Niagahoster: niagahoster.co.id");
      lines.push("  IDwebhost: idwebhost.com");
    } else {
      lines.push("Status: REGISTERED (taken)");
      lines.push("");

      if (result.data) {
        const dates = parseRdapDates(result.data);
        const registrar = getRegistrar(result.data);

        lines.push("Registrar: " + registrar);

        if (dates.created) {
          const ageMs = Date.now() - new Date(result.data.events?.find((e) => e.eventAction === "registration")?.eventDate).getTime();
          const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
          lines.push("Created: " + dates.created + " (" + ageYears + " tahun)");
        }
        if (dates.updated) lines.push("Updated: " + dates.updated);

        if (dates.expiry) {
          const expiryRaw = result.data.events?.find((e) => e.eventAction === "expiration")?.eventDate;
          if (expiryRaw) {
            const daysLeft = Math.ceil((new Date(expiryRaw) - Date.now()) / (1000 * 60 * 60 * 24));
            lines.push("Expiry: " + dates.expiry + " (" + (daysLeft > 0 ? daysLeft + " hari lagi" : "expired") + ")");
          } else {
            lines.push("Expiry: " + dates.expiry);
          }
        }

        if (result.data.status && result.data.status.length > 0) {
          lines.push("Status flags: " + result.data.status.length);
          for (const s of result.data.status.slice(0, 5)) {
            lines.push("  " + s);
          }
        }

        if (result.data.nameservers && result.data.nameservers.length > 0) {
          lines.push("");
          lines.push("Nameservers (" + result.data.nameservers.length + "):");
          for (const ns of result.data.nameservers) {
            const name = ns.ldhName || ns.unicodeName || JSON.stringify(ns);
            lines.push("  " + name.toLowerCase());
          }
        }
      } else if (result.dnsRecords) {
        lines.push("Detected via DNS (no RDAP data)");
        lines.push("DNS records: " + result.dnsRecords.length);
      } else {
        lines.push("Terdaftar (detail terbatas)");
      }
    }
    await m.react("🐣");
    return m.reply(novaWrap("Domain Check: " + domain, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("domaincheck error:", e);
    return m.reply(novaWrap("DomainCheck", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
