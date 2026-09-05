// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { novaError, novaEmpty, novaGuide, novaNoInput, claraWrap } from "../../src/lib/nova-menu-style.js";
import mql from "@microlink/mql"
import te from "../../src/lib/nova-error.js"

const pluginConfig = {
    name: "carbon",
    alias: ["carbon"],
    category: "tools",
    description: "Membuat gambar kode dengan tampilan carbon style",
    usage: ".carbon <kode>",
    example: '.carbon console.log("Hello World")',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const THEMES = [
    "dracula-pro", "monokai", "nord", "solarized-dark", "solarized-light",
    "one-dark", "material", "panda-syntax", "night-owl", "cobalt2"
]

const FONTS = [
    "Fira Code", "JetBrains Mono", "Hack", "Source Code Pro", "Inconsolata",
    "Droid Sans Mono", "Anonymous Pro"
]

function buildCarbonUrl(config) {
    const theme = THEMES.includes(config.theme) ? config.theme : "dracula-pro"
    const font = FONTS.includes(config.font) ? config.font : "Fira Code"

    const params = new URLSearchParams({
        bg: config.background,
        t: theme,
        wt: "none",
        l: config.language || "auto",
        ds: "false",
        dsyoff: "20px",
        dsblur: "68px",
        wc: "true",
        wa: "true",
        pv: "56px",
        ph: "56px",
        ln: config.lineNumbers ? "true" : "false",
        fl: "1",
        fm: font,
        fs: config.fontSize || "14px",
        lh: "152%",
        si: "false",
        es: "2x",
        wm: "false"
    })

    params.append("code", config.code)
    return `https://carbon.now.sh/?${params.toString()}`
}

async function handler(m, { sock }) {
    const text = m.text || m.quoted?.text

    if (!text) {
        return m.reply(claraWrap("carbon", [
      `🖥️ *ᴄᴀʀʙᴏɴ ᴄᴏᴅᴇ*`,
      `Fitur ini mengubah teks kode program kamu menjadi gambar cantik ala Carbon`,
      ``,
      `📌 Format:`,
      `${m.prefix}carbon <kode>`,
      `Atau kamu bisa reply pesan yang berisi kode`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}carbon console.log("Halo")`
    ]))
    }
    try {
    await m.react("🕒");
        const config = {
            code: text,
            language: "auto",
            theme: "dracula-pro",
            font: "Fira Code",
            fontSize: "14px",
            background: "rgba(226,233,239,1)",
            lineNumbers: true,
            width: 1024,
            height: 768,
            waitFor: 3000
        }

        const targetUrl = buildCarbonUrl(config)

        const res = await mql(targetUrl, {
            screenshot: {
                element: ".export-container",
                optimizeForSpeed: true
            },
            viewport: {
                width: config.width,
                height: config.height
            },
            waitFor: config.waitFor,
            meta: false
        })

        const imageUrl = res.data?.screenshot?.url || null

        if (!imageUrl) throw new Error("Gagal generate carbon gambar")

        await sock.sendMedia(m.chat, imageUrl, null, m, {
            type: "image"
        })

    } catch (err) {
    await m.react("❌");
        return m.reply(claraWrap("carbon", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }