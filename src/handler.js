// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from "fs";
import path from "path";
import { serialize } from "./lib/nova-serialize.js";
import { getPlugin, pluginStore } from "./lib/nova-plugins.js";
import { getDatabase } from "./lib/nova-database.js";
import { checkPermission, checkMode } from "./lib/nova-middleware.js";
import { handleAntiRemoveFromUpsert as _handleAntiRemove } from "./lib/nova-group-protection.js";
import config from "../config.js";
import { c, logger, logMessage } from "./lib/nova-logger.js";

// Re-export handleAntiRemoveFromUpsert from group-protection
async function handleAntiRemoveFromUpsert(msg, sock, db) {
  return _handleAntiRemove(msg, sock, db);
}


// Simple inline wrapper for anti-spam DM messages
function simpleWrap(title, lines) {
  const body = lines.join("\n");
  return "❀°˖✧◝(⁰▿⁰)◜✧˖°❀ " + title + "\n" +
    body + "\n" +
    "❀⋆｡˚ Nova AI WhatsApp Bot ˚｡⋆❀";
}

// Track cooldowns per user per command
const cooldownMap = new Map();

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
    const { getActiveJadibots: _gab } = require("./lib/nova-jadibot-manager.js");
    return _gab();
  } catch {
    return [];
  }
}

/**
 * Main message handler — serializes raw WA message, runs plugins/commands
 */
