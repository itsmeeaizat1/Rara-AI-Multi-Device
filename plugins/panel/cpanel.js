// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// cpanel.js — Pusat kontrol panel Pterodactyl (v1-v100)
// Power   : .cpanel start|stop|restart|kill <namaserver> <idpanel>
// Status  : .cpanel status <namaserver> <idpanel>
// Upload  : .cpanel upload <namaserver> <idpanel> (reply file)
// Create  : .cpanel <tipe>, <disk> <ram>, <cpu>, <username>,<nomor>,<idpanel>
//          (revisi owner 7 Okt: tipe client|admin + durasi izin ditentukan
//          owner pas .addaksescpanel; user berizin create sesuai tipenya) | singkat:
//          .cpanel <ram> <username>,<nomor>,<idpanel>  → akun dikirim ke nomor
// Login   : .cpanel login <username>,<password>,<idpanel> → akses kontrol server sendiri (7 hari)
// Logout  : .cpanel logout <idpanel>
// Menu lama dipindah ke .panelmenu

import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import config from "../../config.js";
import { raraWrap, raraBerhasil, raraGagal, raraGangguan } from "../../src/lib/rara-menu-style.js";
import { isLid, lidToJid } from "../../src/lib/rara-lid.js";
import { hasAccessToServer, getUserRole } from "../../src/lib/rara-roles-cpanel.js";
import { isCreateAllowed, cleanNumber as allowCleanNumber } from "../../src/lib/rara-cpanel-allow.js";
import { isGcSeller } from "./gcseller.js";
import { checkPanelJeda, setPanelLastUsed } from "../../src/lib/rara-panel-jeda.js";
import * as timeHelper from "../../src/lib/rara-time.js";
import { downloadMediaMessage } from "rara";
import { getDatabase } from "../../src/lib/rara-database.js";
import { getPanel, listPanels } from "../../src/lib/panel/index.js";
import { buildServerDescription } from "../../src/lib/panel/description.js";
import { isLocationMismatchError, buildLocationMismatchHelp } from "../../src/lib/panel/locations.js";

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
  description: "Pusat kontrol panel Pterodactyl (v1-v100): buat akun client/admin + spesifikasi (izin .addaksescpanel dari owner; kredensial bisa dikirim ke DM WhatsApp ATAU DM Telegram via bridge), power/status/upload server, login client 7 hari",
  usage: ".cpanel client|admin, <disk> <ram>, <cpu>, <username>,<nomor|tg:id_tele>,<idpanel> | .cpanel <ram> <username>,<nomor|tg:id_tele>,<idpanel> | .cpanel start|stop|restart|kill|status|upload <namaserver> <idpanel> | .cpanel login <username>,<password>,<idpanel> | izin create: .addaksescpanel <nomor> <client|admin> <durasi>",
  example: ".panel aizat aizat123, 1",
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

// ── (owner 7 Okt) TARGET CREATE: nomor WA → DM WhatsApp; ID Telegram → DM TG ──
// 3 cara nunjukin user Telegram: prefix tg:<id> (atau telegram:<id>), jid
// bridge tg_<id> (create dari chat Telegram), atau fallback angka yang gak
// terdaftar di WhatsApp (3-10 digit = id user TG, bridge harus nyala).
// Return { kind: "wa"|"tg", jid, tgId, display } — throw Error kalau invalid.
let _tgClientForTest = undefined;
export function _setTgClientForTest(client) { _tgClientForTest = client; }
export async function getTgClient() {
  if (_tgClientForTest !== undefined) return _tgClientForTest;
  try {
    const mgr = await import("../../src/lib/rarabridge/manager.js");
    return (mgr.getTelegramClient && mgr.getTelegramClient()) || null;
  } catch { return null; }
}
export async function resolveCreateTarget(raw, sock) {
  let t = String(raw || "").trim();
  let forcedTg = false;
  const pref = t.match(/^(?:tg|telegram)[:_]/i);
  if (pref) { t = t.slice(pref[0].length); forcedTg = true; }
  let local = t.split("@")[0];
  if (!forcedTg && /^tg_/i.test(local)) { local = local.slice(3); forcedTg = true; }
  if (forcedTg) {
    const id = local.replace(/[^0-9-]/g, "");
    if (!/^-?\d{3,15}$/.test(id)) {
      throw new Error(`ID Telegram "${local}" tidak valid (harus angka, contoh: tg:4436252).`);
    }
    const client = await getTgClient();
    if (!client) throw new Error(`Bridge Telegram belum nyala — aktifkan dulu:\n.bridge on telegram`);
    return { kind: "tg", tgId: id, jid: `tg_${id}@s.whatsapp.net`, display: id };
  }
  const jid = cleanJid(t);
  const l2 = jid.split("@")[0];
  const isPlatformUser = /^(tg|dc)_/.test(l2); // bridge: user TG/Discord bukan nomor WA
  if (!isPlatformUser) {
    let onWa = null;
    try { const [r] = await sock.onWhatsApp(l2); onWa = r; } catch { onWa = null; }
    if (onWa?.exists) return { kind: "wa", jid, tgId: null, display: l2 };
    // fallback: angka gak terdaftar WA + bridge TG nyala → anggap id user TG
    const digits = l2.replace(/[^0-9]/g, "");
    const client = await getTgClient();
    if (digits.length >= 3 && digits.length <= 10 && client) {
      return { kind: "tg", tgId: digits, jid, display: digits };
    }
    throw new Error(`Nomor ${l2} tidak terdaftar di WhatsApp.\nKalau targetnya user Telegram, format:\n.cpanel <tipe>, <disk> <ram>, <cpu>, <username>,tg:<id_tele>,<idpanel>\nContoh: .cpanel client, 5gb 5gb, 200, aizat2,tg:4436252,1`);
  }
  return { kind: "wa", jid, tgId: null, display: l2 }; // jid platform lain (dc_) — perilaku lama
}

