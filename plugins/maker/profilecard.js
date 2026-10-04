// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { raraWrap } from '../../src/lib/rara-menu-style.js'
import { mediaResultCard, probeBuffer } from '../../src/lib/rara-media-result.js'
import { getDatabase } from '../../src/lib/rara-database.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

let _canvas = null
async function getCanvas() {
  if (!_canvas) _canvas = await import('@napi-rs/canvas')
  return _canvas
}

const pluginConfig = {
  name: "profilecard",
  alias: ["profilecard"],
  aliases: ["profilecard", "kartuprofil", "usercard", "statcard"],
  category: "maker",
  description: "Buat profile card dengan stats, level, XP, rank dari database bot",
  usage: ".profilecard | .profilecard @tag",
  example: ".profilecard @628xxx",
  isGroupOnly: false,
};

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    let target = m.sender;
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned[0]) target = mentioned[0];
    if (m.quoted && m.quoted.sender) target = m.quoted.sender;

    const db = await getDatabase();
    const users = db.data.users || {};
    const userData = users[target] || {};

    const name = (userData.name || target.split('@')[0]).slice(0, 25);
    const level = userData.level || 1;
    const exp = userData.exp || 0;
    const limit = userData.limit || 50;
    const money = userData.money || 0;
    const role = userData.role || 'user';
    const energi = userData.energi || 0;

    let expNeeded = 100 + level * 50;
    let expProgress = Math.min(exp % expNeeded, expNeeded);
    let progressPercent = Math.min((expProgress / expNeeded) * 100, 100);

    let rank = 'Bronze';
    if (level >= 50) rank = 'Mythic';
    else if (level >= 35) rank = 'Legend';
    else if (level >= 25) rank = 'Epic';
    else if (level >= 15) rank = 'Gold';
    else if (level >= 8) rank = 'Silver';

    const canvas = await getCanvas();
    const W = 800, H = 450;
    const cv = canvas.createCanvas(W, H);
    const ctx = cv.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W,  H);
    grad.addColorStop(0, '#0f0f1a');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, W - 30, H - 30);

    let avatarImg = null;
    try {
      const ppUrl = await conn.profilePictureUrl(target, 'image').catch(() => null);
      if (ppUrl) {
        const axios = (await import('axios')).default;
        const ppBuf = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 5000 });
        avatarImg = await canvas.loadImage(ppBuf.data);
      }
    } catch (e) { console.error('[profilecard.js]:', e.message); }

    const avX = 80, avY = 80, avR = 50;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.clip();
    if (avatarImg) {
      ctx.drawImage(avatarImg, avX - avR, avY - avR, avR * 2, avR * 2);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
      ctx.fillStyle = '#64ffda';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.charAt(0).toUpperCase(), avX, avY);
    }
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name, 160, 70);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64ffda';
    ctx.fillText('@' + target.split('@')[0], 160, 92);

    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Rank: ' + rank, 160, 115);

    const barX = 50, barY = 160, barW = W - 100, barH = 20;
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#64ffda';
    ctx.fillRect(barX, barY, barW * (progressPercent / 100), barH);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('LV ' + level + ' - ' + expProgress + '/' + expNeeded + ' XP (' + Math.floor(progressPercent) + '%)', barX + barW / 2, barY + 14);

    ctx.textAlign = 'left';
    const statsY = 210;
    const colW = (W - 100) / 4;

    const stats = [
      { label: 'Level', value: level, color: '#64ffda', icon: 'LV' },
      { label: 'Exp', value: exp, color: '#a78bfa', icon: 'XP' },
      { label: 'Limit', value: limit, color: '#ff6b9d', icon: 'LM' },
      { label: 'Money', value: money, color: '#ffd700', icon: '$' },
    ];

    stats.forEach((stat, i) => {
      const sx = 50 + i * colW;
      ctx.fillStyle = '#1a1a2e';
      ctx.strokeStyle = stat.color;
      ctx.lineWidth = 1;
      ctx.fillRect(sx, statsY, colW - 15, 70);
      ctx.strokeRect(sx, statsY, colW - 15, 70);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = stat.color;
      ctx.textAlign = 'center';
      ctx.fillText(stat.icon, sx + (colW - 15) / 2, statsY + 28);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(stat.value), sx + (colW - 15) / 2, statsY + 50);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(stat.label, sx + (colW - 15) / 2, statsY + 65);
    });

    ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#64ffda';
    ctx.fillText('Role: ' + role.toUpperCase() + ' | Energi: ' + energi, W / 2, H - 60);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'right';
    ctx.fillText('Rara AI', W - 25, H - 25);

    const outBuf = cv.toBuffer('image/png');

    let card = "";
    try {
      const info = await probeBuffer(outBuf);
      card = mediaResultCard({
        header: "profilecard",
        type: "gambar",
        request: [
          ["Target", text?.trim() || ("@" + target.split('@')[0])],
          ["Nama", name],
        ],
        size: info.size,
        mime: info.mime,
        width: info.width,
        height: info.height,
      });
    } catch { /* best-effort */ }

    const oldCaption = [
      name + " (@" + target.split('@')[0] + ")",
      "Level: " + level + " | Rank: " + rank,
      "XP: " + expProgress + "/" + expNeeded + " (" + Math.floor(progressPercent) + "%)",
      "Limit: " + limit + " | Money: " + money,
      "Role: " + role + " | Energi: " + energi,
    ].join("\n");

    await m.react("🐣");
    await conn.sendMessage(m.key.remoteJid, {
      image: outBuf,
      caption: card || oldCaption,
    });
  } catch (e) {
    console.error("profilecard error:", e);
    return m.reply(raraWrap("profilecard", "Gagal buat profile card. Coba lagi.", "error"));
  }
}

export { pluginConfig as config, handler };