async function messageHandler(msg, sock) {
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
  if (m.isGroup && !m.fromMe) {
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
      const { handleAntiVirtex } = await import("../plugins/group/antivirtex.js");
      await handleAntiVirtex(m, sock, db);
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antivirtex", e.message);
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
        if (!global.novaDmSpamTrack) global.novaDmSpamTrack = {};
        const tracker = global.novaDmSpamTrack;

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
              text: simpleWrap("Anti-Spam DM", [
                `Kamu terlalu banyak mengirim pesan!`,
                `Warning habis (${dmSettings.maxWarn}x)`,
                "",
                `Kamu di-mute selama ${dmSettings.muteMin} menit.`,
                `Bot tidak akan merespon pesanmu sampai mute selesai.`,
              ]),
            });
            return;
          } else {
            // Warn the user
            tracker[sender].messages = []; // Reset window
            const remaining = dmSettings.maxWarn - tracker[sender].warnCount;

            await sock.sendMessage(m.chat, {
              text: simpleWrap("Anti-Spam DM", [
                `Jangan spam bot!`,
                `Warning ${tracker[sender].warnCount}/${dmSettings.maxWarn}`,
                "",
                `Sisa peringatan: ${remaining}x`,
                `Setelah itu kamu akan di-mute ${dmSettings.muteMin} menit.`,
              ]),
            });
            return;
          }
        }
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("antispamdm", e.message);
    }
  }

  // AI Grup: catat aktivitas grup + bot nimbrung otomatis
  if (!m.isCommand && !m.fromMe && !m.isNewsletter && m.isGroup) {
    try {
      // Catat aktivitas grup untuk proactive messaging
      const { recordGroupActivity } = await import("./lib/nova-aigrup-proactive.js");
      if (typeof recordGroupActivity === "function") recordGroupActivity(m.chat);

      // Cek AI Grup nimbrung
      const { handleAiGrup, isAiGrupEnabled } = await import("./lib/nova-aigrup.js");
      if (typeof isAiGrupEnabled === "function" && isAiGrupEnabled()) {
        const handled = await handleAiGrup(m, sock);
        if (handled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("aigrup", e.message);
    }
  }

  // Registration session handler (interactive reply-based daftar)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
    try {
      const { registrationAnswerHandler } = await import("./../plugins/user/daftar.js");
      if (typeof registrationAnswerHandler === "function") {
        const regHandled = await registrationAnswerHandler(m, sock);
        if (regHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("registration", e.message);
    }

    // VN Captcha Interrogation: jika user lagi dalam sesi ujian suara, verify VN
  if (!m.isCommand && !m.fromMe) {
    try {
      const { verifyVnCaptcha, hasVnCaptchaChallenge, isVnCaptchaBlocked } = await import("../plugins/owner/vncaptcha.js");
      const senderJid = m.key?.remoteJid || m.sender;
      if (typeof isVnCaptchaBlocked === "function" && isVnCaptchaBlocked(senderJid)) {
        await sock.sendMessage(senderJid, { text: "Nomor diblokir 24 jam karena gagal verifikasi suara. Coba lagi besok." });
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

  // Captcha session handler (daftarotomatis captcha verification)
    try {
      const { captchaAnswerHandler } = await import("./../plugins/user/daftarotomatis.js");
      if (typeof captchaAnswerHandler === "function") {
        const captchaHandled = await captchaAnswerHandler(m, sock);
        if (captchaHandled) return;
      }
    } catch (e) {
      if (config.dev?.debugLog) logger.error("captcha", e.message);
    }
  }

  // Auto React VN: jalan walau fromMe (owner testing di self-chat), asal bukan command/newsletter
  if (!m.isCommand && !m.isNewsletter) {
    try {
      const { handleAutoreactvn, isAutoreactvnEnabled } = await import("./lib/nova-autoreactvn.js");
      if (typeof isAutoreactvnEnabled === "function" && isAutoreactvnEnabled(m, sock)) {
        const vnHandled = await handleAutoreactvn(m, sock);
        if (vnHandled) return;
      }
    } catch (e) {
      console.error("[AutoReactVN] Handler error:", e.message);
    }
  }

  // Auto VN Translate: real-time voice note detection & translate
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // Auto OCR Solve: real-time image detection for math/code
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // Auto Meme Gen: real-time image detection for instant meme
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // AI Auto VN Interaction: real-time VN detection, AI balas pakai suara neural (Gemini Live style)
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // Ambient Context Mimicry: bot dengar lingkungan dari VN, deteksi emosi, respon empatik
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // Mood-Driven Theme: passive typing pattern tracking
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
    try {
      const { trackMoodTheme, isMoodThemeEnabled } = await import("../plugins/owner/moodtheme.js");
      if (typeof isMoodThemeEnabled === "function" && isMoodThemeEnabled(m)) {
        trackMoodTheme(m, sock);
      }
    } catch (e) {
      console.error("[MoodTheme] Track error:", e.message);
    }
  }

  // Predictive Life-Nudge: passive pattern tracking + proactive nudge
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
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

  // Auto-AI: if not a command, check if auto-AI should respond
  if (!m.isCommand && !m.fromMe && !m.isNewsletter) {
    try {
      const { handleAutoAI, isAutoAIEnabled } = await import("./lib/nova-auto-ai.js");
      if (typeof isAutoAIEnabled === "function" && isAutoAIEnabled(m, sock)) {
        await handleAutoAI(m, sock);
      }
    } catch {}

    return;
  }

  // From here, only process commands
  if (!m.isCommand) return;

  // Try case handler first (case/nova.js)
  try {
    const { handleCommand: handleCase } = await import("../case/nova.js");
    const caseResult = await handleCase(m, sock);
    if (caseResult?.handled) return;
  } catch (error) {
    if (config.dev?.debugLog) logger.error("case", error.message);
  }

  // Find matching plugin
  const command = m.command?.toLowerCase();
  if (!command) return;

  const plugin = getPlugin(command);
  if (!plugin) {
    // Command not found — check if suggestion feature is on
    if (config.features?.commandSuggestion !== false) {
      const { getAllCommandNames } = await import("./lib/nova-plugins.js");
      const allCommands = getAllCommandNames();
      const { levenshtein } = await import("./lib/nova-middleware.js");
      let closest = null;
      let minDist = Infinity;
      for (const cmd of allCommands) {
        const dist = levenshtein(command, cmd);
        if (dist < minDist && dist <= 3) {
          minDist = dist;
          closest = cmd;
        }
      }
      if (!m.isNewsletter) {
        try {
          let notFoundText = `❓ Command *${m.prefix}${command}* tidak ditemukan\n\n`;
          if (closest) {
            notFoundText += `Mungkin maksudmu: *${m.prefix}${closest}* ?\n\n`;
          }
          notFoundText += `Ketik *${m.prefix}tanyaai <pertanyaan>* untuk tanya AI lebih lanjut`;
          await m.reply(notFoundText);
        } catch {}
      }
    }
    return;
  }

  // Check mode (self/public)
  try {
    const modeResult = checkMode(m, getActiveJadibots);
    if (!modeResult.allowed) {
      if (modeResult.isAfk && modeResult.afkMessage) {
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

  // Check permissions
  try {
    const permResult = checkPermission(m, plugin.config);
    if (!permResult.allowed) {
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
        await m.react("⏳");
      } catch {}
    }
    return;
  }

  // === Anti-Spam Menu V2 (menu + fitur commands) ===
  try {
    const { checkMenuSpamV2 } = await import("../plugins/tools/antispammenuv2.js");
    const spamResult = checkMenuSpamV2(m);
    if (spamResult.blocked) {
      const label = spamResult.scopeType === "menu" ? "menu" : "command fitur";
      const msg = spamResult.reason === "limit"
        ? "Jangan spam " + label + "! Tunggu " + spamResult.remainSec + " detik lagi"
        : "Tunggu " + spamResult.remainSec + " detik sebelum pakai " + label + " lagi";
      await m.reply("Anti-Spam: " + msg);
      return;
    }
  } catch (e) {
    if (config.dev?.debugLog) logger.error("antispammenuv2", e.message);
  }

  // Check if command is enabled
  if (plugin.config.isEnabled === false) {
    if (!m.isNewsletter) {
      try {
        await m.reply("⚠️ Command ini sedang dinonaktifkan");
      } catch {}
    }
    return;
  }

  // === ENERGI / LIMIT CHECK & DEDUCTION ===
  const energiCost = plugin.config.energi || 0;
  let energiDeducted = 0;
  let sisaEnergi = 0;
  let isUnlimited = false;
  let isWeekendDouble = false;

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
            await m.reply(
              (config.messages?.energiExceeded ||
               "⚡ *Energi Habis!* Energi kamu sudah habis. Tunggu reset besok atau beli Premium.")
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
    } catch (e) {
      if (config.dev?.debugLog) logger.error("energi", e.message);
    }
  }

  // Run the plugin handler
  try {
    // Auto typing/read - check DB setting first, fallback to config
    const dbInstance = sock.db || m.db;
    const autoTypingOn = dbInstance?.setting?.("autoTyping") ?? config.features?.autoTyping ?? false;
    const autoReadOn = dbInstance?.setting?.("autoRead") ?? config.features?.autoRead ?? false;
    
    if (autoTypingOn) {
      await sock.sendPresenceUpdate("composing", m.chat);
    }
    if (autoReadOn) {
      await sock.readMessages([msg.key]);
    }

    // === PROCESSING NOTIFICATION (media/tool only) ===
    let procMsgKey = null;
    const procNotifOn = dbInstance?.setting?.("procNotif") ?? true;
    const procCategories = ["ai", "canvas", "image", "maker", "sticker", "convert", "tools", "download", "downloader", "tts", "anime"];
    const cmdCategory = plugin.config?.category || "";
    const isProcCategory = procCategories.includes(cmdCategory);
    if (procNotifOn && !m.isNewsletter && isProcCategory) {
      try {
        const procMsg = await sock.sendMessage(m.chat, {
          text: "⏳ Tunggu sebentar ya kak, lagi diproses!",
        });
        if (procMsg?.key) procMsgKey = procMsg.key;
      } catch {}
    }

    await plugin.handler(m, { sock, conn: sock, config, db: getDatabase(), args: m.args || [], text: m.text || '', uptime: process.uptime() * 1000 });

    // Delete processing notification after handler completes
    if (procMsgKey) {
      try {
        await sock.sendMessage(m.chat, { delete: procMsgKey });
      } catch {}
    }

    if (autoTypingOn) {
      await sock.sendPresenceUpdate("paused", m.chat);
    }

    // === ENERGI NOTIF SETELAH EKSEKUSI ===
    if (energiCost > 0 && !m.isNewsletter && !m.isOwner) {
      try {
        let notifText;
        if (isUnlimited || energiDeducted === 0) {
          // Premium unlimited — tetap kasih notif
          notifText =
            `${energiCost} limit terpakai\n` +
            `sisa limit: ∞ (Premium)`;
        } else {
          notifText =
            `${energiDeducted} limit terpakai\n` +
            `sisa limit: ${sisaEnergi}`;
        }
        await m.reply(notifText);

        // === WARNING LIMIT RENDAH ===
        if (!isUnlimited && energiDeducted > 0) {
          const warnThresholds = [50, 30, 10];
          for (const threshold of warnThresholds) {
            if (sisaEnergi <= threshold && sisaEnergi > 0) {
              try {
                await m.reply(
                  `⚠️ *Limit Menipis!*

` +
                  `Sisa limit kamu: *${sisaEnergi}*
` +
                  `Gunakan dengan bijak atau beli Premium untuk limit lebih banyak.
` +
                  `Ketik \`.buyenergi <jumlah>\` untuk beli limit pake koin.`
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
    if (config.dev?.debugLog) console.error(c.gray(error.stack));
    try {
      await m.reply(`❌ *Error:* ${error.message}`);
    } catch {}
  }
}

/**
 * Handle group participant updates (join, leave, promote, demote)
 */
async function groupHandler(update, sock) {
  if (!update || !update.id) return;

  const db = getDatabase();
  const action = update.action;
  const participants = update.participants || [];

  // Skip if bot just connected (within 15s)
  // (connection.js already handles this)

  for (const participant of participants) {
    try {
      // Resolve LID to JID if needed
      let participantJid = participant;
      if (typeof participant === "object" && participant !== null) {
        participantJid = participant.phoneNumber || participant.id || participant;
      }

      if (action === "add" || action === "invite") {
        // Welcome message
        try {
          const { sendWelcomeMessage } = await import("../plugins/group/welcome.js");
          if (sendWelcomeMessage) {
            let metadata = null;
            try {
              metadata = await sock.groupMetadata(update.id);
            } catch {}
            await sendWelcomeMessage(sock, update.id, participantJid, metadata);
          }
        } catch {}

        // Auto-promote on join
        try {
          const autoPromote = db.setting("autoPromote");
          if (autoPromote && autoPromote.jid === update.id) {
            await sock.groupParticipantsUpdate(update.id, [participantJid], "promote");
          }
        } catch {}
      } else if (action === "remove" || action === "leave") {
        // Goodbye message
        try {
          const { sendGoodbyeMessage } = await import("../plugins/group/goodbye.js");
          if (sendGoodbyeMessage) {
            let metadata = null;
            try {
              metadata = await sock.groupMetadata(update.id);
            } catch {}
            await sendGoodbyeMessage(sock, update.id, participantJid, metadata);
          }
        } catch {}
      } else if (action === "promote") {
        // Log promote
        try {
          const promoteNotify = db.setting("promoteNotify");
          if (promoteNotify && promoteNotify.jid === update.id) {
            await sock.sendMessage(update.id, {
              text: `✅ @${participantJid.replace(/@.+/g, "")} telah di-promote menjadi admin`,
              mentions: [participantJid],
            });
          }
        } catch {}
      } else if (action === "demote") {
        // Log demote
        try {
          const demoteNotify = db.setting("demoteNotify");
          if (demoteNotify && demoteNotify.jid === update.id) {
            await sock.sendMessage(update.id, {
              text: `⚠️ @${participantJid.replace(/@.+/g, "")} telah di-demit dari admin`,
              mentions: [participantJid],
            });
          }
        } catch {}
      }
    } catch (error) {
      logger.error("group", `participant update error: ${error.message}`);
    }
  }
}

/**
 * Handle message updates (status changes, deletions)
 */
async function messageUpdateHandler(updates, sock) {
  if (!updates || !Array.isArray(updates)) return;
  const db = getDatabase();

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
            const { handleAntiRemove } = await import("./lib/nova-group-protection.js");
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

  try {
    // Check for announcement mode change
    if (update.announce !== undefined) {
      const announceNotify = db.setting("announceNotify");
      if (announceNotify && announceNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: update.announce
            ? "🔇 Grup telah diubah menjadi *Announcement Only* oleh admin"
            : "💬 Grup telah diubah menjadi *All Members Can Send* oleh admin",
        });
      }
    }

    // Check for group lock change
    if (update.locked !== undefined) {
      const lockNotify = db.setting("lockNotify");
      if (lockNotify && lockNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: update.locked
            ? "🔒 Settingan grup telah dikunci oleh admin"
            : "🔓 Settingan grup telah dibuka oleh admin",
        });
      }
    }

    // Check for group name change
    if (update.subject) {
      const nameNotify = db.setting("nameNotify");
      if (nameNotify && nameNotify.jid === update.id) {
        await sock.sendMessage(update.id, {
          text: `📝 Nama grup telah diubah menjadi *${update.subject}*`,
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
