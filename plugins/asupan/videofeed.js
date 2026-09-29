// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { f } from '../../src/lib/nova-http.js'
import { claraWrap, claraLine, toSC } from "../../src/lib/nova-menu-style.js";

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

const pluginConfig = {
    name: 'asupan',
    alias: ["asupan"],
    category: 'asupan',
    description: 'Random video asupan',
    usage: '.asupan',
    example: '.asupan',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

function loadJsonData() {
    const tiktokDir = path.join(process.cwd(), 'src', 'data')
    const files = ['bocil.json', 'gheayubi.json', 'kayes.json', 'notnot.json', 'panrika.json', 'santuy.json', 'tiktokgirl.json', 'ukhty.json']
    let allUrls = []
    
    for (const file of files) {
        try {
            const filePath = path.join(tiktokDir, file)
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
                allUrls = allUrls.concat(data.map(d => d.url))
            }
        } catch (e) { console.error('[videofeed.js]:', e.message); }
    }
    
    return allUrls
}

async function handler(m, { sock }) {
    try {
        const urls = loadJsonData()
        
        if (urls.length === 0) {
            return m.reply(claraWrap("Asupan", `❌ Data asupan tidak tersedia`))
        }
        
        const url = urls[Math.floor(Math.random() * urls.length)]
        
        const res = await f(url, 'arrayBuffer')
        // GUARD 14 Sep 2026: f() bisa null (status>=400) atau ArrayBuffer 0 byte
        // (redirect diam-diam dari host CDN) — cek dulu biar gak kirim video kosong.
        if (!res || res.byteLength === 0) {
            throw new Error('Video asupan kosong/gagal diambil')
        }
        const videoBuffer = Buffer.from(res)
        const caption = mediaCaption({
            platformIcon: '',
            platformName: 'Asupan',
            title: 'Random Video Asupan',
            format: 'Video',
            method: 'Nova AI',
        })
        
        await sock.sendMessage(m.chat, {
            video: videoBuffer,
            caption,
        }, { quoted: m })
        
    } catch (error) {
        m.reply(claraWrap("Error", `Video asupan tidak ditemukan`))
    }
}

export { pluginConfig as config, handler }