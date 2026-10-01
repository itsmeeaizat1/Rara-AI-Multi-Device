// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "whoishistory",
  alias: ["whoishistory"],
  category: "tools",
  description: "Riwayat WHOIS domain (registrar, NS, created/updated/expiry date)",
  usage: ".whoishistory <domain>",
  example: ".whoishistory google.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

async function getWhois(domain) {
  // Try RDAP (Registration Data Access Protocol) — modern replacement for WHOIS
  const rdapUrls = [
    "https://rdap.org/domain/" + domain,
    "https://www.rdap.net/domain/" + domain,
  ];

  for (const url of rdapUrls) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/rdap+json", "User-Agent": "Mozilla/5.0 (Rara Bot)" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      return { data, source: "RDAP", url };
    } catch (e) {
      continue;
    }
  }

  // Fallback: try WHOISJSON API
  try {
    const res = await fetch("https://whoisjson.com/api/v1/whois?domain=" + encodeURIComponent(domain), {
      headers: { "User-Agent": "Mozilla/5.0 (Rara Bot)" },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data, source: "WHOISJSON", fallback: true };
    }
  } catch (e) {
    // continue
  }

  return { error: "Tidak bisa fetch WHOIS data untuk " + domain };
}

function parseRdap(data) {
  const result = {
    domain: null,
    status: [],
    registrar: null,
    createdDate: null,
    updatedDate: null,
    expiryDate: null,
    nameservers: [],
    events: [],
    entities: [],
    notices: [],
  };

  // Events (created, updated, expiration)
  if (data.events) {
    for (const ev of data.events) {
      const date = ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("id-ID") : "N/A";
      if (ev.eventAction === "registration") result.createdDate = date;
      else if (ev.eventAction === "last changed") result.updatedDate = date;
      else if (ev.eventAction === "expiration") result.expiryDate = date;
      result.events.push({ action: ev.eventAction, date });
    }
  }

  // Status
  if (data.status) result.status = data.status;

  // Nameservers
  if (data.nameservers) {
    for (const ns of data.nameservers) {
      const ldh = ns.ldhName || ns.unicodeName || JSON.stringify(ns);
      result.nameservers.push(ldh.toLowerCase());
    }
  }

  // Entities (registrar, registrant, admin, tech)
  if (data.entities) {
    for (const ent of data.entities) {
      const roles = ent.roles || [];
      const name = ent.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] || "Unknown";
      const handle = ent.handle || "N/A";

      result.entities.push({
        role: roles.join(", "),
        name,
        handle,
        events: ent.events || [],
      });

      if (roles.includes("registrar")) {
        result.registrar = name;
        // Registrar events for dates
        if (ent.events) {
          for (const ev of ent.events) {
            const date = ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("id-ID") : "N/A";
            if (ev.eventAction === "last changed") result.updatedDate = result.updatedDate || date;
          }
        }
      }
    }
  }

  // Notices
  if (data.notices) {
    for (const notice of data.notices) {
      if (notice.title) result.notices.push(notice.title);
    }
  }

  return result;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "whoishistory <domain>\n\n" +
        "Riwayat WHOIS domain (via RDAP)\n" +
        "Info: registrar, NS, created/updated/expiry date, status\n\n" +
        "Contoh:\n" +
        prefix + "whoishistory google.com\n" +
        prefix + "whoishistory github.com",
        { title: "WHOIS History" }
      );
    }

    const domain = text.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").trim();
    if (!domain) {
      return m.reply(raraWrap("WhoisHistory", "Domain tidak boleh kosong!"));
    }
    const raw = await getWhois(domain);

    if (raw.error) {
      return m.reply(raraWrap("WhoisHistory", raw.error));
    }

    const info = raw.fallback ? raw.data : parseRdap(raw.data);

    const lines = ["Domain: " + domain, "Source: " + raw.source, ""];

    if (info.registrar) {
      lines.push("Registrar: " + info.registrar);
    }

    if (info.createdDate) {
      // Calculate domain age
      const createdRaw = raw.data.events?.find((e) => e.eventAction === "registration")?.eventDate;
      if (createdRaw) {
        const ageMs = Date.now() - new Date(createdRaw).getTime();
        const ageYears = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
        const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        lines.push("Created: " + info.createdDate + " (" + ageYears + " tahun " + (ageDays % 365) + " hari)");
      } else {
        lines.push("Created: " + info.createdDate);
      }
    }

    if (info.updatedDate) lines.push("Updated: " + info.updatedDate);
    if (info.expiryDate) {
      // Calculate days until expiry
      const expiryRaw = raw.data.events?.find((e) => e.eventAction === "expiration")?.eventDate;
      if (expiryRaw) {
        const daysLeft = Math.ceil((new Date(expiryRaw) - Date.now()) / (1000 * 60 * 60 * 24));
        lines.push("Expiry: " + info.expiryDate + " (" + (daysLeft > 0 ? daysLeft + " hari lagi" : "Expired " + Math.abs(daysLeft) + " hari lalu") + ")");
      } else {
        lines.push("Expiry: " + info.expiryDate);
      }
    }

    if (info.status && info.status.length > 0) {
      lines.push("");
      lines.push("Status (" + info.status.length + "):");
      for (const s of info.status.slice(0, 10)) {
        lines.push("  " + s);
      }
    }

    if (info.nameservers && info.nameservers.length > 0) {
      lines.push("");
      lines.push("Nameservers (" + info.nameservers.length + "):");
      for (const ns of info.nameservers) {
        lines.push("  " + ns);
      }
    }

    if (info.entities && info.entities.length > 0) {
      lines.push("");
      lines.push("Entities (" + info.entities.length + "):");
      for (const ent of info.entities.slice(0, 5)) {
        lines.push("  " + ent.role + ": " + ent.name + " (" + ent.handle + ")");
      }
    }

    if (info.events && info.events.length > 0) {
      lines.push("");
      lines.push("Events (" + info.events.length + "):");
      for (const ev of info.events) {
        lines.push("  " + ev.action + ": " + ev.date);
      }
    }
    await m.react("🐣");
    return m.reply(raraWrap("WHOIS: " + domain, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("whoishistory error:", e);
    return m.reply(raraWrap("WhoisHistory", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
