// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import { getAssetBuffer } from "../../src/lib/rara-asset-manager.js";
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from "rara";
import { raraError, raraEmpty, raraGuide, raraNoInput, raraWrap } from "../../src/lib/rara-menu-style.js";
import axios from 'axios'
import crypto from 'crypto'
import config from '../../config.js'
import { isLid, lidToJid } from '../../src/lib/rara-lid.js'
import { checkPanelJeda, setPanelLastUsed } from '../../src/lib/rara-panel-jeda.js'
import { hasAccessToServer, getUserRole, VALID_SERVERS } from '../../src/lib/rara-roles-cpanel.js'
import { isGcSeller } from './gcseller.js'
import * as timeHelper from '../../src/lib/rara-time.js'
import fs from 'fs'
import { getDatabase } from '../../src/lib/rara-database.js'
const RAM_OPTIONS = [
  "1gb",
  "2gb",
  "3gb",
  "4gb",
  "5gb",
  "6gb",
  "7gb",
  "8gb",
  "9gb",
  "10gb",
  "unli",
];
const SERVER_VERSIONS = ["v1", "v2", "v3", "v4", "v5"];

const allCommands = [];
RAM_OPTIONS.forEach((ram) => {
  allCommands.push(ram); // bentuk generik: .1gb v50 username
  SERVER_VERSIONS.forEach((ver) => {
    allCommands.push(`${ram}${ver}`); // bentuk lama: .1gbv1 username
  });
});
allCommands.push("createserver");

