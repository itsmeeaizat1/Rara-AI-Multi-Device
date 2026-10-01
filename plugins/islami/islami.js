// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import config from '../../config.js'
const pluginConfig = {
    name: "islami",
    alias: ["islami"],
    category: "islami",
    description: 'Kumpulan fitur Islami (Asmaul Husna, Niat Sholat, Surah, Doa, Artikel, Kata Mutiara)',
    usage: '.islami <fitur>',
    isGroup: false,
    isBotAdmin: false,
    isAdmin: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

async function fetchJson(url) {
    try {
        const response = await axios.get(url)
        return response.data
    } catch (e) {
        throw e
    }
}

async function handler(m, { sock }) {
    const command = m.command.toLowerCase()
    const text = m.text || ''

    try {
        switch (command) {
            case 'asmaulhusna': {
                let jir = await fetchJson('https://islamic-api-zhirrr.vercel.app/api/asmaulhusna')
                let ye = jir.data

                let tks = '☪️ *asmaul husna*\n\n' + ye.map((item) => {
                    return `Urutan: ${item.index}\nLatin: ${item.latin}\nArab: ${item.arabic}\nTerjemahan ID: ${item.translation_id}\nTerjemahan EN: ${item.translation_en}\n`
                }).join('\n')
                m.reply(tks)
            }
            break

            case 'niatsholat': 
            case 'niatshalat': {
                let jir = await fetchJson('https://islamic-api-zhirrr.vercel.app/api/niatshalat')
                let niatSholat = jir

                if (!text) {
                    let daftarNiat = '📋 *daftar niat sholat*\n\n' + niatSholat.map((item) => `- ${item.name}`).join('\n')
                    daftarNiat += `\n\n📌 Ketik \`${m.prefix}niatsholat [nama sholat]\` untuk melihat niat\n💡 *Contoh:* \`${m.prefix}niatsholat subuh\``
                    m.reply( daftarNiat, "islami")
                } else {
                    let hasil = niatSholat.find((item) => item.name.toLowerCase().includes(text.toLowerCase()))

                    if (hasil) {
                        let tks = `🕋 *${hasil.name.toUpperCase()}*\n\n` +
                            `📄 Arab: ${hasil.arabic}\n` +
                            `🔤 Latin: ${hasil.latin}\n` +
                            `🌍 Terjemahan: ${hasil.terjemahan}`
                        m.reply(tks)
                    } else {
                         m.reply('❌ Niat sholat yang kamu cari tidak ditemukan. Cek lagi nama sholatnya!')
                    }
                }
            }
            break

            case 'surah': {
                if (!text) {
                    m.reply( `⚠️ Ketik nomor surahnya!\n💡 *Contoh:* \`${m.prefix}surah 1\` buat ambil ayat-ayat dari Al-Fatihah`, "islami")
                    return
                }

                await m.react("🕒");
                const no = parseInt(String(text).replace(/[^0-9]/g, ""), 10);
                if (!no || no < 1 || no > 114) {
                    await m.react("❌");
                    return m.reply('❌ Nomor surah harus 1-114!')
                }
                // alquran.cloud (free, tanpa key) — 3 edisi paralel: uthmani + transliterasi + terjemahan
                const eq = await fetchJson(`https://api.alquran.cloud/v1/surah/${no}/editions/quran-uthmani,en.transliteration,id.indonesian`)
                const eds = (eq.data || [])
                const ar = eds[0]?.ayahs || []
                const lat = eds[1]?.ayahs || []
                const idn = eds[2]?.ayahs || []
                let data = ar.map((a, i) => ({
                    no: a.numberInSurah,
                    arab: a.text,
                    latin: lat[i]?.text || '',
                    indo: idn[i]?.text || ''
                }))
                if (data && data.length > 0) {
                    let surahText = data.map((ayat, index) =>
                        `۝ Ayat ${ayat.no}:\n` +
                        `${ayat.arab}\n` +
                        `${ayat.latin}\n` +
                        `_${ayat.indo}_`
                    ).join('\n\n')

                    if (surahText.length > 60000) {
                         await m.react("❌")
                         m.reply('❌ Surah terlalu panjang untuk dikirim via teks. Silakan cari ayat spesifik atau surah yang lebih pendek.')
                    } else {
                         await m.react("🐣")
                         m.reply(surahText)
                    }
                } else {
                    m.reply('❌ Gak ketemu, cek lagi nomor surahnya!')
                }
            }
            break

            case 'doa':
            case 'berdoa': {
                let jir = await fetchJson('https://doa-doa-api-ahmadramadhan.fly.dev/api')
                let daftarDoa = jir

                if (!text) {
                    let listDoa = '🤲 *daftar doa*\n\n' + daftarDoa.map((item) => `- ${item.doa}`).join('\n')
                     listDoa += `\n\n📌 Ketik \`${m.prefix}doa [nama doa]\` untuk melihat doa\n💡 *Contoh:* \`${m.prefix}doa doa sebelum tidur\``
                    m.reply( listDoa, "islami")
                } else {
                    let hasil = daftarDoa.find((item) => item.doa.toLowerCase().includes(text.toLowerCase()))

                    if (hasil) {
                        let tks = `🤲 *${hasil.doa.toUpperCase()}*\n\n` +
                            `📄 Ayat: ${hasil.ayat}\n` +
                            `🔤 Latin: ${hasil.latin}\n` +
                            `🌍 Artinya: ${hasil.artinya}`
                        m.reply(tks)
                    } else {
                         m.reply('❌ Doa yang kamu cari tidak ditemukan. Cek lagi nama doanya!')
                    }
                }
            }
            break

            case 'gislam': {
                if (!text) return m.reply( `❓ Mau cari artikel tentang apa?\n💡 *Contoh:* \`${m.prefix}gislam puasa\``, "islami")
                
                try {
                    const response = await fetchJson(`https://artikel-islam.netlify.app/.netlify/functions/api/ms?page=1&s=${text}`)
                    if (response.success) {
                        const articles = response.data.data
                        if (!articles || articles.length === 0) return m.reply('❌ Artikel tidak ditemukan.')

                        let message = `📚 *HASIL PENCARIAN: ${text.toUpperCase()}*\nTotal: ${articles.length}\n\n`
                        articles.forEach((article, index) => {
                            message += `${index + 1}. *${article.title}*\n🔗 ${article.url}\n\n`
                        })
                        return m.reply(raraWrap("islami", message))
                    } else {
                        return m.reply('Gagal mengambil data artikel.')
                    }
                } catch (error) {
                    return m.reply('❌ Terjadi kesalahan saat mengambil data.')
                }
            }
            break
        }
    } catch (e) {
        console.error('Religi Plugin Error:', e)
        m.reply('❌ Terjadi kesalahan pada sistem.')
    }
}

export { pluginConfig as config, handler }