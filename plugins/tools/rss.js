// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// rss.js — Generic RSS feed reader (rss-parser, no API key)
import RSSParser from 'rss-parser'

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
        const url = (m.text || "").trim()

        if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
            return m.reply(
                "╭──「 RSS Reader 」\n" +
                "├── Baca RSS feed dari URL mana pun\n" +
                "├──\n" +
                "├── 📌 *Cara Pakai:*\n" +
                "├── " + pluginConfig.usage + "\n" +
                "├──\n" +
                "├── 💡 *Contoh:*\n" +
                "├── " + pluginConfig.example + "\n" +
                "├──\n" +
                "├── Bisa juga pakai shortcut:\n" +
                "├── .rss detik = Detik News\n" +
                "├── .rss kompas = Kompas\n" +
                "├── .rss cnn = CNN Indonesia\n" +
                "├── .rss tribun = Tribun News\n" +
                "╰──────────❀"
            )
        }

        await m.react("🕒")

        // Shortcut RSS Indonesia
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
            await m.react("🐣")
            return m.reply(
                "╭──「 RSS Reader 」\n" +
                "├── Feed kosong atau tidak bisa dibaca.\n" +
                "╰──────────❀"
            )
        }

        const feedTitle = feed.title || "RSS Feed"
        const items = feed.items.slice(0, 8)

        let text = "╭──「 " + feedTitle + " 」\n"
        text += "├── " + items.length + " artikel terbaru\n"
        text += "├──\n"

        items.forEach((item, i) => {
            const title = item.title || "No title"
            const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString("id-ID", {
                day: "numeric", month: "short"
            }) : ""
            const link = item.link || ""

            text += "├── " + (i + 1) + ". " + title + "\n"
            if (pubDate) text += "├── " + pubDate + "\n"
            if (link) text += "├── " + link + "\n"
            if (i < items.length - 1) text += "├──\n"
        })

        text += "╰──────────❀"

        await m.react("🐣")
        return m.reply(text)
    } catch (e) {
        console.error("[rss] error:", e.message)
        await m.react("🐣")
        return m.reply(
            "╭──「 Error 」\n" +
            "├── Gagal membaca RSS feed.\n" +
            "├── " + (e.message || "Terjadi kesalahan") + "\n" +
            "╰──────────❀"
        )
    }
}

export { pluginConfig as config, handler }
