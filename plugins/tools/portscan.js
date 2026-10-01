// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, novaWrap } from "../../src/lib/nova-menu-style.js";
import net from "net";

const pluginConfig = {
  name: "portscan",
  alias: ["portscan"],
  category: "tools",
  description: "Scan port terbuka dari suatu host (common ports)",
  usage: ".portscan <host>  atau  .portscan <host> <port1,port2,...>",
  example: ".portscan google.com  atau  .portscan 8.8.8.8 80,443,8080",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: true,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const COMMON_PORTS = [
  { port: 21, service: "FTP" },
  { port: 22, service: "SSH" },
  { port: 23, service: "Telnet" },
  { port: 25, service: "SMTP" },
  { port: 53, service: "DNS" },
  { port: 80, service: "HTTP" },
  { port: 110, service: "POP3" },
  { port: 143, service: "IMAP" },
  { port: 443, service: "HTTPS" },
  { port: 445, service: "SMB" },
  { port: 993, service: "IMAPS" },
  { port: 995, service: "POP3S" },
  { port: 3306, service: "MySQL" },
  { port: 3389, service: "RDP" },
  { port: 5432, service: "PostgreSQL" },
  { port: 6379, service: "Redis" },
  { port: 8080, service: "HTTP Alt" },
  { port: 8443, service: "HTTPS Alt" },
  { port: 27017, service: "MongoDB" },
];

const SERVICE_MAP = {};
for (const p of COMMON_PORTS) SERVICE_MAP[p.port] = p.service;

function scanPort(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    let resolved = false;

    const done = (result) => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.connect(port, host, () => {
      done({ port, open: true, service: SERVICE_MAP[port] || "Unknown" });
    });

    socket.on("timeout", () => {
      done({ port, open: false, service: SERVICE_MAP[port] || "Unknown" });
    });

    socket.on("error", () => {
      done({ port, open: false, service: SERVICE_MAP[port] || "Unknown" });
    });
  });
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    await m.react("🕒");
    const text = (m.text || "").trim();

    if (!text) {
      return m.reply(
        prefix + "portscan <host>\n" +
        prefix + "portscan <host> <port1,port2,...>\n\n" +
        "Default: scan 19 common ports\n" +
        "Custom: scan port spesifik (max 20 ports)\n\n" +
        "Common ports:\n" +
        "20-25, 53, 80, 110, 143, 443, 445, 993, 995\n" +
        "3306, 3389, 5432, 6379, 8080, 8443, 27017\n\n" +
        "Contoh:\n" +
        prefix + "portscan google.com\n" +
        prefix + "portscan 8.8.8.8 53,80,443\n" +
        prefix + "portscan example.com 1-100",
        { title: "Port Scanner" }
      );
    }

    const parts = text.split(/\s+/);
    const host = parts[0].replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
    if (!host) {
      return m.reply(novaWrap("PortScan", "Host tidak boleh kosong!"));
    }

    let portsToScan;
    let isCustom = false;

    if (parts.length > 1) {
      isCustom = true;
      const portStr = parts.slice(1).join("");

      // Range syntax: 1-100
      if (portStr.includes("-")) {
        const [start, end] = portStr.split("-").map((n) => parseInt(n));
        if (isNaN(start) || isNaN(end) || start < 1 || end > 65535 || start > end) {
          return m.reply(novaWrap("PortScan", "Range port invalid!\n💡 *Contoh:* 1-100"));
        }
        const range = end - start + 1;
        if (range > 50) {
          return m.reply(novaWrap("PortScan", "Maksimal 50 port dalam satu scan!"));
        }
        portsToScan = [];
        for (let p = start; p <= end; p++) portsToScan.push(p);
      } else {
        // Comma separated
        const portList = portStr.split(",").map((n) => parseInt(n.trim())).filter((n) => !isNaN(n) && n > 0 && n <= 65535);
        if (portList.length === 0) {
          return m.reply(novaWrap("PortScan", "Port tidak valid!"));
        }
        if (portList.length > 20) {
          return m.reply(novaWrap("PortScan", "Maksimal 20 port custom!"));
        }
        portsToScan = [...new Set(portList)];
      }
    } else {
      portsToScan = COMMON_PORTS.map((p) => p.port);
    }
    // Scan all ports concurrently
    const results = await Promise.all(
      portsToScan.map((port) => scanPort(host, port))
    );

    const openPorts = results.filter((r) => r.open);
    const closedPorts = results.filter((r) => !r.open);

    const lines = [
      "Host: " + host,
      "Total scanned: " + results.length,
      "Open: " + openPorts.length + " | Closed: " + closedPorts.length,
      "",
    ];

    if (openPorts.length > 0) {
      lines.push("OPEN PORTS:");
      for (const op of openPorts) {
        lines.push("  " + op.port + "/tcp (" + op.service + ")");
      }
    } else {
      lines.push("Tidak ada port terbuka ditemukan");
    }

    if (closedPorts.length > 0 && closedPorts.length <= 10) {
      lines.push("");
      lines.push("CLOSED:");
      for (const cp of closedPorts) {
        lines.push("  " + cp.port + "/tcp (" + cp.service + ")");
      }
    }
    await m.react("🐣");
    return m.reply(novaWrap("Port Scan: " + host, lines.join("\n")));
  } catch (e) {
    await m.react("❌");
    console.error("portscan error:", e);
    return m.reply(novaWrap("PortScan", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