// ── GATE KONFIRMASI OWNER (6 Okt 2026): create cpanel butuh izin .addaksescpanel ──
// user gak bisa langsung create; owner harus .addaksescpanel <nomor> <durasi> dulu.
// Throttle 10 menit per nomor biar gak spam DM owner.
const _createReqNotify = new Map();
async function notifyOwnerCreateRequest(sock, sender) {
  const num = allowCleanNumber(sender);
  if (!num) return;
  const now = Date.now();
  const last = _createReqNotify.get(num) || 0;
  if (now - last < 10 * 60 * 1000) return;
  _createReqNotify.set(num, now);
  const owners = config.owner?.number || [];
  const txt = `「 ✦ Permintaan Akses Panel ✦ 」

📱 Nomor: ${num}

Dia mencoba membuat akun panel tapi belum punya izin create.

Izinkan dengan:
.addaksescpanel ${num} 7d
.addaksescpanel ${num} 30d
.addaksescpanel ${num} unli

Tolak: cukup diabaikan.`;
  for (const o of owners) {
    try { await sock.sendMessage(o.includes("@") ? o : o + "@s.whatsapp.net", { text: txt }); } catch {}
  }
}

// parse id panel: "1" / "v1" → 1-100
function parsePanelId(input) {
  const m = String(input || "").trim().match(/^v?(\d{1,3})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  if (!(num >= 1 && num <= MAX_PANELS)) return null;
  return num;
}

// semua konfigurasi PTLA/PTLC/domain resolve via src/lib/panel/ (pusat panel)
function getSlot(num) {
  const p = getPanel(num);
  if (!p?.domain || !p?.apikey) return null;
  return p;
}

function getAvailableSlots() {
  return listPanels();
}

// ── FORMAT BARU (owner 6 Okt 2026): .cpanel <tipe>, <disk> <ram>, <cpu>, <username>,<nomor>,<idpanel> ──
// tipe client = akun biasa TANPA akses admin (level PTLC — cuma ngatur server sendiri).
// tipe admin  = akun root_admin panel (level PTLA — bisa masuk area admin panel).
// disk & ram dipisah spasi: "1gb 5gb" (1gb-100gb) | unli/0 = unlimited.
// cpu: angka persen (200 = 2 core) | unli = unlimited (kosong dianggap unli).
function parseRoleSpec(text) {
  if (!text) return null;
  const parts = String(text).split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 4) return null;
  const role = parts[0].toLowerCase().replace(/[^a-z]/g, "");
  if (role !== "client" && role !== "admin") return null;
  const specM = parts[1].match(/^(\d{1,3}gb|unli(?:mited)?|0)\s+(\d{1,3}gb|unli(?:mited)?|0)$/i);
  if (!specM) return null;
  const toMB = (tok) => {
    const t = String(tok).toLowerCase();
    if (/^(unli(mited)?|0)$/.test(t)) return 0;
    return parseInt(t, 10) * 1024;
  };
  const diskMB = toMB(specM[1]);
  const ramMB = toMB(specM[2]);
  if (!Number.isInteger(diskMB) || !Number.isInteger(ramMB) || ramMB > 102400 || diskMB > 102400) return null; // max 100 GB
  const cpuTok = parts[2] || "unli";
  let cpuPct = 0;
  if (!/^(unli(mited)?|0)$/i.test(cpuTok)) {
    cpuPct = parseInt(String(cpuTok).replace(/[^0-9]/g, ""), 10);
    if (!Number.isInteger(cpuPct) || cpuPct < 0 || cpuPct > 1000) return null; // max 10 core
  }
  const username = parts[3]?.toLowerCase();
  if (!username || !/^[a-z0-9_]{3,16}$/.test(username)) return null;
  let nomor = null;
  let nomorRaw = null; // (owner 7 Okt) penanda platform tg:4436252 dipertahankan
  let panelId = null;
  if (parts[4]) {
    nomorRaw = parts[4];
    nomor = parts[4].replace(/[^0-9]/g, "");
    if (!nomor) return null;
    if (parts[5]) {
      panelId = parsePanelId(parts[5]);
      if (!panelId) return null; // idpanel ditulis tapi invalid → jangan tebak
    }
  }
  return { role, diskMB, ramMB, cpuPct, username, nomor, nomorRaw, panelId };
}

