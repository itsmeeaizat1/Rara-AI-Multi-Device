// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Multi-language: bungkus sock biar sock.sendMessage langsung pun ke-translate
import { makeLangAwareSock } from "./lib/rara-i18n-sock.js";
import { handleGroupEvents as groupHandler } from "./lib/rara-group-events.js";
import { enrichAiSatuan } from "./lib/rara-ai-satuan-rich.js";
import fs from "fs";
import path from "path";
import { serialize } from "./lib/rara-serialize.js";
import { noteChatActivity } from "./lib/rara-chat-revive.js";
import { getPlugin, pluginStore } from "./lib/rara-plugins.js";
import { recordPluginExecution, postExecutionCheck } from "./lib/rara-plugin-health-hook.js";
import { getDatabase } from "./lib/rara-database.js";
import { grantActivityExp } from "./lib/rara-activity-progress.js";
import { ensureRpg, saveRpg } from "./lib/rara-rpg-service.js";
import { checkPermission, checkMode, checkAccessBlocked } from "./lib/rara-middleware.js";
import { handleAntiRemoveFromUpsert as _handleAntiRemove , raraWarning } from "./lib/rara-group-protection.js";
import config from "../config.js";
import { c, logger, logMessage } from "./lib/rara-logger.js";
import { trackNotFound, isNotFoundMuted, resetNotFoundTracker } from "./lib/rara-notfound-antispam.js";
import { handleMessage as _autoflowHandleMessage } from "./lib/autoflow.js";
import { addChat as _autoRoleAddChat } from "./lib/rara-autorole.js";
import { buildNotFoundReply } from "./lib/rara-notfound-info.js";

// Re-export handleAntiRemoveFromUpsert from group-protection
async function handleAntiRemoveFromUpsert(msg, sock, db) {
  return _handleAntiRemove(msg, sock, db);
}


// Simple inline wrapper for anti-spam DM messages
// Track cooldowns per user per command
const cooldownMap = new Map();

// Cooldown untuk "command not found" suggestion (default 5 detik)
const notFoundCooldownMap = new Map();
const NOT_FOUND_COOLDOWN_MS = (config.features?.commandSuggestionCooldown || 5) * 1000;

function checkCooldown(m, plugin) {
  if (!plugin?.config?.cooldown || plugin.config.cooldown <= 0) return true;
  if (m.isOwner || m.fromMe) return true;
  const key = `${m.sender}:${m.command}`;
  const now = Date.now();
  const last = cooldownMap.get(key);
  if (last && now - last < plugin.config.cooldown * 1000) {
    const remaining = Math.ceil((plugin.config.cooldown * 1000 - (now - last)) / 1000);
    return false;
  }
  cooldownMap.set(key, now);
  return true;
}

// Get active jadibots (for checkMode)
function getActiveJadibots() {
  try {
    const { getActiveJadibots: _gab } = require("./lib/rara-jadibot-manager.js");
    return _gab();
  } catch {
    return [];
  }
}

/**
 * Main message handler — serializes raw WA message, runs plugins/commands
 */
