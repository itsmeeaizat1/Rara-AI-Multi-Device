// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// welcome.js — pesan sambutan member baru (single design, engine text)
import { raraWrap, raraError, raraGuide } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import { detectCountry, fillWelcomeTemplate } from "../../src/lib/rara-welcome-card.js";
import config from "../../config.js";
import { mediaResultCard, probeBuffer, probeMedia } from "../../src/lib/rara-media-result.js";

// divider kartu promosi (konsisten sama bootdoctor/switch: pendek 14 kar biar gak hard-wrap WA)
const DIV = "━━━━━━━━━━━━━━";

// kartu info media (batch group) — helper ringkas, best-effort tak pernah ganggu kirim
async function dlCard(type, probe, request) {
  try {
    const info = probe.buffer != null ? await probeBuffer(probe.buffer, { mime: probe.mime }) : await probeMedia(probe.url);
    return mediaResultCard({
      header: Array.isArray(pluginConfig.name) ? pluginConfig.name[0] : pluginConfig.name,
      type, request,
      size: info?.size, mime: info?.mime, width: info?.width, height: info?.height, duration: info?.duration,
    });
  } catch { return null; }
}


// ─── 2 MODE DI DM (request owner 2026-09-06) ───
// .welcome di chat pribadi → muncul 2 pilihan:
//   1. On Global — welcome aktif di SEMUA grup yang bot masuk
//   2. On Per Grup — pilih grup target lewat popup single_select
async function sendWelcomeModeChooser(m, sock, db, prefix) {
  const globalOn = db.setting("welcomeGlobal") === true;
  const text = raraWrap("welcome", [
    `Fitur : welcome message`,
    `Lokasi : chat pribadi`,
    ``,
    `Welcome berlaku per grup — pilih mode aktivasi:`,
    ``,
    `1. Global semua grup`,
    `   Sambutan aktif di semua grup yang bot masuk`,
    `   Status saat ini : ${globalOn ? "ON" : "OFF"}`,
    `2. Per grup target`,
    `   Aktif hanya di grup pilihan kamu`,
    ``,
    `💡 Di dalam grup cukup: ${prefix}welcome on`,
  ].join("\n"));
  try {
    await sock.sendButton(m.chat, null, text, m, {
      buttons: [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "On Global Semua Grup", id: `${prefix}welcome onglobal` }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Pilih Grup Target", id: `${prefix}welcome pilihgrup` }) },
      ],
    });
  } catch {
    await m.reply(text + `\n\nKetik ${prefix}welcome onglobal atau ${prefix}welcome pilihgrup`);
  }
  return { handled: true };
}

// Popup single_select daftar semua grup (on & off per grup target)
async function sendWelcomeGroupPicker(m, sock, prefix) {
  let groups = {};
  try { groups = (await sock.groupFetchAllParticipating()) || {}; } catch {}
  const list = Object.values(groups)
    .map((g) => ({ jid: g.id, subject: (g.subject || g.id || "").trim(), count: (g.participants || []).length }))
    .sort((a, b) => a.subject.localeCompare(b.subject));

  if (!list.length) {
    return m.reply(raraWrap("welcome", [
      `Fitur : welcome message`,
      `Mode : per grup target`,
      ``,
      `Bot belum berada di grup mana pun,`,
      `jadi belum ada target yang bisa dipilih.`,
    ].join("\n")));
  }

  const rowsOn = list.slice(0, 50).map((g) => ({
    title: g.subject.slice(0, 25),
    description: `${g.count} member — ON welcome di grup ini`,
    id: `${prefix}welcome grup ${g.jid} on`,
  }));
  const rowsOff = list.slice(0, 50).map((g) => ({
    title: g.subject.slice(0, 25),
    description: `${g.count} member — OFF welcome di grup ini`,
    id: `${prefix}welcome grup ${g.jid} off`,
  }));

  const text = raraWrap("welcome", [
    `Fitur : welcome message`,
    `Mode : per grup target`,
    ``,
    `Total grup terdeteksi : ${list.length}`,
    ``,
    `Pilih grup dari daftar popup untuk mengaktifkan`,
    `atau menonaktifkan sambutan member baru.`,
  ].join("\n"));
  try {
    await sock.sendButton(m.chat, null, text, m, {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "Pilih Grup",
            sections: [
              { title: "Aktifkan (On)", rows: rowsOn },
              { title: "Matikan (Off)", rows: rowsOff },
            ],
          }),
        },
      ],
    });
  } catch {
    await m.reply(text + `\n\nKetik ${prefix}welcome grup <id grup> on`);
  }
  return { handled: true };
}