// Buat akun via format tipe client/admin (root_admin) + disk/ram/cpu custom.
async function createWithRole(m, { sock }, spec) {
  const panelId = spec.panelId || 1;
  const slot = getSlot(panelId);
  if (!slot?.domain || !slot?.apikey) {
    return m.reply(raraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi (butuh domain + PTLA).\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}\nSet domain: ${(m.prefix || ".")}setpanel v${panelId} http://domain-panel.com\nSet PTLA: ${(m.prefix || ".")}setpanel v${panelId} apikey ptla_xxxx`));
  }
  const ver = "v" + panelId;

  // Mode admin (root_admin) = akun bisa masuk area admin panel.
  // (revisi owner 7 Okt 2026): user mau akses panel harus di-add owner dulu —
  // owner mutusin TIPE (client|admin) + durasi pas .addaksescpanel; user berizin
  // cuma bisa create sesuai tipenya (enforcement di gate bawah).
  const isAdmin = spec.role === "admin";

  // GATE (owner 6 Okt 2026): create butuh izin .addaksescpanel dari owner.
  // Owner bot selalu lolos; role panel/gc-seller TIDAK lagi otomatis bisa create.
  // (revisi owner 7 Okt): TIPE client|admin ditentukan owner pas .addaksescpanel —
  // user berizin cuma bisa create sesuai tipenya (izin lama = client).
  if (!m.isOwner) {
    const allow = isCreateAllowed(m.sender);
    if (!allow.allowed) {
      try { await notifyOwnerCreateRequest(sock, m.sender); } catch {}
      return m.reply(raraWrap("cpanel", `Akses create panel butuh konfirmasi owner.\n\nOwner harus menambahkanmu dulu:\n${m.prefix || "."}addaksescpanel <nomor kamu> <client|admin> <durasi>\n\nContoh: ${(m.prefix || ".")}addaksescpanel ${allowCleanNumber(m.sender)} client 7d\n\nPermintaanmu sudah diberitahukan ke owner.`));
    }
    const allowTipe = String(allow.entry?.tipe || "client").toLowerCase();
    if (allowTipe !== spec.role) {
      return m.reply(raraWrap("cpanel", `Izin create kamu cuma tipe *${allowTipe}*.\n\nGunakan format:\n${m.prefix || "."}cpanel ${allowTipe}, <disk> <ram>, <cpu>, <username>,<nomor>,<idpanel>\n\nMau tipe ${spec.role}? Minta owner:\n${m.prefix || "."}addaksescpanel <nomor kamu> ${spec.role} <durasi>`));
    }
  }
  const jedaCheck = checkPanelJeda(m);
  if (!jedaCheck.allowed) return m.reply(jedaCheck.message);

  // (owner 7 Okt) target: nomor WA → DM WhatsApp; ID Telegram (tg:<id> / jid
  // bridge tg_ / fallback angka gak terdaftar WA) → DM via bridge Telegram.
  let tgt;
  try {
    tgt = await resolveCreateTarget(spec.nomorRaw || spec.nomor || (m.sender || "").split("@")[0], sock);
  } catch (e) {
    return m.reply(raraWrap("cpanel", String(e?.message || e)));
  }
  const targetUser = tgt.jid;

  await m.react("🕒");
  const email = `${spec.username}@raramultidevice.id`;
  const name = capitalize(spec.username) + " Server";
  const password = spec.username + crypto.randomBytes(3).toString("hex");
  const gbLabel = (mb) => (mb === 0 ? "Unlimited" : `${mb / 1024} GB`);
  const ramLabel = gbLabel(spec.ramMB);
  const diskLabel = gbLabel(spec.diskMB);
  const cpuLabel = spec.cpuPct === 0 ? "Unlimited" : `${spec.cpuPct}%`;
  const tipeLabel = isAdmin ? "Admin (akses panel admin)" : "Client (tanpa akses admin)";

  try {
    // 1. buat user — root_admin cuma true kalau tipe admin (Application API
    //    Pterodactyl validasi field root_admin: "Root Administrator Status")
    let userRes;
    try {
      userRes = await axios.post(
        `${slot.domain}/api/application/users`,
        { email, username: spec.username, first_name: name, last_name: "Panel", language: "en", password, root_admin: isAdmin },
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
        return m.reply(raraWrap("cpanel", `Username/email ${spec.username} sudah dipakai, coba username lain.`));
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

    // 3. buat server — limits disk/ram/cpu custom dari spec
    const serverRes = await axios.post(
      `${slot.domain}/api/application/servers`,
      {
        name,
        description: buildServerDescription(`Created at ${timeHelper.formatDateTime("D MMMM YYYY HH:mm")} [${ver.toUpperCase()}] [${isAdmin ? "ADMIN" : "CLIENT"}]`),
        user: user.id,
        egg: parseInt(slot.egg),
        docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
        startup: startupCmd,
        environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start", JS_FILE: "index.js" },
        limits: { memory: spec.ramMB, swap: 0, disk: spec.diskMB, io: 500, cpu: spec.cpuPct },
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

    // 4. kirim kredensial ke nomor target
    let credTxt = `PANEL PTERODACTYL\n\n`;
    credTxt += `Domain: ${slot.domain}\n`;
    credTxt += `Username: ${user.username}\n`;
    credTxt += `Password: ${password}\n`;
    credTxt += `Tipe Akun: ${tipeLabel}\n`;
    credTxt += `RAM: ${ramLabel} | Disk: ${diskLabel} | CPU: ${cpuLabel}\n`;
    credTxt += `Nama Server: ${server.name}\n`;
    credTxt += `Server ID: ${server.id}\n\n`;
    credTxt += `Login di domain di atas untuk mengelola server.\n`;
    credTxt += `Kontrol via bot (login sekali, aktif 7 hari):\n`;
    credTxt += `.cpanel ${user.username} ${password},${panelId}\n`;
    credTxt += `.cpanel status <namaserver> ${panelId}\n`;
    credTxt += `.cpanel start <namaserver> ${panelId}\n`;
    credTxt += `\nSimpan data ini, jangan bagikan ke siapapun!`;
    // (owner 7 Okt) kirim: WA DM atau DM Telegram via bridge — kalau TG gagal
    // (user belum pernah chat bot / blokir), akun tetap jadi + kredensial
    // ditunjukin ke creator biar gak hilang.
    let sentLabel = tgt.display;
    let tgFailed = null;
    if (tgt.kind === "tg") {
      const client = await getTgClient();
      if (!client) tgFailed = "bridge Telegram mati";
      else {
        try { await client.sendMessage(tgt.tgId, credTxt); sentLabel = `DM Telegram ${tgt.tgId}`; }
        catch (e) { tgFailed = e?.message || "gagal kirim DM Telegram"; }
      }
    } else {
      await sock.sendMessage(targetUser, { text: credTxt });
    }
    if (tgFailed) {
      await m.react("❗");
      return m.reply(raraWrap("cpanel", `Akun ${user.username} BERHASIL dibuat, tapi kirim ke DM Telegram ${tgt.tgId} gagal (${tgFailed} — user belum pernah chat bot / blokir).\n\nSimpan kredensial ini manual:\nDomain: ${slot.domain}\nUsername: ${user.username}\nPassword: ${password}\nTipe: ${tipeLabel}`));
    }

    // 5. notif saluran (anti-throw — gagal gak ganggu akun ke user)
    try {
      const { notifyServerCreated } = await import("../../src/lib/rara-saluran-broadcast.js");
      let totalServers = null;
      try {
        const resCount = await axios.get(`${slot.domain}/api/application/servers?per_page=1`, {
          headers: { Authorization: `Bearer ${slot.apikey}`, Accept: "Application/vnd.pterodactyl.v1+json" },
        });
        totalServers = resCount.data?.meta?.pagination?.total ?? null;
      } catch {}
      await notifyServerCreated(sock, {
        phoneNumber: tgt.display,
        tipe: isAdmin ? "Admin" : "Client",
        username: user.username,
        server: server.name,
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
    return m.reply(`Akun panel untuk ${user.username} berhasil dibuat di panel ${ver.toUpperCase()} kak 🥳\n\nTipe: ${tipeLabel}\nRAM: ${ramLabel} | Disk: ${diskLabel} | CPU: ${cpuLabel}\nData akun sudah dikirim ke ${sentLabel}\n\nKontrol server sendiri (user):\n${m.prefix || "."}panel ${user.username} <password>,${panelId}`);
  } catch (err) {
    console.error("[cpanel create role]", err?.response?.data || err.message);
    await m.react("❌");
    const rawMsg = err?.response?.data?.errors?.[0]?.detail || err?.response?.data?.message || err.message;
    const errorMap = {
      'has already been taken': `Username/email ${spec.username} sudah dipakai, coba username lain`,
      'could not find': 'Egg atau nest tidak ditemukan, cek config egg/nestid',
      'No suitable allocation': 'Tidak ada port tersedia di server, hubungi admin panel',
      unauthorized: 'API key tidak punya permission atau salah (Unauthenticated)',
    };
    const friendly = Object.entries(errorMap).find(([k]) => String(rawMsg).toLowerCase().includes(k));
    if (isLocationMismatchError(rawMsg)) {
      const help = await buildLocationMismatchHelp(slot);
      if (help) return m.reply(raraWrap("cpanel", help));
    }
    return m.reply(raraWrap("cpanel", `Gagal membuat panel.\n\n${friendly ? friendly[1] : rawMsg}`));
  }
}

// ══ Session login user (kontrol server sendiri tanpa role) ══
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function loadSessions() {
  const db = getDatabase();
  return db.setting("panelSessions") || {};
}
function saveSessions(sessions) {
  const db = getDatabase();
  db.setting("panelSessions", sessions);
}
function getSession(m, panelId) {
  const s = loadSessions()[cleanJid(m.sender)];
  if (!s || !s.ptlc) return null;
  if (Date.now() > (s.expiresAt || 0)) return null;
  if (panelId && s.panelId !== panelId) return null;
  return s;
}

const GUIDE = `Kontrol Panel Pterodactyl (v1-v100)

「 🔧 Setup Panel (owner, sekali aja) 」
{p}setpanel v1 http://domain-panel.com → set domain
{p}setpanel v1 apikey ptla_xxxx → PTLA: key application, WAJIB (buat create & kontrol semua)
{p}setpanel v1 capikey ptlc_xxxx → PTLC: key client, opsional (buat operasi client tanpa login)
Ambil PTLA: panel → Admin → API | PTLC: panel → Account → API Credentials
PTLA & PTLC boleh barengan, gak saling hapus.

「 🛠️ Cara Kasih Akses Create 」
User mau akses panel harus di-add owner dulu (owner bot otomatis bisa).
Owner mutusin tipe + durasi pas .addaksescpanel:
.addaksescpanel @user client 7d   → izin create tipe client 7 hari
.addaksescpanel @user admin unli → izin create tipe admin selamanya
.addaksescpanel 628xxx 7d         → tanpa tipe = client
.delaksescpanel @user            → cabut izin
.listaksescpanel                  → daftar izin aktif + tipe
Durasi: 30m / 12h / 7d / 2w / unli
User yang udah dibuka izinnya tinggal create sesuai tipenya, format di bawah.

「 📦 Buat Akun + Spesifikasi 」
.cpanel <tipe>, <disk> <ram>, <cpu>, <username>,<nomor>,<idpanel>
Contoh tipe client:
.cpanel client, 5gb 5gb, 200, aizat2, 628174887770, 1
Contoh tipe admin:
.cpanel admin, 5gb 5gb, 200, aizat2, 628174887770, 1
Kirim ke DM Telegram (ganti nomor dengan tg:<id_tele>):
.cpanel client, 5gb 5gb, 200, aizat2,tg:4436252,1
Tipe ngikutin izin dari owner (spek create-nya sama lengkap):
• client = izin client, cuma ngatur server sendiri
• admin = izin admin, masuk area admin panel (lihat semua server, ubah spek siapa pun)
Disk/RAM: 1gb - 100gb, unli | CPU: angka persen (200 = 2 core), unli
Atau format singkat (paket ram otomatis):
.cpanel <ram> <username>,<nomor>,<idpanel>
Contoh: .cpanel 5gb aizat2,628174887770,1
RAM: 1gb - 10gb, unli

「 ⚡ Kontrol Server 」
Power:
.cpanel start|stop|restart|kill <namaserver> <idpanel>
Status & Upload:
.cpanel status <namaserver> <idpanel>
.cpanel upload <namaserver> <idpanel> (reply file)

「 🔑 Login Client (kontrol server sendiri) 」
.cpanel login <username>,<password>,<idpanel>
Contoh: .cpanel login aizat,aizat123,1
Logout: .cpanel logout <idpanel>

「 ℹ️ 」
Spesifikasi server (ram/cpu/disk) diatur pas create oleh creator.
Client gak bisa ubah ram/cpu sendiri — minta creator/admin.
Panel aktif: {available}`;

function buildGuide(m) {
  const p = m.prefix || ".";
  const available = getAvailableSlots().join(", ") || "belum ada";
  const txt = GUIDE.replace("{available}", available).replace(/\{p\}/g, p);
  return raraWrap("cpanel", txt);
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

// ══════════ LOGIN (dipanggil dari 2 format) ══════════
// Format 1: .cpanel login <username>,<password>,<idpanel>
// Format 2: .cpanel <username> <password>,<idpanel>   (contoh: .panel aizat aizat123, 1)
async function doPanelLogin(m, username, password, panelId) {
  const slot = getSlot(panelId);
  if (!slot?.domain || !slot?.apikey) {
    return m.reply(raraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi.\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}`));
  }
  const ver = "v" + panelId;

  await m.react("🕒");
  try {
    // 1. cari email user via application API (login Ptero pakai email, bukan username)
    let email = null;
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages && !email) {
      const res = await axios.get(
        `${slot.domain}/api/application/users?page=${page}&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${slot.apikey}`,
            "Content-Type": "application/json",
            Accept: "Application/vnd.pterodactyl.v1+json",
          },
        }
      );
      const hit = (res.data.data || []).find(
        (u) => u.attributes.username.toLowerCase() === username.toLowerCase()
      );
      if (hit) email = hit.attributes.email;
      totalPages = res.data.meta?.pagination?.total_pages || 1;
      page++;
    }
    if (!email) {
      await m.react("❗");
      return m.reply(raraWrap("cpanel", `Username "${username}" tidak ditemukan di panel ${ver.toUpperCase()}.`));
    }

    // 2. verifikasi password via login API
    let authToken;
    try {
      const loginRes = await axios.post(
        `${slot.domain}/api/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json", Accept: "application/json" }, timeout: 10000 }
      );
      authToken = loginRes.data?.token || loginRes.data?.data?.token;
    } catch (e) {
      await m.react("❗");
      return m.reply(raraWrap("cpanel", `Username atau password salah. Coba lagi.`));
    }
    if (!authToken) {
      await m.react("❗");
      return m.reply(raraWrap("cpanel", `Login gagal, coba lagi nanti.`));
    }

    // 3. buat client API key (ptlc) untuk session
    const keyRes = await axios.post(
      `${slot.domain}/api/client/account/api_keys`,
      { description: "Rara Bot Control Session", allowed_ips: [] },
      {
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json", Accept: "application/json" },
        timeout: 10000,
      }
    );
    const ptlc = keyRes.data?.secret || keyRes.data?.data?.secret;
    if (!ptlc) {
      await m.react("❗");
      return m.reply(raraWrap("cpanel", `Login berhasil tapi gagal membuat session key. Coba lagi.`));
    }

    // 4. simpan session 7 hari
    const sessions = loadSessions();
    sessions[cleanJid(m.sender)] = {
      ptlc,
      username: username.toLowerCase(),
      email,
      panelId,
      domain: slot.domain,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MS,
    };
    saveSessions(sessions);

    await m.react("🐣");
    const p = m.prefix || ".";
    return m.reply(`Login panel ${ver.toUpperCase()} berhasil kak 🥳\n\nUsername: ${username}\nSession aktif 7 hari\n\nKontrol server milik akunmu:\n${p}cpanel status <namaserver> ${panelId}\n${p}cpanel start <namaserver> ${panelId}\n${p}cpanel stop <namaserver> ${panelId}\n${p}cpanel restart <namaserver> ${panelId}\n${p}cpanel kill <namaserver> ${panelId}\n${p}cpanel upload <namaserver> ${panelId} (reply file)\n\nLogout: ${p}cpanel logout ${panelId}`);
  } catch (err) {
    console.error("[cpanel login]", err?.response?.data || err.message);
    await m.react("❌");
    return m.reply(raraGangguan("cpanel"));
  }
}


async function handler(m, { sock }) {
  const args = m.args || (m.text || "").trim().split(/\s+/).filter(Boolean);
  if (!args.length) return m.reply(buildGuide(m));

  const sub = String(args[0] || "").toLowerCase();

  // (owner 8 Okt) `.panel status|info|fixqueue` TANPA nama server = info panel via VPS
  // (plugin statuspanel). `.cpanel status <server> <idpanel>` tetap status server game.
  if (["status", "info", "fixqueue"].includes(sub) && args.length === 1 && (m.command === "panel" || m.command === "p")) {
    const ps = await import("./panelstatus.js");
    return ps.handler(m, { sock });
  }

  // FORMAT TIPE (owner 6 Okt 2026): .cpanel client, 1gb 5gb, 200, aizat, 628xxx, 1
  const roleSpec = parseRoleSpec(m.text);
  if (roleSpec) return createWithRole(m, { sock }, roleSpec);

  // ══════════ POWER / STATUS / UPLOAD ══════════
  if (POWER_SIGNALS.includes(sub) || sub === "status" || sub === "upload") {
    const serverName = args[1];
    const panelId = parsePanelId(args[2]);
    if (!serverName || !panelId) {
      return m.reply(raraWrap("cpanel", `Format salah.\n\nContoh: ${m.prefix || "."}cpanel ${sub} ${serverName || "namaserver"} <idpanel>\nId panel: 1-100 (contoh 1 = domain panel no 1)`));
    }
    const slot = getSlot(panelId);
    if (!slot?.domain || !slot?.apikey) {
      return m.reply(raraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi (butuh domain + PTLA).\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}\nSet domain: ${m.prefix || "."}setpanel v${panelId} http://domain-panel.com\nSet PTLA: ${m.prefix || "."}setpanel v${panelId} apikey ptla_xxxx`));
    }
    const ver = "v" + panelId;
    // akses: owner / gc-seller / role panel  →  ATAU  session login user (server sendiri)
    const isAdminAccess = m.isOwner || isGcSeller(m.chat, ver) || hasAccessToServer(m.sender, ver, false);
    const session = !isAdminAccess ? getSession(m, panelId) : null;
    if (!isAdminAccess && !session) {
      const role = getUserRole(m.sender, ver) || "Tidak ada";
      return m.reply(raraWrap("cpanel", `Akses ditolak.\n\nKamu tidak punya akses ke panel ${ver.toUpperCase()}.\nRole kamu: ${role}\n\nLogin pakai akun panelmu:\n${m.prefix || "."}panel <username> <password>,${panelId}`));
    }

    await m.react("🕒");
    try {
      let attr, clientKey = null;
      if (session) {
        // user login: daftar server milik akunnya via client API (ptlc cuma bisa lihat server sendiri)
        const cli = await axios.get(`${slot.domain}/api/client?per_page=100`, {
          headers: { Authorization: `Bearer ${session.ptlc}`, Accept: "application/json" },
        });
        const mine = (cli.data.data || []).map((s) => s.attributes);
        const hit = mine.find((a) => a.name.toLowerCase() === String(serverName).toLowerCase());
        if (!hit) {
          await m.react("❗");
          const names = mine.slice(0, 10).map((a) => a.name);
          let txt = `Server "${serverName}" tidak ditemukan di akunmu (panel ${ver.toUpperCase()}).`;
          if (names.length) txt += `\n\nServer milik akun ${session.username}: ${names.join(", ")}`;
          return m.reply(raraWrap("cpanel", txt));
        }
        attr = { id: hit.internal_id, uuid: hit.uuid, name: hit.name };
        clientKey = session.ptlc;
      } else {
        const found = await findServerByName(slot, serverName);
        if (!found.exact) {
          await m.react("❗");
          let txt = `Server "${serverName}" tidak ditemukan di panel ${ver.toUpperCase()} (total ${found.total} server).`;
          if (found.suggestions.length) txt += `\n\nNama mirip: ${found.suggestions.join(", ")}`;
          txt += `\n\nLihat daftar: ${m.prefix || "."}listserver ${panelId}`;
          return m.reply(raraWrap("cpanel", txt));
        }
        attr = found.exact.attributes;
      }

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

      // client API: user login pakai ptlc session-nya; admin pakai capikey
      if (!clientKey && !slot.capikey) {
        await m.react("❗");
        return m.reply(raraWrap("cpanel", `Fitur ${sub} butuh Client API key (capikey) panel ${ver.toUpperCase()} — atau login dulu via ${m.prefix || "."}cpanel login.\n\nSet capikey via: ${m.prefix || "."}setpanel v${panelId} capikey ptlc_xxxx`));
      }
      if (!clientKey) clientKey = slot.capikey;

      // ── status ──
      if (sub === "status") {
        const res = await axios.get(
          `${slot.domain}/api/client/servers/${attr.uuid}/resources`,
          { headers: { Authorization: `Bearer ${clientKey}`, Accept: "application/json" } }
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
          return m.reply(raraWrap("cpanel", `Reply file/audio/gambar/video dengan caption:\n${m.prefix || "."}cpanel upload ${serverName} ${panelId}`));
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
          return m.reply(raraWrap("cpanel", `Gagal mengunduh media. Pastikan kamu reply file dengan caption command.`));
        }
        // ambil upload URL dari client API
        const upRes = await axios.get(
          `${slot.domain}/api/client/servers/${attr.uuid}/files/upload`,
          { headers: { Authorization: `Bearer ${clientKey}`, Accept: "application/json" } }
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
        return m.reply(raraGangguan("cpanel"));
      }
      return m.reply(raraGagal("cpanel"));
    }
  }

  // ══════════ LOGIN USER ══════════
  if (sub === "login") {
    const raw = args.slice(1).join(" ");
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts[0] || !parts[1] || !parsePanelId(parts[2])) {
      return m.reply(raraWrap("cpanel", `Format salah.\n\n${m.prefix || "."}panel <username> <password>,<idpanel>\n\nContoh: ${m.prefix || "."}panel aizat aizat123, 1`));
    }
    return doPanelLogin(m, parts[0], parts[1], parsePanelId(parts[2]));
  }

  // ══════════ LOGOUT ══════════
  if (sub === "logout") {
    const panelId = parsePanelId(args[1]);
    const sessions = loadSessions();
    const key = cleanJid(m.sender);
    if (!sessions[key]) {
      return m.reply(raraWrap("cpanel", `Kamu tidak punya session login aktif.`));
    }
    if (panelId && sessions[key].panelId !== panelId) {
      return m.reply(raraWrap("cpanel", `Session kamu bukan di panel v${panelId}. Session kamu: v${sessions[key].panelId}`));
    }
    const uname = sessions[key].username;
    delete sessions[key];
    saveSessions(sessions);
    return m.reply(`Logout panel berhasil kak 🥳 (${uname})`);
  }

  // ══════════ CEK SESSION ══════════
  if (sub === "me") {
    const s = getSession(m, null);
    if (!s) {
      return m.reply(raraWrap("cpanel", `Belum login.\n\nLogin: ${m.prefix || "."}cpanel login <username>,<password>,<idpanel>`));
    }
    const days = Math.max(0, Math.ceil((s.expiresAt - Date.now()) / 86400000));
    return m.reply(`Session Panel\n\nUsername: ${s.username}\nPanel: v${s.panelId}\nBerlaku: ${days} hari lagi`);
  }

  // ══════════ BUAT AKUN PANEL ══════════
  if (RAM_SPECS[sub]) {
    const restTokens = args.slice(1);
    // format: username,nomor,idpanel  (idpanel boleh token ke-3 terpisah)
    const parts = restTokens.join(" ").split(",").map((s) => s.trim()).filter(Boolean);
    const username = parts[0];
    const nomorRaw = parts[1] || null; // (owner 7 Okt) penanda tg: dipertahankan
    const nomor = nomorRaw ? nomorRaw.replace(/[^0-9]/g, "") : null;
    let panelId = parsePanelId(parts[2]);
    if (!panelId) panelId = parsePanelId(restTokens[restTokens.length - 1]);

    if (!username || !nomor || !panelId) {
      return m.reply(raraWrap("cpanel", `Format salah.\n\n${m.prefix || "."}cpanel ${sub} <username>,<nomor>,<idpanel>\n\nContoh: ${m.prefix || "."}cpanel ${sub} aizat,628174887770,1`));
    }
    const slot = getSlot(panelId);
    if (!slot?.domain || !slot?.apikey) {
      return m.reply(raraWrap("cpanel", `Panel v${panelId} belum dikonfigurasi.\n\nPanel aktif: ${getAvailableSlots().join(", ") || "belum ada"}`));
    }
    const ver = "v" + panelId;
    const specs = RAM_SPECS[sub];
    if (!/^[a-z0-9_]{3,16}$/.test(username)) {
      return m.reply(raraWrap("cpanel", `Username hanya boleh huruf kecil, angka, underscore (3-16 karakter).`));
    }

    // GATE (owner 6 Okt 2026): create butuh izin .addaksescpanel dari owner.
    // (revisi owner 7 Okt): jalur paket RAM ini otomatis tipe client — pemilik
    // izin tipe admin harus pakai format lengkap .cpanel admin, <disk> <ram>, <cpu>, ...
    if (!m.isOwner) {
      const allow = isCreateAllowed(m.sender);
      if (!allow.allowed) {
        try { await notifyOwnerCreateRequest(sock, m.sender); } catch {}
        return m.reply(raraWrap("cpanel", `Akses create panel butuh konfirmasi owner.\n\nOwner harus menambahkanmu dulu:\n${m.prefix || "."}addaksescpanel <nomor kamu> <client|admin> <durasi>\n\nContoh: ${(m.prefix || ".")}addaksescpanel ${allowCleanNumber(m.sender)} client 7d\n\nPermintaanmu sudah diberitahukan ke owner.`));
      }
      const allowTipe = String(allow.entry?.tipe || "client").toLowerCase();
      if (allowTipe === "admin") {
        return m.reply(raraWrap("cpanel", `Izin create kamu tipe *admin* — pakai format lengkap:\n${m.prefix || "."}cpanel admin, <disk> <ram>, <cpu>, <username>,<nomor>,<idpanel>\n\nContoh: ${(m.prefix || ".")}cpanel admin, 5gb 5gb, 200, aizat,${allowCleanNumber(m.sender)},1`));
      }
    }
    const jedaCheck = checkPanelJeda(m);
    if (!jedaCheck.allowed) return m.reply(jedaCheck.message);

    // (owner 7 Okt) target: nomor WA → DM WA; tg:<id_tele> → DM bridge Telegram
    let tgt;
    try {
      tgt = await resolveCreateTarget(nomorRaw || (m.sender || "").split("@")[0], sock);
    } catch (e) {
      return m.reply(raraWrap("cpanel", String(e?.message || e)));
    }
    const targetUser = tgt.jid;

    await m.react("🕒");
    const email = `${username}@raramultidevice.id`;
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
          return m.reply(raraWrap("cpanel", `Username/email ${username} sudah dipakai, coba username lain.`));
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
          description: buildServerDescription(`Created at ${timeHelper.formatDateTime("D MMMM YYYY HH:mm")} [${ver.toUpperCase()}]`),
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
      credTxt += `Kontrol via bot (login sekali, aktif 7 hari):\n`;
      credTxt += `.cpanel ${user.username} ${password},${panelId}\n`;
      credTxt += `.cpanel status <namaserver> ${panelId}\n`;
      credTxt += `.cpanel start <namaserver> ${panelId}\n`;
      credTxt += `\nSimpan data ini, jangan bagikan ke siapapun!`;
      // (owner 7 Okt) WA DM atau DM Telegram via bridge (fallback manual bila gagal)
      let sentLabel = tgt.display;
      let tgFailed = null;
      if (tgt.kind === "tg") {
        const client = await getTgClient();
        if (!client) tgFailed = "bridge Telegram mati";
        else {
          try { await client.sendMessage(tgt.tgId, credTxt); sentLabel = `DM Telegram ${tgt.tgId}`; }
          catch (e) { tgFailed = e?.message || "gagal kirim DM Telegram"; }
        }
      } else {
        await sock.sendMessage(targetUser, { text: credTxt });
      }
      if (tgFailed) {
        await m.react("❗");
        return m.reply(raraWrap("cpanel", `Akun ${user.username} BERHASIL dibuat, tapi kirim ke DM Telegram ${tgt.tgId} gagal (${tgFailed} — user belum pernah chat bot / blokir).\n\nSimpan kredensial ini manual:\nDomain: ${slot.domain}\nUsername: ${user.username}\nPassword: ${password}`));
      }

      // notif saluran (anti-throw) — .cpanel <ram> path lama = akun client biasa
      try {
        const { notifyServerCreated } = await import("../../src/lib/rara-saluran-broadcast.js");
        let totalServers = null;
        try {
          const resCount = await axios.get(`${slot.domain}/api/application/servers?per_page=1`, {
            headers: { Authorization: `Bearer ${slot.apikey}`, Accept: "Application/vnd.pterodactyl.v1+json" },
          });
          totalServers = resCount.data?.meta?.pagination?.total ?? null;
        } catch {}
        await notifyServerCreated(sock, {
          phoneNumber: tgt.display,
          tipe: "Client",
          username: user.username,
          server: server.name,
          ram: ramLabel,
          cpu: specs.cpu === 0 ? "Unlimited" : `${specs.cpu}%`,
          disk: specs.disk === 0 ? "Unlimited" : `${specs.disk / 1024} GB`,
          serverId: server.id,
          totalServers,
        });
      } catch (e) {
        console.log("[Rara Panel] Notif saluran gagal (gak fatal):", e?.message || e);
      }

      await m.react("🐣");
      await setPanelLastUsed();
      return m.reply(`Akun panel untuk ${user.username} berhasil dibuat di panel ${ver.toUpperCase()} kak 🥳\n\nRAM: ${ramLabel}\nData akun sudah dikirim ke ${sentLabel}\n\nKontrol server sendiri (user):\n${m.prefix || "."}panel ${user.username} <password>,${panelId}`);
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
      if (isLocationMismatchError(rawMsg)) {
        const help = await buildLocationMismatchHelp(slot);
        if (help) return m.reply(raraWrap("cpanel", help));
      }
      return m.reply(raraWrap("cpanel", `Gagal membuat akun panel.\n\n${friendly ? friendly[1] : rawMsg}`));
    }
  }

  // ══════════ LOGIN SHORTCUT: .panel <username> <password>,<idpanel> ══════════
  // contoh: .panel aizat aizat123, 1  → login domain panel 1
  {
    const username = args[0];
    const rest = args.slice(1).join(" ");
    const parts = rest.split(",").map((s) => s.trim()).filter(Boolean);
    const password = parts[0];
    const shortcutPanel = parsePanelId(parts[1]);
    if (username && password && shortcutPanel) {
      return doPanelLogin(m, username, password, shortcutPanel);
    }
    return m.reply(buildGuide(m));
  }
}

export { pluginConfig as config, handler, parseRoleSpec };
