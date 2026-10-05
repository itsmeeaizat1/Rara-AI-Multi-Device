// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// anonim.js — CHAT ANONIM & ANONYMOUS (kategori baru "anonim", setelah "group").
// Permintaan owner 6 Okt 2026: fitur chat anonim ala bot Telegram (screenshot
// terlampir) — bot cocokin dua user acak buat chat tanpa nunjukin identitas,
// plus Statistik, Premium (filter gender + Badge VIP + referral ajak teman),
// dan rating partner 👍/👎 setelah obrolan.
// TERPISAH TOTAL dari plugins/fun/vibychatanonymouschat.js (engine lama
// src/lib/rara-anonchat.js) — jangan disatuin (instruksi owner).
//
// .anonim daftar       isi profil (nama/jenis kelamin/umur/lokasi/referral) — bisa dari grup/DM
// .anonim bataldaftar  berhenti pakai fitur ini
// .anonim find         cari partner (DM only)
// .anonim next         ganti partner (DM only)
// .anonim stop         akhiri obrolan (DM only)
// .anonim settings     filter gender/umur/lokasi — PREMIUM ONLY (DM only)
// .anonim language     ganti bahasa tampilan fitur ini
// .anonim premium      info fitur VIP + kode referral Chat Anonim
// .anonim statistik    statistik kamu (obrolan/pesan/rating/referral/status)
// .anonim report <alasan>  laporkan partner (DM only)
// .anonim help          bantuan
//
// Engine: src/lib/rara-anonim-engine.js (relay, registrasi & rating via
// answerHandler di handler.js, sweeper via index.js schedulerInits).
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap } from "../../src/lib/rara-menu-style.js";
import {
  getProfile, isRegistered, startRegistration, hasRegistrationSession, registrationAnswerHandler,
  unregisterProfile, findPartner, nextPartner, stopChat, reportPartner, setLanguage,
  showSettings, applySettings, showPremiumInfo, showStatistik, helpText, welcomeText,
  relayMessage, ratingAnswerHandler,
} from "../../src/lib/rara-anonim-engine.js";

const pluginConfig = {
  name: "anonim",
  alias: ["anonim", "anonchat2", "anonymous"],
  category: "anonim",
  description: "Chat Anonim & Anonymous — cari partner ngobrol acak secara anonim",
  usage: ".anonim daftar/bataldaftar/find/next/stop/settings/language/premium/statistik/report/help",
  example: ".anonim find",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

const DM_ONLY = new Set(["find", "next", "stop", "report", "settings", "statistik"]);

function isDm(m) {
  return !m.isGroup && !(m.chat || "").endsWith("@g.us");
}

// hook non-command: jawaban rating 👍/👎 → lanjutin sesi daftar (step-by-step) → relay pesan sesi aktif
export async function answerHandler(m, sock) {
  try {
    const db = getDatabase();
    if (await ratingAnswerHandler(m, sock, db)) return true;
    if (await registrationAnswerHandler(m, sock, db)) return true;
    return await relayMessage(m, sock, db);
  } catch { return false; }
}

async function handler(m, { sock, db: _db }) {
  const db = _db || getDatabase();
  const args = (m.args || []).slice();
  const sub = (args.shift() || "").toLowerCase();

  if (DM_ONLY.has(sub) && !isDm(m)) {
    return m.reply(raraWrap("Chat Anonim", "🔒 Fitur ini cuma bisa dipakai di DM bot ya — chat pribadi bot biar privat.\n\nKhusus *daftar/bataldaftar* bisa dari grup."));
  }

  switch (sub) {
    case "daftar": {
      if (isRegistered(db, m.sender)) {
        return m.reply(raraWrap("Chat Anonim", "✅ Kamu udah terdaftar di Chat Anonim.\n\n🔍 Cari partner: *.anonim find*\n🚫 Ganti profil: *.anonim bataldaftar* lalu daftar ulang."));
      }
      if (hasRegistrationSession(m.sender)) {
        return m.reply(raraWrap("Daftar Chat Anonim", "📝 Kamu lagi di tengah proses daftar — balas pertanyaan sebelumnya ya."));
      }
      startRegistration(m.sender);
      return m.reply(raraWrap("Daftar Chat Anonim", "📝 *Daftar Chat Anonim*\n\nSiapa namamu? (nama panggilan, bukan nama asli juga gapapa)"));
    }
    case "bataldaftar":
      return unregisterProfile(m, sock, db);
    case "find":
      return findPartner(m, sock, db);
    case "next":
      return nextPartner(m, sock, db);
    case "stop":
      return stopChat(m, sock, db);
    case "report":
      return reportPartner(m, sock, db, args.join(" "));
    case "settings":
      if (!args.length) return showSettings(m, sock, db);
      return applySettings(m, sock, db, args);
    case "language": {
      const lang = (args[0] || "").toLowerCase();
      if (lang !== "id" && lang !== "en") {
        return m.reply(raraWrap("Chat Anonim", "⚠️ *.anonim language id* atau *.anonim language en*"));
      }
      if (!isRegistered(db, m.sender)) {
        return m.reply(raraWrap("Chat Anonim", "📝 Kamu belum daftar. *.anonim daftar* dulu ya."));
      }
      setLanguage(db, m.sender, lang);
      return m.reply(raraWrap("Chat Anonim", `✅ Bahasa diganti ke *${lang === "en" ? "English" : "Indonesia"}*.`));
    }
    case "premium":
      return showPremiumInfo(m, sock, db);
    case "statistik":
    case "stat":
      return showStatistik(m, sock, db);
    case "help":
      return m.reply(helpText());
    default:
      return m.reply(welcomeText(getProfile(db, m.sender)));
  }
}

export { pluginConfig as config, handler };
