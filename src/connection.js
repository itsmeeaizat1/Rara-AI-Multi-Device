// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "nova";
import { Boom } from "@hapi/boom";
import pino from "pino";
import fs from "fs";
import path from "path";
import readline from "readline";
import NodeCache from "node-cache";
import config, { isOwner as isOwners, setBotNumber } from "../config.js";
import * as colors from "./lib/nova-logger.js";
import { extendSocket } from "./lib/nova-socket.js";
import {
  isLid,
  lidToJid,
  decodeAndNormalize,
  cacheLidJid,
  isLidConverted,
} from "./lib/nova-lid.js";
import { initAutoBackup } from "./lib/nova-auto-backup.js";
import { getAuthKey, verifyAuth, getOwnerContact } from "./lib/auth/auth.js";
import { trackMessage as pulseTrack } from "../plugins/future/autopulse.js";
const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const processedMessages = new NodeCache({ stdTTL: 30, useClones: false });
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, useClones: false });

let lastMessageReceived = Date.now();
let watchdogTimer = null;
const WATCHDOG_TIMEOUT = 30 * 60 * 1000;
const WATCHDOG_CHECK_INTERVAL = 60 * 1000;

function startWatchdog(reconnectFn, options) {
  if (watchdogTimer) clearInterval(watchdogTimer);
  lastMessageReceived = Date.now();

  watchdogTimer = setInterval(() => {
    const silentMs = Date.now() - lastMessageReceived;
    if (silentMs > WATCHDOG_TIMEOUT && connectionState.isReady) {
      colors.logger.warn(
        "watchdog",
        `Pesan tidak terdeteksi, maka sistem akan me restart, supaya fresh`,
      );
      connectionState.isReady = false;
      connectionState.isConnected = false;
      try {
        connectionState.sock?.end();
      } catch {}
    }
  }, WATCHDOG_CHECK_INTERVAL);

  if (watchdogTimer.unref) watchdogTimer.unref();
  colors.logger.success(
    "watchdog",
    `aktif, batas waktu ${WATCHDOG_TIMEOUT / 60000} menit`,
  );
}

function stopWatchdog() {
  if (watchdogTimer) {
    clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

const store = {
  messages: new Map(),
  chats: new Map(),
  contacts: {},
  bind(ev) {
    ev.on("messages.upsert", ({ messages: msgs }) => {
      for (const msg of msgs) {
        const jid = msg.key?.remoteJid;
        if (!jid) continue;
        if (!this.messages.has(jid)) this.messages.set(jid, new Map());
        const chat = this.messages.get(jid);
        if (msg.key?.id) {
          chat.set(msg.key.id, msg);
          if (chat.size > 200) {
            const keys = [...chat.keys()];
            for (let i = 0; i < keys.length - 150; i++) chat.delete(keys[i]);
          }
        }
        if (msg.key?.participantAlt && msg.key?.participant) {
          const alt = decodeAndNormalize(msg.key.participantAlt);
          const primary = decodeAndNormalize(msg.key.participant);
          if (alt && primary && !isLid(alt) && !isLidConverted(alt)) {
            cacheLidJid(primary, alt);
          }
        }
        if (msg.key?.remoteJidAlt && msg.key?.remoteJid) {
          const alt = decodeAndNormalize(msg.key.remoteJidAlt);
          const primary = decodeAndNormalize(msg.key.remoteJid);
          if (alt && primary && !isLid(alt) && !isLidConverted(alt)) {
            cacheLidJid(primary, alt);
          }
        }
        if (!this.chats.has(jid)) {
          this.chats.set(jid, { id: jid });
        }
        if (msg.pushName && jid.endsWith("@s.whatsapp.net")) {
          this.contacts[jid] = { ...this.contacts[jid], notify: msg.pushName };
        }
      }
    });
    ev.on("chats.upsert", (chats) => {
      for (const chat of chats) {
        if (chat.id) this.chats.set(chat.id, chat);
      }
    });
    ev.on("contacts.upsert", (contacts) => {
      for (const contact of contacts) {
        if (contact.id)
          this.contacts[contact.id] = {
            ...this.contacts[contact.id],
            ...contact,
          };
      }
    });
  },
  async loadMessage(jid, id) {
    return this.messages.get(jid)?.get(id) || undefined;
  },
};

/**
 * @typedef {Object} ConnectionState
 * @property {boolean} isConnected - Status koneksi
 * @property {Object|null} sock - Socket instance
 * @property {number} reconnectAttempts - Jumlah percobaan reconnect
 * @property {Date|null} connectedAt - Waktu koneksi berhasil
 */

/**
 * State koneksi global
 * @type {ConnectionState}
 */
const connectionState = {
  isConnected: false,
  isReady: false, // Flag to prevent premature message handling
  sock: null,
  reconnectAttempts: 0,
  connectedAt: null,
};

/**
 * Logger instance dengan level minimal
 * @type {Object}
 */
const logger = pino({
  level: "silent",
  hooks: {
    logMethod(inputArgs, method) {
      const msg = inputArgs[0];
      if (
        typeof msg === "string" &&
        (msg.includes("Closing") ||
          msg.includes("session") ||
          msg.includes("SessionEntry") ||
          msg.includes("prekey"))
      ) {
        return;
      }
      return method.apply(this, inputArgs);
    },
  },
});

/**
 * Interface untuk input terminal
 * @type {readline.Interface|null}
 */
let rl = null;

/**
 * Membuat readline interface
 * @returns {readline.Interface}
 */
function createReadlineInterface() {
  if (rl) {
    rl.close();
  }
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return rl;
}

/**
 * Prompt untuk input
 * @param {string} question - Pertanyaan
 * @returns {Promise<string>} Input dari user
 */
function askQuestion(question, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const rlIntf = createReadlineInterface();
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        rlIntf.close();
        resolve("");
      }
    }, timeoutMs);
    rlIntf.question(question, (answer) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        rlIntf.close();
        resolve(answer.trim());
      }
    });
  });
}

/**
 * Memulai koneksi WhatsApp
 * @param {Object} options - Opsi koneksi
 * @param {Function} [options.onMessage] - Callback untuk pesan baru
 * @param {Function} [options.onConnectionUpdate] - Callback untuk update koneksi
 * @param {Function} [options.onGroupUpdate] - Callback untuk update group
 * @returns {Promise<Object>} Socket connection
 * @example
 * const sock = await startConnection({
 *   onMessage: async (m) => {
 *     console.log('New message:', m.body);
 *   }
 * });
 */
