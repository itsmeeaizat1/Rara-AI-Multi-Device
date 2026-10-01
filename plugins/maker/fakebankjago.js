// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// FIX 14 Sep 2026 (audit fitur canvas): ensureFile() nulis font ke path
// relatif "../assets/fonts/..." — relatif ke process.cwd(), BUKAN ke lokasi
// file plugin. Kalau bot dijalanin dari root repo, path itu nyasar SATU
// LEVEL DI LUAR repo (folder assets/fonts yang bener ada di root repo, bukan
// di atasnya) — sama kelas bug yang udah pernah difix di fakedana.js.
// Font-nya SUDAH ADA di assets/fonts/ bawaan repo, jadi gak perlu download
// ulang dari GitHub tiap kali file gak ketemu di path yang salah — langsung
// register dari path absolut via import.meta.url (immune ke cwd).
import { novaWrap } from "../../src/lib/nova-menu-style.js";
import { Canvas, loadImage, FontLibrary } from 'skia-canvas'
import te from '../../src/lib/nova-error.js'
import { fileURLToPath } from "url";

const _font1Path = fileURLToPath(new URL("../../assets/fonts/Fontspring-DEMO-ceraroundpro-medium.otf", import.meta.url));
const _font2Path = fileURLToPath(new URL("../../assets/fonts/Roboto_Medium.ttf", import.meta.url));
FontLibrary.use("CustomFont", _font1Path);
FontLibrary.use("GreetingFont", _font2Path);

async function generateImage(saldo, greet) {
  const bgUrl = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/52e39f-1773064858080.jpg"

  const bgRes = await fetch(bgUrl)
  const bg = await loadImage(Buffer.from(await bgRes.arrayBuffer()))

  const canvas = new Canvas(bg.width, bg.height)
  const ctx = canvas.getContext("2d")

  ctx.drawImage(bg, 0, 0, bg.width, bg.height)

  const numberText = saldo
  const baseX = 2470
  const baseY = 894

  ctx.font = "125px CustomFont"
  ctx.fillStyle = "black"

  const numberWidth = ctx.measureText(numberText).width
  const numberX = baseX - numberWidth

  ctx.fillText(numberText, numberX, baseY)

  const rpText = "Rp"
  const rpWidth = ctx.measureText(rpText).width
  const rpX = numberX - rpWidth - 4

  ctx.fillText(rpText, rpX, baseY)

  ctx.font = "93px GreetingFont"
  ctx.fillStyle = "gray"

  ctx.fillText(greet, 98, 86)

  return await canvas.png
}
const pluginConfig = {
    name: 'fakebankjago',
    alias: ["fakebankjago"],
    category: "maker",
    description: 'Membuat gambar chat iPhone style',
    usage: '.fakebankjago <text>',
    example: '.fakebankjago Hai cantik',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const [nama,nominal] = m.text?.split(',')
    if (!nama || !nominal) {
        return m.reply(novaWrap("fakebankjago", [
            "Bikin screenshot chat fake bank ala Bank Jago.",
            "",
            `📌 Format: ${m.prefix}fakebank <nama>,<nominal>`,
            "",
            `💡 Contoh: ${m.prefix}fakebank Aizat,10000`,
        ]))
    }
    if(isNaN(nominal)) { return m.reply(novaWrap("fakebankjago", "Nominal harus berupa angka kak.", "error")); }
    try {
        await m.react("🕒");
        const saldo = Number(nominal.replace(/[^0-9]/g, '')).toLocaleString('id-ID')
        const hour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
        const h = Number(hour)
        let waktu = 'Malam'
        if (h >= 4 && h < 11) waktu = 'Pagi'
        else if (h >= 11 && h < 15) waktu = 'Siang'
        else if (h >= 15 && h < 18) waktu = 'Sore'
        const fake = await generateImage(saldo, `Selamat ${waktu}, ${nama}`)
        await m.react("🐣");
        await sock.sendMedia(m.chat, fake, null, m, {
            type: 'image',
        })
    } catch (error) {
        await m.react("❌");
        m.reply(novaWrap("fakebankjago", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
