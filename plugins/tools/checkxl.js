// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios"
import te from "../../src/lib/rara-error.js"
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap, raraLine } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
    name: "cekxl",
    alias: ["cekxl"],
    category: "tools",
    description: "Cek informasi paket dan kuota nomor XL/Axis secara detail",
    usage: ".cekxl <nomor>",
    example: ".cekxl 083150850721",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function cleanNumber(phoneNumber) {
    let num = phoneNumber.replace(/\D/g, "")
    if (num.startsWith("0")) num = "62" + num.substring(1)
    if (!num.startsWith("62")) num = "62" + num
    return num
}

function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "0 B"
    const units = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + units[i]
}

async function handler(m, { sock }) {
    const input = m.args[0] || m.text?.trim()

    if (!input) {
        return m.reply(raraWrap("cekxl", [
      `📱 *CEK XL/AXIS*`,
      `Fitur ini digunakan untuk mengecek informasi paket dan kuota yang tersedia pada nomor XL atau Axis kamu secara lengkap dan detail`,
      ``,
      `📌 Format:`,
      `${m.prefix}cekxl <nomor hp>`,
      ``,
      `💡 Contoh:`,
      `${m.prefix}cekxl 083150850721`,
      `${m.prefix}cekxl 6281234567890`,
      ``,
      `Format nomor bisa pakai 08xx, 628xx, atau tanpa awalan`
    ]))
    }

    const cleanNum = cleanNumber(input)

    if (cleanNum.length < 10 || cleanNum.length > 15) {
        { const __navText = `❌ Nomor yang kamu masukkan tidak valid, pastikan nomor tersebut merupakan nomor XL atau Axis yang benar ya`; return await m.reply(__navText); }
    }
    try {
    await m.react("🕒");
        const { data } = await axios.get(
            `https://xl-ku.my.id/end.php?check=package&number=${cleanNum}&version=2`,
            { timeout: 30000 }
        )

        if (!data || data.error || data.status === false) {
            return m.reply(raraWrap("Cekxl", `❌ Tidak bisa mengecek nomor *${cleanNum}*, pastikan nomor tersebut merupakan nomor XL atau Axis yang aktif`))
        }

        let txt = `📱 *INFORMASI XL/AXIS*\n\n`
        txt += `📞 Nomor: *${cleanNum}*\n`

        if (data.msisdn) txt += `🆔 MSISDN: *${data.msisdn}*\n`
        if (data.status) txt += `📊 Status: *${data.status}*\n`
        if (data.activeDate) txt += `📅 Aktif Sejak: *${data.activeDate}*\n`
        if (data.expireDate) txt += `⏰ Masa Aktif: *${data.expireDate}*\n`
        if (data.graceDate) txt += `⚠️ Masa Tenggang: *${data.graceDate}*\n`

        if (data.packages && Array.isArray(data.packages) && data.packages.length > 0) {
            txt += `\n📦 *daftar paket aktif*\n\n`
            for (const pkg of data.packages) {
                txt += `- *${pkg.name || pkg.packageName || "Paket"}*\n`
                if (pkg.quota || pkg.remainingQuota) txt += `Sisa Kuota: *${pkg.remainingQuota || pkg.quota}*\n`
                if (pkg.totalQuota) txt += `Total Kuota: *${pkg.totalQuota}*\n`
                if (pkg.expireDate || pkg.validUntil) txt += `Berlaku Sampai: *${pkg.expireDate || pkg.validUntil}*\n`
                if (pkg.type) txt += `Tipe: *${pkg.type}*\n`
                txt += `\n`
            }
        }

        if (data.balance || data.pulsa) {
            txt += `💰 *saldo*\n`
            txt += `Pulsa: *${data.balance || data.pulsa}*\n\n`
        }

        if (data.result && typeof data.result === "object") {
            const r = data.result
            if (r.name) txt += `👤 Nama Paket: *${r.name}*\n`
            if (r.quota) txt += `📊 Kuota: *${r.quota}*\n`
            if (r.masa_aktif) txt += `📅 Masa Aktif: *${r.masa_aktif}*\n`
            if (r.status) txt += `📊 Status: *${r.status}*\n`
        }

        if (typeof data === "object" && !data.packages && !data.result) {
            const skipKeys = ["error", "status", "msisdn", "activeDate", "expireDate", "graceDate", "balance", "pulsa"]
            const extraKeys = Object.keys(data).filter(k => !skipKeys.includes(k))
            if (extraKeys.length > 0) {
                txt += `\n📋 *detail lainnya*\n\n`
                for (const key of extraKeys) {
                    const val = data[key]
                    if (typeof val === "string" || typeof val === "number") {
                        txt += `- ${key}: *${val}*\n`
                    }
                }
            }
        }
        await m.react("🐣");
        await m.reply(txt.trim())

    } catch (error) {
    await m.react("❌");
        m.reply(raraWrap("cekxl", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
