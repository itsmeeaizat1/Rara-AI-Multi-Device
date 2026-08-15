// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import moment from "moment-timezone";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/nova-database.js";
import { createWideDiscordCard } from "../../src/lib/nova-welcome-card.js";
import { resolveAnyLidToJid } from "../../src/lib/nova-lid.js";
import path from "path";
import fs from "fs";
import axios from "axios";
import te from "../../src/lib/nova-error.js";
import { saluranCtx } from "../../src/lib/nova-context.js";
import { getAssetBuffer } from "../../src/lib/nova-asset-manager.js";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "nova";
import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";
function resolvePlaceholders(
  template,
  username,
  groupName,
  groupDesc,
  memberCount,
  groupOwner,
  prefix,
) {
  const now = moment().tz("Asia/Jakarta");
  const dayNames = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
  };
  const dayId = dayNames[now.format("dddd")] || now.format("dddd");
  return template
    .replace(/{user}/gi, `@${username}`)
    .replace(/{number}/gi, username)
    .replace(/{group}/gi, groupName || "Grup")
    .replace(/{desc}/gi, groupDesc || "")
    .replace(/{count}/gi, memberCount?.toString() || "0")
    .replace(/{owner}/gi, groupOwner || "Admin")
    .replace(/{date}/gi, now.format("DD/MM/YYYY"))
    .replace(/{time}/gi, now.format("HH:mm"))
    .replace(/{day}/gi, dayId)
    .replace(/{bot}/gi, config.bot?.name || "Nova")
    .replace(/{prefix}/gi, prefix);
}
const pluginConfig = {
  name: "welcome",
  alias: ["welcome", "welcomegc", "welcomemsg"],
  category: "group",
  description: "Mengatur welcome message untuk grup",
  usage: ".welcome <on/off>",
  example: ".welcome on",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  isAdmin: true,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};
