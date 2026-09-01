// NOVA AI WHATSAPP BOT - BERITAV2 PLUGIN
import axios from 'axios';
import { novaError, novaEmpty, novaGuide, novaNoInput } from "../../src/lib/nova-menu-style.js";
import * as cheerio from 'cheerio';

const pluginConfig = {
    name: "beritav2",
    alias: ["beritav2"],
    category: 'info',
    description: 'Berita terkini dari RSS Indonesia (Detik, Kompas, CNN, Tribun)',
    usage: '.beritav2 <sumber>',
    example: '.beritav2 detik',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
};

const SOURCES = {
    detik: {
        name: "Detik",
        fullName: "Detik News",
        urls: [
            "https://rss.detik.com/index.php/detiknews",
            "https://news.detik.com/rss",
            "https://news.google.com/rss/search?q=site:detik.com&hl=id&gl=ID&ceid=ID:id"
        ]
    },
    kompas: {
        name: "Kompas",
        fullName: "Kompas.com",
        urls: [
            "https://www.kompas.com/getrss",
            "https://rss.kompas.com",
            "https://news.google.com/rss/search?q=site:kompas.com&hl=id&gl=ID&ceid=ID:id"
        ]
    },
    cnn: {
        name: "CNN Indonesia",
        fullName: "CNN Indonesia",
        urls: [
            "https://www.cnnindonesia.com/rss",
            "https://news.google.com/rss/search?q=site:cnnindonesia.com&hl=id&gl=ID&ceid=ID:id"
        ]
    },
    tribun: {
        name: "Tribun",
        fullName: "Tribunnews",
        urls: [
            "https://www.tribunnews.com/rss",
            "https://news.google.com/rss/search?q=site:tribunnews.com&hl=id&gl=ID&ceid=ID:id"
        ]
    }
};

function formatPubDate(rawDate) {
    if (!rawDate) return "";
    try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            return d.toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        }
    } catch (_) {}
    return rawDate;
}

function parseRssXml(xmlData) {
    const $ = cheerio.load(xmlData, { xmlMode: true });
    const items = [];
    
    $("item").each((i, el) => {
        if (items.length >= 5) return;
        
        let title = $(el).find("title").text().trim();
        title = title.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").replace(/\s+-\s+.*$/, "").trim();
        
        let link = $(el).find("link").text().trim() || $(el).find("guid").text().trim();
        let pubDateRaw = $(el).find("pubDate").text().trim() || $(el).find("dc\\:date").text().trim();
        let pubDate = formatPubDate(pubDateRaw);
        
        if (title && link) {
            items.push({ title, link, pubDate });
        }
    });
    
    return items;
}

async function fetchRssFeed(sourceKey) {
    const cfg = SOURCES[sourceKey];
    if (!cfg) return null;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
    };

    let lastError = null;

    for (const url of cfg.urls) {
        try {
            const res = await axios.get(url, { headers, timeout: 7000 });
            const items = parseRssXml(res.data);
            if (items && items.length > 0) {
                return { source: cfg, items };
            }
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(lastError?.message || `Gagal mengambil berita dari ${cfg.fullName}`);
}

function renderSelectionBox(prefix = ".") {
    return [
        "╭─「 ✦ Pilihan Sumber Berita ✦ 」",
        "│ Silakan pilih sumber berita yang ingin dibaca:",
        "│ ",
        `│ 1. ${prefix}beritav2 detik   - Detik News`,
        `│ 2. ${prefix}beritav2 kompas  - Kompas.com`,
        `│ 3. ${prefix}beritav2 cnn     - CNN Indonesia`,
        `│ 4. ${prefix}beritav2 tribun  - Tribunnews`,
        "│ ",
        `│ Contoh: ${prefix}beritav2 detik`,
        "╰────  •  ────"
    ].join("\n");
}

function renderNewsBox(sourceName, items) {
    const lines = [`╭─「 ✦ Berita ${sourceName} ✦ 」`];
    
    items.slice(0, 5).forEach((item, index) => {
        const num = index + 1;
        lines.push(`│ ${num}. ${item.title}`);
        if (item.pubDate) {
            lines.push(`│ ${item.pubDate}`);
        }
        lines.push(`│ ${item.link}`);
        if (index < Math.min(items.length, 5) - 1) {
            lines.push("│ ");
        }
    });
    
    lines.push("╰────  •  ────");
    return lines.join("\n");
}

function renderErrorBox(sourceName, errorMsg) {
    return [
        "╭─「 ✦ Error Berita ✦ 」",
        `│ Gagal ambil berita ${sourceName ? `dari ${sourceName}` : ""}`,
        `│ Detail: ${errorMsg || "Ada error nih"}`,
        "│ ",
        "│ Silakan coba sumber lain: detik, kompas, cnn, tribun",
        "╰────  •  ────"
    ].join("\n");
}

async function handler(m, extra = {}) {
    const { usedPrefix, text, args } = extra;
    const prefix = m.prefix || usedPrefix || ".";
    
    // Extract input from m.text, text argument, or m.args
    const rawInput = (typeof text === "string" && text) || m.text || (args && args.join(" ")) || (m.args && m.args.join(" ")) || "";
    const input = rawInput.trim().toLowerCase();

    // Determine target source key
    let sourceKey = null;
    if (["detik", "1"].includes(input)) {
        sourceKey = "detik";
    } else if (["kompas", "2"].includes(input)) {
        sourceKey = "kompas";
    } else if (["cnn", "cnnindonesia", "3"].includes(input)) {
        sourceKey = "cnn";
    } else if (["tribun", "tribunnews", "4"].includes(input)) {
        sourceKey = "tribun";
    }

    // If source is missing or invalid, display selection box
    if (!input || !sourceKey) {
        return m.reply(renderSelectionBox(prefix));
    }

    try {
        if (typeof m.react === "function") {
        }

        const data = await fetchRssFeed(sourceKey);
        const resultText = renderNewsBox(data.source.name, data.items);

        if (typeof m.react === "function") {
            await m.react("📰");
        }

        return m.reply(resultText);
    } catch (err) {
        if (typeof m.react === "function") {
        }

        const errorText = renderErrorBox(SOURCES[sourceKey]?.name || sourceKey, err.message);
        return m.reply(errorText);
    }
}

export { pluginConfig as config, handler };
export default { config: pluginConfig, handler };
