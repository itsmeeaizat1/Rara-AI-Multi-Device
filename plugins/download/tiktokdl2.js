// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import * as cheerio from 'cheerio'
import crypto from 'crypto'
import { generateWAMessage, generateWAMessageFromContent, jidNormalizedUser } from 'rara'
import config from '../../config.js'
import te from '../../src/lib/rara-error.js'
import { raraWrap, raraLine, raraCaption, raraError, raraEmpty, raraGuide, raraNoInput, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { tiktokCaption } from "../../src/lib/rara-tiktok-format.js";

// Caption builder LOKAL (bukan shared lib — owner: tiap fitur punya sendiri, 14 Sep 2026)
function mediaCaption({
  platformIcon = "📥",
  platformName = "Download",
  title, author, authorHandle, duration, uploadDate,
  views, likes, comments, shares, downloads, subscribers,
  description, format, method,
} = {}) {
  const lines = [];
  if (title) lines.push(`Title: ${String(title).slice(0, 80)}`);
  let authorStr = "";
  if (author && authorHandle) authorStr = `${author} (@${authorHandle})`;
  else if (author) authorStr = String(author);
  else if (authorHandle) authorStr = `@${authorHandle}`;
  if (authorStr) lines.push(`Author: ${authorStr}`);
  if (duration) lines.push(`Duration: ${String(duration)}`);
  if (uploadDate) lines.push(`Upload: ${String(uploadDate)}`);
  if (views) lines.push(`Views: ${String(views)}`);
  if (likes) lines.push(`Likes: ${String(likes)}`);
  if (comments) lines.push(`Comments: ${String(comments)}`);
  if (shares) lines.push(`Shares: ${String(shares)}`);
  if (downloads) lines.push(`Downloads: ${String(downloads)}`);
  if (subscribers) lines.push(`Subs: ${String(subscribers)}`);
  if (description && String(description).trim()) {
    lines.push(`Desc: ${String(description).trim().slice(0, 120)}`);
  }
  if (format) lines.push(`Format: ${format}`);
  if (method) lines.push(`Source: ${method}`);
  return lines.join("\n");
}


const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Origin: 'https://savett.cc',
    Referer: 'https://savett.cc/en1/download',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
}

async function getToken() {
    const res = await axios.get('https://savett.cc/en1/download')
    return {
        csrf: res.data.match(/name="csrf_token" value="([^"]+)"/)?.[1],
        cookie: res.headers['set-cookie'].map(v => v.split(';')[0]).join('; ')
    }
}

async function fetchTikTok(url, csrf, cookie) {
    const res = await axios.post(
        'https://savett.cc/en1/download',
        `csrf_token=${encodeURIComponent(csrf)}&url=${encodeURIComponent(url)}`,
        { headers: { ...headers, Cookie: cookie } }
    )
    return res.data
}

function parseResponse(html) {
    const $ = cheerio.load(html)

    const stats = []
    $('#video-info .my-1 span').each((_, el) => {
        stats.push($(el).text().trim())
    })

    const data = {
        username: $('#video-info h3').first().text().trim(),
        views: stats[0] || null,
        likes: stats[1] || null,
        bookmarks: stats[2] || null,
        comments: stats[3] || null,
        shares: stats[4] || null,
        duration: $('#video-info p.text-muted').first().text().replace(/Duration:/i, '').trim() || null,
        type: null,
        downloads: { nowm: [], wm: [] },
        mp3: [],
        slides: []
    }

    const slides = $('.carousel-item[data-data]')

    if (slides.length) {
        data.type = 'photo'
        slides.each((_, el) => {
            try {
                const json = JSON.parse($(el).attr('data-data').replace(/&quot;/g, '"'))
                if (Array.isArray(json.URL)) {
                    json.URL.forEach(url => {
                        data.slides.push({ index: data.slides.length + 1, url })
                    })
                }
            } catch (e) { console.error('[tiktokdl2.js]:', e.message); }
        })
        return data
    }

    data.type = 'video'

    $('#formatselect option').each((_, el) => {
        const label = $(el).text().toLowerCase()
        const raw = $(el).attr('value')
        if (!raw) return

        try {
            const json = JSON.parse(raw.replace(/&quot;/g, '"'))
            if (!json.URL) return

            if (label.includes('mp4') && !label.includes('watermark')) {
                data.downloads.nowm.push(...json.URL)
            }
            if (label.includes('watermark')) {
                data.downloads.wm.push(...json.URL)
            }
            if (label.includes('mp3')) {
                data.mp3.push(...json.URL)
            }
        } catch (e) { console.error('[tiktokdl2.js]:', e.message); }
    })

    return data
}