// eslint-disable-next-line require-await
async function buildWelcomeMessage(
  participant,
  groupName,
  groupDesc,
  memberCount,
  customMsg = null,
  groupOwner = "",
  prefix = ".",
) {
  const greetings = [
    `Akhirnya datang juga`,
    `Selamat datang`,
    `Welcome`,
    `Halo`,
    `Hai`,
    `Yokoso~`,
    `Ohayou~`,
  ];
  const quotes = [
    `Jangan jadi silent reader ya!`,
    `Santai aja, anggap rumah sendiri!`,
    `Yuk langsung gas ngobrol!`,
    `Siap-siap rame bareng!`,
    `Jangan malu-malu, kita semua temen!`,
    `Kalau bingung mulai, nyapa aja dulu 😄`,
  ];
  const emojis = ["🎐", "🌸", "✨", "💫", "🪸", "🔥", "💖"];
  const headers = [
    `🎐 Ohayou~ minna-san!
Hari ini kita kedatangan tomodachi baru 🌱
Yuk sambut bareng-bareng~`,
    `🌸 Ohayou minna-san!
Satu teman baru akhirnya join ✨
Semoga betah dan langsung nimbrung ya~`,
    `✨ Ohayou~!
Tomodachi baru datang bawa vibes baru 💫
Yoroshiku ne~ mari seru-seruan bareng!`,
    `🪸 Ohayou minna-san!
Grup ini nambah satu keluarga lagi 🤍
Tanoshii jikan o issho ni sugoso ne~`,
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  const header = headers[Math.floor(Math.random() * headers.length)];
  const username = participant?.split("@")[0] || "User";
  const now = moment().tz("Asia/Jakarta");
  const dayNames = {
    Sunday: "Minggu",
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
  };
  const dayId = dayNames[now.format("dddd")] || now.format("dddd");
  if (customMsg) {
    return resolvePlaceholders(
      customMsg,
      username,
      groupName,
      groupDesc,
      memberCount,
      groupOwner,
      prefix,
    );
  }
  const welcomeTemplates = [
    `╭─✿「 *welcome* 」✿─╮\n│ 🌸 Halo *@${username}*!\n│ Selamat datang di *${groupName}* \n│ Member ke-*${memberCount}* 💕\n╰───────────────✿\n\n_jangan malu-malu ya, perkenalkan diri~_ 💖`,
    `╭─✿「 *new member* 」✿─╮\n│ ✨ Yay! *@${username}* join!\n│ Grup: *${groupName}*\n│ Member: *${memberCount}* 🎀\n╰───────────────✿\n\n_semoga betah dan happy di sini ya~_ 🌸`,
    `╭─✿「 *joined* 」✿─╮\n│ 💖 Hai *@${username}*!\n│ Welcome to *${groupName}*\n│ Kamu member ke-*${memberCount}* 🌷\n╰───────────────✿\n\n_jangan jadi silent reader ya~_ 👀✨`,
    `╭─✿「 *welcome* 」✿─╮\n│ 🎀 Halo *@${username}*!\n│ Selamat bergabung di *${groupName}*\n│ Member: *${memberCount}* 💫\n╰───────────────✿\n\n_yuk nimbrung, jangan malu~_ 🥰`,
    `╭─✿「 *new member* 」✿─╮\n│ 🌷 Yoo *@${username}*!\n│ Akhirnya join *${groupName}*!\n│ Member ke-*${memberCount}* ✨\n╰───────────────✿\n\n_baca desc grup dulu ya sayang~_ 📋💕`,
    `╭─✿「 *joined* 」✿─╮\n│ 💕 Welcome *@${username}*!\n│ Grup: *${groupName}*\n│ Member: *${memberCount}* 🌸\n╰───────────────✿\n\n_semoga nyaman dan seru di sini~_ 💖`,
    `╭─✿「 *welcome* 」✿─╮\n│ 🌸 Hai *@${username}*!\n│ Selamat datang di *${groupName}*\n│ Member ke-*${memberCount}* 🎀\n╰───────────────✿\n\n_gas kenalan sama temen-temen~_ 🤝✨`,
    `╭─✿「 *new member* 」✿─╮\n│ ✨ Yoo *@${username}*!\n│ Welcome *${groupName}*!\n│ Member: *${memberCount}* 💕\n╰───────────────✿\n\n_jangan lupa perkenalkan diri ya~_ 😊🌷`,
  ];
  return welcomeTemplates[Math.floor(Math.random() * welcomeTemplates.length)];

  return msg;
}
async function sendWelcomeMessage(sock, groupJid, participant, groupMeta) {
  try {
    const db = getDatabase();
    const groupData = db.getGroup(groupJid);
    if (groupData?.welcome !== true) return false;
    const welcomeType = db.setting("welcomeType") || 1;
    const realParticipant = resolveAnyLidToJid(
      participant,
      groupMeta?.participants || [],
    );
    const memberCount = groupMeta?.participants?.length || 0;
    const groupName = groupMeta?.subject || "Grup";
    let userName = realParticipant?.split("@")[0] || "User";
    let ppUrl =
      "https://cdn.gimita.id/download/pp%20kosong%20wa%20default%20(1)_1769506608569_52b57f5b.jpg";
    try {
      ppUrl = await sock.profilePictureUrl(realParticipant, "image");
    } catch { }
    const text = await buildWelcomeMessage(
      realParticipant,
      groupMeta?.subject,
      groupMeta?.descOwner,
      memberCount,
      groupData?.welcomeMsg,
      groupMeta?.owner?.split("@")[0] || "",
      config.command?.prefix || ".",
    );
    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Nova-AI";
    if (welcomeType === 2) {
      const cardBody = groupData?.welcomeMsg
        ? resolvePlaceholders(
          groupData.welcomeMsg,
          userName,
          groupMeta?.subject,
          groupMeta?.desc,
          memberCount,
          groupMeta?.owner?.split("@")[0] || "",
          config.command?.prefix || ".",
        )
        : `Selamat datang di grup *${groupName}* 🎉\nMember ke-${memberCount}`;
      await sock.sendMessage(groupJid, {
        interactiveMessage: {
          body: {
            text: `👋 Welcome *@${userName}*`,
          },
          footer: { text: config.bot?.name || "Nova-AI" },
          header: { title: "Welcome", hasMediaAttachment: false },
          carouselMessage: {
            cards: [
              {
                header: {
                  imageMessage: { url: ppUrl },
                },
                body: {
                  text: cardBody,
                },
                footer: { text: config.bot?.name || "Nova-AI" },
                nativeFlowMessage: {
                  buttons: [
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "👋 Halo @" + userName,
                        id: "hi",
                      }),
                    },
                  
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "Kembali",
                        id: m.prefix + "menu"
                      })
                    },
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: "Tanya AI",
                        id: m.prefix + "aihelp"
                      })
                    }
                  ],
                },
              },
            ],
            messageVersion: 1,
            carouselCardType: 1,
          },
          contextInfo: {
            ...saluranCtx(),
            mentionedJid: [realParticipant],
          },
        },
      });
    } else if (welcomeType === 3) {
      const textOnly = groupData?.welcomeMsg
        ? resolvePlaceholders(
          groupData.welcomeMsg,
          userName,
          groupMeta?.subject,
          groupMeta?.desc,
          memberCount,
          groupMeta?.owner?.split("@")[0] || "",
          config.command?.prefix || ".",
        )
        : `*Halo* @${userName} 👋\nSelamat datang di grup *${groupName}* 🌸`;
      await sock.sendMessage(groupJid, {
        text: textOnly,
        contextInfo: {
          ...saluranCtx(),
          mentionedJid: [realParticipant],
          forwardedNewsletterMessageInfo: {
            newsletterName: config?.saluran?.name,
            newsletterJid: config?.saluran?.id,
          },
        },
      });
    } else if (welcomeType === 4) {
      await sock.sendText(groupJid, text, null, {
        mentions: [realParticipant],
        contextInfo: {
          ...saluranCtx(),
          mentionedJid: [realParticipant],
        },
      });
    } else if (welcomeType === 5) {
      await sock.sendPreview(
        groupJid,
        {
          caption: "https://welcome.guys " + text,
          url: "https://welcome.guys",
          title: `Welcome to ${groupName}`,
          description: `👋 Halo ${userName}!`,
          image: ppUrl,
          previewType: 0,
        },
        {
          contextInfo: {
            mentionedJid: [realParticipant],
          }
        }
      );
    } else if (welcomeType === 6) {
      await sock.sendMessage(groupJid, {
        video: getAssetBuffer("nova-mp4") || { url: "https://files.catbox.moe/k28dhp.mp4" },
        gifPlayback: true,
        caption: text,
        contextInfo: {
          mentionedJid: [realParticipant],
        }
      });
    } else if (welcomeType === 7) {
      const qFake = {
        key: {
          fromMe: false,
          participant: realParticipant,
          remoteJid: realParticipant
        },
        message: {
          conversation: `Halo semuanya! 👋`
        }
      };

      const media = await prepareWAMessageMedia({
        image: { url: ppUrl }
      }, { upload: sock.waUploadToServer });

      const msg = generateWAMessageFromContent(groupJid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {},
            interactiveMessage: {
              header: {
                title: "",
                subtitle: "",
                hasMediaAttachment: true,
                imageMessage: media.imageMessage
              },
              body: {
                text: text
              },
              footer: {
                text: config.bot?.name || "Nova-AI"
              },
              contextInfo: {
                mentionedJid: [realParticipant],
                isForwarded: true,
                forwardingScore: 9,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: saluranId,
                  newsletterName: saluranName,
                  serverMessageId: 127,
                },
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "👋 Halo",
                      id: "hi"
                    })
                  }
                ,
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Kembali",
                      id: m.prefix + "menu"
                    })
                  },
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "Tanya AI",
                      id: m.prefix + "aihelp"
                    })
                  }
                ]
              }
            }
          }
        }
      }, { quoted: qFake, userJid: sock.user.jid });

      await sock.relayMessage(groupJid, msg.message, {
        messageId: msg.key.id,
      });
    } else {
      await sock.sendMessage(groupJid, {
        text: text,
        mentions: [realParticipant],
      });
    }
    return true;
  } catch (error) {
    console.error("Welcome Error:", error);
    return false;
  }
}
async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const sub = args[0]?.toLowerCase();
  const sub2 = args[1]?.toLowerCase();
  const groupData = db.getGroup(m.chat) || {};
  const currentStatus = groupData.welcome === true;
  if (sub === "on" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕐");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: true });
        count++;
      }
      m.react("✅");
      return m.reply(claraWrap("Welcome Global On", `Welcome diaktifkan di *${count}* grup!`));
    } catch (err) {
      return m.reply(claraWrap("welcome", te(m.prefix, m.command, m.pushName), "error"));
    }
  }
  if (sub === "off" && sub2 === "all") {
    if (!m.isOwner) {
      return m.reply(config.messages.ownerOnly);
    }
    m.react("🕐");
    try {
      const groups = await sock.groupFetchAllParticipating();
      const groupIds = Object.keys(groups);
      let count = 0;
      for (const groupId of groupIds) {
        db.setGroup(groupId, { welcome: false });
        count++;
      }
      m.react("✅");
      return m.reply(claraWrap("Welcome Global Off", `Welcome dinonaktifkan di *${count}* grup!`));
    } catch (err) {
      return m.reply(claraWrap("welcome", te(m.prefix, m.command, m.pushName), "error"));
    }
  }
  if (sub === "on") {
    if (currentStatus) {
      return m.reply(claraWrap("Welcome Already Active", [`Status: *✅ ON*`, `Welcome sudah aktif di grup ini.`, ``, `_Gunakan \`${m.prefix}welcome off\` untuk menonaktifkan._`].join("\n")));
    }
    db.setGroup(m.chat, { welcome: true });
    return m.reply(claraWrap("Welcome Aktif", [`Welcome message berhasil diaktifkan!`, `Member baru akan disambut otomatis.`, ``, `_Gunakan \`${m.prefix}setwelcome\` untuk custom pesan._`].join("\n")));
  }
  if (sub === "off") {
    if (!currentStatus) {
      return sendReplyWithNav(sock, m, `⚠️ *ᴡᴇʟᴄᴏᴍᴇ ᴀʟʀᴇᴀᴅʏ ɪɴᴀᴄᴛɪᴠᴇ*\n\n` +
        `> Status: *❌ OFF*\n` +
        `> Welcome sudah nonaktif di grup ini.\n\n` +
        `_Gunakan \`${m.prefix}welcome on\` untuk mengaktifkan._`, "welcome");
    }
    db.setGroup(m.chat, { welcome: false });
    return m.reply(claraWrap("Welcome Nonaktif", [`Welcome message berhasil dinonaktifkan.`, `Member baru tidak akan disambut.`].join("\n")));
  }
  m.reply(claraWrap("Welcome Settings", [`Status: *${currentStatus ? "✅ ON" : "❌ OFF"}*`, ``, `━━━ Pilihan ━━━`, `> \`${m.prefix}welcome on\` → Aktifkan`, `> \`${m.prefix}welcome off\` → Nonaktifkan`, `> \`${m.prefix}welcome on all\` → Global ON (owner)`, `> \`${m.prefix}welcome off all\` → Global OFF (owner)`, `> \`${m.prefix}setwelcome\` → Custom pesan`, `> \`${m.prefix}resetwelcome\` → Reset default`].join("\n")));
}
export { pluginConfig as config, handler, sendWelcomeMessage };
