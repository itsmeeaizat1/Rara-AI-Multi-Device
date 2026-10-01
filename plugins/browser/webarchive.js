// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "webarchive",
  alias: ["webarchive"],
  category: "browser",
  description: "Cek snapshot Wayback Machine (lihat tampilan lama website)",
  usage: ".webarchive <url>  atau  .webarchive list <url>",
  example: ".webarchive google.com  atau  .webarchive list example.com",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const WAYBACK_API = "https://archive.org/wayback/available?url=";

async function checkArchive(url) {
  const apiRes = await fetch(WAYBACK_API + encodeURIComponent(url), {
    headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
    signal: AbortSignal.timeout(12000),
  });

  if (!apiRes.ok) {
    throw new Error("API error: " + apiRes.status);
  }

  const data = await apiRes.json();
  return data;
}

async function listSnapshots(url) {
  // Get snapshot list from CDX API
  const cdxUrl = "https://web.archive.org/cdx/search/cdx?url=" + encodeURIComponent(url) +
    "&output=json&limit=20&fl=timestamp,statuscode,digest&sort=timestamp";

  const res = await fetch(cdxUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Nova Bot)" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error("CDX API error: " + res.status);
  }

  const text = await res.text();
  const data = JSON.parse(text);
  return data;
}

function formatDate(timestamp) {
  const y = timestamp.substring(0, 4);
  const mo = timestamp.substring(4, 6);
  const d = timestamp.substring(6, 8);
  const h = timestamp.substring(8, 10);
  const mi = timestamp.substring(10, 12);
  return d + "/" + mo + "/" + y + " " + h + ":" + mi;
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "webarchive <url> (latest snapshot)\n" +
        prefix + "webarchive list <url> (20 recent snapshots)\n\n" +
        "Cek snapshot Wayback Machine dari website\n" +
        "Info: timestamp, status code, direct archive link\n\n" +
        "Contoh:\n" +
        prefix + "webarchive google.com\n" +
        prefix + "webarchive list example.com\n" +
        prefix + "webarchive https://github.com",
        { title: "Wayback Machine Snapshot" }
      );
    }

    let mode = "latest";
    let url = text;

    if (text.toLowerCase().startsWith("list ")) {
      mode = "list";
      url = text.substring(5).trim();
    }

    url = url.startsWith("http") ? url : "https://" + url;
    const baseDomain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (mode === "latest") {
      const data = await checkArchive(url);

      if (!data.archived_snapshots || !data.archived_snapshots.closest) {
        return m.reply(novaWrap("WebArchive: " + baseDomain, [
          "URL: " + url,
          "Status: No snapshots found",
          "Website ini belum pernah di-archive di Wayback Machine",
        ].join("\n")));
      }

      const snap = data.archived_snapshots.closest;
      const snapDate = snap.timestamp ? formatDate(snap.timestamp) : "N/A";
      const archiveUrl = "https://web.archive.org/web/" + snap.timestamp + "/" + url;

      const lines = [
        "URL: " + url,
        "Status: " + (snap.available ? "Available" : "Not available"),
        "Snapshot date: " + snapDate,
        "Status code: " + (snap.status || "N/A"),
        "",
        "Archive URL:",
        archiveUrl,
      ];
      return m.reply(novaWrap("Wayback Machine: " + baseDomain, lines.join("\n")));
    }

    // List mode
    const snapshots = await listSnapshots(url);

    if (!snapshots || snapshots.length < 2) {
      return m.reply(novaWrap("WebArchive: " + baseDomain, "Tidak ada snapshot ditemukan"));
    }

    // First row is headers
    const headers = snapshots[0];
    const rows = snapshots.slice(1);

    const lines = [
      "URL: " + url,
      "Total snapshots: " + rows.length + " (max 20)",
      "",
      "Recent snapshots:",
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ts = row[0] || "";
      const status = row[1] || "N/A";
      const date = ts ? formatDate(ts) : "N/A";
      const archiveUrl = "https://web.archive.org/web/" + ts + "/" + url;

      lines.push((i + 1) + ". " + date + " [" + status + "]");
      lines.push("   " + archiveUrl);
    }

    lines.push("");
    lines.push("Full archive: https://web.archive.org/web/*/" + url);
    await m.react("🐣");
    return m.reply(novaWrap("Wayback Machine: " + baseDomain, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("webarchive error:", e);
    return m.reply(novaWrap("WebArchive", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