// Set welcome per grup target (dipanggil dari popup / manual)
async function setWelcomeTargetGroup(m, sock, db, parts, prefix) {
  const target = String(parts[1] || "");
  const groupJid = target.endsWith("@g.us") ? target : `${target.replace(/[^0-9-]/g, "")}@g.us`;
  const action = parts[2] === "off" ? "off" : "on";

  if (!/\d-\d+@g\.us$/.test(groupJid)) {
    return m.reply(raraWrap("welcome", [
      `Fitur : welcome message`,
      `Mode : per grup target`,
      ``,
      `ID grup tidak valid.`,
      `Gunakan popup ${prefix}welcome pilihgrup`,
    ].join("\n")));
  }

  db.setGroup(groupJid, { welcome: action === "on" });
  let subject = groupJid;
  try { subject = (await sock.groupMetadata(groupJid))?.subject || groupJid; } catch {}

  return m.reply(raraWrap("welcome", [
    `Fitur : welcome message`,
    `Mode : per grup target`,
    `Status : ${action.toUpperCase()}`,
    `Grup : ${subject}`,
    ``,
    action === "on"
      ? `Sambutan member baru aktif di grup tersebut.`
      : `Sambutan member baru dimatikan di grup tersebut.`,
  ].join("\n")));
}

async function handler(m, { sock, config: botConfig }) {
    const prefix = botConfig.command?.prefix || ".";
  try {
    const db = getDatabase();
    const raw = (m.text || "").trim().toLowerCase();
    const parts = raw.split(/\s+/).filter(Boolean);
    const isInGroup = String(m.chat || "").endsWith("@g.us");

    // ─── DI DM: subcommand mode ───
    if (!isInGroup) {
      // .welcome onglobal | .welcome on global
      if (parts[0] === "onglobal" || (parts[0] === "on" && parts[1] === "global")) {
        db.setting("welcomeGlobal", true);
        await m.reply(raraWrap("welcome", [
          `Fitur : welcome message`,
          `Mode : global semua grup`,
          `Status : ON`,
          ``,
          `Sambutan member baru aktif di semua grup yang bot masuk.`,
          `Grup yang welcome-nya di-off eksplisit tetap senyap.`,
          `💡 Matikan dengan ${prefix}welcome offglobal`,
        ].join("\n")));
        return { handled: true };
      }
      // .welcome offglobal | .welcome off global
      if (parts[0] === "offglobal" || (parts[0] === "off" && parts[1] === "global")) {
        db.setting("welcomeGlobal", false);
        await m.reply(raraWrap("welcome", [
          `Fitur : welcome message`,
          `Mode : global semua grup`,
          `Status : OFF`,
          ``,
          `Sambutan global dimatikan. Grup yang udah ON`,
          `per-grup tetap menerima sambutan.`,
        ].join("\n")));
        return { handled: true };
      }
      // .welcome pilihgrup → popup daftar grup
      if (parts[0] === "pilihgrup") {
        return await sendWelcomeGroupPicker(m, sock, prefix);
      }
      // .welcome grup <jid> <on|off> (dari popup)
      if (parts[0] === "grup" && parts[1]) {
        return await setWelcomeTargetGroup(m, sock, db, parts, prefix);
      }
      // .welcome / .welcome on / .welcome off di DM → 2 PILIHAN MODE
      return await sendWelcomeModeChooser(m, sock, db, prefix);
    }

    // ─── DI GRUP: perilaku lama (per-grup) ───
    if (!["on", "off"].includes(raw)) {
      await m.reply(raraGuide('Welcome', `Aktifkan atau matikan pesan sambutan member baru. Custom pesannya? Ketik ${prefix}setwelcome <pesan>.`, `${prefix}welcome on`));
      return { handled: true };
    }

    db.setGroup(m.chat, { welcome: raw === "on" });

    await m.reply(raraWrap("welcome", [
      `Fitur : welcome message`,
      `Status : ${raw === "on" ? "ON" : "OFF"}`,
      `Grup : ${m.chat}`,
      ``,
      `💡 Custom pesan? Ketik ${prefix}setwelcome <pesan>`,
    ].join("\n")));
  } catch (error) {
    await m.reply(raraError('Welcome', `Gagal: ${error.message}`));
  }

  return { handled: true };
}

