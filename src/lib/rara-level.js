// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import config from "../../config.js";
import sharp from "sharp";
import { getAssetBuffer } from "./rara-asset-manager.js";
import { bridgeMentionText } from "./rarabridge/adapter.js";

const EXP_PER_LEVEL = 10000;

// seam e2e — inject loadImage fake biar kartu level-up gak nyamber jaringan
let _loadImageForTest = null;
function _setLevelCardLoadImageForTest(fn) { _loadImageForTest = fn; }

function calculateLevel(exp) {
  return Math.floor(exp / EXP_PER_LEVEL) + 1;
}

function expForLevel(level) {
  return (level - 1) * EXP_PER_LEVEL;
}

function getRole(level) {
  if (level >= 100) return "🐉 Mythic";
  if (level >= 80) return "⚔️ Legend";
  if (level >= 60) return "💜 Epic";
  if (level >= 40) return "💪 Grandmaster";
  if (level >= 20) return "🎖️ Master";
  if (level >= 10) return "⭐ Elite";
  return "🛡️ Warrior";
}


// ══════════════════════════════════════════════════════════════════
// KARTU DALAM PREVIEW (owner 15 Sep 2026): canvas ditanam di
// externalAdReply thumbnail (renderLargerThumbnail) — jadi cuma PREVIEW
// di dalam bubble pesan, BUKAN media langsung → gak bisa disimpan ke galeri.
// ══════════════════════════════════════════════════════════════════

// kit canvas module-level: seam loadImage (e2e gak nyamber jaringan)
async function _levelCardKit() {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  return { createCanvas, loadImage: _loadImageForTest || loadImage };
}

// _drawValueChip — chip nilai kanan-atas (owner 16 Sep 2026: angka besar
// 88-90px kegedean di kartu, diminta dikecilin/disesuaikan posisinya)
function _drawValueChip(ctx, rightX, label, value) {
  const labelTxt = String(label || "");
  const valueTxt = String(value ?? "");
  ctx.font = "bold 16px sans-serif";
  const lw = ctx.measureText(labelTxt).width;
  ctx.font = "bold 34px sans-serif";
  const vw = ctx.measureText(valueTxt).width;
  const pad = 14;
  const panelW = Math.max(lw, vw) + pad * 2;
  const panelH = labelTxt ? 84 : 60;
  const px = rightX - panelW;
  const py = 26;
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.strokeStyle = "rgba(0, 242, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "center";
  if (labelTxt) {
    ctx.fillStyle = "#00f2ff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(labelTxt, px + panelW / 2, py + 26);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(valueTxt, px + panelW / 2, py + 62);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(valueTxt, px + panelW / 2, py + panelH / 2 + 12);
  }
  ctx.textAlign = "left";
}

// generateRpgCard — kartu canvas GENERIC tema level-up (owner 15 Sep 2026:
// dipakai .levelinfo/.prestige/.reincarnate/.achievement — hasilnya ditanam
// di PREVIEW pesan, bukan media → gak bisa disimpan ke galeri)
async function generateRpgCard({
  title, name, infoLine, bigValue, bigLabel, bars = [],
}) {
  const { createCanvas, loadImage } = await _levelCardKit();
  const width = 800;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, height - 20, 30);
  ctx.clip();
  try {
    const background = await loadImage(
      "https://images.wallpapersden.com/image/download/anime-night-sky-scenery_bWlsZ26UmZqaraWkpJRmbmdlrWZnZWU.jpg",
    );
    const ratio = Math.max(width / background.width, height / background.height);
    const x = (width - background.width * ratio) / 2;
    const y = (height - background.height * ratio) / 2;
    ctx.drawImage(background, x, y, background.width * ratio, background.height * ratio);
  } catch {
    ctx.fillStyle = "#1e1e2f";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 5;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText(String(title || "RARA RPG"), 30, 62);
  if (name) {
    ctx.fillStyle = "#00f2ff";
    ctx.font = "italic 25px sans-serif";
    ctx.fillText(String(name), 30, 100);
  }
  if (infoLine) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.font = "15px sans-serif";
    ctx.fillText(String(infoLine), 30, 122);
  }

  if (bigValue != null) {
    // angka dikecilin jadi chip panel kanan-atas (request owner 16 Sep 2026)
    _drawValueChip(ctx, width - 30, bigLabel, bigValue);
  }

  let by = 138;
  const bx = 30, bw = 520, bh = 18;
  for (const b of bars.slice(0, 4)) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 9);
    ctx.fill();
    const prog = Math.min((b.cur || 0) / (b.max || 1), 1);
    if (prog > 0) {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, b.c1 || "#ff00cc");
      g.addColorStop(1, b.c2 || "#3333ff");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(bw * prog, bh), bh, 9);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(
      `${b.label || "Progress"}  ${(b.cur || 0).toLocaleString("id-ID")} / ${(b.max || 0).toLocaleString("id-ID")}`,
      bx + 12, by + 13,
    );
    by += 32;
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "12px sans-serif";
  ctx.fillText(config.bot?.name || "Rara AI", 30, height - 18);
  return canvas.toBuffer("image/png");
}

