// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import config from '../../config.js'
import path from 'path'
import fs from 'fs'
import te from '../../src/lib/rara-error.js'
import { mediaResultCard, probeMedia } from "../../src/lib/rara-media-result.js";

// Caption builder LOKAL (bukan shared lib - owner: tiap fitur punya sendiri, 14 Sep 2026)
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
    name: 'githubdl',
    alias: ["githubdl"],
    category: 'download',
    description: 'Download repository GitHub sebagai ZIP',
    usage: '.githubdl <user> <repo> <branch>',
    example: '.githubdl niceplugin NiceBot main',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    energi: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const args = m.args || []
    let username, repo, branch
    
    if (args[0]?.includes('github.com')) {
        const urlMatch = args[0].match(/github\.com\/([^\/]+)\/([^\/]+)/i)
        if (urlMatch) {
            username = urlMatch[1]
            repo = urlMatch[2].replace(/\.git$/, '')
            branch = args[1] || 'main'
        }
    } else {
        username = args[0]
        repo = args[1]
        branch = args[2] || 'main'
    }
    
    if (!username) {
        return m.reply(raraWrap("githubdl", [
            "Format: " + m.prefix + "githubdl <user> <repo> <branch>",
            "",
            "💡 Contoh:",
            m.prefix + "githubdl niceplugin NiceBot main",
            m.prefix + "githubdl https://github.com/user/repo",
        ]))
    }
    
    if (!repo) {
        { const __navText = raraWrap("githubdl", `Masukkan nama repository.\n\n💡 Contoh: .githubdl Rara-AI-Whatsapp-Bot`); return await m.reply( __navText, "githubdl"); }
    }
    try {
        await m.react("🕒");
        const repoInfo = await fetch(`https://api.github.com/repos/${username}/${repo}`)
        
        if (!repoInfo.ok) {
            return m.reply(raraWrap("githubdl", `Repo ${username}/${repo} tidak ditemukan`, "error"))
        }
        
        const repoData = await repoInfo.json()
        const defaultBranch = repoData.default_branch || 'main'
        branch = branch || defaultBranch
        
        const zipUrl = `https://github.com/${username}/${repo}/archive/refs/heads/${branch}.zip`
        
        const checkRes = await fetch(zipUrl, { method: 'HEAD' })
        if (!checkRes.ok) {
            return m.reply(raraWrap("githubdl", `Branch ${branch} tidak ditemukan. Default: ${defaultBranch}`, "error"))
        }
        
        let card = "";
        try {
          const info = await probeMedia(zipUrl);
          card = mediaResultCard({
            header: pluginConfig.name,
            type: "dokumen",
            title: `${repo} (${branch})`,
            platform: "GitHub",
            request: [["Repo", `${username}/${repo}`], ["Branch", branch]],
            ...info,
          });
        } catch { /* best-effort */ }
        const _cap = mediaCaption({ platformIcon: "🐙", platformName: "GitHub", title: `${repo} (${branch})`, format: "ZIP Archive", method: "github" });
        await sock.sendMessage(m.chat, {
            document: { url: zipUrl }, caption: card || _cap,
            fileName: `${repo} - Branch: ${branch}.zip`,
            mimetype: 'application/zip',
            contextInfo: { forwardingScore: 0, isForwarded: false },
        }, { quoted: m })
        await m.react("🐣"); await m.reply(raraBerhasil("Githubdl"));
    } catch (e) {
        m.reply(raraGangguan("Githubdl"))
    }
}

export { pluginConfig as config, handler }