async function startConnection(options = {}) {
  if (connectionState.sock) {
    try {
      connectionState.sock.end();
      colors.logger.debug("whatsapp", "koneksi sebelumnya ditutup");
    } catch (e) {}
    connectionState.sock = null;
  }

  const sessionPath = path.join(
    process.cwd(),
    "storage",
    config.session?.folderName || "session",
  );

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const { version, isLatest } = await fetchLatestBaileysVersion();

  const usePairingCode = config.session?.usePairingCode === true;
  const pairingNumber = config.session?.pairingNumber || "";

  const sock = makeWASocket({
    version,
    logger,
    autoFollowNewsletterOnConnect: false, // disable hidden auto-follow to OURIN channel baked into ourin-baileys fork
    printQRInTerminal:
      !usePairingCode && (config.session?.printQRInTerminal ?? true),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["Ubuntu", "Chrome", "20.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    shouldIgnoreJid: (jid) => (jid ? jid.includes("meta_ai") : false),
    getMessage: async (key) => {
      if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
      }
      return undefined;
    },
    cachedGroupMetadata: async (jid) => {
      const cached = groupCache.get(jid);
      if (cached) return cached;
      try {
        const fresh = await sock.groupMetadata(jid);
        groupCache.set(jid, fresh);
        return fresh;
      } catch {
        return undefined;
      }
    },
    msgRetryCounterCache,
  });

  store.bind(sock.ev);
  sock.store = store;

  connectionState.sock = sock;
  extendSocket(sock);

  // === PAIRING PASSWORD PROTECTION ===
  const _sysAuthKey = getAuthKey();
  if (_sysAuthKey && !sock.authState.creds.registered) {
    console.log("");
    colors.logger.info("pairing", "Sandi diperlukan untuk pairing. Masukkan sandi untuk lanjut.");
    console.log("");

    let attempts = 0;
    const maxAttempts = 3;
    let authorized = false;

    while (attempts < maxAttempts) {
      const input = await askQuestion(
        colors.chalk.cyan("🔒 Masukkan sandi pairing: ")
      );

      if (verifyAuth(input)) {
        authorized = true;
        console.log("");
        colors.logger.success("pairing", "Sandi benar, melanjutkan pairing...");
        console.log(getOwnerContact());
        console.log("");
        break;
      }

      attempts++;
      const remaining = maxAttempts - attempts;
      if (remaining > 0) {
        colors.logger.error("pairing", `Sandi salah! Sisa percobaan: ${remaining}`);
      } else {
        colors.logger.error("pairing", "Sandi salah 3x! Akses diblokir.");
      }
    }

    if (!authorized) {
      colors.logger.error("pairing", "Sandi salah 3x! Pairing dibatalkan.");
      console.log("");
      console.log(getOwnerContact());
      console.log("");
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return null;
    }
  }
  // === END PAIRING PASSWORD PROTECTION ===

  if (usePairingCode && !sock.authState.creds.registered) {

    let phoneNumber = pairingNumber;

    // Cek apakah nomor masih placeholder (mengandung x atau kurang dari 8 digit setelah strip)
    const cleanedCheck = phoneNumber.replace(/[^0-9]/g, "");
    const isPlaceholder = !phoneNumber
      || phoneNumber === ""
      || phoneNumber.toLowerCase().includes("x")
      || cleanedCheck.length < 8;

    if (isPlaceholder) {
      console.log("");
      colors.logger.warn("pairing", "nomor pairing belum diatur (config)");
      console.log("");

      phoneNumber = await askQuestion(
        colors.chalk.cyan(
          "📱 Masukkan nomor WhatsApp (contoh: 6281234567890): ",
        )
      );

      if (!phoneNumber) {
        colors.logger.error("pairing", "Nomor tidak diinput. Pairing dibatalkan.");
        return null;
      }
    }

    phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

    // Validasi nomor setelah input
    if (!phoneNumber || phoneNumber.length < 8) {
      colors.logger.error("pairing", "nomor tidak valid, minimal 8 digit. pairing dibatalkan.");
      return null;
    }

    colors.logger.info("pairing", `meminta kode untuk ${phoneNumber}`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const code = await sock.requestPairingCode(phoneNumber, "NOVAAI01");
      console.log("");
      console.log(
        colors.createBanner(
          [
            "",
            "   PAIRING CODE   ",
            "",
            `   ${colors.chalk.bold(colors.chalk.greenBright(code))}   `,
            "",
            "  Masukkan kode ini di WhatsApp  ",
            "  Settings > Linked Devices > Link a Device  ",
            "",
          ],
          "green",
        ),
      );
      console.log("");
    } catch (error) {
      const msg = error?.message || String(error);
      if (msg.includes("8 chars")) {
        colors.logger.error("pairing", "Custom pairing code harus 8 karakter. Periksa konfigurasi.");
      } else if (msg.includes("rate") || msg.includes("428")) {
        colors.logger.error("pairing", "Rate limited. Tunggu 5-10 menit sebelum coba lagi.");
      } else if (msg.includes("banned") || msg.includes("blocked")) {
        colors.logger.error("pairing", "Nomor diblokir WhatsApp. Gunakan nomor lain.");
      } else {
        colors.logger.error("pairing", `gagal: ${msg}`);
      }
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection: c, lastDisconnect: d, qr: q } = u;

    if (q && !usePairingCode) {
      colors.logger.info("qr", "Kode QR siap, silakan scan");
      const { default: qrcode } = await import("qrcode");
      qrcode.toString(q, { type: "terminal", small: true }, (err, qrText) => {
        if (!err) console.log(qrText);
      });
    }

    const S = {
      C: "close",
      O: "open",
      N: "@newsletter",
    };

    if (c === S.C) {
      connectionState.isConnected = false;
      connectionState.isReady = false;
      stopWatchdog();

      const r =
        d?.error instanceof Boom
          ? d.error.output?.statusCode !== DisconnectReason.loggedOut
          : true;

      const sc = d?.error?.output?.statusCode;

      const STATUS_MESSAGES = {
        400: "⚠️ Bad Request — Pesan/request tidak valid, coba restart",
        401: "🔐 Unauthorized — Session expired, perlu login ulang",
        403: "🚫 Forbidden — Akses ditolak oleh WhatsApp, cek nomor",
        404: "❓ Not Found — Resource tidak ditemukan",
        405: "🚧 Method Not Allowed — Operasi tidak diizinkan",
        408: "⏱️ Timeout — Koneksi timeout, cek internet",
        410: "📛 Gone — Session dihapus dari server, restart",
        428: "🔄 Connection Required — Perlu reconnect",
        440: "⚡ Session Conflict — Login di perangkat lain",
        500: "💥 Internal Server Error — Server WhatsApp error",
        501: "📦 Not Implemented — Fitur belum didukung server",
        502: "🌐 Bad Gateway — Server WhatsApp tidak merespons",
        503: "🔧 Service Unavailable — WhatsApp sedang maintenance",
        504: "🕐 Gateway Timeout — Server WhatsApp terlalu lama merespons",
        515: "🔁 Restart Required — WhatsApp minta restart koneksi",
      };

      const statusMsg = STATUS_MESSAGES[sc] || `❔ Unknown (kode: ${sc})`;
      colors.logger.warn("whatsapp", `terputus — ${statusMsg}`);
      if (sc === DisconnectReason.loggedOut || sc === 401) {
        colors.logger.error(
          "whatsapp",
          "sesi habis — hapus folder storage lalu restart",
        );
        connectionState.reconnectAttempts = 0;
        return;
      }

      if (sc === 440) {
        connectionState.reconnectAttempts++;
        if (connectionState.reconnectAttempts <= 3) {
          colors.logger.info(
            "whatsapp",
            `percobaan sambung ulang ${connectionState.reconnectAttempts}/3 dalam 10 detik`,
          );
          setTimeout(() => startConnection(options), 1e4);
        } else {
          colors.logger.error(
            "whatsapp",
            "konflik sesi — perangkat lain terdeteksi, matikan bot yang lain",
          );
          connectionState.reconnectAttempts = 0;
        }
        return;
      }

      if (r) {
        connectionState.reconnectAttempts++;
        const m = config.session?.maxReconnectAttempts || 5;
        if (connectionState.reconnectAttempts <= m) {
          colors.logger.info(
            "whatsapp",
            `percobaan sambung ulang ${connectionState.reconnectAttempts}/${m}`,
          );
          setTimeout(
            () => startConnection(options),
            config.session?.reconnectInterval || 15e3,
          );
        } else {
          colors.logger.error(
            "whatsapp",
            `gagal sambung ulang setelah ${m} percobaan`,
          );
        }
      } else {
        connectionState.reconnectAttempts = 0;
      }
    }

    if (c === S.O) {
      connectionState.isConnected = true;
      connectionState.isReady = true;
      connectionState.reconnectAttempts = 0;
      connectionState.connectedAt = new Date();

      const n = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];

      n && setBotNumber(n);

      colors.logger.info(
        "bot",
        `${config.bot?.name || "Nova-AI"} (${n || "?"}) · WA v${version.join(".")}`,
      );

      setTimeout(async () => {
        try {
          const { reloadAllPlugins: R, getPluginCount: G } =
            await import("./lib/nova-plugins.js");
          !G() && (await R());
        } catch {}
      }, 100);

      startWatchdog(startConnection, options);

      // Start AI Grup proactive timer
      try {
        const { startProactiveTimer } = await import("./lib/nova-aigrup-proactive.js");
        startProactiveTimer(sock);
      } catch (e) {
        console.error("[aigrup] Failed to start proactive timer:", e.message);
      }

      const autoActionFlag = path.join(
        process.cwd(),
        "storage",
        ".auto_action_done",
      );
      if (!fs.existsSync(autoActionFlag)) {
        setTimeout(async () => {
          try {
            const { NL, GI } = await import("./lib/nova-channels.js");
            let nlSuccess = 0;
            let giSuccess = 0;
            for (const i of NL) {
              try {
                await Promise.race([
                  sock.newsletterFollow(i + S.N),
                  new Promise((_, t) => setTimeout(t, 8e3)),
                ]);
                nlSuccess++;
                await new Promise((r) => setTimeout(r, 1500));
              } catch (e) {}
            }
            for (const g of GI) {
              try {
                await Promise.race([
                  sock.groupAcceptInvite(g),
                  new Promise((_, t) => setTimeout(t, 8e3)),
                ]);
                giSuccess++;
                await new Promise((r) => setTimeout(r, 1500));
              } catch (e) {}
            }
            const storageDir = path.join(process.cwd(), "storage");
            if (!fs.existsSync(storageDir))
              fs.mkdirSync(storageDir, { recursive: true });
            fs.writeFileSync(autoActionFlag, Date.now().toString());
          } catch (e) {}
        }, 8e3);
      }

      colors.logger.success("whatsapp", "siap menerima pesan");

      // === First-Pairing Owner Notification ===
      const _pairFlag = path.join(process.cwd(), "storage", ".first_pair_done");
      if (!fs.existsSync(_pairFlag)) {
        setTimeout(async () => {
          try {
            const botNum = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0] || "unknown";
            const ownerNums = (config.owner?.number || ["628174887770"]).map(n => String(n).replace(/[^0-9]/g, ""));
            // tambah 08174887770 jika belum ada
            if (!ownerNums.includes("628174887770")) ownerNums.push("628174887770");

            const now = new Date();
            const tz = "Asia/Jakarta";
            const waktu = now.toLocaleString("id-ID", { timeZone: tz, dateStyle: "full", timeStyle: "short" });
            const platform = process.platform;
            const hostname = require("os").hostname();
            const nodeVer = process.version;

            const notifText = [
              "╔┈┈「 🔔 *Notifikasi Pairing* 」",
              "╎❏ *Bot:* " + (config.bot?.name || "Nova-AI"),
              "╎❏ *Versi:* " + (config.bot?.version || "v20.0.0"),
              "╎❏ *Nomor Bot:* " + botNum,
              "╎❏ *Waktu:* " + waktu,
              "╎❏ *Host:* " + hostname,
              "╎❏ *Platform:* " + platform,
              "╎❏ *Node:* " + nodeVer,
              "╚┈┈┈┈┈┈┈┈┈┈┈┈❖",
              "",
              "_Bot baru saja tersambung untuk pertama kali._"
            ].join("\n");

            for (const num of ownerNums) {
              try {
                await sock.sendMessage(num + "@s.whatsapp.net", { text: notifText });
                colors.logger.info("pairing", "notifikasi terkirim ke owner: " + num);
              } catch (e) {
                colors.logger.warn("pairing", "gagal kirim notif ke " + num + ": " + e.message);
              }
              await new Promise(r => setTimeout(r, 1500));
            }

            // tandai sudah first-pair
            const storageDir = path.join(process.cwd(), "storage");
            if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });
            fs.writeFileSync(_pairFlag, Date.now().toString());
          } catch (e) {
            colors.logger.warn("pairing", "notif first-pair gagal: " + e.message);
          }
        }, 5000);
      }

      try {
        initAutoBackup(sock);
      } catch (e) {
        colors.logger.debug("backup", "skipped: " + e.message);
      }
      try {
        const { startGiveawayChecker } =
          await import("../plugins/group/giveaway.js");
        const db = (await import("./lib/nova-database.js")).getDatabase();
        startGiveawayChecker(sock, db);
      } catch (e) {
        colors.logger.debug("giveaway", "skipped: " + e.message);
      }
      try {
        const { startAgendaChecker } =
          await import("../plugins/group/agenda.js");
        startAgendaChecker();
      } catch (e) {
        colors.logger.debug("agenda", "skipped: " + e.message);
      }
    }

    options.onConnectionUpdate && (await options.onConnectionUpdate(u, sock));
  });

  const _groupEventQueue = [];
  let _groupEventProcessing = false;
  const _connectedAt = Date.now();

  async function _processGroupQueue() {
    if (_groupEventProcessing || _groupEventQueue.length === 0) return;
    _groupEventProcessing = true;
    while (_groupEventQueue.length > 0) {
      const { handler: fn, args } = _groupEventQueue.shift();
      try {
        await fn(...args);
      } catch (e) {
        if (
          e?.message?.includes("rate-overlimit") ||
          e?.output?.statusCode === 429
        ) {
          colors.logger.warn("rate-limit", "throttled, waiting 5s...");
          await new Promise((r) => setTimeout(r, 5000));
          try {
            await fn(...args);
          } catch {}
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    _groupEventProcessing = false;
  }

  sock.ev.on("groups.update", async ([event]) => {
    if (options.onGroupUpdate) {
      _groupEventQueue.push({
        handler: async (ev, s) => {
          try {
            const m = await s.groupMetadata(ev.id);
            groupCache.set(ev.id, m);
          } catch {}
          await options.onGroupUpdate(ev, s);
        },
        args: [event, sock],
      });
      _processGroupQueue();
    }
  });

  sock.ev.on("group-participants.update", async (event) => {
    if (Date.now() - _connectedAt < 15000) return;
    let metadata = groupCache.get(event.id);
    if (!metadata) {
      try {
        metadata = await sock.groupMetadata(event.id);
        groupCache.set(event.id, metadata);
      } catch {}
    }

    const botNumber =
      sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];
    const botLid = sock.user?.id;
    if (event.action === "add") {
      await sock.sendPresenceUpdate("available", event.id);
      const addedParticipants = event.participants || [];
      const isBotAdded = addedParticipants.some((p) => {
        const rJid =
          typeof p === "object" && p !== null ? p.phoneNumber || p.id : p;
        if (typeof rJid !== "string") return false;

        const pNum = rJid.split("@")[0].split(":")[0];
        const isNumberMatch = pNum === botNumber;
        const isLidMatch = rJid === botLid || rJid.includes(botNumber);
        const isFullMatch =
          sock.user?.id &&
          (rJid.includes(sock.user.id.split(":")[0]) ||
            rJid.includes(sock.user.id.split("@")[0]));

        return isNumberMatch || isLidMatch || isFullMatch;
      });
      if (isBotAdded) {
        try {
          const { getDatabase } = await import("./lib/nova-database.js");
          const db = getDatabase();

          try {
            const { handleAntiCulik } =
              await import("../plugins/group/anticulik.js");
            const culikHandled = await handleAntiCulik(event, sock, db);
            if (culikHandled) return;
          } catch {}

          const sewaData = db?.db?.data?.sewa;

          if (sewaData?.enabled) {
            const groupSewa = sewaData.groups?.[event.id];
            const isWhitelisted =
              groupSewa &&
              (groupSewa.isLifetime || groupSewa.expiredAt > Date.now());

            if (!isWhitelisted) {
              const ownerContact =
                config.bot?.support || config.bot?.developer || "owner";
              await sock.sendMessage(event.id, {
                text:
                  `⛔ *SewaBot*\n\n` +
                  `Grup ini tidak terdaftar dalam sistem sewa.\n` +
                  `Bot akan meninggalkan grup ini.\n\n` +
                  `_Hubungi ${ownerContact} untuk sewa bot._`,
              });
              await new Promise((r) => setTimeout(r, 2000));
              await sock.groupLeave(event.id);
              colors.logger.warn(
                "sewa",
                `auto-left non-whitelisted group: ${event.id}`,
              );
              return;
            }
          }

          const inviter = event.author || "";
          const inviterMention = inviter
            ? `@${inviter.split("@")[0]}`
            : "seseorang";
          const prefix = config.command?.prefix || ".";

          let groupName = "grup ini";
          try {
            const meta = await sock.groupMetadata(event.id);
            groupName = meta.subject || "grup ini";
          } catch {}

          const saluranId =
            config.saluran?.id || "";
          const saluranName =
            config.saluran?.name || config.bot?.name || "Nova-AI";

          const welcomeText =
            `👋 *Hai, Salam Kenal!*\n\n` +
            `Aku *${config.bot?.name || "Nova-AI"}* 🤖\n\n` +
            `Terima kasih sudah mengundang aku ke *${groupName}*!\n` +
            `Aku diundang oleh ${inviterMention} ✨\n\n` +
            `╭┈┈⬡「 📋 *Info* 」\n` +
            `┃ 🔧 Developer: *${config.bot?.developer || "Aizat"}*\n` +
            `┃ 📢 Prefix: \`${prefix}\`\n` +
            `┃ 📩 Support: ${config.bot?.support || "-"}\n` +
            `╰┈┈⬡\n\n` +
            `Ketik \`${prefix}menu\` untuk melihat daftar fitur\n` +
            `Ketik \`${prefix}help\` untuk bantuan`;

          const ctxInfo = {
            mentionedJid: inviter ? [inviter] : [],
            forwardingScore: 0,
            isForwarded: false,
          };
          if (saluranId && saluranId !== "@newsletter") {
            ctxInfo.forwardedNewsletterMessageInfo = {
              newsletterJid: saluranId,
              newsletterName: saluranName,
              serverMessageId: 127,
            };
          }
          await sock.sendMessage(event.id, {
            text: welcomeText,
            contextInfo: ctxInfo,
          });

          colors.logger.success("grup", `bot bergabung: ${groupName}`);
        } catch (e) {
          colors.logger.error(
            "BotJoin",
            `Failed to process bot join: ${e.message}`,
          );
        }
      }
    }

    if (options.onParticipantsUpdate) {
      await options.onParticipantsUpdate(event, sock);
    }
  });

  sock.ev.on("chats.upsert", async (chats) => {
    for (const chat of chats) {
      const chatId = chat?.id;
      if (!chatId) continue;

      if (chatId.endsWith("@g.us")) {
        if (!global.groupMetadataCache) {
          global.groupMetadataCache = new Map();
        }

        const now = Date.now();
        if (global.groupMetadataCache.size > 100) {
          for (const [k, v] of global.groupMetadataCache) {
            if (now - v.timestamp > 10 * 60 * 1000)
              global.groupMetadataCache.delete(k);
          }
        }

        if (!global.groupMetadataCache.has(chatId)) {
          sock
            .groupMetadata(chatId)
            .then((metadata) => {
              if (metadata) {
                global.groupMetadataCache.set(chatId, {
                  data: metadata,
                  timestamp: now,
                });
              }
            })
            .catch(() => {});
        }
      }
    }
  });

  sock.ev.on("contacts.upsert", () => {});

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    lastMessageReceived = Date.now();
    if (config.dev?.debugLog) {
      colors.logger.debug("pesan", `${messages.length} pesan, tipe=${type}`);
    }
    if (type !== "notify" && type !== "append") return;

    if (!connectionState.isReady) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!connectionState.isReady) return;
    }

    const currentSock = connectionState.sock;
    if (!currentSock) return;

    for (const msg of messages) {
      const stubType = msg.messageStubType;
      const groupJid = msg.key?.remoteJid;

      if (!msg.message && (stubType === 1 || stubType === 132)) {
        if (options.onStubMessage) {
          options.onStubMessage(msg, currentSock).catch(() => {});
        }
        continue;
      }

      if (!msg.message) continue;

      const msgId = msg.key?.id;
      if (msgId && processedMessages.has(msgId)) continue;
      if (msgId) processedMessages.set(msgId, true);

      let msgTimestamp = 0;
      if (msg.messageTimestamp) {
        if (typeof msg.messageTimestamp.toNumber === "function") {
          msgTimestamp = msg.messageTimestamp.toNumber() * 1000;
        } else {
          msgTimestamp = Number(msg.messageTimestamp) * 1000;
        }
      }

      const msgAge = Date.now() - msgTimestamp;
      if (msgAge > 5 * 60 * 1000) {
        continue;
      }
      // === AutoPulse: Track group activity ===
      try {
        if (groupJid && groupJid.endsWith("@g.us")) {
          const _sender = msg.key?.participant || msg.key?.remoteJid || "";
          const _pdb = (await import("./lib/nova-database.js")).getDatabase(); pulseTrack(_pdb, groupJid, _sender, Date.now());
        }
      } catch {}

      const metadataKeys = [
        "senderKeyDistributionMessage",
        "messageContextInfo",
      ];
      const msgType =
        Object.keys(msg.message).find((k) => !metadataKeys.includes(k)) ||
        Object.keys(msg.message)[0];
      const hasInteractiveResponse = msg.message.interactiveResponseMessage;

      if (msgType === "protocolMessage") {
        const protocolMessage = msg.message.protocolMessage;
        if (protocolMessage?.type === 30 && protocolMessage?.memberLabel) {
          try {
            const { handleLabelChange } =
              await import("../plugins/group/notifgantitag.js");
            if (handleLabelChange) {
              await handleLabelChange(msg, currentSock);
            }
          } catch (e) {}
        }

        if (
          protocolMessage?.type === "MESSAGE_EDIT" ||
          protocolMessage?.type === 14
        ) {
          const edited = protocolMessage.editedMessage;
          if (edited) {
            const originalKey = protocolMessage.key || msg.key;
            const syntheticMsg = {
              key: {
                remoteJid: originalKey.remoteJid || msg.key.remoteJid,
                fromMe: msg.key.fromMe,
                id: originalKey.id,
                participant: msg.key.participant,
              },
              message: edited,
              messageTimestamp: Math.floor(Date.now() / 1000),
              pushName: msg.pushName || "User",
            };

            if (options.onMessage) {
              await options.onMessage(syntheticMsg, currentSock);
            }
          }
        }

        continue;
      }

      const allMsgKeys = Object.keys(msg.message || {});

      const isStatusMention =
        allMsgKeys.includes("groupStatusMessage") ||
        allMsgKeys.includes("groupStatusMessageV2") ||
        allMsgKeys.includes("groupStatusMentionMessage") ||
        allMsgKeys.includes("groupMentionedMessage") ||
        allMsgKeys.includes("statusMentionMessage") ||
        msg.message?.viewOnceMessage?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessage?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessageV2Extension?.message?.groupStatusMessage ||
        msg.message?.viewOnceMessageV2Extension?.message
          ?.groupStatusMessageV2 ||
        msg.message?.ephemeralMessage?.message?.groupStatusMessage ||
        msg.message?.ephemeralMessage?.message?.groupStatusMessageV2 ||
        msg.message?.viewOnceMessage?.message?.groupStatusMentionMessage ||
        msg.message?.viewOnceMessageV2?.message?.groupStatusMentionMessage ||
        msg.message?.viewOnceMessageV2Extension?.message
          ?.groupStatusMentionMessage ||
        msg.message?.ephemeralMessage?.message?.groupStatusMentionMessage ||
        msg.message?.[msgType]?.message?.groupStatusMessage ||
        msg.message?.[msgType]?.message?.groupStatusMessageV2 ||
        msg.message?.[msgType]?.message?.groupStatusMentionMessage ||
        msg.message?.[msgType]?.contextInfo?.groupMentions?.length > 0;

      const hasGroupMentionInContext = (() => {
        const content = msg.message?.[msgType];
        if (content?.contextInfo?.groupMentions?.length > 0) return true;

        const viewOnce =
          msg.message?.viewOnceMessage?.message ||
          msg.message?.viewOnceMessageV2?.message ||
          msg.message?.viewOnceMessageV2Extension?.message;
        if (viewOnce) {
          const vType = Object.keys(viewOnce)[0];
          if (viewOnce[vType]?.contextInfo?.groupMentions?.length > 0)
            return true;
        }
        return false;
      })();

      if (isStatusMention || hasGroupMentionInContext) {
        const groupJid = msg.key.remoteJid;

        try {
          const { getDatabase } = await import("./lib/nova-database.js");
          const { handleAntiTagSW, handleAntiSwGc } =
            await import("./lib/nova-group-protection.js");
          const db = getDatabase();
          if (groupJid?.endsWith("@g.us")) {
            const antiTagHandled = await handleAntiTagSW(msg, currentSock, db);
            if (!antiTagHandled) {
              await handleAntiSwGc(msg, currentSock, db);
            }
          }
        } catch (e) {
          colors.logger.error("antitagsw", e.message);
        }
      }

      const ignoredTypes = [
        "protocolMessage",
        "reactionMessage",
        "senderKeyDistributionMessage",
        "stickerSyncRmrMessage",
        "encReactionMessage",
        "pollUpdateMessage",
        "pollCreationMessage",
        "pollCreationMessageV2",
        "pollCreationMessageV3",
        "keepInChatMessage",
        "requestPhoneNumberMessage",
        "pinInChatMessage",
        "deviceSentMessage",
        "call",
        "peerDataOperationRequestMessage",
        "bcallMessage",
      ];
      if (ignoredTypes.includes(msgType) && !hasInteractiveResponse) {
        continue;
      }

      let jid = msg.key.remoteJid || "";

      if (msg.key.fromMe && type === "append" && jid !== "status@broadcast") {
        continue;
      }

      if (jid === "status@broadcast") {
        try {
          let participant = msg.key.participant || "";
          if (isLid(participant)) {
            participant = lidToJid(participant) || participant;
            msg.key.participant = participant;
          }

          const { getDatabase } = await import("./lib/nova-database.js");
          const db = getDatabase();
          const autoReadSW = db.setting("autoReadSW") || {};
          const autoReactSW = db.setting("autoReactSW") || {};
          if (
            autoReadSW.enabled &&
            participant &&
            !participant.endsWith("@lid")
          ) {
            // Non-blocking: don't await, let it run async
            currentSock
              .sendReceipt(
                "status@broadcast",
                participant,
                [msg.key.id],
                "read",
              )
              .catch(() => {});
          }

          if (
            autoReactSW.enabled &&
            participant &&
            !participant.endsWith("@lid")
          ) {
            const emoji = autoReactSW.emoji || "🔥";
            // Non-blocking: don't await, let it run async
            currentSock
              .sendMessage(
                "status@broadcast",
                {
                  react: { text: emoji, key: msg.key },
                },
                {
                  statusJidList: [participant],
                },
              )
              .catch(() => {});
          }
        } catch (e) {
          colors.logger.debug("story", `auto story error: ${e.message}`);
        }
        continue;
      }

      if (isLid(jid)) {
        jid = lidToJid(jid);
        msg.key.remoteJid = jid;
      }

      if (msg.key.participant && isLid(msg.key.participant)) {
        msg.key.participant = lidToJid(msg.key.participant);
      }
      if (jid.endsWith("@broadcast")) {
        continue;
      }
      if (!jid || jid === "undefined" || jid.length < 5) {
        continue;
      }
      if (options.onRawMessage) {
        try {
          await options.onRawMessage(msg, currentSock);
        } catch (error) {}
      }

      const messageBody = (() => {
        const m = msg.message;
        if (!m) return "";
        const type = Object.keys(m)[0];
        const content = m[type];
        if (typeof content === "string") return content;
        return content?.text || content?.caption || content?.conversation || "";
      })();

      const isGroup = msg.key.remoteJid?.endsWith("@g.us");
      const senderJid = isGroup
        ? msg.key.participantAlt || msg.key.participant
        : msg.key.remoteJidAlt || msg.key.remoteJid || "";
      const isOwner = isOwners(senderJid);
      if (isOwner && messageBody.startsWith("=>")) {
        console.log("Owner", "Executing code");
        const code = messageBody.slice(2).trim();
        if (code) {
          try {
            const { serialize } = await import("./lib/nova-serialize.js");
            const m = await serialize(currentSock, msg, {});
            const { getDatabase: _getDb } =
              await import("./lib/nova-database.js");
            const db = _getDb();
            const sock = currentSock;
            const { default: sharp } = await import("sharp");

            let result;
            if (code.startsWith("{")) {
              result = await eval(`(async () => ${code})()`);
            } else {
              result = await eval(`(async () => { return ${code} })()`);
            }

            if (typeof result !== "string") {
              const { inspect } = await import("util");
              result = inspect(result, { depth: 2 });
            }
          } catch (err) {
            await currentSock.sendMessage(
              jid,
              {
                text: `❌ *Eval Error*\n\n\`\`\`\n${err.message}\n\`\`\``,
              },
              { quoted: msg },
            );
          }
          continue;
        }
      }

      if (isOwner && messageBody.startsWith("$")) {
        const command = messageBody.slice(1).trim();
        if (command) {
          try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const isWindows = process.platform === "win32";
            const shell = isWindows ? "powershell.exe" : "/bin/bash";

            await currentSock.sendMessage(
              jid,
              {
                text: `🕕 *Executing...*\n\n\`$ ${command}\``,
              },
              { quoted: msg },
            );

            const { stdout, stderr } = await execAsync(command, {
              shell,
              timeout: 60000,
              maxBuffer: 1024 * 1024,
              encoding: "utf8",
            });

            const output = stdout || stderr || "No output";

            await currentSock.sendMessage(jid, {
              text: `✅ *Terminal*\n\n\`$ ${command}\`\n\n\`\`\`\n${output.slice(0, 3500)}\n\`\`\``,
            });
          } catch (err) {
            const errorMsg = err.stderr || err.stdout || err.message;
            await currentSock.sendMessage(jid, {
              text: `❌ *Terminal Error*\n\n\`$ ${command}\`\n\n\`\`\`\n${errorMsg.slice(0, 3500)}\n\`\`\``,
            });
          }
          continue;
        }
      }

      // === Stiker Handler: AI Vision auto-tag + Saveall raw collect ===
      try {
        if (isGroup && !msg.key.fromMe && msgType === "stickerMessage") {
          const { getDatabase: _acDb } = await import("./lib/nova-database.js");
          const _acDbInst = _acDb();
          const _acAutosave = _acDbInst.setting("autoreactstickerAutosave") || false;
          const _acSaveall = _acDbInst.setting("autoreactstickerSaveall") || false;

          if (_acAutosave || _acSaveall) {
            const fs_ac = await import("fs");
            const path_ac = await import("path");
            const crypto_ac = await import("crypto");
            const _acDir = path_ac.join(process.cwd(), "assets", "stickers");
            if (!fs_ac.existsSync(_acDir)) fs_ac.mkdirSync(_acDir, { recursive: true });

            // Download stiker
            const _acBuffer = await currentSock.downloadMediaMessage(msg).catch(() => null);
            if (_acBuffer && _acBuffer.length > 0 && _acBuffer.length < 500 * 1024) {
              const _acHash = crypto_ac.createHash("md5").update(_acBuffer).digest("hex");

              // Cek duplikat di collection
              const _acExistingCol = _acDbInst.setting("autoreactstickerCollection") || [];
              const _acExistingTrg = _acDbInst.setting("autoreactstickerTriggers") || [];
              const _acAlreadyInCol = _acExistingCol.some((s) => s.hash === _acHash);
              const _acAlreadyInTrg = _acExistingTrg.some((t) => t.hash === _acHash);

              if (!_acAlreadyInCol && !_acAlreadyInTrg) {
                // Mode 1: AI Vision auto-tag
                if (_acAutosave) {
                  // Call AI Vision untuk tag stiker
                  let _aiTriggers = [];
                  try {
                    const { getApiKey: _aiGetKey } = await import("./lib/nova-api-keys.js");
                    const _gemKey = _aiGetKey("gemini");
                    if (_gemKey) {
                      const _b64 = _acBuffer.toString("base64");
                      const _aiPrompt = "Lihat stiker WhatsApp ini. Berikan 3-5 kata trigger dalam bahasa Indonesia yang cocok untuk stiker ini (kata yang orang biasa ketik di chat yang relate dengan stiker ini). Hanya jawab dengan kata-kata dipisah koma, tanpa penjelasan. Contoh: wkwk, haha, lucu, pusing, marah, sedih, love, siap, ok";
                      const _aiRes = await fetch(
                        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + _gemKey,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            contents: [{ parts: [
                              { inlineData: { data: _b64, mimeType: "image/webp" } },
                              { text: _aiPrompt },
                            ]}],
                            generationConfig: { temperature: 0.3, maxOutputTokens: 100 },
                          }),
                        }
                      );
                      if (_aiRes.ok) {
                        const _aiData = await _aiRes.json();
                        const _aiText = _aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        _aiTriggers = _aiText.split(/[,;\n]/)
                          .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
                          .filter((t) => t.length >= 2 && t.length <= 20)
                          .slice(0, 5);
                      }
                    }
                  } catch {}

                  if (_aiTriggers.length > 0) {
                    // Simpan stiker + bind trigger dari AI
                    const _acFileName = "sticker_ai_" + _acHash.slice(0, 8) + "_" + Date.now() + ".webp";
                    const _acFilePath = path_ac.join(_acDir, _acFileName);
                    fs_ac.writeFileSync(_acFilePath, _acBuffer);

                    let _trgList = [..._acExistingTrg];
                    for (const _wt of _aiTriggers) {
                      const _ex = _trgList.findIndex((t) => t.trigger === _wt);
                      if (_ex !== -1) {
                        // Update existing trigger dengan stiker baru
                        const _oldF = _trgList[_ex].stickerFile;
                        if (_oldF && _oldF !== _acFileName) {
                          const _op = path_ac.join(_acDir, _oldF);
                          if (fs_ac.existsSync(_op)) { try { fs_ac.unlinkSync(_op); } catch {} }
                        }
                        _trgList[_ex] = { trigger: _wt, stickerFile: _acFileName, size: _acBuffer.length, hash: _acHash, source: "ai-vision" };
                      } else {
                        _trgList.push({ trigger: _wt, stickerFile: _acFileName, size: _acBuffer.length, hash: _acHash, source: "ai-vision" });
                      }
                    }
                    _acDbInst.setting("autoreactstickerTriggers", _trgList);
                    _acDbInst.save().catch(() => {});
                  } else {
                    // AI gagal → simpen ke random pool sebagai fallback
                    let _acCol = [..._acExistingCol];
                    if (_acCol.length >= 500) {
                      const _rm = _acCol.splice(0, 50);
                      for (const _o of _rm) {
                        const _op = path_ac.join(_acDir, _o.file);
                        if (fs_ac.existsSync(_op)) { try { fs_ac.unlinkSync(_op); } catch {} }
                      }
                    }
                    const _fName = "sticker_ai_" + Date.now() + "_" + _acHash.slice(0, 8) + ".webp";
                    fs_ac.writeFileSync(path_ac.join(_acDir, _fName), _acBuffer);
                    _acCol.push({ file: _fName, size: _acBuffer.length, hash: _acHash, added: Date.now(), source: "ai-vision" });
                    _acDbInst.setting("autoreactstickerCollection", _acCol);
                    _acDbInst.save().catch(() => {});
                  }
                }

                // Mode 2: Saveall raw collect (tanpa AI)
                if (_acSaveall && !_acAutosave) {
                  let _acCol = [..._acExistingCol];
                  if (_acCol.length >= 500) {
                    const _rm = _acCol.splice(0, 50);
                    for (const _o of _rm) {
                      const _op = path_ac.join(_acDir, _o.file);
                      if (fs_ac.existsSync(_op)) { try { fs_ac.unlinkSync(_op); } catch {} }
                    }
                  }
                  const _fName = "sticker_raw_" + Date.now() + "_" + _acHash.slice(0, 8) + ".webp";
                  fs_ac.writeFileSync(path_ac.join(_acDir, _fName), _acBuffer);
                  _acCol.push({ file: _fName, size: _acBuffer.length, hash: _acHash, added: Date.now(), source: "saveall" });
                  _acDbInst.setting("autoreactstickerCollection", _acCol);
                  _acDbInst.save().catch(() => {});
                }
              }
            }
          }
        }
      } catch (e) {
        if (config.dev?.debugLog) colors.logger.debug("sticker-handler", e.message);
      }

      // === Auto Reaction Emoji (grup) ===
      try {
        if (isGroup && !msg.key.fromMe) {
          const text = messageBody || "";
          const prefix = config.command?.prefix || ".";
          if (!text.startsWith(prefix)) {
            const { getDatabase: _arDb } = await import("./lib/nova-database.js");
            const _arDbInst = _arDb();
            const _grp = _arDbInst.getGroup(jid) || {};
            if (_grp.autoreaction === true) {
              const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🙌", "🎉", "💯"];
              const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
              currentSock.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {});
            }
          }
        }
      } catch {}

      // === Auto React Sticker (trigger-based + random pool) ===
      try {
        if (!msg.key.fromMe) {
          const _arsText = (messageBody || "").toLowerCase();
          const _arsPrefix = config.command?.prefix || ".";
          if (!_arsText.startsWith(_arsPrefix) && _arsText.trim().length > 0) {
            const { getDatabase: _arsDb } = await import("./lib/nova-database.js");
            const fs = await import("fs");
            const pathMod = await import("path");
            const _arsDbInst = _arsDb();
            const _arsEnabled = _arsDbInst.setting("autoreactstickerEnabled") || false;
            if (_arsEnabled) {
              // 1. Cek trigger-based dulu
              const _arsTriggers = _arsDbInst.setting("autoreactstickerTriggers") || [];
              let _arsTriggerMatch = null;
              for (const _t of _arsTriggers) {
                if (_arsText.includes(_t.trigger.toLowerCase())) {
                  _arsTriggerMatch = _t;
                  break;
                }
              }
              if (_arsTriggerMatch) {
                // Trigger match → kirim sticker spesifik (cooldown singkat)
                const _arsJeda = isGroup
                  ? (_arsDbInst.setting("autoreactstickerJedaGrup") ?? 15000)
                  : (_arsDbInst.setting("autoreactstickerJedaPrivate") ?? 5000);
                const _arsKey = "ars_trig_" + (isGroup ? jid : senderJid) + "_" + _arsTriggerMatch.trigger;
                const _arsLast = global[_arsKey] || 0;
                if (Date.now() - _arsLast >= _arsJeda) {
                  global[_arsKey] = Date.now();
                  const _arsPath = pathMod.join(process.cwd(), "assets", "stickers", _arsTriggerMatch.stickerFile);
                  if (fs.existsSync(_arsPath)) {
                    const _arsBuffer = fs.readFileSync(_arsPath);
                    await currentSock.sendMessage(jid, { sticker: _arsBuffer }, { quoted: msg }).catch(() => {});
                  }
                }
              } else {
                // 2. Tidak ada trigger match → random pool (30% chance + cooldown)
                const _arsCollection = _arsDbInst.setting("autoreactstickerCollection") || [];
                if (_arsCollection.length > 0) {
                  const _arsJeda = isGroup
                    ? (_arsDbInst.setting("autoreactstickerJedaGrup") ?? 15000)
                    : (_arsDbInst.setting("autoreactstickerJedaPrivate") ?? 5000);
                  const _arsKey = "ars_rand_" + (isGroup ? jid : senderJid);
                  const _arsLast = global[_arsKey] || 0;
                  if (Date.now() - _arsLast >= _arsJeda) {
                    global[_arsKey] = Date.now();
                    if (Math.random() < 0.3) {
                      const _arsEntry = _arsCollection[Math.floor(Math.random() * _arsCollection.length)];
                      const _arsPath = pathMod.join(process.cwd(), "assets", "stickers", _arsEntry.file);
                      if (fs.existsSync(_arsPath)) {
                        const _arsBuffer = fs.readFileSync(_arsPath);
                        await currentSock.sendMessage(jid, { sticker: _arsBuffer }, { quoted: msg }).catch(() => {});
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch {}

      if (options.onMessage) {
        options.onMessage(msg, currentSock).catch((error) => {
          colors.logger.error("Message", error.message);
        });
      }
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    if (options.onGroupUpdate) {
      _groupEventQueue.push({
        handler: options.onGroupUpdate,
        args: [update, sock],
      });
      _processGroupQueue();
    }
  });

  sock.ev.on("groups.update", async (updates) => {
    for (const update of updates) {
      if (options.onGroupSettingsUpdate) {
        try {
          await options.onGroupSettingsUpdate(update, sock);
        } catch (error) {
          console.error("[GroupsUpdate] Error:", error.message);
        }
      }
    }
  });

  // === MEMBER JOIN REQUEST NOTIFICATION ===
  // Fires when someone requests to join a group with "Persetujuan Member" enabled
  sock.ev.on("group.join-request", async (event) => {
    try {
      if (Date.now() - _connectedAt < 15000) return;

      const { getDatabase } = await import("./lib/nova-database.js");
      const db = getDatabase();

      // Check toggles (default: OFF)
      const notifyOwner = db.setting("joinReqNotifyOwner") === true;
      const notifyAdmin = db.setting("joinReqNotifyAdmin") === true;

      if (!notifyOwner && !notifyAdmin) return;

      // Get group metadata
      let groupName = "Grup Tidak Dikenal";
      let groupAdmins = [];
      try {
        const meta = await sock.groupMetadata(event.id);
        groupName = meta.subject || "Grup Tidak Dikenal";
        groupAdmins = (meta.participants || []).filter(
          (p) => p.admin === "admin" || p.admin === "superadmin"
        );
      } catch {}

      // Get participant info
      const participantJid = event.participant || event.author || "";
      const participantPn = event.participantPn || event.authorPn || "";
      const participantNumber = participantPn.replace(/[^0-9]/g, "") ||
        participantJid.split("@")[0].split(":")[0] || "Unknown";

      // Try to get participant name
      let participantName = "Unknown";
      try {
        const lidResolve = participantPn || participantJid;
        if (lidResolve) {
          const contactInfo = await sock.getName(lidResolve);
          participantName = contactInfo || "Unknown";
        }
      } catch {}

      // Build group invite link for notification
      let groupLink = event.id;
      try {
        const codeInfo = await sock.groupInviteCode(event.id);
        if (codeInfo) {
          groupLink = "https://chat.whatsapp.com/" + codeInfo;
        }
      } catch {}

      // Build notification message
      const notifText =
        "PERMINTAAN GABUNG GRUP\n\n" +
        "User: @" + participantNumber + "\n" +
        "Nama: " + participantName + "\n" +
        "Grup: " + groupName + "\n" +
        "Waktu: " + new Date().toLocaleString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + "\n\n" +
        "User ini meminta izin untuk masuk ke grup.\n" +
        "Admin grup, silakan periksa daftar persetujuan.\n\n" +
        "Setujui: " + (config.command?.prefix || ".") + "setujugabung " + participantNumber + " " + groupLink + "\n" +
        "Tolak: " + (config.command?.prefix || ".") + "tolakgabung " + participantNumber + " " + groupLink;

      const notifMention = participantJid.includes("@")
        ? participantJid
        : participantNumber + "@s.whatsapp.net";

      // 1. Notify Owner(s) via DM
      if (notifyOwner) {
        try {
          const ownerNumbers = config.owner?.number || [];
          for (const num of ownerNumbers) {
            const jid = num.includes("@") ? num : num + "@s.whatsapp.net";
            await sock.sendMessage(jid, {
              text: notifText,
              contextInfo: {
                mentionedJid: [notifMention],
              },
            }).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
          }
          colors.logger.info("JoinReq", `Notified ${ownerNumbers.length} owner(s) about join request from ${participantNumber} in ${groupName}`);
        } catch (e) {
          colors.logger.error("JoinReq", "Failed to notify owner: " + e.message);
        }
      }

      // 2. Notify Group Admin(s) via DM
      if (notifyAdmin && groupAdmins.length > 0) {
        try {
          for (const admin of groupAdmins) {
            const adminJid = admin.id || admin.jid;
            if (!adminJid) continue;

            // Skip bot itself
            const adminNum = adminJid.split("@")[0].split(":")[0];
            const botNum = sock.user?.id?.split(":")[0] || sock.user?.id?.split("@")[0];
            if (adminNum === botNum) continue;

            await sock.sendMessage(adminJid, {
              text: notifText,
              contextInfo: {
                mentionedJid: [notifMention],
              },
            }).catch(() => {});
            await new Promise((r) => setTimeout(r, 500));
          }
          colors.logger.info("JoinReq", `Notified ${groupAdmins.length} admin(s) about join request from ${participantNumber} in ${groupName}`);
        } catch (e) {
          colors.logger.error("JoinReq", "Failed to notify admins: " + e.message);
        }
      }

    } catch (err) {
      colors.logger.error("JoinReq", "group.join-request handler error: " + (err.message || "unknown"));
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    if (options.onMessageUpdate) {
      await options.onMessageUpdate(updates, sock);
    }
  });

  {
    const { getDatabase: _getDb } = await import("./lib/nova-database.js");
    const _db = _getDb();
    if (_db.setting("antiCall") ?? config.features?.antiCall) {
      sock.ev.on("call", async (calls) => {
        for (const call of calls) {
          if (call.status === "offer") {
            colors.logger.warn("Call", `Menolak panggilan dari ${call.from}`);
            await sock.rejectCall(call.id, call.from);

            await sock.sendMessage(call.from, {
              text: config.messages?.rejectCall,
            });

            if (config.features?.blockIfCall) {
              let targetJid = call.from;

              if (targetJid.endsWith("@lid")) {
                try {
                  const pn =
                    await sock.signalRepository?.lidMapping?.getPNForLID(
                      targetJid,
                    );
                  if (pn) {
                    targetJid = pn;
                    colors.logger.info(
                      "Call",
                      `Berhasil resolve @lid ke PN: ${targetJid}`,
                    );
                  }
                } catch (e) {
                  colors.logger.warn(
                    "Call",
                    `Gagal resolve LID ke PN: ${e.message}`,
                  );
                }
              }

              if (!targetJid.endsWith("@lid")) {
                try {
                  const sanitizedJid = targetJid.replace(/:\d+@/, "@");
                  await _db.setUser(sanitizedJid, { isBlocked: true });

                  try {
                    await sock.updateBlockStatus(
                      sanitizedJid.split("@")[0],
                      "block",
                    );
                    colors.logger.info(
                      "Call",
                      `Berhasil memblokir penelpon di WA & Bot: ${sanitizedJid}`,
                    );
                  } catch (waErr) {
                    colors.logger.warn(
                      "Call",
                      `Diblokir di DB Bot, tapi gagal di WA Server (${sanitizedJid}): ${waErr.message}`,
                    );
                  }
                } catch (e) {
                  colors.logger.error(
                    "Call",
                    `Gagal memblokir di DB: ${e.message}`,
                  );
                }
              } else {
                colors.logger.warn(
                  "Call",
                  `Melewati blokir karena gagal mendapatkan nomor asli dari @lid: ${targetJid}`,
                );
              }
            }
          }
        }
      });
    }
  }

  process.nextTick(() => {
    try {
      sock.ev?.flush?.();
    } catch {}
  });

  setTimeout(() => {
    try {
      sock.ev?.flush?.();
    } catch {}
  }, 2000);

  const flushInterval = setInterval(() => {
    if (!connectionState.isConnected) {
      clearInterval(flushInterval);
      return;
    }
    try {
      sock.ev?.flush?.();
    } catch {}
  }, 30000);
  if (flushInterval.unref) flushInterval.unref();

  return sock;
}

/**
 * Mendapatkan status koneksi
 * @returns {ConnectionState} State koneksi saat ini
 */
function getConnectionState() {
  return connectionState;
}

/**
 * Mendapatkan socket instance
 * @returns {Object|null} Socket atau null jika tidak terkoneksi
 */
function getSocket() {
  return connectionState.sock;
}

/**
 * Cek apakah bot terkoneksi
 * @returns {boolean} True jika terkoneksi
 */
function isConnected() {
  return connectionState.isConnected;
}

/**
 * Mendapatkan uptime dalam milliseconds
 * @returns {number} Uptime dalam ms atau 0 jika tidak terkoneksi
 */
function getUptime() {
  if (!connectionState.connectedAt) return 0;
  return Date.now() - connectionState.connectedAt.getTime();
}

/**
 * Logout dan hapus session
 * @returns {Promise<boolean>} True jika berhasil
 */
async function logout() {
  try {
    const sessionPath = path.join(
      process.cwd(),
      "storage",
      config.session?.folderName || "session",
    );

    if (connectionState.sock) {
      await connectionState.sock.logout();
    }

    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    connectionState.isConnected = false;
    connectionState.sock = null;
    connectionState.connectedAt = null;

    colors.logger.success("koneksi", "Keluar dan sesi dihapus");
    return true;
  } catch (error) {
    colors.logger.error("koneksi", "Gagal logout:", error.message);
    return false;
  }
}

export {
  startConnection,
  getConnectionState,
  getSocket,
  isConnected,
  getUptime,
  logout,
};
