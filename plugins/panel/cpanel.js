// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// cpanel.js — Pusat kontrol panel Pterodactyl (v1-v100)
// Power   : .cpanel start|stop|restart|kill <namaserver> <idpanel>
// Status  : .cpanel status <namaserver> <idpanel>
// Upload  : .cpanel upload <namaserver> <idpanel> (reply file)
// Create  : .cpanel <ram> <username>,<nomor>,<idpanel>  → akun dikirim ke nomor
// Menu lama dipindah ke .panelmenu

import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import config from "../../config.js";
import { claraWrap, novaBerhasil, novaGagal, novaGangguan } from "../../src/lib/nova-menu-style.js";
import { isLid, lidToJid } from "../../src/lib/nova-lid.js";
import { hasAccessToServer, getUserRole } from "../../src/lib/nova-roles-cpanel.js";
import { isGcSeller } from "./gcseller.js";
import { checkPanelJeda, setPanelLastUsed } from "../../src/lib/nova-panel-jeda.js";
import * as timeHelper from "../../src/lib/nova-time.js";
import { downloadMediaMessage } from "nova";

const MAX_PANELS = 100;
const POWER_SIGNALS = ["start", "stop", "restart", "kill"];
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

const pluginConfig = {
  name: ["cpanel"],
  alias: ["panel"],
  category: "panel",
  description: "Kontrol panel Pterodactyl: start/stop/restart/kill, status, upload file, buat akun (v1-v100)",
  usage: ".cpanel start <namaserver> <idpanel> | .cpanel status <nama> <id> | .cpanel upload <nama> <id> | .cpanel unli aizat,628xxx,1",
  example: ".cpanel start Aizat1 1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function cleanJid(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  return jid.includes("@") ? jid : jid + "@s.whatsapp.net";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// parse id panel: "1" / "v1" → 1-100
function parsePanelId(input) {
  const m = String(input || "").trim().match(/^v?(\d{1,3})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (!(num >= 1 && num <= MAX_PANELS)) return null;
  return num;
}

function getSlot(num) {
  return config.pterodactyl?.["server" + num] || null;
}

function getAvailableSlots() {
  const out = [];
  const ptero = config.pterodactyl || {};
  for (let i = 1; i <= MAX_PANELS; i++) {
    const cfg = ptero["server" + i];
    if (cfg?.domain && cfg?.apikey) out.push("v" + i);
  }
  return out;
}

function buildGuide(m) {
  const p = m.prefix || ".";
  const available = getAvailableSlots();
  let txt = `Kontrol Panel Pterodactyl (v1-v100)\n\n`;
  txt += `Power Server:\n`;
  txt += `${p}cpanel start <namaserver> <idpanel>\n`;
  txt += `${p}cpanel stop <namaserver> <idpanel>\n`;
  txt += `${p}cpanel restart <namaserver> <idpanel>\n`;
  txt += `${p}cpanel kill <namaserver> <idpanel>\n\n`;
  txt += `Status & Upload:\n`;
  txt += `${p}cpanel status <namaserver> <idpanel>\n`;
  txt += `${p}cpanel upload <namaserver> <idpanel> (reply file)\n\n`;
  txt += `Buat Akun Panel:\n`;
  txt += `${p}cpanel <ram> <username>,<nomor>,<idpanel>\n`;
  txt += `Contoh: ${p}cpanel unli aizat,628174887770,1\n`;
  txt += `RAM: 1gb - 10gb, unli\n\n`;
  txt += `Panel aktif: ${available.join(", ") || "belum ada"}`;
  return claraWrap("cpanel", txt);
}

// cari server by name (case-insensitive) di panel — return attr + suggestions
async function findServerByName(serverConfig, name) {
  let all = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const res = await axios.get(
      `${serverConfig.domain}/api/application/servers?page=${page}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${serverConfig.apikey}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json",
        },
      }
    );
    all = all.concat(res.data.data || []);
    totalPages = res.data.meta?.pagination?.total_pages || 1;
    page++;
  }
  const lower = String(name).toLowerCase();
  const exact = all.find((s) => s.attributes.name.toLowerCase() === lower);
  const suggestions = all
    .filter((s) => s.attributes.name.toLowerCase().includes(lower))
    .slice(0, 10)
    .map((s) => s.attributes.name);
  return { exact, suggestions, total: all.length };
}

async function handler(m, { sock }) {
  const args = m.args || (m.text || "").trim().split(/\s+/).filter(Boolean);
  if (!args.length) return m.reply(buildGuide(m));

  const sub = String(args[0] || "").toLowerCase();

  // ══════════ POWER / STATUS / UPLOAD ══════════
  if (POWER_SIGNALS.includes(sub) || sub === "status" || sub === "upload") {
    const serverName = args[1];
    const panelId = parsePanelId(args[2]);
    if (!serverName || !panelId) {
      return m.reply(claraWrap("cpanel", `Format salah.\n\nContoh: ${m.prefix || "."}cpanel ${sub} ${serverName || "namaserver"} <idpanel>\nId panel: 1-100 (contoh 1 = domain panel no 1)`));
    }
    const slot = getSlot(panelId);
    if (!slot?.domain || !slot?.apikey) {
      return m.reply(claraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi.\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}\nSet via: ${m.prefix || "."}setpanel v${panelId} <domain>`));
    }
    const ver = "v" + panelId;
    if (!m.isOwner && !isGcSeller(m.chat, ver) && !hasAccessToServer(m.sender, ver, false)) {
      const role = getUserRole(m.sender, ver) || "Tidak ada";
      return m.reply(claraWrap("cpanel", `Akses ditolak.\n\nKamu tidak punya akses ke panel ${ver.toUpperCase()}.\nRole kamu: ${role}`));
    }

    await m.react("🕒");
    try {
      const found = await findServerByName(slot, serverName);
      if (!found.exact) {
        await m.react("❗");
        let txt = `Server "${serverName}" tidak ditemukan di panel ${ver.toUpperCase()} (total ${found.total} server).`;
        if (found.suggestions.length) txt += `\n\nNama mirip: ${found.suggestions.join(", ")}`;
        txt += `\n\nLihat daftar: ${m.prefix || "."}listserver ${panelId}`;
        return m.reply(claraWrap("cpanel", txt));
      }
      const attr = found.exact.attributes;

      // ── power control (application API) ──
      if (POWER_SIGNALS.includes(sub)) {
        await axios.post(
          `${slot.domain}/api/application/servers/${attr.id}/power`,
          { signal: sub },
          {
            headers: {
              Authorization: `Bearer ${slot.apikey}`,
              "Content-Type": "application/json",
              Accept: "Application/vnd.pterodactyl.v1+json",
            },
          }
        );
        await m.react("🐣");
        const label = { start: "dinyalakan", stop: "dimatikan", restart: "direstart", kill: "dihentikan paksa" }[sub];
        return m.reply(`Server ${attr.name} di panel ${ver.toUpperCase()} berhasil ${label} kak 🥳`);
      }

      // client API (butuh capikey)
      if (!slot.capikey) {
        await m.react("❗");
        return m.reply(claraWrap("cpanel", `Fitur ${sub} butuh Client API key (capikey) panel ${ver.toUpperCase()}.\n\nSet via: ${m.prefix || "."}setpanel v${panelId} capikey ptlc_xxxx`));
      }

      // ── status ──
      if (sub === "status") {
        const res = await axios.get(
          `${slot.domain}/api/client/servers/${attr.uuid}/resources`,
          { headers: { Authorization: `Bearer ${slot.capikey}`, Accept: "application/json" } }
        );
        const st = res.data.attributes || {};
        const state = String(st.current_state || "unknown");
        const mem = st.resources?.memory_bytes ? (st.resources.memory_bytes / 1024 / 1024).toFixed(0) + " MB" : "-";
        const cpu = st.resources?.cpu_absolute != null ? st.resources.cpu_absolute.toFixed(1) + "%" : "-";
        await m.react("🐣");
        return m.reply(`Server: ${attr.name}\nPanel: ${ver.toUpperCase()}\nStatus: ${state}\nRAM: ${mem}\nCPU: ${cpu}`);
      }

      // ── upload file (reply media) ──
      if (sub === "upload") {
        const quotedMsg = m.quoted?.message;
        if (!quotedMsg) {
          await m.react("❗");
          return m.reply(claraWrap("cpanel", `Reply file/audio/gambar/video dengan caption:\n${m.prefix || "."}cpanel upload ${serverName} ${panelId}`));
        }
        let buffer, filename;
        try {
          buffer = await downloadMediaMessage({ key: m.quoted.key, message: quotedMsg }, "buffer", {});
          const media = quotedMsg.documentMessage || quotedMsg.audioMessage || quotedMsg.videoMessage || quotedMsg.imageMessage || {};
          const mime = media.mimetype || "";
          const ext = (mime.split("/")[1] || "bin").split(";")[0];
          filename = media.fileName || `upload_${Date.now()}.${ext}`;
        } catch (e) {
          await m.react("❗");
          return m.reply(claraWrap("cpanel", `Gagal mengunduh media. Pastikan kamu reply file dengan caption command.`));
        }
        // ambil upload URL dari client API
        const upRes = await axios.get(
          `${slot.domain}/api/client/servers/${attr.uuid}/files/upload`,
          { headers: { Authorization: `Bearer ${slot.capikey}`, Accept: "application/json" } }
        );
        const uploadUrl = upRes.data.attributes;
        const fd = new FormData();
        fd.append("files", buffer, { filename });
        await axios.post(uploadUrl, fd, { headers: fd.getHeaders(), maxBodyLength: Infinity, maxContentLength: Infinity });
        await m.react("🐣");
        return m.reply(`File ${filename} berhasil diupload ke server ${attr.name} (panel ${ver.toUpperCase()}) kak 🥳`);
      }
    } catch (err) {
      console.error("[cpanel]", err?.response?.data || err.message);
      await m.react("❌");
      const detail = err?.response?.data?.errors?.[0]?.detail || err?.response?.data?.message || err.message;
      if (detail.includes("capikey") || err?.response?.status === 401 || err?.response?.status === 403) {
        return m.reply(novaGangguan("cpanel"));
      }
      return m.reply(novaGagal("cpanel"));
    }
  }

  // ══════════ BUAT AKUN PANEL ══════════
  if (RAM_SPECS[sub]) {
    const restTokens = args.slice(1);
    // format: username,nomor,idpanel  (idpanel boleh token ke-3 terpisah)
    const parts = restTokens.join(" ").split(",").map((s) => s.trim()).filter(Boolean);
    const username = parts[0];
    const nomor = parts[1] ? parts[1].replace(/[^0-9]/g, "") : null;
    let panelId = parsePanelId(parts[2]);
    if (!panelId) panelId = parsePanelId(restTokens[restTokens.length - 1]);

    if (!username || !nomor || !panelId) {
      return m.reply(claraWrap("cpanel", `Format salah.\n\n${m.prefix || "."}cpanel ${sub} <username>,<nomor>,<idpanel>\n\nContoh: ${m.prefix || "."}cpanel ${sub} aizat,628174887770,1`));
    }
    const slot = getSlot(panelId);
    if (!slot?.domain || !slot?.apikey) {
      return m.reply(claraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi.\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}`));
    }
    const ver = "v" + panelId;
    const specs = RAM_SPECS[sub];
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      return m.reply(claraWrap("cpanel", `Username hanya boleh huruf kecil, angka, underscore (3-16 karakter).`));
    }

    const gcSellerAccess = isGcSeller(m.chat, ver);
    if (!gcSellerAccess && !hasAccessToServer(m.sender, ver, m.isOwner)) {
      const role = getUserRole(m.sender, ver) || "Tidak ada";
      return m.reply(claraWrap("cpanel", `Akses ditolak.\n\nKamu tidak punya akses ke panel ${ver.toUpperCase()}.\nRole kamu: ${role}`));
    }
    const jedaCheck = checkPanelJeda(m);
    if (!jedaCheck.allowed) return m.reply(jedaCheck.message);

    const targetUser = cleanJid(nomor);
    try {
      const [onWa] = await sock.onWhatsApp(targetUser.split("@")[0]);
      if (!onWa?.exists) {
        return m.reply(claraWrap("cpanel", `Nomor ${targetUser.split("@")[0]} tidak terdaftar di WhatsApp.`));
      }
    } catch (e) {
      return m.reply(claraWrap("cpanel", `Gagal validasi nomor WhatsApp.`));
    }

    await m.react("🕒");
    const email = `${username}@nova.md`;
    const name = capitalize(username) + " Server";
    const password = username + crypto.randomBytes(3).toString("hex");
    const ramLabel = specs.ram === 0 ? "Unlimited" : `${specs.ram / 1000} GB`;

    try {
      // 1. buat user
      let userRes;
      try {
        userRes = await axios.post(
          `${slot.domain}/api/application/users`,
          { email, username, first_name: name, last_name: "Panel", language: "en", password },
          {
            headers: {
              Authorization: `Bearer ${slot.apikey}`,
              "Content-Type": "application/json",
              Accept: "Application/vnd.pterodactyl.v1+json",
            },
          }
        );
      } catch (e) {
        const raw = e?.response?.data?.errors?.[0]?.detail || e.message;
        if (String(raw).includes("already been taken")) {
          return m.reply(claraWrap("cpanel", `Username/email ${username} sudah dipakai, coba username lain.`));
        }
        throw e;
      }
      const user = userRes.data.attributes;

      // 2. ambil startup dari egg
      const eggRes = await axios.get(
        `${slot.domain}/api/application/nests/${slot.nestid}/eggs/${slot.egg}`,
        {
          headers: {
            Authorization: `Bearer ${slot.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        }
      );
      const startupCmd = eggRes.data.attributes.startup;

      // 3. buat server
      const serverRes = await axios.post(
        `${slot.domain}/api/application/servers`,
        {
          name,
          description: `Created at ${timeHelper.formatDateTime("D MMMM YYYY HH:mm")} [${ver.toUpperCase()}]`,
          user: user.id,
          egg: parseInt(slot.egg),
          docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
          startup: startupCmd,
          environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start", JS_FILE: "index.js" },
          limits: { memory: specs.ram, swap: 0, disk: specs.disk, io: 500, cpu: specs.cpu },
          feature_limits: { databases: 5, backups: 5, allocations: 5 },
          deploy: { locations: [parseInt(slot.location)], dedicated_ip: false, port_range: [] },
        },
        {
          headers: {
            Authorization: `Bearer ${slot.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        }
      );
      const server = serverRes.data.attributes;

      // 4. kirim kredensial ke nomor target (plain text)
      let credTxt = `PANEL PTERODACTYL\n\n`;
      credTxt += `Domain: ${slot.domain}\n`;
      credTxt += `Username: ${user.username}\n`;
      credTxt += `Password: ${password}\n`;
      credTxt += `RAM: ${ramLabel}\n`;
      credTxt += `Nama Server: ${server.name}\n`;
      credTxt += `Server ID: ${server.id}\n\n`;
      credTxt += `Login di domain di atas untuk mengelola server.\n`;
      credTxt += `Simpan data ini, jangan bagikan ke siapapun!`;
      await sock.sendMessage(targetUser, { text: credTxt });

      await m.react("🐣");
      await setPanelLastUsed();
      return m.reply(`Akun panel untuk ${user.username} berhasil dibuat di panel ${ver.toUpperCase()} kak 🥳\n\nRAM: ${ramLabel}\nData akun sudah dikirim ke ${targetUser.split("@")[0]}`);
    } catch (err) {
      console.error("[cpanel create]", err?.response?.data || err.message);
      await m.react("❌");
      const rawMsg = err?.response?.data?.errors?.[0]?.detail || err?.response?.data?.message || err.message;
      const errorMap = {
        "could not find": "Egg atau nest tidak ditemukan, cek config egg/nestid",
        "No suitable allocation": "Tidak ada port tersedia di server, hubungi admin panel",
        unauthorized: "API key tidak punya permission",
      };
      const friendly = Object.entries(errorMap).find(([k]) => String(rawMsg).toLowerCase().includes(k));
      return m.reply(claraWrap("cpanel", `Gagal membuat akun panel.\n\n${friendly ? friendly[1] : rawMsg}`));
    }
  }

  return m.reply(buildGuide(m));
}

export { pluginConfig as config, handler };
