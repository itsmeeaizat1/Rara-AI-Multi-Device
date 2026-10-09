// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// rara-group-events.js — event member grup (join/leave/promote/demote).
// DIEKSTRAK dari handler.js 9 Okt 2026 (arsitektur modular / single
// responsibility): handler.js fokus routing pesan, file ini fokus event grup.
// Eksport handleGroupEvents — handler.js re-export sebagai groupHandler
// (kompatibel: welcome-e2e & bridge import { groupHandler } dari handler.js).
import { getDatabase } from "./rara-database.js";
import config from "../../config.js";
import { logger } from "./rara-logger.js";

/**
 * Handle group participant updates (join, leave, promote, demote)
 */
export async function handleGroupEvents(update, sock) {
  if (!update || !update.id) return;

  const db = getDatabase();
  
  // Skip welcome/goodbye in self mode
  const __ghBotMode = db.setting("botMode") || config.mode || "public";
  if (__ghBotMode === "self") return;

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
          const welcomeModule = await import("../../plugins/group/welcome.js");
          const sendWelcomeMessage = welcomeModule.default?.sendWelcomeMessage || welcomeModule.sendWelcomeMessage;
          if (sendWelcomeMessage) {
            let metadata = null;
            try {
              metadata = await sock.groupMetadata(update.id);
            } catch {}
            await sendWelcomeMessage(sock, update.id, participantJid, metadata);

            // === Auto-Smart Welcome (AI Personalized) ===
            try {
              const smartWelcomeModule = await import("../../plugins/owner/autosmartwelcome.js");
              const sendSmartWelcome = smartWelcomeModule.sendSmartWelcome;
              if (sendSmartWelcome) {
                await sendSmartWelcome(sock, update.id, participantJid, metadata);
              }
            } catch (e) {
              if (config.dev?.debugLog) logger.error("smart-welcome", e.message);
            }

        // === Quiz Verification for new member ===
        try {
          const { handleNewMemberQuiz } = await import("./rara-quiz-verify.js");
          if (typeof handleNewMemberQuiz === "function") {
            await handleNewMemberQuiz(sock, update.id, [participantJid]);
          }
        } catch (e) {
          if (config.dev?.debugLog) logger.error("quizverify-join", e.message);
        }
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
          const goodbyeModule = await import("../../plugins/group/goodbye.js");
          const sendGoodbyeMessage = goodbyeModule.default?.sendGoodbyeMessage || goodbyeModule.sendGoodbyeMessage;
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
              text: "「 ✦ Promote ✦ 」\n@" + participantJid.replace(/@.+/g, "") + " telah di-promote menjadi admin",
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
              text: "「 ✦ Demote ✦ 」\n@" + participantJid.replace(/@.+/g, "") + " telah di-demit dari admin",
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
