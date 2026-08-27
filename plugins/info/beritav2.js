// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// beritav2.js — Berita terkini via RSS Indonesia (gratis, no API key)
import axios from 'axios'
import * as cheerio from 'cheerio'

const pluginConfig = {
  name: "beritav2",
  alias: ["beritav2"],
  category: "info",
  description: "Berita terkini dari RSS Indonesia (Detik, Kompas, CNN, Tribun)",
  usage: ".beritav2 <sumber>",
  example: ".beritav2 detik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
}

const SOURCES = {
  detik: { url: "https://rss.detik.com/index.php/detiknews", name: "Detik News" },
  kompas: { url: "https://www.kompas.com/getrss", name: "Kompas" },
  cnn: { url: "https://www.cnnindonesia.com/rss", name: "CNN Indonesia" },
  tribun: { url: "https://www.tribunnews.com/rss", name: "Tribun News" },
}

async function parseRSS(url) {
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  })
  const $ = cheerio.load(data, { xmlMode: true })
  const items = []
  $("item").slice(0, 5).each((_, el) => {
    const title = $(el).find("title").text().trim()
    const link = $(el).find("link").text().trim()
    const pubDate = $(el).find("pubDate").text().trim()
    items.push({ title, link, pubDate })
  })
  return items
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    })
  } catch {
    return dateStr || ""
  }
}

async function handler(m, { sock }) {
  try {
    const input = (m.text || "").trim().toLowerCase()

    if (!input || !SOURCES[input]) {
      const list = Object.entries(SOURCES)
        .map(([key, val]) => `├── .beritav2 ${key} — ${val.name}`)
        .join("\n")
      return m.reply(
        "╭──「 Berita v2 」\n" +
        "├── Pilih sumber berita:\n" +
        list + "\n" +
        "╰──────────❀"
      )
    }

    const source = SOURCES[input]
    await m.react("🕒")

    const news = await parseRSS(source.url)

    if (!news.length) {
      await m.react("🐣")
      return m.reply(
        "╭──「 Berita v2 」\n" +
        "├── Tidak ada berita tersedia saat ini.\n" +
        "╰──────────❀"
      )
    }

    let text = "╭──「 Berita " + source.name + " 」\n"
    news.forEach((n, i) => {
      text += "├── " + (i + 1) + ". " + n.title + "\n"
      text += "├── " + formatDate(n.pubDate) + "\n"
      text += "├── " + n.link + "\n"
      if (i < news.length - 1) text += "├──\n"
    })
    text += "╰──────────❀"

    await m.react("🐣")
    return m.reply(text)
  } catch (e) {
    console.error("[beritav2] error:", e.message)
    await m.react("🐣")
    return m.reply(
      "╭──「 Error 」\n" +
      "├── Gagal mengambil berita.\n" +
      "├── " + (e.message || "Terjadi kesalahan") + "\n" +
      "╰──────────❀"
    )
  }
}

export { pluginConfig as config, handler }
