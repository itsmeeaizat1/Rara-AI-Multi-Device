// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// plugins/tools/proxy.js — Proxy fetcher via ProxyScrape v4
// (port dari script owner 9 Sep 2026).
//
// .proxy [jumlah] [negara|protokol] — ambil proxy hidup acak
// .proxy file [negara|protokol]     — kirim full list 500 sebagai dokumen .txt
// .proxy help                       — panduan

import fs from "fs";
import path from "path";
import { fetchProxies, pickAlive, COUNTRIES } from "../../src/scraper/proxyscrape.js";
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "proxy",
  alias: ["proxy", "proxylist", "proxyscrape", "getproxy"],
  category: "tools",
  description: "Ambil daftar proxy gratis (http/socks4/socks5) dari ProxyScrape — hidup & acak",
  usage: ".proxy [1-50] [negara|http|socks4|socks5]\n.proxy file [negara|protokol] — full list 500 sebagai file .txt",
  example: ".proxy 10\n.proxy 5 id\n.proxy 20 socks5",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const PROTOS = ["http", "socks4", "socks5"];
const TMP_DIR = path.join(process.cwd(), "tmp");

function isCountryCode(w) {
  return /^[a-z]{2}$/.test(w) && COUNTRIES.split(",").includes(w);
}

async function handler(m, { sock }) {
  try {
    const args = (m.args || []).map((a) => String(a).toLowerCase());
    const sub = args[0];

    // help
    if (sub === "help" || sub === "?") {
      return m.reply(novaWrap("proxy",
        `🌐 PROXY FETCHER — ProxyScrape v4\n\n` +
        `.proxy — 10 proxy hidup acak\n` +
        `.proxy <1-50> — sejumlah itu\n` +
        `.proxy <jumlah> <negara> — filter negara (id, sg, us, jp, ...)\n` +
        `.proxy <jumlah> <http|socks4|socks5> — filter protokol\n` +
        `.proxy file — full list sampai 500 proxy (.txt)\n\n` +
        `Contoh: ${m.prefix}proxy 5 id | ${m.prefix}proxy 20 socks5`, "guide"));
    }

    // parse argumen: jumlah / negara / protokol
    let count = 10;
    let country = "";
    let protocol = "http,socks4,socks5";
    let wantFile = false;
    for (const w of args) {
      if (w === "file" || w === "txt") wantFile = true;
      else if (/^\d+$/.test(w)) count = Math.min(500, Math.max(1, parseInt(w)));
      else if (PROTOS.includes(w)) protocol = w;
      else if (isCountryCode(w)) country = w;
    }

    await m.react("⏲️");
    const proxies = await fetchProxies({ protocol, country });
    if (!proxies.length) {
      await m.react("❌");
      return m.reply(novaWrap("proxy",
        `Gak nemu proxy${country ? ` untuk negara *${country.toUpperCase()}*` : ""}.\n\nCoba negara lain, atau lihat daftar: ${m.prefix}proxy help`, "warn"));
    }

    // mode file: full list → dokumen .txt
    if (wantFile) {
      const content = proxies.map((p) => p.addr).join("\n") + "\n";
      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
      const fileName = `proxy-${country || "all"}-${Date.now()}.txt`;
      const filePath = path.join(TMP_DIR, fileName);
      fs.writeFileSync(filePath, content, "utf-8");
      await m.react("🐣");
      await sock.sendMessage(m.chat, {
        document: { url: filePath },
        fileName,
        mimetype: "text/plain",
        caption: `🌐 ${proxies.length} proxy (${country ? country.toUpperCase() : "semua negara"} | ${protocol})\nSumber: ProxyScrape v4`,
      }, { quoted: m });
      return;
    }

    // mode list: N proxy hidup acak
    const picked = pickAlive(proxies, count);
    const lines = picked.map((p, i) =>
      `${i + 1}. ${p.addr}  [${p.protocol} | ${String(p.country).toUpperCase()}${p.ssl ? " | ssl" : ""} | ${p.anonymity}]`
    );
    const filterInfo = `${country ? `negara ${country.toUpperCase()} | ` : ""}${protocol === "http,socks4,socks5" ? "semua protokol" : protocol}`;
    await m.react("🐣");
    return m.reply(novaWrap("proxy",
      `🌐 ${picked.length} PROXY HIDUP (acak)\n` +
      `Filter: ${filterInfo} | Stok: ${proxies.length}\n\n` +
      lines.join("\n") +
      `\n\n💡 Format: protocol://ip:port\nFull list 500: ${m.prefix}proxy file`, "guide"));
  } catch (err) {
    console.error("proxy error:", err.message);
    await m.react("❌");
    return m.reply(novaWrap("proxy", te(m.prefix, m.command, m.pushName), "error"));
  }
}

export { pluginConfig as config, handler };
