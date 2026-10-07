// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// cpanel-allow.js — Konfirmasi owner buat create panel (owner 6 Okt 2026):
// "user gak bisa langsung create cpanel, owner harus menambahkan dulu"
//   .addaksescpanel @user 7d             → izin create tipe client 7 hari
//   .addaksescpanel role @user client 7d → sama (kata "role" opsional)
//   .addaksescpanel 628xxx admin 30d     → izin create tipe admin 30 hari
//   .addaksescpanel @user unli          → tipe client selamanya
//   (revisi owner 7 Okt): owner mutusin tipe client|admin + durasi —
//   user berizin cuma bisa create sesuai tipenya.
//   .delcpanel @user         → cabut izin
//   .listcpanel              → daftar izin aktif + sisa waktu
// OWNER BOT ONLY. Akses create dicek oleh .cpanel (buat akun panel).
import { raraWrap, raraGuide, raraError } from "../../src/lib/rara-menu-style.js";
import { isLid, lidToJid } from "../../src/lib/rara-lid.js";
import {
  allowCreate,
  revokeCreate,
  listCreateAllow,
  parseDurasi,
  cleanNumber,
  formatSisa,
  formatTanggal,
} from "../../src/lib/rara-cpanel-allow.js";

const pluginConfig = {
  name: ["addaksescpanel", "delcpanel", "listcpanel"],
  alias: ["addcpanel", "listallowed"], // addcpanel = nama lama, tetap jalan
  category: "panel",
  description: "Izin create panel dari owner: tipe (client|admin) + durasi ditentukan saat .addaksescpanel — user berizin cuma bisa create sesuai tipenya",
  usage: ".addaksescpanel role @user|nomor <client|admin> <durasi> | .delcpanel @user|nomor | .listcpanel (tipe default client; durasi: 30m/12h/7d/2w/unli)",
  example: ".addaksescpanel role @user 7d",
  isOwner: true,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function cleanJid(jid) {
  if (!jid) return null;
  if (isLid(jid)) jid = lidToJid(jid);
  return jid.includes("@") ? jid : jid + "@s.whatsapp.net";
}

// target: mention → reply → nomor mentah. Return jid atau null.
function resolveTarget(m, args) {
  if (m.mentionedJid?.length) return cleanJid(m.mentionedJid[0]);
  if (m.quoted?.sender) return cleanJid(m.quoted.sender);
  for (const a of args) {
    const n = a.replace(/[^0-9]/g, "");
    if (n.length >= 7) return cleanJid(n);
  }
  return null;
}

async function handler(m, { sock }) {
  const cmd = String(m.command || "").toLowerCase();
  // args tanpa nama command & kata "role" (opsional sesuai format owner)
  const rawArgs = m.args || (m.text || "").trim().split(/\s+/).filter(Boolean);
  const args = rawArgs.filter((a, i) => i > 0 || !/^role$/i.test(a));

  // ── .listcpanel ──
  if (cmd === "listcpanel") {
    const list = listCreateAllow();
    if (!list.length) {
      return m.reply(raraWrap("cpanel", `Belum ada user yang punya izin create panel.\n\nTambah dengan: ${(m.prefix || ".")}addaksescpanel @user <client|admin> 7d`));
    }
    let txt = "";
    for (const e of list) {
      txt += `📱 ${e.number}\n🛡 Tipe: ${String(e.tipe || "client").toLowerCase() === "admin" ? "Admin" : "Client"}\n⏳ ${formatSisa(e.expiresAt)}${e.expiresAt ? ` (berakhir ${formatTanggal(e.expiresAt)})` : ""}\n\n`;
    }
    return m.reply(raraWrap("cpanel", `「 ✦ Izin Create Panel ✦ 」\n\nTotal: ${list.length} user\n\n${txt.trim()}\nCabut dengan: ${(m.prefix || ".")}delcpanel <nomor>`));
  }

  const target = resolveTarget(m, args);
  if (!target) {
    const c = cmd === "delcpanel" ? "delcpanel" : "addaksescpanel";
    return m.reply(raraGuide("cpanel", `${(m.prefix || ".")}${c} role <@user|nomor> <client|admin> <durasi>\n\nContoh:\n${(m.prefix || ".")}addaksescpanel role @user client 7d\n${(m.prefix || ".")}addaksescpanel 62812345678 admin 30d\n${(m.prefix || ".")}addaksescpanel @user unli (tipe client selamanya)\n${(m.prefix || ".")}delcpanel @user\n\nTipe: client (ngatur server sendiri) | admin (akses panel admin)\nDurasi: 30m | 12h | 7d | 2w | unli\nTanpa tipe = client | Tanpa durasi = selamanya.`));
  }

  // ── .delcpanel ──
  if (cmd === "delcpanel") {
    const ok = revokeCreate(target);
    if (!ok) {
      return m.reply(raraWrap("cpanel", `Nomor ${cleanNumber(target)} tidak ada di daftar izin create panel.`));
    }
    return m.reply(raraWrap("cpanel", `「 ✦ Izin Dicabut ✦ 」\n\n📱 Nomor: ${cleanNumber(target)}\n\nDia gak bisa create cpanel lagi sampai ditambahkan ulang.`));
  }

  // ── .addaksescpanel ──
  // token durasi = token pertama yang bukan mention/nomor/kata "role"/tipe.
  // (revisi owner 7 Okt): tipe client|admin opsional di posisi mana pun,
  // default client. Token nyasar (mis. "7x") JANGAN diabaikan diam-diam →
  // kasih error jelas, biar owner gak dikira dah di-izin padahal salah format.
  let tipe = "client";
  for (const a of args) {
    if (/^(client|admin)$/i.test(a)) tipe = a.toLowerCase();
  }
  let durasiTok = null;
  for (const a of args) {
    if (a.startsWith("@") || /^role$/i.test(a)) continue;
    if (/^(client|admin)$/i.test(a)) continue;
    if (a.replace(/\D/g, "").length >= 7) continue;
    durasiTok = a;
    break;
  }
  const d = parseDurasi(durasiTok);
  if (d.invalid) {
    return m.reply(raraError("cpanel", `Durasi "${durasiTok}" gak dikenal.\n\nFormat: 30m | 12h | 7d | 2w | unli`));
  }
  const res = allowCreate(target, d.ms, tipe);
  if (!res.ok) {
    return m.reply(raraError("cpanel", res.error || "Gagal menambahkan izin."));
  }
  const e = res.entry;
  return m.reply(raraWrap("cpanel", `「 ✦ Izin Create Panel ✦ 」\n\n📱 Nomor: ${e.number}\n🛡 Tipe: ${tipe === "admin" ? "Admin (akses panel admin)" : "Client (ngatur server sendiri)"}\n⏳ Durasi: ${formatSisa(e.expiresAt)}${e.expiresAt ? `\n📅 Berakhir: ${formatTanggal(e.expiresAt)}` : ""}\n\nDia sekarang bisa buat akun panel tipe *${tipe}* via ${(m.prefix || ".")}cpanel.\nContoh: .cpanel ${tipe}, 1gb 5gb, 200, username,${e.number},1\n\nCabut: ${(m.prefix || ".")}delcpanel ${e.number}`));
}

export { handler, pluginConfig, resolveTarget };
export default handler;
