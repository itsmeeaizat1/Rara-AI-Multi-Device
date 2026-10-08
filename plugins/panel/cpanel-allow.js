// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// cpanel-allow.js — Sistem akses role hierarki (owner 8 Okt 2026):
//   .addaksescpanel basic, 628174887770, 7d     → user basic: bisa create panel
//     tapi GAK bisa nambahin orang lain
//   .addaksescpanel reseller, 628xxx, 17/05/2026 → user reseller: bisa create
//     + nambahin user lain sebagai BASIC
//   .addaksescpanel admin, 628xxx, 7d           → user admin: bisa nambahin
//     user TANPA akses / yang role-nya di bawah admin jadi basic ATAU reseller
//     (gak bisa kasih admin — itu owner bot)
//   Target: nomor WA / @mention / ID Telegram (tg:4436252)
//   Durasi: 30m|12h|7d|2w|unli | 16:00 (jam) | 17/05/2026 (tanggal) |
//           17/05/2026 16:00 (tanggal + jam)
//   (kompatibel format lama: .addaksescpanel role @user client 7d)
// RESELLER juga bisa: .listaksescpanel (user basic dia aja) +
//   .delaksescpanel <nomor> (cuma basic yang dia sendiri yang nambahin).
// Basic/unknown → ditolak + arahan ke owner/reseller.
// Catatan anti-abuse: akses basic yang dikasih reseller GAK bisa lebih lama
// dari sisa akses reseller itu sendiri (kecuali reseller unli).
import { raraWrap, raraGuide, raraError } from "../../src/lib/rara-menu-style.js";
import { isLid, lidToJid } from "../../src/lib/rara-lid.js";
import {
  allowCreate,
  revokeCreate,
  listCreateAllow,
  isCreateAllowed,
  parseDurasi,
  normalizeTarget,
  cleanNumber,
  formatSisa,
  formatTanggal,
} from "../../src/lib/rara-cpanel-allow.js";

const pluginConfig = {
  name: ["addaksescpanel", "delaksescpanel", "listaksescpanel"],
  alias: ["addcpanel", "delcpanel", "listcpanel", "listallowed"], // nama2 lama tetap jalan
  category: "panel",
  description: "Akses create panel ber-role: basic (create saja), reseller (nambah basic), admin (nambah basic & reseller) — owner mutusin role, tipe, durasi",
  usage: ".addaksescpanel <basic|reseller|admin>, <@user|nomor|tg:id>, <durasi> | .delaksescpanel <nomor|tg:id> | .listaksescpanel (durasi: 30m/12h/7d/2w/unli/16:00/17-05-2026)",
  example: ".addaksescpanel basic, 628174887770, 7d",
  isOwner: false, // reseller juga bisa (gate di handler — cuma boleh nambah basic)
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

const DURASI_PANDUAN = `Durasi: 30m | 12h | 7d | 2w | unli | 16:00 (sampai jam itu) | 17/05/2026 (sampai tanggal itu)`;

// parse argumen fleksibel: pisah koma ATAU spasi, kata "role" opsional.
// "admin" itu ambigu (ROLE admin vs TIPE akun admin) → ditentukan posisi:
// SEBELUM target = role admin (format baru ".addaksescpanel admin, 628xxx, 7d"),
// SETELAH target = tipe akun admin (format lama ".addaksescpanel 628xxx admin 7d").
// Return { role, tipe, targetTok, durasiTok }.
function parseArgs(text) {
  let toks = String(text || "").split(/[,\s]+/).filter(Boolean);
  if (/^role$/i.test(toks[0])) toks = toks.slice(1);
  // pass 1: cari posisi target (token eksplisit pertama)
  let targetIdx = -1;
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    if (/^(?:tg|telegram)[:_]/i.test(a) || a.startsWith("@")) { targetIdx = i; break; }
    if (a.replace(/\D/g, "").length >= 5 && !/^\d{1,2}\//.test(a)) { targetIdx = i; break; }
  }
  let role = null, tipe = null, targetTok = null, durasiTok = null;
  const isTarget = (i, a) => i === targetIdx && (targetTok = a) === a;
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    if (i === targetIdx) { targetTok = a; continue; }
    if (/^role$/i.test(a)) continue;
    if (/^basic$/i.test(a) && !role) { role = "basic"; continue; }
    if (/^reseller$/i.test(a) && !role) { role = "reseller"; continue; }
    if (/^client$/i.test(a) && !tipe) { tipe = "client"; continue; }
    if (/^admin$/i.test(a)) {
      if (i < targetIdx && !role) { role = "admin"; continue; } // sebelum target = ROLE
      if (!tipe) { tipe = "admin"; continue; }                  // setelah target = TIPE
    }
    if (/[:\/]/.test(a)) { if (!durasiTok) durasiTok = a; continue; } // 16:00 / 17/05/2026
    if (/^\d{1,4}(m|h|d|w)$/i.test(a) || /^unli/i.test(a) || /^permanen/i.test(a)) { if (!durasiTok) durasiTok = a; continue; }
    if (!durasiTok) durasiTok = a; // token nyasar → anggap durasi (divalidasi nanti)
  }
  return { role, tipe, targetTok, durasiTok };
}