async function savett(url) {
    const { csrf, cookie } = await getToken()
    const html = await fetchTikTok(url, csrf, cookie)
    return parseResponse(html)
}

const pluginConfig = {
    name: ['tiktok2', 'tt2', 'ttmp4'],
    alias: ["tiktok2", "tt2", "ttmp4"],
    category: 'download',
    description: 'Download video/slide TikTok tanpa watermark',
    usage: '.tiktok2 <url>',
    example: '.tiktok2 https://vt.tiktok.com/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.react("🕒");
    const url = m.text?.trim()

    if (!url) {
        return m.reply(raraNoInput("TikTok DL 2", "Masukkan link TikTok yang mau kamu download!", `${m.prefix}tiktok2 https://vt.tiktok.com/xxx`));
    }

    if (!url.match(/tiktok\.com|vt\.tiktok/i)) {
        return m.reply(raraGuide("TikTok DL 2", "URL tidak valid! Kirim link TikTok ya.", `${m.prefix}tiktok2 https://vt.tiktok.com/xxx`));
    }
    try {
        const result = await savett(url)

        // format owner 19 Sep: judul/uploader/username/durasi/view/like/komentar/share/download
        // (savett nowm standard → SD)
        const caption = tiktokCaption({
            uploader: result.username || null,
            duration: result.duration || null,
            views: result.views || null,
            likes: result.likes || null,
            comments: result.comments || null,
            shares: result.shares || null,
            download: result.type === "video" ? "SD" : null,
        });

        if (result.type === 'video' && result.downloads.nowm.length > 0) {
            const videoRes = await axios.get(result.downloads.nowm[0], {
                responseType: 'arraybuffer',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                    'Referer': 'https://www.tiktok.com/'
                }
            })

            await sock.sendMessage(
                m.chat,
                {
                    video: Buffer.from(videoRes.data),
                    mimetype: 'video/mp4',
                    caption,
                },
                { quoted: m }
            )
            return
        }

        if (result.type === 'photo' && result.slides.length > 0) {
            await m.reply(raraWrap("Tiktokdl2", `📸 *Mengirim ${result.slides.length} slide...*`))

            const mediaList = []
            for (let i = 0; i < result.slides.length; i++) {
                const imgUrl = result.slides[i].url
                if (!imgUrl) continue

                try {
                    const res = await axios.get(imgUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    })
                    mediaList.push({
                        image: Buffer.from(res.data),
                        caption: i === 0 ? caption : ''
                    })
                } catch (e) {
                    console.error(`[TikTok2] Failed to download slide ${i}:`, e.message)
                }
            }

            if (mediaList.length === 0) {
                throw new Error('Gagal mengunduh gambar slide')
            }

            const opener = generateWAMessageFromContent(
                m.chat,
                {
                    messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                    albumMessage: {
                        expectedImageCount: mediaList.length,
                        expectedVideoCount: 0
                    }
                },
                {
                    userJid: jidNormalizedUser(sock.user.id),
                    quoted: m,
                    upload: sock.waUploadToServer
                }
            )

            await sock.relayMessage(opener.key.remoteJid, opener.message, {
                messageId: opener.key.id
            })

            for (const content of mediaList) {
                const msg = await generateWAMessage(
                    opener.key.remoteJid,
                    content,
                    { upload: sock.waUploadToServer }
                )

                msg.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: {
                        associationType: 1,
                        parentMessageKey: opener.key
                    }
                }

                await sock.relayMessage(msg.key.remoteJid, msg.message, {
                    messageId: msg.key.id
                })
            }

            if (result.mp3.length > 0) {
                await sock.sendMessage(
                    m.chat,
                    {
                        audio: { url: result.mp3[0] },
                        mimetype: 'audio/mpeg'
                    },
                    { quoted: m }
                )
            }
            return
        }

        if (result.mp3.length > 0) {
            m.reply(raraWrap("Tiktokdl2", `🍀 *note*\nKonten ini tidak memiliki video/slide, mengirim audio saja...`))
            await sock.sendMessage(
                m.chat,
                {
                    audio: { url: result.mp3[0] },
                    mimetype: 'audio/mpeg'
                },
                { quoted: m }
            )
            return
        }

        throw new Error('Tidak ada media yang dapat diunduh')

        await m.react("🐣");
        await m.reply(raraBerhasil("Tiktokdl2"));
    } catch (err) {
        console.error('[TikTokDL2] Error:', err)
        m.reply(raraError("TikTok DL 2", err.message || "Gagal mengunduh video TikTok"));
    }
}

export { pluginConfig as config, handler }
