// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rss.js — Generic RSS feed reader (rss-parser, no API key)
import RSSParser from 'rss-parser'
import { raraGuide } from "../../src/lib/rara-menu-style.js"

const pluginConfig = {
    name: "rss",
    alias: ["rss"],
    category: 'tools',
    description: 'Baca RSS feed dari URL mana pun (berita, blog, podcast)',
    usage: '.rss <url rss>',
    example: '.rss https://blog.example.com/feed.xml',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true,
}

async function handler(m, { sock }) {
    try {
    await m.react("🕒");
        const url = (m.text || "").trim()

        if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
            return m.reply(raraGuide("RSS Reader", "Mau baca RSS feed? Kirim URL-nya ya! Bisa juga pakai shortcut: detik, kompas, cnn, tribun.", `${m.prefix}rss detik`))
        }
        const SHORTCUTS = {
            detik: "https://rss.detik.com/index.php/detiknews",
            kompas: "https://www.kompas.com/getrss",
            cnn: "https://www.cnnindonesia.com/rss",
            tribun: "https://www.tribunnews.com/rss",
        }

        const feedUrl = SHORTCUTS[url.toLowerCase()] || url

        const parser = new RSSParser({
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        })

        const feed = await parser.parseURL(feedUrl)

        if (!feed.items || !feed.items.length) {
            return m.reply("❌ Feed kosong atau tidak dapat dibaca.")
        }

        const feedTitle = feed.title || "RSS Feed"
        const items = feed.items.slice(0, 8)

        let text = "✅ *" + feedTitle + "*\n"
        text += items.length + " artikel terbaru\n\n"

        items.forEach((item, i) => {
            const title = item.title || "No title"
            const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString("id-ID", {
                day: "numeric", month: "short"
            }) : ""
            const link = item.link || ""

            text += (i + 1) + ". " + title + "\n"
            if (pubDate) text += "   " + pubDate + "\n"
            if (link) text += "   " + link + "\n"
            if (i < items.length - 1) text += "\n"
        })

        await m.react("🐣");
        return m.reply(text.trim())
    } catch (e) {
    await m.react("❌");
        console.error("[rss] error:", e.message)
        return m.reply("❌ " + (e.message || "Gagal membaca RSS feed"))
    }
}

export { pluginConfig as config, handler }