// generateLevelInfoCard — kartu stats RPG (.levelinfo) = wrapper generateRpgCard
async function generateLevelInfoCard({ name, rpg }) {
  return generateRpgCard({
    title: "LEVEL INFO",
    name,
    infoLine: `${rpg.job || "novice"} (Lv.${rpg.jobLevel || 1})  •  Gold ${(rpg.gold || 0).toLocaleString("id-ID")}  •  Gems ${rpg.gems || 0}`,
    bigValue: String(rpg.level || 1),
    bigLabel: "LEVEL",
    bars: [
      { label: "EXP", cur: rpg.exp || 0, max: rpg.expNext || 100, c1: "#ff00cc", c2: "#3333ff" },
      { label: "HP", cur: rpg.hp || 0, max: rpg.maxHp || 100, c1: "#ff4d4d", c2: "#ff9a8b" },
      { label: "Mana", cur: rpg.mana || 0, max: rpg.maxMana || 50, c1: "#4834d4", c2: "#686de0" },
      { label: "Energy", cur: rpg.energy || 0, max: rpg.maxEnergy || 100, c1: "#feca57", c2: "#ff9f43" },
    ],
  });
}

// levelPreviewThumb — encode canvas → thumbnail externalAdReply.
// fit "contain" biar kartu 800x280 utuh kebaca (letterbox gelap).
async function levelPreviewThumb(buffer) {
  try {
    // FIX 19 Sep 2026 (owner: "pas level rpg muncul, thumbnail canvas tdk
    // tampil krna ditanam di ad external reply"): field thumbnail di
    // externalAdReply protokol WA = jpegThumbnail — WhatsApp cuma
    // MERENDER JPEG. Kartu canvas dikirim sebagai PNG RGBA (ada alpha
    // channel) → WA nolak senyap → preview kosong, cuma teks level up
    // yang muncul. JPEG di studio (default serialize-thumb) merender
    // normal, itu yang bikin keliatan "cuma kartu canvas gak muncul".
    // FIX: flatten alpha ke background gelap (PNG RGBA → JPEG solid) +
    // encode JPEG q88 (sekalian jauh lebih kecil dari PNG).
    return await sharp(buffer)
      .resize(640, 360, { fit: "contain", background: "#0b0b14" })
      .flatten({ background: "#0b0b14" })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    // FIX 1 Okt 2026 (owner: "thumbnail level up kadang muncul kadang gagal"):
    // dulu sharp gagal → balikin buffer PNG RGBA ASLI → WA nolak senyap →
    // preview kosong (bug 19 Sep muncul lagi secara intermiten). Sekarang
    // fallback = JPEG solid gelap VALID, preview tetap muncul (gelap).
    return Buffer.from(
      "/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAkAEADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEC/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AkQDaAAAAAAAAAAAAAAAAAAAAAAP/2Q==",
      "base64",
    );
  }
}


// replyWithCardPreview — SATU PINTU (owner 15 Sep 2026): gambar kartu →
// thumbnail → ditanam di PREVIEW pesan (externalAdReply renderLargerThumbnail),
// bukan media langsung → gak bisa disimpan ke galeri. Return true kalau
// preview terkirim; false → pemanggil fallback m.reply(txt) polos.
async function replyWithCardPreview(m, txt, cardData, opts = {}) {
  try {
    const card = await generateRpgCard(cardData);
    const thumb = await levelPreviewThumb(card);
    await m.reply(txt, {
      contextInfo: {
        externalAdReply: {
          title: opts.title || config.bot?.name || "Rara AI - Multi Device",
          body: opts.body || "",
          thumbnail: thumb,
          previewType: "PHOTO",
          showAdAttribution: false,
          renderLargerThumbnail: true,
        },
      },
    });
    return true;
  } catch (e) {
    console.error("card preview error:", e);
    return false;
  }
}