// target: mention → reply → token. Return id-entry (wa:…/tg:…) atau null.
function resolveTarget(m, targetTok) {
  if (m.mentionedJid?.length) return normalizeTarget(m.mentionedJid[0]);
  if (m.quoted?.sender) return normalizeTarget(m.quoted.sender);
  if (targetTok) {
    if (targetTok.startsWith("@")) return null; // mention teks tanpa data mention → biar guide
    return normalizeTarget(targetTok);
  }
  return null;
}

const ROLE_LABEL = {
  basic: "Basic (create panel saja)",
  reseller: "Reseller (create panel + nambah user basic)",
  admin: "Admin (nambah user basic & reseller)",
};
const ROLE_RANK = { basic: 1, reseller: 2, admin: 3 };
const TIPE_LABEL = { client: "Client (ngatur server sendiri)", admin: "Admin (akses panel admin)" };

function guide(m, subj) {
  const p = m.prefix || ".";
  return raraGuide("cpanel", `${p}${subj}\n\nFormat:\n${p}addaksescpanel <basic|reseller|admin>, <@user|nomor|tg:id_tele>, <durasi>\n\nContoh:\n${p}addaksescpanel basic, 628174887770, 7d\n${p}addaksescpanel reseller, @user, 17/05/2026\n${p}addaksescpanel admin, tg:4436252, 16:00\n${p}delaksescpanel <nomor|tg:id>\n${p}listaksescpanel\n\nRole: basic (create panel saja) | reseller (nambah basic) | admin (nambah basic & reseller)\nTipe akun: client | admin (default client)\n${DURASI_PANDUAN}\nTanpa durasi = selamanya.`);
}