const pluginConfig = {
  name: allCommands,
  alias: ["createpanel"],
  category: "panel",
  description: "Create server panel dengan spesifikasi RAM (v1-v5)",
  usage: ".1gbv1 username atau .1gbv2 username,628xxx",
  example: ".2gbv1 myserver,628xxx",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const RAM_SPECS = {
  "1gb": { ram: 1024, cpu: 70, disk: 1024 },
  "2gb": { ram: 2048, cpu: 80, disk: 2048 },
  "3gb": { ram: 3072, cpu: 90, disk: 2048 },
  "4gb": { ram: 4096, cpu: 100, disk: 4096 },
  "5gb": { ram: 5120, cpu: 110, disk: 5120 },
  "6gb": { ram: 6144, cpu: 120, disk: 6144 },
  "7gb": { ram: 7168, cpu: 130, disk: 7168 },
  "8gb": { ram: 8192, cpu: 140, disk: 8192 },
  "9gb": { ram: 9216, cpu: 150, disk: 9216 },
  "10gb": { ram: 10240, cpu: 160, disk: 10240 },
  unli: { ram: 0, cpu: 0, disk: 0 },
  unlimited: { ram: 0, cpu: 0, disk: 0 },
};

function cleanJid(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  return jid.includes("@") ? jid : jid + "@s.whatsapp.net";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatDate() {
  return timeHelper.formatDateTime("D MMMM YYYY HH:mm");
}

function parseCommand(cmd, args) {
  // bentuk lama: .1gbv1 (suffix vN di nama command)
  const match = cmd.match(/^(\d+gb|unli(mited)?)(v\d{1,3})$/i);
  if (match) {
    const num = parseInt(match[3].replace("v", ""), 10);
    if (num >= 1 && num <= 100) {
      return {
        ram: match[1].toLowerCase(),
        server: "v" + num,
        serverKey: "s" + num,
      };
    }
    return null;
  }
  // bentuk generik: .1gb v50 username → panel di argumen pertama
  const bare = cmd.match(/^(\d+gb|unli(mited)?)$/i);
  if (bare) {
    const toks = (args || []).map((t) => String(t || "").trim());
    let num = 1;
    const argMatch = toks[0]?.match(/^v(\d{1,3})$/i);
    if (argMatch) {
      const n = parseInt(argMatch[1], 10);
      if (n >= 1 && n <= 100) num = n;
    }
    return { ram: bare[1].toLowerCase(), server: "v" + num, serverKey: "s" + num, panelFromArgs: argMatch ? num : null };
  }
  return null;
}

// FORMAT BARU (request owner 10 Sep 2026): .10gb unli, nama | .10gb unli, 200, nama
// Disk = token pertama (unli/0 = unlimited, else MB). CPU = token kedua (opsional —
// unli/0 = unlimited, else % mis. 200 = 2 core). Username = token ketiga.
// Target opsional di token keempat: .10gb unli, 200, nama, 628xxx
// Return null kalau bukan format baru → jatuh ke parsing lama (.1gb username,628xxx).
function specsLabel(cmd) {
  const m = String(cmd || "").toLowerCase().match(/^(\d+gb|unli)/);
  return m ? m[1].toUpperCase() : "";
}

function parseDiskCpu(argStr) {
  if (!argStr) return null;
  const tokens = String(argStr).split(/[\s,]+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2) return null;
  const LIMIT_RE = /^(unli(mited)?|0|\d{1,7})$/i;
  if (!LIMIT_RE.test(tokens[0])) return null; // token pertama bukan disk → format lama
  const toLimit = (tok) => {
    if (!tok) return null;
    if (/^(unli(mited)?|0)$/i.test(tok)) return 0; // unlimited
    return parseInt(String(tok).replace(/[^0-9]/g, ""), 10);
  };
  const diskMB = toLimit(tokens[0]);
  if (diskMB === null || Number.isNaN(diskMB)) return null;

  let cpuTok, username, nomor = null;
  if (tokens.length === 2) {
    // .10gb unli, nama → cpu ikut unli
    username = tokens[1];
    cpuTok = "unli";
  } else {
    // .10gb unli, 200, nama[, 628xxx]
    cpuTok = tokens[1];
    username = tokens[2];
    if (tokens.length >= 4 && /^\d{8,15}$/.test(tokens[3])) nomor = tokens[3];
  }
  if (!username) return null;
  const cpuPct = toLimit(cpuTok);
  if (cpuPct === null || Number.isNaN(cpuPct)) return null;
  if (cpuPct > 1000 || diskMB > 10000000) return null; // guard: max 10 core / 10TB
  return { diskMB, cpuPct, username: username.toLowerCase(), nomor };
}

function getServerConfig(pteroConfig, serverKey) {
  const num = parseInt(String(serverKey || "").replace("s", ""), 10);
  if (!(num >= 1 && num <= 100)) return null;
  return pteroConfig["server" + num] || null;
}

function validateServerConfig(serverConfig) {
  const missing = [];
  if (!serverConfig?.domain) missing.push("domain");
  if (!serverConfig?.apikey) missing.push("apikey (PTLA)");
  return missing;
}

function getAvailableServers(pteroConfig) {
  const available = [];
  for (let i = 1; i <= 100; i++) {
    const cfg = pteroConfig?.[`server${i}`];
    if (cfg?.domain && cfg?.apikey) available.push(`v${i}`);
  }
  return available;
}

// Auto-generate ptlc_ (Client API Key) setelah buat akun
async function generateClientApiKey(domain, email, password) {
  try {
    // Step 1: Login sebagai user baru
    const loginRes = await axios.post(
      `${domain}/api/auth/login`,
      { email, password },
      { 
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        timeout: 10000
      }
    );
    
    // Token bisa di response.data.token atau response.data.data.token
    const authToken = loginRes.data?.token || loginRes.data?.data?.token;
    if (!authToken) return null;
    
    // Step 2: Create client API key
    const keyRes = await axios.post(
      `${domain}/api/client/account/api-keys`,
      { 
        description: "Auto-generated by Rara Bot",
        allowed_ips: []
      },
      { 
        headers: { 
          Authorization: `Bearer ${authToken}`, 
          "Content-Type": "application/json", 
          "Accept": "application/json" 
        },
        timeout: 10000
      }
    );
    
    // Secret key (ptlc_) bisa di response.data.secret atau response.data.data.secret
    const secret = keyRes.data?.secret || keyRes.data?.data?.secret || null;
    return secret;
  } catch (e) {
    console.log("[Rara Panel] Auto-generate ptlc_ failed:", e?.response?.status || e.message);
    return null;
  }
}

async function handler(m, { sock }) {
  const pteroConfig = config.pterodactyl;

  const mArgs = m.args || [];
  const parsed = parseCommand(m.command, mArgs);
  if (!parsed) {
    return m.reply( raraWrap("Panel", `❌ Format command tidak valid.`), "Panel");
  }

  const { ram, server: serverVersion, serverKey } = parsed;

  const gcSellerAccess = isGcSeller(m.chat, serverVersion)
  if (!gcSellerAccess && !hasAccessToServer(m.sender, serverVersion, m.isOwner)) {
    const userRole = getUserRole(m.sender, serverVersion);
    return m.reply( `❌ *akses ditolak*\n\n` +
      `Kamu tidak punya akses ke *${serverVersion.toUpperCase()}*\n` +
      `Role kamu di ${serverVersion.toUpperCase()}: *${userRole || "Tidak ada"}*\n\n` +
      `Hubungi admin untuk mendapat akses.`, "Panel");
  }

  const jedaCheck = checkPanelJeda(m);
  if (!jedaCheck.allowed) {
    return m.reply(jedaCheck.message);
  }

  const serverConfig = getServerConfig(pteroConfig, serverKey);
  const missingConfig = validateServerConfig(serverConfig);

  if (missingConfig.length > 0) {
    const available = getAvailableServers(pteroConfig);
    let txt = `⚠️ *sErver ${serverVersion.toUpperCase()} Belum Konfig*\n\n`;
    if (available.length > 0) {
      txt += `Server tersedia: *${available.join(", ")}*\n`;
      txt += `Contoh: \`${m.prefix}${ram}${available[0]} username\``;
    } else {
      txt += `Isi config pterodactyl di \`config.js\``;
    }
    return m.reply(raraWrap("Panel", txt));
  }

  let targetUser = null;
  let username = null;
  let customDisk = null; // MB, 0 = unlimited (format baru)
  let customCpu = null;  // %,  0 = unlimited (format baru)
  let argStr = m.text?.trim() || "";
  // bentuk generik .1gb v50 username → buang token vN dari argumen
  if (parsed.panelFromArgs) {
    argStr = argStr.replace(/^v\d{1,3}\s*/i, "").trim();
  }

  // FORMAT BARU: .10gb unli, nama | .10gb unli, 200, nama | .10gb unli, 200, nama, 628xxx
  const spec = parseDiskCpu(argStr);
  if (spec) {
    customDisk = spec.diskMB;
    customCpu = spec.cpuPct;
    username = spec.username;
    if (spec.nomor) targetUser = cleanJid(spec.nomor);
  } else if (argStr.includes(",")) {
    const parts = argStr.split(",");
    username = parts[0]?.trim().toLowerCase();
    let nomor = parts[1]?.trim().replace(/[^0-9]/g, "");
    if (nomor) targetUser = nomor + "@s.whatsapp.net";
  } else if (argStr) {
    username = argStr.trim().toLowerCase();
  }

  if (!username) {
    const available = getAvailableServers(pteroConfig);
    const userRole = getUserRole(m.sender, serverVersion) || "Guest";
    return m.reply( `⚠️ *cara pakai*\n\n` +
      `*Custom disk+CPU:*\n` +
      `\`${m.prefix}${m.command} unli, nama\` (disk & CPU unli)\n` +
      `\`${m.prefix}${m.command} unli, 200, nama\` (CPU 200%)\n` +
      `\`${m.prefix}${m.command} 5000, 100, nama, 628xxx\`\n\n` +
      `*Default:*\n` +
      `\`${m.prefix}${m.command} username\`\n` +
      `\`${m.prefix}${m.command} username,628xxx\`\n` +
      `Reply/tag pesan user\n\n` +
      `RAM: *${specsLabel(m.command)}* | unli = unlimited\n` +
      `Server: *${serverVersion.toUpperCase()}*\n` +
      `Role kamu: *${capitalize(userRole)}*\n` +
      `Server tersedia: *${available.join(", ") || "none"}*`, "Panel");
  }

  if (!/^[a-z0-9_]{3,16}$/.test(username)) {
    return m.reply(
      `❌ Username hanya boleh huruf kecil, angka, underscore (3-16 karakter).`,
    );
  }

  if (!targetUser) {
    if (m.quoted?.sender) {
      targetUser = cleanJid(m.quoted.sender);
    } else if (m.mentionedJid?.length > 0) {
      targetUser = cleanJid(m.mentionedJid[0]);
    } else {
      targetUser = cleanJid(m.sender);
    }
  }

  if (!targetUser) {
    return m.reply(raraWrap("Panel", `❌ Tidak dapat menentukan nomor target.`));
  }

  const isPlatformUser = /^(tg|dc)_/.test(String(targetUser.split("@")[0])); // bridge: user TG/Discord bukan nomor WA
  try {
    const [onWa] = isPlatformUser ? [{ exists: true }] : await sock.onWhatsApp(targetUser.split("@")[0]);
    if (!onWa?.exists) {
      return m.reply(
        `❌ Nomor \`${targetUser.split("@")[0]}\` tidak terdaftar di WhatsApp!`,
      );
    }
  } catch (e) {
    return m.reply(raraWrap("Panel", `Gagal validasi nomor WhatsApp.`));
  }

  const specs = RAM_SPECS[ram];
  if (!specs) {
    return m.reply(raraWrap("Panel", `❌ Paket tidak ditemukan.`));
  }

  const email = `${username}@raramultidevice.id`;
  const name = capitalize(username) + " Server";
  const password = username + crypto.randomBytes(3).toString("hex");
  const serverLabel = serverVersion.toUpperCase();

  await m.react("🕒");

  try {
    let userRes;
    try {
      userRes = await axios.post(
        `${serverConfig.domain}/api/application/users`,
        {
          email,
          username,
          first_name: name,
          last_name: "Panel",
          language: "en",
          password,
        },
        {
          headers: {
            Authorization: `Bearer ${serverConfig.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        },
      );
    } catch (e) { e._step = 'create_user'; throw e; }

    const user = userRes.data.attributes;

    let eggRes;
    try {
      eggRes = await axios.get(
        `${serverConfig.domain}/api/application/nests/${serverConfig.nestid}/eggs/${serverConfig.egg}`,
        {
          headers: {
            Authorization: `Bearer ${serverConfig.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        },
      );
    } catch (e) { e._step = 'fetch_egg'; throw e; }

    const startupCmd = eggRes.data.attributes.startup;

    let serverRes;
    try {
      serverRes = await axios.post(
        `${serverConfig.domain}/api/application/servers`,
        {
          name,
          description: `Created at ${formatDate()} [${serverLabel}]`,
          user: user.id,
          egg: parseInt(serverConfig.egg),
          docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
          startup: startupCmd,
          environment: {
            INST: "npm",
            USER_UPLOAD: "0",
            AUTO_UPDATE: "0",
            CMD_RUN: "npm start",
            JS_FILE: "index.js",
          },
          limits: {
            memory: specs.ram,
            swap: 0,
            disk: customDisk !== null ? customDisk : specs.disk,
            io: 500,
            cpu: customCpu !== null ? customCpu : specs.cpu,
          },
          feature_limits: {
            databases: 5,
            backups: 5,
            allocations: 5,
          },
          deploy: {
            locations: [parseInt(serverConfig.location)],
            dedicated_ip: false,
            port_range: [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${serverConfig.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        },
      );
    } catch (e) { e._step = 'create_server'; throw e; }

    const server = serverRes.data.attributes;

    const ramLabel = specs.ram === 0 ? "Unlimited" : `${specs.ram / 1000} GB`;
    const diskMB = customDisk !== null ? customDisk : specs.disk;
    const cpuPct = customCpu !== null ? customCpu : specs.cpu;
    const diskLabel = diskMB === 0 ? "Unlimited" : `${diskMB} MB`;
    const cpuLabel = cpuPct === 0 ? "Unlimited" : `${cpuPct}%`;

    // Baca delivery mode dari database (1=PM, 2=Grup, 3=PM+Grup)
    const db = getDatabase()
    const deliveryMode = db.setting('panelDeliveryMode') || 1

    // Auto-generate ptlc_ (Client API Key) untuk power control via bot
    let clientApiKey = null;
    try {
      clientApiKey = await generateClientApiKey(serverConfig.domain, email, password);
    } catch (e) {
      console.log("[Rara Panel] ptlc_ generation skipped:", e.message);
    }
    
    // Simpan ptlc_ ke database kalau berhasil
    if (clientApiKey) {
      try {
        const db = getDatabase()
        const panelKeys = db.setting('panelClientKeys') || {}
        panelKeys[m.sender] = {
          ptlc: clientApiKey,
          domain: serverConfig.domain,
          serverId: server.id,
          serverLabel: serverLabel,
          username: user.username,
          createdAt: Date.now()
        }
        db.setting('panelClientKeys', panelKeys)
      } catch (e) {
        console.log("[Rara Panel] Failed to save ptlc_ to db:", e.message);
      }
    }

    let detailTxt = `PANEL BERHASIL DIBUAT\n\n`;
    detailTxt += `Server: *${serverLabel}*\n`;
    detailTxt += `Username: *${user.username}*\n`;
    detailTxt += `Password: *${password}*\n`;
    detailTxt += `RAM: *${ramLabel}*\n`;
    detailTxt += `CPU: *${cpuLabel}*\n`;
    detailTxt += `Storage: *${diskLabel}*\n`;
    detailTxt += `Server ID: *${server.id}*\n`;
    detailTxt += `Panel: ${serverConfig.domain}\n`;
    if (clientApiKey) {
      detailTxt += `Client Key: *${clientApiKey}*\n`;
      detailTxt += `Power control tersedia: .startserver, .stopserver, .restartserver, .cekserver\n`;
    }
    detailTxt += `\nSimpan data ini, jangan bagikan ke siapapun!`;

    const headerMedia = await prepareWAMessageMedia(
      { image: getAssetBuffer("panel-thumb") },
      { upload: sock.waUploadToServer }
    );

    // Helper: bikin interactive message dengan tombol copy
    function buildPanelMsg(recipient) {
      return generateWAMessageFromContent(
        recipient,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                contextInfo: { mentionedJid: [recipient] },
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: detailTxt }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `Panel Pterodactyl - ${serverConfig.domain}` }),
                header: proto.Message.InteractiveMessage.Header.fromObject({
                  hasMediaAttachment: true,
                  imageMessage: headerMedia.imageMessage,
                }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                  buttons: [
                    { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "Copy Username", copy_code: username }) },
                    { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "Copy Password", copy_code: password }) },
                    { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "Buka Panel", url: serverConfig.domain }) },
                  ],
                }),
              }),
            },
          },
        },
        {}
      );
    }

    // Helper: kirim detail ke chat tertentu (untuk grup mode)
    async function sendDetailToChat(chatId) {
      const panelMsg = buildPanelMsg(chatId)
      await sock.relayMessage(chatId, panelMsg.message, { messageId: panelMsg.key.id })
    }

    // Konfirmasi singkat tanpa password (untuk grup)
    const confirmTxt = `Panel *${serverLabel}* berhasil dibuat\n\nUntuk: ${targetUser.split("@")[0]}\nServer: ${serverLabel}\nRAM: ${ramLabel} | CPU: ${cpuLabel} | Storage: ${diskLabel}`;

    // Mode 1: PM Only - kirim ke DM pembuat + target
    if (deliveryMode === 1) {
      await sendDetailToChat(m.sender)
      if (targetUser !== m.sender) {
        await sendDetailToChat(targetUser)
      }
      await m.reply(raraWrap("Panel", confirmTxt + "\n\nDetail akun sudah dikirim ke DM kamu"))
    }
    // Mode 2: Grup Only - kirim detail lengkap di grup/chat
    else if (deliveryMode === 2) {
      await sendDetailToChat(m.chat)
      // Kalau target bukan pembuat dan bukan di chat yang sama, kirim juga ke target
      if (targetUser !== m.sender && targetUser !== m.chat) {
        await sendDetailToChat(targetUser)
      }
    }
    // Mode 3: PM + Grup - kirim ke DM dan grup
    else if (deliveryMode === 3) {
      await sendDetailToChat(m.sender)
      await sendDetailToChat(m.chat)
      if (targetUser !== m.sender && targetUser !== m.chat) {
        await sendDetailToChat(targetUser)
      }
    }

    // NOTIF SALURAN WA (owner 6 Okt 2026): info "server baru dibuat" dikirim
    // ke saluran resmi yang udah diset (.autobroadcastchannel serverCreated on).
    // Anti-throw: gagal kirim saluran GAK boleh ganggu pengiriman akun ke user.
    try {
      const { notifyServerCreated } = await import("../../src/lib/rara-saluran-broadcast.js");
      const buyerJid = cleanJid(m.sender) || "";
      let totalServers = null;
      try {
        const resCount = await axios.get(`${serverConfig.domain}/api/application/servers?per_page=1`, {
          headers: {
            Authorization: `Bearer ${serverConfig.apikey}`,
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        });
        totalServers = resCount.data?.meta?.pagination?.total ?? null;
      } catch {}
      await notifyServerCreated(sock, {
        phoneNumber: buyerJid ? buyerJid.split("@")[0] : "",
        tipe: "Client",
        username: user.username,
        server: serverLabel,
        ram: ramLabel,
        cpu: cpuLabel,
        disk: diskLabel,
        serverId: server.id,
        totalServers,
      });
    } catch (e) {
      console.log("[Rara Panel] Notif saluran gagal (gak fatal):", e?.message || e);
    }

    await m.react("🐣");
    await setPanelLastUsed();
  } catch (err) {
    const rawMsg = err?.response?.data?.errors?.[0]?.detail || err?.response?.data?.message || err.message;
    const errorMap = {
      'has already been taken': `Username/email *${username}* sudah dipakai, coba username lain`,
      'could not find': 'Egg atau nest tidak ditemukan, cek config egg/nestid',
      'No suitable allocation': 'Tidak ada port tersedia di server, hubungi admin panel',
      'unauthorized': 'API key tidak punya permission, buat key baru dengan semua permissions',
    };
    const friendly = Object.entries(errorMap).find(([k]) => rawMsg.toLowerCase().includes(k));
    return m.reply(raraWrap("Panel", `GAGAL MEMBUAT PANEL\n\n${friendly ? friendly[1] : rawMsg}`));
  }
}

export { pluginConfig as config, handler, parseDiskCpu }