async function messageHandler(msg, sock, jadibotCtx = {}) {
  if (!msg || !msg.message) return;

  let m;
  try {
    m = await serialize(sock, msg, sock.store || {});
  } catch (error) {
    logger.error("serialize", error.message);
    return;
  }

  if (!m) return;

  // Global sender tracking for mood-driven AI (read by callAI)
  if (!m.fromMe) {
    global.__novaMoodSender = m.sender || m.key?.participant || "";
  }

  const db = getDatabase();

  // === KILL-SWITCH GLOBAL: .bot off = SUNYI TOTAL, .bot mute = DIJEDA ===
  // Di-cek di titik PALING AWAL — sebelum stat, auto-flow, anti, dan semua fitur.
  // Dua tingkat (request owner 9 Sep 2026):
  //   .bot off  → botPower=false : SUNYI TOTAL — gak ada notif/pesan apa pun,
  //               kayak bot beneran mati. Cuma .bot yang diproses.
  //   .bot mute → botMute=true    : bot DIJEDA — semua command diblok, tapi user
  //               yang nyoba command tetap dikasih notif "bot sedang dijeda
  //               oleh owner" (throttle GLOBAL 10 dtk biar gak keban).
  // Pesan biasa (bukan command) di-diamin total di kedua mode.
  // State disimpan di settings.botPower + settings.botMute oleh plugins/bot/bot.js.
  try {
    const __novaPowerOff = db.db?.data?.settings?.botPower === false;
    const __novaMuted = db.db?.data?.settings?.botMute === true;
    const __novaCmd = String(m.command || "").toLowerCase();
    if (__novaCmd !== "bot") {
      // .bot off → sunyi total, gak kirim notif apa pun
      if (__novaPowerOff) {
        return;
      }
      // .bot mute → dijeda, tapi kasih notif ala off lama (throttle 10 dtk)
      if (__novaMuted) {
        if (__novaCmd) {
          const __novaNow = Date.now();
          if (
            !global.__novaBotMuteNoticeAt ||
            __novaNow - global.__novaBotMuteNoticeAt >= 10000
          ) {
            global.__novaBotMuteNoticeAt = __novaNow;
            sock
              .sendMessage(
                m.chat,
                {
                  text: "Bot sedang dijeda oleh owner.\nSemua fitur sementara tidak bisa diakses — bot tidak merespon command apa pun sampai diaktifkan kembali.\n\nTerima kasih atas pengertiannya.",
                },
                { quoted: m }
              )
              .catch(() => {});
          }
        }
        return; // fitur gak diproses
      }
    }
  } catch {}

  // Statistik realtime: tiap pesan masuk dihitung (semua user, termasuk owner)
  try { db.incrementStat("messagesReceived"); } catch {}

  // === ChatRevive: catat aktivitas MANUSIA per grup (.chatrevive) ===
  // Penanda "grup masih hidup" buat fitur revive grup sepi. Cuma pesan
  // non-bot, semua platform (WA + bridge TG lewat sini juga). Silent-fail
  // — fitur ini gak boleh ganggu jalurnya pesan.
  try {
    if (!m.fromMe) noteChatActivity(m.chat);
  } catch {}

  // === Mode PC/GC Only — gate fitur yang bikin bot "ngobrol" (autoflow,
  // autoAI, autoRole) supaya mode beneran dituruti, BUKAN cuma command.
  // Tanpa ini, walau .onlypc on, bot masih balas keyword/ngobrol di grup
  // lewat autoflow & autoAI → owner nyangka fitur gak berfungsi.
  // Anti-detection (moderasi grup) & logging TIDAK digate — jalan terus.
  const __novaOnlyGc = db.setting("onlyGc") || false;
  const __novaOnlyPc = db.setting("onlyPc") || false;
  const __novaOnlyModeBlocked =
    ((__novaOnlyGc && !m.isGroup) || (__novaOnlyPc && m.isGroup)) &&
    !m.isOwner &&
    !m.fromMe;
  // Blacklist (bannedUsers) & mode whitelist — nomor ke-ban / gak
  // ter-whitelist gak bisa chat bot lewat jalur mana pun (autoflow,
  // autoAI, autoRole), bukan cuma command.
  let __novaAccessModeBlocked = false;
  try {
    __novaAccessModeBlocked = checkAccessBlocked(m).blocked;
  } catch {}
  const __novaModeBlocked = __novaOnlyModeBlocked || __novaAccessModeBlocked;

  // 🔹 AFK HOOKS (rara-afk.js) — WAJIB PALING AWAL: user AFK balakang →
  // kartu "AFK Berakhir" (jam mulai + total durasi); ada yang mention
  // user AFK di grup → kartu info. Dulu kepasang di bawah (automation
  // hub) → di grup yang AI-nimbrung/game-hook nyala, pesan ke-consume
  // `return` duluan → kartu AFK selesai GAK PERNAH keluar (request owner
  // 14 Sep 2026). Fire-and-forget, gak ngeblok pipeline.
  if (!m.fromMe && !m.isNewsletter && !__novaModeBlocked) {
    try {
      const { handleAfkHooks } = await import("./lib/rara-afk.js");
      handleAfkHooks(m, sock, db).catch((e) => {
        try { console.error("[AfkHook] error:", e?.message || e); } catch {}
      });
    } catch (e) {
      try { console.error("[AfkHook] import gagal:", e?.message || e); } catch {}
    }
  }

  // 🔹 OMNIOUTFITCHANGER PHOTO HOOK — kalau sender punya session
  // .omnioutfitchanger aktif (nunggu foto item topi/baju/celana/sepatu)
  // dan pesan ini foto POLOS (bukan command, bukan reply), tangkep jadi
  // item outfit & STOP pipeline di sini (foto gak lanjut diproses fitur
  // lain). Kalau gak ada session aktif, lanjut normal (return false).
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaModeBlocked && (m.isImage || m.isMedia)) {
    try {
      const { handleOutfitPhotoHook } = await import("../plugins/ai-image/omnioutfitchanger.js");
      const handled = await handleOutfitPhotoHook(m);
      if (handled) return;
    } catch (e) {
      try { console.error("[OmniOutfitHook] error:", e?.message || e); } catch {}
    }
  }

  // === AutoFlow: cek rule automation (keyword/media) tiap pesan masuk ===
  if (!__novaModeBlocked) { try { _autoflowHandleMessage(sock, m); } catch {} }

  // === AutoRole: track poin per chat + cek upgrade role ===
  if (m.isGroup && !__novaModeBlocked) { _autoRoleAddChat(sock, m.chat, m.sender, m.pushName).catch(() => {}); }

  // === Self mode guard for non-command features ===
  // In self mode, only owner/fromMe can trigger non-command auto-features (AI grup, auto-AI, etc.)
  // Anti-detection (anti-NSFW, anti-kasar, etc.) still runs regardless of mode for group safety.
  const __novaBotMode = db.setting("botMode") || config.mode || "public";
  const __novaIsSelfMode = __novaBotMode === "self";
  // Cek juga publicGroups & selfGroups untuk akurasi skip
  const __novaPublicGroups = db.setting("publicGroups") || [];
  const __novaIsPublicGroup = m.isGroup && __novaPublicGroups.includes(m.chat);
  const __novaSelfModeSkip = __novaIsSelfMode && !m.fromMe && !m.isOwner && !__novaIsPublicGroup;


  // Panel message logging (group only, private never logged)
  try {
    const logEnabled = db.db?.data?.settings?.logMessage === true || (config.features?.logMessage === true && db.db?.data?.settings?.logMessage !== false);
    if (logEnabled && m.body && m.body.trim()) {
      logMessage({
        chatType: m.isGroup ? "group" : "private",
        groupName: m.groupName || "",
        pushName: m.pushName || m.senderNumber || "",
        sender: m.sender || "",
        message: m.body,
        messageType: m.type || "conversation",
        isNewsletter: m.isNewsletter || false,
      });
    }
  } catch {}

  // Anti-detection features (runs on ALL group messages, not just commands)
  // Skip in self mode — bot harus silent di grup saat self mode
  if (m.isGroup && !m.fromMe && !__novaSelfModeSkip) {
    try {
      const { handleAntiNSFW } = await import("../plugins/group/anti18plus.js");
      await handleAntiNSFW(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("anti18plus", e.message);
    }
    try {
      const { handleAntiBucin } = await import("../plugins/group/antibucin.js");
      await handleAntiBucin(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antibucin", e.message);
    }
    try {
      const { handleAntiKasar } = await import("../plugins/group/antikasar.js");
      await handleAntiKasar(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antikasar", e.message);
    }
    try {
      const { handleAntiRibut } = await import("../plugins/group/antiribut.js");
      await handleAntiRibut(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antiribut", e.message);
    try {
      const { processConflictMessage } = await import("../plugins/owner/autoconflict.js");
      await processConflictMessage(m, sock);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("autoconflict", e.message);
    }
    }
    try {
      const { handleAntiVn } = await import("../plugins/group/antivn.js");
      await handleAntiVn(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antivn", e.message);
    }
    try {
      const { handleAntiFoto } = await import("../plugins/group/antifoto.js");
      await handleAntiFoto(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antifoto", e.message);
    }
    try {
      const { handleAntiVideo } = await import("../plugins/group/antivideo.js");
      await handleAntiVideo(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antivideo", e.message);
    }
    try {
      const { checkAntimedia } = await import("../plugins/group/antimedia.js");
      await checkAntimedia(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antimedia", e.message);
    }
    try {
      const { checkAntisticker } = await import("../plugins/group/antisticker.js");
      await checkAntisticker(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antisticker", e.message);
    }
    try {
      const { checkAntidocument } = await import("../plugins/group/antidocument.js");
      await checkAntidocument(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antidocument", e.message);
    }
try {
      const { handleAntiBug } = await import("../plugins/group/antibug.js");
      await handleAntiBug(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antibug", e.message);
    }
    try {
      const { handleAntiRvo } = await import("../plugins/group/antirvo.js");
      await handleAntiRvo(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antirvo", e.message);
    }
    try {
      const { handleAntiNomorLuar } = await import("../plugins/group/antinomorluar.js");
      await handleAntiNomorLuar(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antinomorluar", e.message);
    }
    // Group anti-spam (flood protection)
    try {
      const { checkSpam, handleSpamAction } = await import("../plugins/group/antispam.js");
      const isSpam = await checkSpam(m, sock, db);
      if (isSpam) {
        await handleSpamAction(m, sock, db);
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antispam-group", e.message);
    }
  }

  // === Anti-Spam DM (Private Chat Protection) ===
  if (!m.isGroup && !m.fromMe && !m.isOwner && m.body && m.body.trim()) {
    try {
      const dmSettings = db.setting("antispamDM");
      if (dmSettings?.enabled) {
        const now = Date.now();
        if (!global.raraDmSpamTrack) global.raraDmSpamTrack = {};
        const tracker = global.raraDmSpamTrack;

        const sender = m.sender;

        // Check if user is muted
        if (tracker[sender]?.mutedUntil && now < tracker[sender].mutedUntil) {
          const remainingMin = Math.ceil((tracker[sender].mutedUntil - now) / 60000);
          // Silent ignore - don't respond to muted users
          return;
        }

        // Initialize or clean up tracking
        if (!tracker[sender]) {
          tracker[sender] = { messages: [], warnCount: 0, mutedUntil: 0 };
        }

        // Remove messages outside the window
        tracker[sender].messages = tracker[sender].messages.filter(
          (ts) => now - ts < dmSettings.windowMs
        );

        // Add current message
        tracker[sender].messages.push(now);

        // Check if over limit
        if (tracker[sender].messages.length > dmSettings.limit) {
          tracker[sender].warnCount++;

          if (tracker[sender].warnCount >= dmSettings.maxWarn) {
            // Mute the user
            tracker[sender].mutedUntil = now + dmSettings.muteMin * 60000;
            tracker[sender].warnCount = 0;
            tracker[sender].messages = [];

            await sock.sendMessage(m.chat, {
              text: raraWarning("ANTI SPAM — TINDAKAN", [
                ["Pengirim", "@" + sender.split("@")[0]],
                ["Pelanggaran", "Pesan terlalu cepat dan berulang"],
                ["Peringatan", dmSettings.maxWarn + " dari " + dmSettings.maxWarn],
                ["Tindakan", "Di-mute selama " + dmSettings.muteMin + " menit"],
              ], "Bot tidak akan merespon pesanmu sampai masa mute selesai."),
            });
            return;
          } else {
            // Warn the user
            tracker[sender].messages = []; // Reset window
            const remaining = dmSettings.maxWarn - tracker[sender].warnCount;

            await sock.sendMessage(m.chat, {
              text: raraWarning("ANTI SPAM — PERINGATAN", [
                ["Pengirim", "@" + sender.split("@")[0]],
                ["Pelanggaran", "Pesan terlalu cepat dan berulang"],
                ["Peringatan", tracker[sender].warnCount + " dari " + dmSettings.maxWarn],
                ["Tindakan", "Teguran tercatat"],
              ], `Sisa peringatan: ${remaining}x. Setelah itu kamu akan di-mute ${dmSettings.muteMin} menit.`),
            });
            return;
          }
        }
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antispamdm", e.message);
    }
  }


  // === Quiz Verification Check (anti-spam bot) ===
  // Check if sender has pending quiz verification in this group
  if (m.isGroup && !m.fromMe && m.body && !m.isNewsletter) {
    try {
      const { checkMessageVerification } = await import("./lib/rara-quiz-verify.js");
      const verifyResult = checkMessageVerification(m.chat, m.sender, m.body);
      if (verifyResult.wasPending) {
        if (verifyResult.verified) {
          // Verified successfully — let them know
          await sock.sendMessage(m.chat, {
            text: "「 ✦ Verifikasi ✦ 」\n✅ Verifikasi berhasil!\nSelamat datang di grup",
          }, { quoted: m });
          return; // Don't process further this message
        } else if (verifyResult.kicked) {
          // Max attempts reached — kick
          try {
            await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
          } catch {}
          await sock.sendMessage(m.chat, {
            text: "「 ✦ Verifikasi ✦ 」\n❌ Gagal verifikasi 3x!\nMember dikeluarkan",
          });
          return;
        } else if (verifyResult.timedOut) {
          try {
            await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
          } catch {}
          await sock.sendMessage(m.chat, {
            text: "「 ✦ Verifikasi ✦ 」\n⏰ Waktu verifikasi habis!\nMember dikeluarkan",
          });
          return;
        } else if (verifyResult.shouldDelete) {
          // Wrong answer — delete message and remind
          try {
            await sock.sendMessage(m.chat, { delete: m.key });
          } catch {}
          await sock.sendMessage(m.chat, {
            text: verifyResult.message,
          });
          return;
        }
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("quizverify", e.message);
    }
  }

  // === Activity Tracker ===
  if (m.isGroup && !m.fromMe && !m.isNewsletter) {
    try {
      const { trackActivity } = await import("./lib/rara-activity-tracker.js");
      trackActivity(m, { messageType: m.type || "text" });
      try {
        const { logMessageForSummary } = await import("../plugins/owner/autosummary.js");
        logMessageForSummary(m);
      } catch (e) {
        if (config.dev?.debugLog) logger.error("autosummary-log", e.message);
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("activity", e.message);
    }
  }

  // === Auto-Translate ===
  if (m.isGroup && !m.isCommand && !m.fromMe && !m.isNewsletter && m.body && m.body.length >= 5) {
    try {
      const { handleAutoTranslateMessage } = await import("./lib/rara-autotranslate.js");
      if (typeof handleAutoTranslateMessage === "function") {
        await handleAutoTranslateMessage(m, sock);
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("autotranslate", e.message);
    }
  }

  // AI Grup: catat aktivitas grup + bot nimbrung otomatis (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && m.isGroup && !__novaSelfModeSkip) {
    try {
      // Catat aktivitas grup untuk proactive messaging
      const { recordGroupActivity } = await import("./lib/rara-aigroupchat-proactive.js");
      if (typeof recordGroupActivity === "function") recordGroupActivity(m.chat);

      // Cek AI Grup nimbrung
      const { handleAiGrup, isAiGrupEnabled } = await import("./lib/rara-aigroupchat.js");
      if (typeof isAiGrupEnabled === "function" && isAiGrupEnabled(jadibotCtx)) {
        const handled = await handleAiGrup(m, sock, undefined, jadibotCtx);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("aigrup", e.message);
    }
  }

  // Registration session handler (interactive reply-based daftar)
  // Note: TIDAK exclude fromMe — biar owner bisa testing daftar via chat ke diri sendiri.
  // Proteksi echo pesan prompt milik bot sendiri ada di dalam registrationAnswerHandler (cek session.promptId).
  // Skip in self mode for non-owner.
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { registrationAnswerHandler } = await import("./../plugins/user/register.js");
      if (typeof registrationAnswerHandler === "function") {
        const regHandled = await registrationAnswerHandler(m, sock);
        if (regHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("registration", e.message);
    }
  }

  // VN Captcha Interrogation: jika user lagi dalam sesi ujian suara, verify VN (skip in self mode)
  if (!m.isCommand && !m.fromMe && !__novaSelfModeSkip) {
    try {
      const { verifyVnCaptcha, hasVnCaptchaChallenge, isVnCaptchaBlocked } = await import("../plugins/owner/vncaptcha.js");
      const senderJid = m.key?.remoteJid || m.sender;
      if (typeof isVnCaptchaBlocked === "function" && isVnCaptchaBlocked(senderJid)) {
        await sock.sendMessage(senderJid, { text: "「 ✦ Diblokir 24 Jam ✦ 」\n❌ Gagal verifikasi suara\nCoba lagi besok" });
        return;
      }
      if (typeof hasVnCaptchaChallenge === "function" && hasVnCaptchaChallenge(senderJid)) {
        const vnResult = await verifyVnCaptcha(m, sock);
        if (vnResult) return;
      }
    } catch (e) {
      console.error("[VNCaptcha] Hook error:", e.message);
    }
  }

  // Captcha session handler (daftarotomatis captcha verification) — skip in self mode for non-owner
  if (!__novaSelfModeSkip) {
    try {
      const { captchaAnswerHandler } = await import("./../plugins/user/autoregister.js");
      if (typeof captchaAnswerHandler === "function") {
        const captchaHandled = await captchaAnswerHandler(m, sock);
        if (captchaHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("captcha", e.message);
    }
  }

  // Channel Hub — auto-react & auto-reply post di SALURAN WA utama (fitur no.1
  // "bot masa depan" 25 Sep; engine src/lib/rara-saluran-hub.js, toggle .channelhub).
  // NOTE: blok game di bawah skip isNewsletter → hook saluran WAJIB punya blok sendiri.
  if (m.isNewsletter && !m.isCommand && !m.fromMe) {
    try {
      const { inboundHandler } = await import("../src/lib/rara-saluran-hub.js");
      await inboundHandler(sock, m);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("saluranhub", e.message);
    }
  }

  // Game answer handler (non-command reply to game message) — skip in self mode for non-owner
  // Checks all registered game sessions via rara-games + family100
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    // Chat anonim antar member (relay pesan sesi aktif — plugins/fun/vibychatanonymouschat.js)
    try {
      const { answerHandler: anonChatRelay } = await import("../plugins/fun/vibychatanonymouschat.js");
      if (typeof anonChatRelay === "function") {
        const anonHandled = await anonChatRelay(m, sock);
        if (anonHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("anonchat", e.message);
    }

    // Chatib Lobby — ruang obrol anonim multi-user (plugins/fun/chatiblobby.js)
    try {
      const { answerHandler: chatibRelay } = await import("../plugins/fun/chatiblobby.js");
      if (typeof chatibRelay === "function") {
        const chatibHandled = await chatibRelay(m, sock);
        if (chatibHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("chatiblobby", e.message);
    }

    // Chat Anonim & Anonymous — kategori BARU (plugins/anonim/anonim.js), TERPISAH
    // dari vibychatanonymouschat/rara-anonchat di atas (owner 6 Okt 2026: jangan disatuin).
    // Nanganin: lanjutan sesi daftar (step-by-step) + relay pesan sesi chat aktif.
    try {
      const { answerHandler: anonimHandler } = await import("../plugins/anonim/anonim.js");
      if (typeof anonimHandler === "function") {
        const anonimHandled = await anonimHandler(m, sock);
        if (anonimHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("anonim", e.message);
    }

    // Family 100 (separate plugin, own session system)
    try {
      const { answerHandler: fam100Handler } = await import("../plugins/game/family100.js");
      if (typeof fam100Handler === "function") {
        const famHandled = await fam100Handler(m, sock);
        if (famHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("family100", e.message);
    }

    // Menara Seribu Pintu (own session system)
    try {
      const { answerHandler: menaraHandler } = await import("../plugins/rpg/menara.js");
      if (typeof menaraHandler === "function") {
        const menaraHandled = await menaraHandler(m, sock);
        if (menaraHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("menara", e.message);
    }

    // Arena Kuis RPG (own session system)
    try {
      const { answerHandler: quizArenaHandler } = await import("../plugins/rpg/quizarena.js");
      if (typeof quizArenaHandler === "function") {
        const qaHandled = await quizArenaHandler(m, sock);
        if (qaHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("quizarena", e.message);
    }

    // Asah Otak multiplayer (own session system)
    try {
      const { answerHandler: asahHandler } = await import("../plugins/game/asahotak.js");
      if (typeof asahHandler === "function") {
        const asahHandled = await asahHandler(m, sock);
        if (asahHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("asahotak", e.message);
    }

    // AltF games batch (port altftool.com — plugins/game/*.js, own session systems)
    try {
      const { answerHandler: dwHandler } = await import("../plugins/game/dailywordgame.js");
      if (typeof dwHandler === "function") {
        const dwHandled = await dwHandler(m, sock);
        if (dwHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("dailywordgame", e.message);
    }

    try {
      const { answerHandler: g2048Handler } = await import("../plugins/game/game2048.js");
      if (typeof g2048Handler === "function") {
        const g2048Handled = await g2048Handler(m, sock);
        if (g2048Handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("game2048", e.message);
    }

    try {
      const { answerHandler: c4Handler } = await import("../plugins/game/fourinarow.js");
      if (typeof c4Handler === "function") {
        const c4Handled = await c4Handler(m, sock);
        if (c4Handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("fourinarow", e.message);
    }

    try {
      const { answerHandler: slideHandler } = await import("../plugins/game/slidingpuzzle.js");
      if (typeof slideHandler === "function") {
        const slideHandled = await slideHandler(m, sock);
        if (slideHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("slidingpuzzle", e.message);
    }

    try {
      const { answerHandler: mineHandler } = await import("../plugins/game/minesweeper.js");
      if (typeof mineHandler === "function") {
        const mineHandled = await mineHandler(m, sock);
        if (mineHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("minesweeper", e.message);
    }

    try {
      const { answerHandler: emojiQuizHandler } = await import("../plugins/game/emojiquiz.js");
      if (typeof emojiQuizHandler === "function") {
        const eqHandled = await emojiQuizHandler(m, sock);
        if (eqHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("emojiquiz", e.message);
    }

    // ImgMotion — step 2 video (plugins/tools/imgmotion.js)
    try {
      const { answerHandler: imgMotionHandler } = await import("../plugins/tools/imgmotion.js");
      if (typeof imgMotionHandler === "function") {
        const imHandled = await imgMotionHandler(m, sock);
        if (imHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("imgmotion", e.message);
    }

    // Ampro — step 2 magic link (plugins/tools/ampro.js)
    try {
      const { answerHandler: amproHandler } = await import("../plugins/tools/ampro.js");
      if (typeof amproHandler === "function") {
        const apHandled = await amproHandler(m, sock);
        if (apHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("ampro", e.message);
    }

    // All other games (via rara-game-factory — shared session map in rara-game-engine)
    try {
      const { games } = await import("./lib/rara-game-factory.js");
      const { getSession } = await import("./lib/rara-game-engine.js");
      const session = getSession(m.chat);
      if (session && session.gameType) {
        const cfg = games.get(session.gameType);
        if (cfg) {
          const { answerHandler } = games.createHandler(session.gameType);
          const handled = await answerHandler(m, sock);
          if (handled) return;
        }
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("game-answer", e.message);
    }
  }

  // Maps search answer handler (balas nomor hasil .mapss → buka halaman
  // place: screenshot + plain text isi — plugins/browser/mapss.js) —
  // DIPASANG SETELAH game handler biar jawaban game prioritas duluan
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { answerHandler: mapssHandler } = await import("../plugins/browser/mapss.js");
      if (typeof mapssHandler === "function") {
        const mapssHandled = await mapssHandler(m, sock);
        if (mapssHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("mapss-answer", e.message);
    }
  }

  // Pacaran answer handler (reply terima/tolak to tembakan) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { answerHandler: pacaranHandler } = await import("../plugins/couple/dating.js");
      if (typeof pacaranHandler === "function") {
        const handled = await pacaranHandler(m, sock);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("pacaran-answer", e.message);
    }
  }

  // Nikah answer handler (reply terima/tolak to lamaran) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { answerHandler: nikahHandler } = await import("../plugins/couple/marriage.js");
      if (typeof nikahHandler === "function") {
        const handled = await nikahHandler(m, sock);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("nikah-answer", e.message);
    }
  }

  // RPG Cinta answer handler (reply terima/tolak to jadianmatch) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { answerHandler: jadianMatchHandler } = await import("../plugins/rpg-couple/daterpg.js");
      if (typeof jadianMatchHandler === "function") {
        const handled = await jadianMatchHandler(m, sock);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("jadianmatch-answer", e.message);
    }
  }

  // RPG Cinta nikah answer handler (reply terima/tolak to nikahmatch) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { answerHandler: nikahMatchHandler } = await import("../plugins/rpg-couple/marriagematch.js");
      if (typeof nikahMatchHandler === "function") {
        const handled = await nikahMatchHandler(m, sock);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("nikahmatch-answer", e.message);
    }
  }

  // Confess reply handler (balasan ke pesan confess anonim/non-anonim) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && m.quoted && !__novaSelfModeSkip) {
    try {
      const { replyHandler: confessReply } = await import("../plugins/confess-menfess/confess.js");
      if (typeof confessReply === "function") {
        const handled = await confessReply(m, { sock });
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("confess-reply", e.message);
    }
  }

  // ConfessViral reply handler (balasan ke pesan confess viral) — skip in self mode for non-owner
  if (!m.isCommand && !m.isNewsletter && m.quoted && !__novaSelfModeSkip) {
    try {
      const { replyHandler: viralReply } = await import("../plugins/confess-menfess/confessviral.js");
      if (typeof viralReply === "function") {
        const handled = await viralReply(m, { sock });
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("confessviral-reply", e.message);
    }
  }

  // Auto React VN: jalan walau fromMe (owner testing di self-chat), asal bukan command/newsletter (skip in self mode for non-owner)
  if (!m.isCommand && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAutoreactvn, isAutoreactvnEnabled } = await import("./lib/rara-autoreactvn.js");
      if (typeof isAutoreactvnEnabled === "function" && isAutoreactvnEnabled(m, sock)) {
        const vnHandled = await handleAutoreactvn(m, sock);
        if (vnHandled) return;
      }
    } catch (e) {
      console.error("[AutoReactVN] Handler error:", e.message);
    }
  }

  // Auto VN Translate: real-time voice note detection & translate (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAutoVnTranslate, isAutoVnEnabled } = await import("../plugins/owner/autotranslatevn.js");
      if (typeof isAutoVnEnabled === "function" && isAutoVnEnabled(m, sock)) {
        const vnTrans = await handleAutoVnTranslate(m, sock);
        if (vnTrans) return;
      }
    } catch (e) {
      console.error("[AutoVnTranslate] Hook error:", e.message);
    }
  }

  // Auto OCR Solve: real-time image detection for math/code (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAutoOcrSolve, isAutoOcrEnabled } = await import("../plugins/ai/ocrsolve.js");
      if (typeof isAutoOcrEnabled === "function" && isAutoOcrEnabled(m, sock)) {
        const ocrResult = await handleAutoOcrSolve(m, sock);
        if (ocrResult) return;
      }
    } catch (e) {
      console.error("[AutoOcrSolve] Hook error:", e.message);
    }
  }

  // Auto Meme Gen: real-time image detection for instant meme (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAutoMemeGen, isAutoMemeEnabled } = await import("../plugins/ai/automemegenerator.js");
      if (typeof isAutoMemeEnabled === "function" && isAutoMemeEnabled(m, sock)) {
        const memeResult = await handleAutoMemeGen(m, sock);
        if (memeResult) return;
      }
    } catch (e) {
      console.error("[AutoMemeGen] Hook error:", e.message);
    }
  }

  // ScanVirus: auto-scan file member di grup via VirusTotal (skip in self mode)
  // Fire-and-forget + queue internal di lib — scan bisa lama (upload ±3 menit),
  // jangan pernah ngeblok pipeline pesan yang lain.
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { isScanVirusEnabled, handleScanVirus } = await import("./lib/rara-scanvirus.js");
      if (typeof isScanVirusEnabled === "function" && (await isScanVirusEnabled(m))) {
        handleScanVirus(m, sock); // tanpa await — biar handler gak nunggu
      }
    } catch (e) {
      console.error("[ScanVirus] Hook error:", e.message);
    }
  }

  // AI Auto VN Interaction: real-time VN detection (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAiAutoVnInteraction, isAiAutoVnEnabled } = await import("../plugins/owner/aiautointeractionvn.js");
      if (typeof isAiAutoVnEnabled === "function" && isAiAutoVnEnabled(m, sock)) {
        const vnAiResult = await handleAiAutoVnInteraction(m, sock);
        if (vnAiResult) return;
      }
    } catch (e) {
      console.error("[AiAutoVn] Hook error:", e.message);
    }
  }

  // Ambient Context Mimicry (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { handleAmbientMimic, isAmbientMimicEnabled } = await import("../plugins/owner/ambientmimic.js");
      if (typeof isAmbientMimicEnabled === "function" && isAmbientMimicEnabled(m, sock)) {
        const ambientResult = await handleAmbientMimic(m, sock);
        if (ambientResult) return;
      }
    } catch (e) {
      console.error("[AmbientMimic] Hook error:", e.message);
    }
  }

  // Mood-Driven Theme: passive typing pattern tracking (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { trackMoodTheme, isMoodThemeEnabled } = await import("../plugins/owner/moodtheme.js");
      if (typeof isMoodThemeEnabled === "function" && isMoodThemeEnabled(m)) {
        trackMoodTheme(m, sock);
      }
    } catch (e) {
      console.error("[MoodTheme] Track error:", e.message);
    }
  }

  // Predictive Life-Nudge (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { trackPredictiveNudge, checkAndSendNudge, isPredictiveNudgeEnabled } = await import("../plugins/owner/predictivenudge.js");
      if (typeof isPredictiveNudgeEnabled === "function" && isPredictiveNudgeEnabled(m, sock)) {
        trackPredictiveNudge(m, sock);
        const nudgeSent = await checkAndSendNudge(m, sock);
        // Nudge is proactive — don't return, let other processing continue
      }
    } catch (e) {
      console.error("[PredictiveNudge] Hook error:", e.message);
    }
  }

  // === Automation Hub Hooks ===
  // Track activity for smartdigest
  if (!m.isNewsletter) {
    try {
      const { trackActivity } = await import("./lib/rara-automation-hub.js");
      trackActivity(m);
    } catch {}
  }
  // Auto-forward & Auto-mod hooks (skip in self mode for non-owner)
  if (!m.fromMe && !m.isNewsletter && !__novaSelfModeSkip) {
    try {
      const { checkAutoForward, checkAutoMod } = await import("./lib/rara-automation-hub.js");
      await checkAutoForward(m, sock);
      await checkAutoMod(m, sock);
    } catch (e) {
      if (config.dev?.debugLog) console.error("[AutomationHub] Hook error:", e.message);
    }

    // 🔹 GROUP GUARDIAN AI (rara-guardian.js): moderator AI kontekstual —
    // fire-and-forget biar gak nambah latency pesan masuk
    try {
      const { guardianJudge } = await import("./lib/rara-guardian.js");
      guardianJudge(m, sock, db, config).catch(() => {});
    } catch (e) {
      if (config.dev?.debugLog) console.error("[Guardian] Hook error:", e.message);
    }

    // 🔹 GROUP REGISTRY: grup yang baru dijenguk bot kecatat otomatis ke db
    // (biar Total Grup di menu gak suka 0 walau bot baru join grup)
    if (m.isGroup && m.chat && m.chat.endsWith("@g.us")) {
      try {
        if (!db.getGroup(m.chat)) {
          let gname = "";
          try { const md = await sock.groupMetadata(m.chat); gname = md?.subject || ""; } catch {}
          const { ensureGroupRegistered } = await import("./lib/rara-group-registry.js");
          ensureGroupRegistered(m.chat, { name: gname, db });
        }
      } catch {}
    }

  }


  // Auto-AI: if not a command, check if auto-AI should respond (skip in self mode)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && !__novaSelfModeSkip && !__novaModeBlocked) {
    // 🔹 TELPON MODE (voice agent): VN masuk di chat yang mode-nya nyala →
    // didengerin (STT) terus dijawab pakai suara (TTS VN) — ala telepon
    try {
      if (m.isAudio) {
        const { isTelponOn, handleTelponVn } = await import("./lib/rara-telpon.js");
        if (typeof isTelponOn === "function" && isTelponOn(db, m.chat)) {
          await handleTelponVn(m, sock, db, config);
          return;
        }
      }
    } catch (e) {
      if (config.dev?.debugLog) console.error("[Telpon] Hook error:", e.message);
    }

    try {
      const { handleAutoAI, isAutoAIEnabled } = await import("./lib/rara-auto-ai.js");
      // FIX: dulu isAutoAIEnabled(m, sock) — lib expect chatId STRING,
      // object m jadi key "[object Object]" → selalu false → autoai
      // GAK PERNAH aktif walau di-on. Sekarang m.chat.
      if (typeof isAutoAIEnabled === "function" && isAutoAIEnabled(m.chat)) {
        await handleAutoAI(m, sock);
      }
    } catch {}

    return;
  }

  // From here, only process commands
  if (!m.isCommand) return;

  // AutoAI AFK-mode: saat autoai aktif di grup ini, command non-owner
  // diblokir (sesuai desain .autoai — enableCommands default false,
  // buka via .autoai enablecommand). Owner & .autoai selalu lolos.
  // React 🚫 doang, tanpa reply — biar grup gak kebanjiran notif.
  try {
    const { isCommandBlockedByAutoAI } = await import("./lib/rara-auto-ai.js");
    if (typeof isCommandBlockedByAutoAI === "function" && isCommandBlockedByAutoAI(m)) {
      if (!m.isNewsletter) { try { await m.react("🚫"); } catch {} }
      return;
    }
  } catch {}

  // Check mode (self/public) — MOVED HERE (before case handler & notFound)
  // Ini memastikan SEMUA command (case handler, plugin, notFound) di-blokir di self mode
  try {
    const modeResult = checkMode(m, getActiveJadibots);
    if (!modeResult.allowed) {
      if (!m.isNewsletter) { try { await m.react("🚫"); } catch {} }
      if (modeResult.isModeLimited && modeResult.modeLimitedMessage) {
        // Throttle 10 dtk per chat — mode gak bisa dijadikan alat spam ban notif
        const __novaNow = Date.now();
        if (
          !global.__novaModeNoticeAt ||
          !global.__novaModeNoticeAt[m.chat] ||
          __novaNow - global.__novaModeNoticeAt[m.chat] >= 10000
        ) {
          global.__novaModeNoticeAt = global.__novaModeNoticeAt || {};
          global.__novaModeNoticeAt[m.chat] = __novaNow;
          await m.reply(modeResult.modeLimitedMessage);
        }
      } else if (modeResult.isAfk && modeResult.afkMessage) {
        await m.reply(modeResult.afkMessage);
      } else if (modeResult.isOnlyThisGroup && modeResult.onlyThisGroupMessage) {
        await m.reply(modeResult.onlyThisGroupMessage);
      } else if (modeResult.hasJadibots && modeResult.jadibotMessage) {
        await sock.sendMessage(m.chat, {
          text: modeResult.jadibotMessage,
          mentions: modeResult.jadibotMentions || [],
        }, { quoted: msg });
      }
      return;
    }
  } catch {}

  // Try case handler first (case/rara.js)
  try {
    const { handleCommand: handleCase } = await import("../case/rara.js");
    const caseResult = await handleCase(m, sock);
    if (caseResult?.handled) {
      try { db.incrementStat("commandsRun"); } catch {}
      return;
    }
  } catch (error) {
    if (config.dev?.debugLog) logger.error("case", error.message);
  }

  // Find matching plugin
  const command = m.command?.toLowerCase();
  if (!command) return;

  const plugin = getPlugin(command);
  if (!plugin) {
    // Command not found — check if suggestion feature is on (skip in self mode for non-owner)
    if (config.features?.commandSuggestion !== false && !__novaSelfModeSkip) {
      // Smart anti-spam: track frequency, escalate response, progressive cooldown
      const isMuted = isNotFoundMuted(m.sender);
      if (isMuted) return;

      const spamResult = trackNotFound(m.sender, command);
      if (!spamResult.shouldReply) return;

      // Cari closest match — levenshtein (jarak edit) + didyoumean (skor
      // kemiripan relatif, nangkep typo jauh yang strukturnya masih mirip)
      // (16 Sep 2026, upgrade request owner: dep didyoumean)
      const { getAllCommandNames } = await import("./lib/rara-plugins.js");
      const { suggestCommand } = await import("./lib/rara-command-suggest.js");
      const closest = suggestCommand(command, getAllCommandNames());

      if (!m.isNewsletter) {
        try {
          const replyText = await buildNotFoundReply(
            m, { sock, config, db: getDatabase(), uptime: process.uptime() * 1000 },
            command, closest,
            spamResult.level, spamResult.totalHits
          );
          if (replyText) await m.reply(replyText);
        } catch (e) {
          if (config.dev?.debugLog) logger.error("notFound reply", e.message);
        }
      }
    }
    return;
  }

  // Check permissions
  try {
    const permResult = checkPermission(m, plugin.config);
    if (!permResult.allowed) {
      if (!m.isNewsletter) { try { await m.react("🚫"); } catch {} }
      // Cek apakah ditolak karena premium
      const isPremiumRejection =
        permResult.reason &&
        (permResult.reason.toLowerCase().includes("premium") ||
         permResult.reason.includes("💎"));

      if (permResult.reason && !m.isNewsletter) {
        await m.reply(permResult.reason);
      }

      // Kirim VN "Daftar dulu, Kak!" kalau user blm premium
      if (isPremiumRejection && !m.isNewsletter) {
        try {
          const vnPath = path.join(process.cwd(), "assets", "vn", "vn_premium_only.mp3");
          if (fs.existsSync(vnPath)) {
            const vnBuffer = fs.readFileSync(vnPath);
            if (vnBuffer && vnBuffer.length > 0) {
              await sock.sendMessage(
                m.chat,
                { audio: vnBuffer, mimetype: "audio/mpeg", ptt: true },
                { quoted: m }
              );
            }
          }
        } catch (e) {
          console.error("[Handler] VN premium error:", e.message);
        }
      }

      return;
    }
  } catch {}

  // Check cooldown
  if (!checkCooldown(m, plugin)) {
    if (!m.isNewsletter) {
      try {
        await m.react("❗");
      } catch {}
    }
    return;
  }

  // === Anti-Spam Menu V2 (menu + fitur commands) ===
  try {
    const { checkMenuSpamV2 } = await import("../plugins/tools/antispammenu.js");
    const spamResult = checkMenuSpamV2(m);
    if (spamResult.blocked) {
      const label = spamResult.scopeType === "menu" ? "menu" : "command fitur";
      const msg = spamResult.reason === "limit"
        ? "Jangan spam " + label + "! Tunggu " + spamResult.remainSec + " detik lagi"
        : "Tunggu " + spamResult.remainSec + " detik sebelum pakai " + label + " lagi";
      if (!m.isNewsletter) { try { await m.react("❗"); } catch {} }
      await m.reply("「 ✦ Anti-Spam ✦ 」\n⚠ " + msg + "");
      return;
    }
  } catch (e) {
    if (config.dev?.debugLog) logger.error("antispammenu", e.message);
  }

  // Check if command is enabled
  if (plugin.config.isEnabled === false) {
    if (!m.isNewsletter) {
      try {
        if (!m.isNewsletter) { try { await m.react("❗"); } catch {} }
        await m.reply("「 ✦ Nonaktif ✦ 」\n⚠ Command ini sedang dinonaktifkan");
      } catch {}
    }
    return;
  }

  // === TOGGLE FITUR CHECK (owner-controlled on/off) ===
  // ESCAPE HATCH: .switch (dan alias togglefitur/onofffitur/enable/disable)
  // WAJIB selalu bisa dipanggil owner, apapun status disabled-nya. Bug lama:
  // kategori command switch = "owner" — kalau kategori "owner" ke-disable,
  // .switch ikut ke-block SEBELUM sampai handler-nya sendiri → owner gak
  // bisa lagi nyalain apa-apa (self-lockout total, gak ada jalan keluar
  // selain edit database manual). Report owner: ".switch fitur owner on"
  // malah kena "Fitur ini sedang dinonaktifkan oleh owner" padahal dia
  // sendiri ownernya.
  const SWITCH_ESCAPE_HATCH = ["switch", "enable", "disable", "togglefitur", "onofffitur", "onoff"];
  try {
    const dbInstance = getDatabase();
    const cmdName = plugin.config.name || command;
    const cmdCat = plugin.config.category || "";
    const disabledCmds = dbInstance.setting("disabledCommands") || [];
    const disabledCats = dbInstance.setting("disabledCategories") || [];
    const isEscapeHatch = SWITCH_ESCAPE_HATCH.includes(cmdName) || SWITCH_ESCAPE_HATCH.includes(command);
    if (!isEscapeHatch && (disabledCmds.includes(cmdName) || (cmdCat && disabledCats.includes(cmdCat)))) {
      if (!m.isNewsletter) {
        try {
          if (!m.isNewsletter) { try { await m.react("❗"); } catch {} }
          await m.reply("「 ✦ Nonaktif ✦ 」\n⚠ Fitur ini sedang dinonaktifkan oleh owner\nKetik .togglefitur untuk melihat status");
        } catch {}
      }
      return;
    }
  } catch {}

  // === ENERGI / LIMIT CHECK & DEDUCTION ===
  // (owner: dua mata uang BEDA — energi itu khusus game, limit itu akses fitur)
  const energiCost = plugin.config.energi || 0;
  // Game (rpg/game/rpg couple) → potong ENERGI GAME (rpg.energy/maxEnergy)
  // Fitur lain (ai/download/dll) → potong LIMIT AKSES FITUR (user.energi)
  const gameCtx = ["rpg", "game", "rpg couple"].includes(String(plugin.config.category || ""));
  let energiDeducted = 0;
  let sisaEnergi = 0;
  let isUnlimited = false;
  let isWeekendDouble = false;
  let gameEnergiUsed = false;

  // Weekend double limit (Sabtu-Minggu)
  if (config.energi?.weekendDouble !== false && energiCost > 0) {
    const hariIni = new Date().toLocaleDateString("en-US", { timeZone: "Asia/Jakarta", weekday: "short" });
    if (hariIni === "Sat" || hariIni === "Sun") {
      isWeekendDouble = true;
    }
  }

  if (config.energi?.enabled && energiCost > 0 && !m.isOwner) {
    try {
      const db = getDatabase();

      // ═══ ENERGI GAME (rpg.energy/maxEnergy) — khusus kategori rpg/game ═══
      if (gameCtx) {
        const rpg = ensureRpg(m);
        const energiGame = rpg?.energy ?? 0;
        const maxEnergy = rpg?.maxEnergy ?? 100;
        if (energiGame < energiCost) {
          if (!m.isNewsletter) {
            try { await m.react("❗"); } catch {}
            try {
              await m.reply(
                "「 ✦ energi game kurang ✦ 」\n⚠ Butuh *" + energiCost + "* energi game\n⚡ Energi: *" + energiGame + "/" + maxEnergy + "*\n💡 Isi ulang via *.heal* (energy drink)"
              );
            } catch {}
          }
          return;
        }
        rpg.energy -= energiCost;
        rpg.lastActive = Date.now();
        saveRpg(m, rpg);
        gameEnergiUsed = true;
        energiDeducted = energiCost;
        sisaEnergi = rpg.energy;
        m.energiInfo = { game: true, deducted: energiCost, sisa: rpg.energy, max: maxEnergy, unlimited: false };
      } else {
        // ═══ LIMIT AKSES FITUR (user.energi, refill harian) ═══
        const user = db.getUser(m.sender);
        let currentEnergi = user?.energi ?? config.energi?.default ?? 25;

      // Weekend: gratis user dapat double limit (bonus di awal hari)
      // Cek apakah sudah dikasih bonus weekend
      if (isWeekendDouble && !user?.isPremium && currentEnergi !== -1) {
        const lastWeekendBonus = db.setting?.("weekendBonus_" + m.sender);
        const today = new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" });
        if (lastWeekendBonus !== today) {
          const baseLimit = config.energi?.default ?? 300;
          const bonusLimit = baseLimit; // double = base + base
          currentEnergi = Math.min(currentEnergi + bonusLimit, baseLimit * 2);
          db.updateEnergi(m.sender, bonusLimit); // tambah energi
          db.setting("weekendBonus_" + m.sender, today);
          db.save();
        }
      }

      if (currentEnergi === -1) {
        isUnlimited = true;
      } else if (currentEnergi < energiCost) {
        // Energi tidak cukup
        if (!m.isNewsletter) {
          try {
            if (!m.isNewsletter) { try { await m.react("❗"); } catch {} }
          await m.reply(
              (config.messages?.energiExceeded ||
               "「 ✦ Energi Habis ✦ 」\n⚠ Energi kamu sudah habis!\nTunggu reset besok atau beli Premium")
            );
          } catch {}
        }
        return;
      } else {
        // Potong energi
        const result = db.updateEnergi(m.sender, -energiCost);
        if (result === -1) {
          isUnlimited = true;
        } else {
          energiDeducted = energiCost;
          sisaEnergi = result;
          db.save();
        }
      }
      } // end cabang limit akses fitur
    } catch (e) {
      if (config.dev?.debugLog) logger.error("energi", e.message);
    }
  }

  // Teruskan info energi ke plugin (dipakai buat info section di caption hasil game)
  // Catatan: cabang energi game sudah set m.energiInfo sendiri (format game) — jangan ditimpa
  if (!gameEnergiUsed) m.energiInfo = {
    deducted: energiDeducted,
    sisa: sisaEnergi,
    unlimited: isUnlimited,
  };

  // Run the plugin handler
  try {
    // Auto typing/read - check DB setting first, fallback to config
    // FIX 3 Okt 2026: dulu `sock.db || m.db` -> TIDAK PERNAH diisi di produksi (undefined), jadi procNotif/autoRead/
    // autoTyping selalu jatuh ke default & `.procnotif off` tak pernah berpengaruh. Pakai getDatabase() seperti bagian lain.
    const dbInstance = sock.db || m.db || getDatabase();
    const autoTypingOn = dbInstance?.setting?.("autoTyping") ?? config.features?.autoTyping ?? false;
    const autoReadOn = dbInstance?.setting?.("autoRead") ?? config.features?.autoRead ?? false;
    
    if (autoTypingOn) {
      await sock.sendPresenceUpdate("composing", m.chat);
    }
    if (autoReadOn) {
      await sock.readMessages([msg.key]);
    }

    // === PROCESSING NOTIFICATION (all commands) ===
    const procNotifOn = dbInstance?.setting?.("procNotif") ?? true;
    if (procNotifOn && !m.isNewsletter) {
      try { await m.react("🕒"); } catch {}
    }

    // Statistik realtime: command valid diproses (+1, semua user termasuk owner)
    try { db.incrementStat("commandsRun"); } catch {}
    // AI SATUAN RICH (owner 21 Sep 2026: "smua ai satuan support vision dan
    // browsing") — reply foto → deskripsi gambar di-inject ke prompt satuan;
    // flag --search/kata kunci terkini → hasil browsing di-inject. Satu
    // pintu, 200-an plugin satuan gak perlu diedit; gagal senyap.
    if (plugin.config?.category === "ai") {
      try { await enrichAiSatuan(m, plugin, { sock }); } catch {}
    }

    // Multi-language (fix 18 Sep 2026): sock dibungkus translate-aware supaya
    // jalur sock.sendMessage LANGSUNG (menu tombol, caption media, hasil
    // fitur yang gak lewat m.reply) ikut ke-translate ke bahasa user.
    // REVERT 4 Okt 2026: kartu field media dimatikan total (owner minta kembali ke versi pra-field;
    // pemasangan ulang utk fitur non-menu menyusul setelah bot dipastikan sehat). Tanpa pembungkus media.
    const dispatchSock = makeLangAwareSock(sock, m.sender);
    try {
      await plugin.handler(m, { sock: dispatchSock, conn: dispatchSock, config, db: getDatabase(), args: m.args || [], text: m.text || '', uptime: process.uptime() * 1000, isJadibot: !!jadibotCtx.isJadibot, jadibotId: jadibotCtx.jadibotId || null });
    } finally { /* tidak ada pembungkus kartu pusat */ }
    recordPluginExecution(command, true, null);

    // 🎯 PROGRES LEVEL AKTIVITAS (13 Sep 2026, request owner: "setiap user
    // ada aktivitas ketik cmd / bermain game, level naik dikasih pesan
    // selamat + penghargaan"): tiap command sukses = +EXP level global
    // (biasa +15 / game-rpg +40); nyebrang batas level → kartu SELAMAT +
    // penghargaan koin otomatis. Fire-and-forget biar gak ngeremat.
    try { grantActivityExp(sock, m, { category: plugin.category }).catch(() => {}); } catch {}

    try { await postExecutionCheck(command, sock); } catch {}
    // Reset smart antispam — user berhasil pakai command valid
    try { resetNotFoundTracker(m.sender); } catch {}

    // React 🐣 after processing completes (skip if plugin set custom reaction)
    if (procNotifOn && !m.isNewsletter && !m.__customReact) {
      try { await m.react("🐣"); } catch {}
    }

    if (autoTypingOn) {
      await sock.sendPresenceUpdate("paused", m.chat);
    }

    // === ENERGI NOTIF SETELAH EKSEKUSI (simple, plain text, tanpa quote) ===
    // Notif LIMIT hanya buat fitur — game (energi game) udah ada baris ⚡ Energi di caption hasil
    if (energiCost > 0 && !m.isNewsletter && !m.isOwner && !gameEnergiUsed) {
      try {
        const usedAmount = isUnlimited ? energiCost : energiDeducted;
        let notifText = "「 ✦ Limit ✦ 」\n" + usedAmount + " limit terpakai";
        if (!isUnlimited) {
          notifText += "\nSisa limit: " + sisaEnergi;
        }
        notifText += "";
        await sock.sendMessage(m.chat, { text: notifText });

        // === WARNING LIMIT RENDAH (tetap dikirim jika sisa limit menipis) ===
        if (!isUnlimited && energiDeducted > 0) {
          const warnThresholds = [50, 30, 10];
          for (const threshold of warnThresholds) {
            if (sisaEnergi <= threshold && sisaEnergi > 0) {
              try {
                await sock.sendMessage(
                  m.chat,
                  { text: "「 ✦ Limit Menipis ✦ 」\nSisa limit kamu tinggal " + sisaEnergi + "\nKetik .buyenergi <jumlah> untuk beli\natau upgrade Premium" }
                );
              } catch {}
              break;
            }
          }
        }
      } catch {}
    }
  } catch (error) {
    logger.error("plugin", `${command}: ${error.message}`);
    recordPluginExecution(command, false, error.message);
    if (config.dev?.debugLog) console.error(c.gray(error.stack));
    if (!m.isNewsletter) { try { await m.react("❌"); } catch {} }
    try {
      await m.reply("「 ✦ Error ✦ 」\n❌ " + error.message + "");
    } catch {}
  }
}


/**
 * Handle message updates (status changes, deletions)
 */
async function messageUpdateHandler(updates, sock) {
  if (!updates || !Array.isArray(updates)) return;
  const db = getDatabase();
  
  // Skip anti-delete in self mode
  const __muBotMode = db.setting("botMode") || config.mode || "public";
  if (__muBotMode === "self") return;

  for (const update of updates) {
    try {
      // Handle anti-delete: if a message was recalled/deleted, restore it
      const key = update.key;
      if (!key) continue;

      // Check for message deletion (protocolMessage type 0 = revoke)
      if (update.message?.protocolMessage?.type === 0) {
        // Message was deleted by sender
        const antiDelete = db.setting("antiDelete");
        if (antiDelete) {
          try {
            const { handleAntiRemove } = await import("./lib/rara-group-protection.js");
            if (handleAntiRemove) {
              await handleAntiRemove(update, sock, db);
            }
          } catch {}
        }
      }
    } catch (error) {
      if (config.dev?.debugLog) {
        logger.error("msg-update", error.message);
      }
    }
  }
}

/**
 * Handle group settings updates (announcement, locked, name change, etc.)
 */
async function groupSettingsHandler(update, sock) {
  if (!update || !update.id) return;
  const db = getDatabase();
  
  // Skip in self mode
  const __gsBotMode = db.setting("botMode") || config.mode || "public";
  if (__gsBotMode === "self") return;

  try {
    // Check for announcement mode change
    if (update.announce !== undefined) {
      const announceNotify = db.setting("announceNotify");
      if (announceNotify && announceNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: update.announce
            ? "「 ✦ Announcement Only ✦ 」\nGrup telah diubah menjadi Announcement Only\nHanya admin yang bisa kirim pesan"
            : "「 ✦ All Members ✦ 」\nGrup telah diubah menjadi All Members Can Send\nSemua member bisa kirim pesan",
        });
      }
    }

    // Check for group lock change
    if (update.locked !== undefined) {
      const lockNotify = db.setting("lockNotify");
      if (lockNotify && lockNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: update.locked
            ? "「 ✦ Grup Dikunci ✦ 」\nSettingan grup telah dikunci oleh admin"
            : "「 ✦ Grup Dibuka ✦ 」\nSettingan grup telah dibuka oleh admin",
        });
      }
    }

    // Check for group name change
    if (update.subject) {
      const nameNotify = db.setting("nameNotify");
      if (nameNotify && nameNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: "「 ✦ Nama Grup ✦ 」\nNama grup diubah menjadi: *" + update.subject + "*",
        });
      }
    }
  } catch (error) {
    if (config.dev?.debugLog) {
      logger.error("group-settings", error.message);
    }
  }
}

export {
  messageHandler,
  groupHandler,
  messageUpdateHandler,
  groupSettingsHandler,
  handleAntiRemoveFromUpsert,
};