async function handler(m, { sock }) {
  const cmd = String(m.command || "").toLowerCase();
  const isDel = cmd === "delaksescpanel" || cmd === "delcpanel";
  const isList = cmd === "listaksescpanel" || cmd === "listcpanel";

  // ── identitas pemanggil: owner (bebas) / reseller (terbatas) ──
  const p = m.prefix || ".";
  let rolePemanggil = "owner"; // owner bot
  let entryPemanggil = null;
  if (!m.isOwner) {
    const a = isCreateAllowed(m.sender);
    entryPemanggil = a.entry;
    rolePemanggil = ["reseller", "admin"].includes(a.entry?.role) ? a.entry.role : null;
    if (!rolePemanggil) {
      return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\nKamu gak punya izin mengatur akses panel.\n\nCuma *owner*, *admin*, dan *reseller* yang bisa.\n\nMinta akses ke owner:\n${p}addaksescpanel reseller, <nomor kamu>, <durasi>`));
    }
  }
  const idPemanggil = rolePemanggil === "owner" ? "owner" : entryPemanggil.id;

  // ── .listaksescpanel ──
  if (isList) {
    const list = listCreateAllow(idPemanggil, rolePemanggil);
    if (!list.length) {
      return m.reply(raraWrap("cpanel", rolePemanggil === "owner"
        ? `Belum ada user yang punya akses create panel.\n\nTambah dengan: ${p}addaksescpanel basic, <nomor>, 7d`
        : `Belum ada user yang bisa kamu atur.\n\nTambah dengan: ${p}addaksescpanel basic, <nomor>, <durasi>`));
    }
    let txt = "";
    for (const e of list) {
      txt += `📱 ${e.number}${e.platform === "tg" ? " (Telegram)" : ""}\n🛡 Role: ${String(e.role || "basic").toLowerCase() === "reseller" ? "Reseller" : "Basic"}\n⚙️ Tipe: ${String(e.tipe || "client").toLowerCase() === "admin" ? "Admin" : "Client"}\n⏳ ${formatSisa(e.expiresAt)}${e.expiresAt ? ` (berakhir ${formatTanggal(e.expiresAt)})` : ""}${e.addedBy && e.addedBy !== "owner" ? `\n➕ Ditambahin: ${String(e.addedBy).replace(/^(wa|tg):/, "")}` : ""}\n\n`;
    }
    const judul = rolePemanggil === "owner" ? `「 ✦ Akses Create Panel ✦ 」` : rolePemanggil === "admin" ? `「 ✦ Akses Panel (Di Bawah Kamu) ✦ 」` : `「 ✦ User Akses Panel Kamu ✦ 」`;
    return m.reply(raraWrap("cpanel", `${judul}\n\nTotal: ${list.length} user\n\n${txt.trim()}\nCabut dengan: ${p}delaksescpanel <nomor|tg:id>`));
  }

  // ── parse argumen ──
  // m.args produksi = token SETELAH command; fallback m.text + strip nama command
  // (defensif: .addaksescpanel/alias gak boleh kebaca sebagai token durasi).
  let body = Array.isArray(m.args) && m.args.length ? m.args.join(" ") : String(m.text || "");
  body = body.replace(/^\s*\.?(addaksescpanel|addcpanel|delaksescpanel|delcpanel|listaksescpanel|listcpanel|listallowed)\b/i, "");
  const { role, tipe, targetTok, durasiTok } = parseArgs(body);
  const target = resolveTarget(m, targetTok);
  const c = isDel ? "delaksescpanel" : "addaksescpanel";
  if (!target) return m.reply(guide(m, c));

  // ── .delaksescpanel ──
  if (isDel) {
    const ok = revokeCreate(target.id, idPemanggil, rolePemanggil);
    if (!ok) {
      const alasan = rolePemanggil === "reseller"
        ? `Gak bisa dicabut: ${target.display} bukan user basic yang kamu tambahin sendiri.`
        : rolePemanggil === "admin"
          ? `Gak bisa dicabut: ${target.display} setara/lebih tinggi dari kamu, atau gak ada di daftar.`
          : `${target.display} gak ada di daftar akses create panel.`;
      return m.reply(raraWrap("cpanel", alasan));
    }
    return m.reply(raraWrap("cpanel", `「 ✦ Akses Dicabut ✦ 」\n\n📱 ${target.display}${target.platform === "tg" ? " (Telegram)" : ""}\n\nDia gak bisa create cpanel lagi sampai ditambahin ulang.`));
  }

  // ── .addaksescpanel ──
  const roleTarget = role || "basic"; // tanpa role = basic (default aman)
  const tipeTarget = tipe || "client";

  const eksis = isCreateAllowed(target.id).entry;
  // HIERARKI: cuma boleh grant role DI BAWAH pemanggil (owner bebas semua).
  if (rolePemanggil === "reseller" && roleTarget !== "basic") {
    return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\nSebagai reseller kamu cuma bisa nambahin user *basic*.\n\nRole *${roleTarget}* bisa dikasih admin/owner bot.`));
  }
  if (rolePemanggil === "admin" && roleTarget === "admin") {
    return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\nSebagai admin kamu bisa nambahin user *basic* atau *reseller*.\n\nRole *admin* cuma bisa dikasih owner bot.`));
  }
  // target yang udah punya role setara/lebih tinggi dari PEMANGGIL gak boleh
  // diutak-atik (admin boleh naikin basic/reseller; gak boleh sentuh admin lain).
  if (rolePemanggil !== "owner" && eksis) {
    const rkEksis = ROLE_RANK[eksis.role] || 1;
    const rkPemanggil = ROLE_RANK[rolePemanggil] || 0;
    if (rkEksis >= rkPemanggil) {
      return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\n${target.display} sekarang role *${eksis.role}* — setara/lebih tinggi dari akses kamu.\n\nGak bisa diubah lewat kamu.`));
    }
  }
  // reseller gak boleh nyandera user yang udah diatur owner/admin/reseller lain
  if (rolePemanggil === "reseller" && eksis && eksis.addedBy !== idPemanggil) {
    return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\n${target.display} udah punya akses yang diatur owner/admin/reseller lain.\n\nGak bisa diubah lewat kamu.`));
  }
  // tipe admin cuma buat owner
  if (rolePemanggil !== "owner" && tipeTarget === "admin") {
    return m.reply(raraWrap("cpanel", `「 ✦ Akses Ditolak ✦ 」\n\nTipe *admin* (akses panel admin) cuma bisa dikasih owner bot.`));
  }

  const d = parseDurasi(durasiTok);
  if (d.invalid) {
    return m.reply(raraError("cpanel", `Durasi "${durasiTok}" gak dikenal.\n\n${DURASI_PANDUAN}`));
  }

  // ANTI-ABUSE: akses yang dikasih admin/reseller gak boleh lebih lama
  // dari sisa akses mereka sendiri (yang unli bebas).
  let capNote = "";
  let expiresAt = d.expiresAt !== undefined ? d.expiresAt : null;
  let ms = d.ms;
  if (rolePemanggil !== "owner" && entryPemanggil.expiresAt) {
    const own = entryPemanggil.expiresAt;
    if (expiresAt === null || expiresAt === undefined) { expiresAt = own; capNote = "\n\n⏳ Durasi dibatasi sisa akses kamu."; }
    else if (expiresAt > own) { expiresAt = own; capNote = "\n\n⏳ Durasi dibatasi sisa akses reseller kamu."; }
    ms = undefined;
  }

  const res = allowCreate(target.id, ms, tipeTarget, { role: roleTarget, addedBy: idPemanggil, expiresAt });
  if (!res.ok) {
    return m.reply(raraError("cpanel", res.error || "Gagal menambahkan akses."));
  }
  const e = res.entry;
  const tipeLine = tipeTarget === "admin" ? TIPE_LABEL.admin : TIPE_LABEL.client;
  return m.reply(raraWrap("cpanel", `「 ✦ Akses Create Panel ✦ 」\n\n📱 ${e.number}${e.platform === "tg" ? " (Telegram)" : ""}\n🛡 Role: ${ROLE_LABEL[roleTarget]}\n⚙️ Tipe: ${tipeLine}\n⏳ Durasi: ${formatSisa(e.expiresAt)}${e.expiresAt ? `\n📅 Berakhir: ${formatTanggal(e.expiresAt)}` : ""}${capNote}\n\nDia sekarang bisa create panel via ${p}cpanel.${roleTarget === "reseller" ? `\nBisa juga nambahin user lain sebagai basic: ${p}addaksescpanel basic, <nomor>, <durasi>` : ""}${roleTarget === "admin" ? `\nBisa juga nambahin user lain jadi basic atau reseller: ${p}addaksescpanel <basic|reseller>, <nomor>, <durasi>` : ""}\n\nContoh: .cpanel ${tipeTarget}, 1gb 5gb, 200, username,${e.number},1\n\nCabut: ${p}delaksescpanel ${e.number}`));
}

export { handler, pluginConfig, resolveTarget, parseArgs };
export default handler;