async function checkAndNotifyLevelUp(sock, m, db, user, oldExp, newExp) {
  const { createCanvas, loadImage: _loadImage, GlobalFonts } =
    await import("@napi-rs/canvas");
  const loadImage = _loadImageForTest || _loadImage;
  /**
   * Fungsi untuk membuat gambar Level Up bertema Anime
   * @param {Object} data - Data user
   * @param {string} data.name - Nama user
   * @param {number} data.level - Level baru yang dicapai
   * @param {number} data.currentXp - XP saat ini
   * @param {number} data.requiredXp - Total XP yang dibutuhkan
   * @param {string} data.avatarUrl - URL foto profil user
   * @param {string} data.backgroundUrl - URL gambar background anime
   */
  async function generateLevelUpCard(data) {
    const width = 800;
    const height = 280;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, 30);
    ctx.clip();
    // FIX 1 Okt 2026 (owner: "thumbnail level up kadang muncul kadang gagal"):
    // background gak lagi fetch remote hardcoded tiap level up (wallpapersden
    // lambat/mati intermiten dari IP datacenter → kartu kadang bagus kadang
    // polos). Prioritas: (1) ASSET LOKAL 'rara-levelup' — .ganti-rara-levelup.jpg
    // sekarang BENERAN nyambung ke kartu (dulu cuman pajangan!); (2) remote
    // pakai fetch TIMEOUT 5 dtk (dulu loadImage tanpa timeout → notif level up
    // bisa gantung lama, keliatan "nbug").
    try {
      let bgSrc = data.backgroundBuffer || getAssetBuffer("rara-levelup");
      if (!bgSrc && data.backgroundUrl) {
        const res = await fetch(data.backgroundUrl, {
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        bgSrc = Buffer.from(await res.arrayBuffer());
      }
      const background = await loadImage(bgSrc);
      const ratio = Math.max(
        width / background.width,
        height / background.height,
      );
      const x = (width - background.width * ratio) / 2;
      const y = (height - background.height * ratio) / 2;
      ctx.drawImage(
        background,
        x,
        y,
        background.width * ratio,
        background.height * ratio,
      );
    } catch (err) {
      ctx.fillStyle = "#1e1e2f";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    try {
      // FIX 1 Okt 2026: avatar dari BUFFER (sock.profileBuffer, cached) dulu —
      // URL pps.whatsapp.net itu signed & bisa expired/lambat → lingkaran
      // avatar kadang muncul kadang gak.
      const avatar = await loadImage(data.avatarBuffer || data.avatarUrl).catch(
        () => null,
      );
      if (avatar) {
        ctx.shadowColor = "#00f2ff";
        ctx.shadowBlur = 20;
        ctx.save();
        ctx.beginPath();
        ctx.arc(120, height / 2, 85, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, 35, height / 2 - 85, 170, 170);
        ctx.restore();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#00f2ff";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(120, height / 2, 85, 0, Math.PI * 2);
        ctx.stroke();
      }
    } catch (e) {}
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 5;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("LEVEL UP!", 230, 85);
    ctx.fillStyle = "#00f2ff";
    ctx.font = "italic 25px sans-serif";
    ctx.fillText(`Congratulations, ${data.name}!`, 230, 125);
    // angka dikecilin jadi chip panel kanan-atas (request owner 16 Sep 2026)
    _drawValueChip(ctx, width - 30, "LEVEL", data.level);
    const barX = 230;
    const barY = 185;
    const barWidth = 520;
    const barHeight = 30;
    const progress = Math.min(data.currentXp / data.requiredXp, 1);
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 15);
    ctx.fill();
    const barGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    barGrad.addColorStop(0, "#ff00cc");
    barGrad.addColorStop(1, "#3333ff");
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 15);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    const xpInfo = `${data.currentXp.toLocaleString()} / ${data.requiredXp.toLocaleString()} XP`;
    ctx.fillText(xpInfo, barX + 15, barY + 21);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "12px sans-serif";
    ctx.fillText(config.bot.name, 230, 245);
    return canvas.toBuffer("image/png");
  }
  const oldLevel = calculateLevel(oldExp);
  const newLevel = calculateLevel(newExp);

  if (newLevel > oldLevel) {
    // 🎁 PENGHARGAAN NAIK LEVEL (13 Sep 2026, request owner: "klo level naik
    // dikasih pesan selamat atau pemberitahuan penghargaan") — tiap naik
    // level dapat bonus koin (level baru × 500), masuk dompet koin global.
    const awardKoin = newLevel * 500;
    try { db.updateKoin(m.sender, awardKoin); } catch {}
    user.rpg.level = newLevel;
    user.rpg.maxHealth = 100 + (newLevel - 1) * 10;
    user.rpg.maxMana = 100 + (newLevel - 1) * 5;
    user.rpg.maxStamina = 100 + (newLevel - 1) * 5;
    user.rpg.health = user.rpg.maxHealth;
    user.rpg.mana = user.rpg.maxMana;
    user.rpg.stamina = user.rpg.maxStamina;

    db.save();

    if (user.settings?.levelupNotif === false) {
      return { leveledUp: true, notified: false, oldLevel, newLevel };
    }

    const role = getRole(newLevel);
    const botName = config.bot?.name || "Rara-AI";
    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || botName;

    let ppBuffer = null;
    try {
      // profileBuffer = Buffer cached (tanpa URL signed yang bisa expired);
      // fallback ke URL lama kalau sock gak punya helper itu
      ppBuffer =
        typeof sock.profileBuffer === "function"
          ? await sock.profileBuffer(m.sender)
          : await sock.profilePictureUrl(m.sender, "image");
    } catch {}

    const txt = `🎊 *SELAMAT ${bridgeMentionText(m)}!*

Level kamu bertambah ${newLevel - oldLevel}
🥗 Level kamu sekarang *${newLevel}*

Sekarang kamu berada di rank *${role}*

🎁 *PENGHARGAAN NAIK LEVEL!*
+${awardKoin} Koin langsung masuk ke dompet kamu 💰

Mau cek detail level? ketik _${m.prefix}level_

Sering seringlah berinteraksi dengan bot agar level kamu bertambah!`;

    const contextInfo = {
      mentionedJid: [m.sender],
      forwardingScore: 0,
      isForwarded: false,
    };

    const fakeQuoted = {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
      },
      message: {
        contactMessage: {
          displayName: `✅ ${botName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Verified Bot\nEND:VCARD`,
        },
      },
    };
    // 🖼️ kartu digambar SEKALI, lalu ditanam di PREVIEW pesan (bukan media)
    let cardBuffer = null;
    try {
      cardBuffer = await generateLevelUpCard({
        name: m.pushName || "User",
        level: newLevel,
        currentXp: newExp,
        requiredXp: expForLevel(newLevel),
        avatarBuffer: ppBuffer, // Buffer → loadImage lokal, gak fetch remote lagi
        avatarUrl: ppBuffer ||
          "https://ui-avatars.com/api/?name=K&background=00f2ff&color=fff&size=256",
        // backgroundUrl cuma fallback kalau asset lokal rara-levelup gak ada
        backgroundUrl:
          "https://images.wallpapersden.com/image/download/anime-night-sky-scenery_bWlsZ26UmZqaraWkpJRmbmdlrWZnZWU.jpg",
      });
    } catch (e) {
      console.error("levelup card error:", e);
    }

    try {
      if (cardBuffer && typeof m.reply === "function") {
        await m.reply(txt, {
          mentions: [m.sender],
          contextInfo: {
            externalAdReply: {
              title: botName,
              body: `Level Up → ${newLevel}`,
              thumbnail: await levelPreviewThumb(cardBuffer),
              previewType: "PHOTO",
              showAdAttribution: false,
              renderLargerThumbnail: true,
            },
          },
        });
      } else if (cardBuffer) {
        // fallback: m.reply gak tersedia (pemanggil non-handler) → media
        await sock.sendMedia(m.chat, cardBuffer, txt, m, { type: "image", contextInfo });
      } else {
        await m.reply(txt, { mentions: [m.sender] });
      }
    } catch (e) {
      console.error("levelup preview error:", e);
      // jalur preview gagal → jangan hilangin notif: kirim media langsung
      try {
        await sock.sendMedia(m.chat, cardBuffer, txt, m, { type: "image", contextInfo });
      } catch (e2) {
        console.error("levelup send fallback error:", e2);
      }
    }

    return { leveledUp: true, notified: true, oldLevel, newLevel, awardKoin };
  }

  return { leveledUp: false, notified: false, oldLevel, newLevel: oldLevel, awardKoin: 0 };
}

async function addExpWithLevelCheck(sock, m, db, user, expAmount) {
  if (!user)
    return { leveledUp: false, notified: false, oldLevel: 1, newLevel: 1 };
  if (!user.rpg) user.rpg = {};

  const oldExp = user.exp || 0;
  const newExp = db.updateExp(m.sender, expAmount);
  user.exp = newExp;

  const result = await checkAndNotifyLevelUp(sock, m, db, user, oldExp, newExp);

  db.setUser(m.sender, { rpg: user.rpg });

  return result;
}

export {
  calculateLevel,
  expForLevel,
  getRole,
  generateRpgCard,
  generateLevelInfoCard,
  levelPreviewThumb,
  replyWithCardPreview,
  checkAndNotifyLevelUp,
  addExpWithLevelCheck,
  _setLevelCardLoadImageForTest,
};