/**
 * sendWelcomeMessage — dipanggil oleh handler.js saat member baru join
 * Single design: engine text + info lengkap + mention
 */
async function sendWelcomeMessage(sock, groupJid, participantJid, metadata) {
  const db = getDatabase();
  const groupData = db.getGroup(groupJid) || {};

  // Mode global (welcomeGlobal) — ON di semua grup,
  // KECUALI grup yang eksplisit OFF (off per-grup menang).
  const globalWelcome = db.setting("welcomeGlobal") === true;
  if (groupData.welcome === false) return;
  if (!groupData.welcome && !globalWelcome) return;

  const groupName = metadata?.subject || "Grup";
  const memberCount = metadata?.participants?.length || 0;
  const username = participantJid.split("@")[0].split(":")[0];
  const prefix = config.command?.prefix || ".";

  // Info user dari database + deteksi negara dari nomor
  const userData = db.getUser(participantJid) || {};
  const displayName = userData.name || userData.regName || username;
  // Bridge (Telegram/Discord): jid = tg_<id>/dc_<id> — tampilin NAMA platform dari db
  // (disimpen bridge pas service message join), bukan ID mentah (request owner 29 Sep)
  const isBridgeJid = /^(tg|dc)_/.test(participantJid);
  const handle = isBridgeJid ? String(userData.name || username).slice(0, 30) : username;
  const country = isBridgeJid ? (participantJid.startsWith("tg_") ? "Telegram" : "Discord") : detectCountry(participantJid);

  // Nama owner grup (buat placeholder {owner})
  const ownerJid = metadata?.owner || "";
  const ownerData = ownerJid ? db.getUser(ownerJid) || {} : {};
  const ownerName = ownerData.name || ownerData.regName || ownerJid.split("@")[0] || "Owner";

  // Deskripsi/rules grup: custom welcomeMsg (yang di-set owner) > deskripsi grup
  // Semua placeholder didukung: {user} {number} {group} {desc} {count} {owner} {date} {time} {day} {bot} {prefix}
  let rulesText = "";
  const customMsg = String(groupData.welcomeMsg || "").trim();
  if (customMsg) {
    rulesText = fillWelcomeTemplate(customMsg, {
      username: handle, // bridge: {user}/{number} → nama platform (tg_ gak ada nomor hp)
      groupName,
      memberCount,
      desc: metadata?.desc || "",
      ownerName,
      botName: config.bot?.name || "Rara AI",
      prefix,
    });
  } else if (metadata?.desc) {
    rulesText = metadata.desc;
  }
  if (rulesText.length > 200) rulesText = rulesText.slice(0, 197) + "...";

  // Sapaan acak biar gak monoton
  const SAPAAN = [
    `Halo kak @${handle}, selamat datang!`,
    `Wew, akhirnya @${handle} nyampe juga!`,
    `Ada member baru nih, welcome ya @${handle}!`,
    `Ketemu lagi di sini, selamat datang @${handle}!`,
    `Tumben @${handle} mampir ke sini, haha welcome!`,
  ];
  const sapaan = SAPAAN[Math.floor(Math.random() * SAPAAN.length)];

  // REVISI 9 Okt (owner): teks promosi markdown khas kartu telegram-AI —
  // seksi bold + emoji, divider, bullet ▪ label bold — biar gak polos/kaku.
  const CTA_WELCOME = [
    "Semoga betah ya kak — butuh apa-apa tinggal ketik *.menu* 🤖",
    "Kenalan sama bot? Ketik *.menu* buat lihat semua fitur ✨",
    "Jangan sungkan kak, botnya suka diajak ngobrol — coba *.menu* 😉",
  ];
  const engineText = raraWrap("Welcome", [
    `👋 *${sapaan}*`,
    ``,
    `👤 *PROFIL MEMBER BARU*`,
    DIV,
    `▪ *Nama:* ${displayName}`,
    `▪ *${isBridgeJid ? "Akun" : "Nomor"}:* @${handle}`,
    `▪ *Negara:* ${country}`,
    `▪ *Grup:* ${groupName}`,
    `▪ *Total Member:* ${memberCount}`,
    ...(rulesText ? [``, `📋 *DESKRIPSI GRUP*`, DIV, `▪ ${rulesText}`] : []),
    ``,
    `🎯 ${CTA_WELCOME[Math.floor(Math.random() * CTA_WELCOME.length)]}`,
  ].join("\n"));

  // KARTU CANVAS DALAM PREVIEW (request owner 16 Sep 2026): kartu welcome
  // ("Selamat datang" + nama grup + foto circle + nama + member ke-X + total
  // member) digambar canvas → ditanam di PREVIEW (externalAdReply), bukan
  // media langsung → gak bisa disimpan ke galeri.
  let ppBuffer = null;
  try {
    const ppUrl = await sock.profilePictureUrl(participantJid, "image");
    if (ppUrl) {
      const res = await fetch(ppUrl);
      if (res.ok) ppBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch {}
  try {
    const { generateWelcomeCard } = await import("../../src/lib/rara-welcome-canvas.js");
    const { levelPreviewThumb } = await import("../../src/lib/rara-level.js");
    const card = await generateWelcomeCard({
      groupName, ppBuffer, name: displayName,
      memberKe: memberCount || 1,
      totalMember: memberCount || 1,
    });
    const thumb = await levelPreviewThumb(card);
    await sock.sendMessage(groupJid, {
      text: engineText,
      mentions: [participantJid],
      contextInfo: {
        mentionedJid: [participantJid],
        forwardingScore: 0, isForwarded: false,
        externalAdReply: {
          title: "SELAMAT DATANG",
          body: groupName,
          thumbnail: thumb,
          previewType: "PHOTO",
          showAdAttribution: false,
          renderLargerThumbnail: true,
        },
      },
    });
    return;
  } catch (e) {
    console.error("welcome card error:", e);
  }

  // Fallback berjenjang: canvas/preview gagal → foto profil + caption (perilaku
  // lama, request owner 10 Sep 2026) → teks polos. Pesan tidak pernah hilang.
  if (ppBuffer) {
    try {
      const card = await dlCard("gambar", { buffer: ppBuffer }, [["Engine", "WhatsApp CDN"], ["Tipe", "Foto Profil Member"], ["Konteks", "Member Masuk"]]);
      await sock.sendMessage(groupJid, {
        image: ppBuffer,
        caption: card ? `${engineText}\n\n${card}` : engineText,
        mentions: [participantJid],
      });
      return;
    } catch (e) {
      console.error("welcome image fallback error:", e);
    }
  }

  await sock.sendMessage(groupJid, {
    text: engineText,
    mentions: [participantJid],
  });
}

export default {
  config: {
    name: "welcome2",
    alias: ["welcome2", "welcome"],
    category: "group",
    description: "Pesan welcome saat member join grup (teks engine)",
    usage: ".welcome on/off\n.welcome (di DM: pilih mode global/per-grup)\n.setwelcome <pesan> (custom)\n.resetwelcome (reset)",
    example: ".welcome on",
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 0,
    isEnabled: true,
  },
  handler,
  sendWelcomeMessage,
  sendWelcomeModeChooser,
};
