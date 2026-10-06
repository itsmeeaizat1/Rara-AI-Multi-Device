// ═══════════════════════════════════════════════════════════════════════════
// .briefing — RARA DAILY BRIEFING PERSONAL (25 Sep 2026)
// Kartu pagi otomatis ke DM: cuaca lokasi kamu, gempa 24 jam, jadwal tim
// favorit, agenda reminder, saldo RPG, catatan personal — semua API LIVE.
// Engine: src/lib/rara-briefing.js (jangan duplikasi logika di sini).
// ═══════════════════════════════════════════════════════════════════════════

import { raraGuide, raraWrap } from "../../src/lib/rara-menu-style.js";
import { getDatabase } from "../../src/lib/rara-database.js";
import {
  getBriefingUser, parseJam, buildBriefingCard,
} from "../../src/lib/rara-briefing.js";

const pluginConfig = {
  name: "briefing",
  alias: ["briefing"],
  category: "user",
  description: "Kartu briefing pagi personal — cuaca lokasi, gempa 24 jam, jadwal tim favorit, agenda reminder, saldo RPG. Dikirim otomatis ke DM tiap pagi",
  usage: ".briefing",
  example: ".briefing on 06:30",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, energi: 2, isEnabled: true,
};

const MAX_TIM = 3;

async function handler(m, { sock }) {
  const db = getDatabase();
  const sender = m.sender;
  const text = (m.args || []).join(" ").trim().toLowerCase();
  const sub = (m.args?.[0] || "").toLowerCase();

  const u = getBriefingUser(db, sender);

  // tanpa argumen / tes → kartu LANGSUNG (live fetch, bukan mock)
  if (!text || sub === "tes" || sub === "now" || sub === "sekarang") {
    if (!text) {
      m.react?.("⚡");
    } else {
      m.react?.("🛠️");
    }
    const card = await buildBriefingCard(sender, m.pushName || "");
    await m.reply(card);
    if (!text) {
      await m.reply(raraGuide(
        "briefing",
        "Kartu di atas dibikin langsung dari data live.\nMau dikirim otomatis tiap pagi ke DM kamu?\n.briefing on [jam] — nyalakan pengiriman harian (default 06:00)\n.briefing lokasi <kota> — cuaca sesuai kota kamu\n.briefing tim <nama tim> — pantau jadwal tim favorit (maks " + MAX_TIM + ")\n.briefing off — matikan kapan saja",
        ".briefing on 06:30\n.briefing lokasi bandung\n.briefing tim arsenal",
        "Data diambil real-time dari BMKG, open-meteo, dan ESPN.\nKalau ada bagian yang gagal, kartunya jujur nunjukin bagian mana yang gagal."
      ));
    }
    return;
  }

  // ── ON ──
  if (sub === "on" || sub === "nyala" || sub === "aktif") {
    const jamArg = (m.args?.[1] || "").trim();
    const jam = jamArg ? parseJam(jamArg) : u.jam;
    if (jamArg && !jam) return m.reply(raraWrap("briefing", "Format jam gak valid. Contoh yang bener: .briefing on 06:30", "guide"));
    u.on = true;
    u.jam = jam;
    return m.reply(raraGuide(
      "briefing",
      "Siap! Mulai besok pagi, kartu briefing bakal saya kirim ke DM kamu tiap hari jam " + jam + " WIB.\n.briefing lokasi <kota> — sesuaikan cuaca\n.briefing tim <tim> — pantau tim favorit\n.briefing off — matikan kapan saja",
      ".briefing lokasi surabaya",
      "Pengiriman gak ke-ulangin dua kali di hari yang sama walaupun bot restart."
    ));
  }

  // ── OFF ──
  if (sub === "off" || sub === "mati" || sub === "stop") {
    u.on = false;
    return m.reply(raraGuide(
      "briefing",
      "Oke, pengiriman harian saya matikan.\nKartu masih bisa kamu minta kapan saja dengan ketik .briefing.\n.briefing on [jam] — nyalain lagi",
      ".briefing on",
      "Pengaturan lokasi, tim, dan jam kamu tetap saya simpan."
    ));
  }

  // ── JAM ──
  if (sub === "jam" || sub === "waktu") {
    const jam = parseJam(m.args?.[1] || "");
    if (!jam) return m.reply(raraWrap("briefing", "Format jam gak valid. Contoh: .briefing jam 06:30", "guide"));
    u.jam = jam;
    return m.reply(raraWrap("briefing", "Oke, jadwal briefing kamu jadi jam " + jam + " WIB" + (u.on ? " (aktif)." : " (saat ini masih mati — ketik .briefing on)."), "guide"));
  }

  // ── LOKASI ──
  if (sub === "lokasi" || sub === "kota") {
    const kota = (m.args || []).slice(1).join(" ").trim();
    if (!kota) return m.reply(raraWrap("briefing", "Sebutin nama kotanya. Contoh: .briefing lokasi bandung", "guide"));
    if (kota.length > 40) return m.reply("Nama kota kepanjangan.");
    u.lokasi = kota;
    return m.reply(raraWrap("briefing", "Siap, cuaca briefing kamu sekarang buat " + kota + (u.on ? "." : " (briefing masih mati — ketik .briefing on)."), "guide"));
  }

  // ── TIM ──
  if (sub === "tim" || sub === "team") {
    const args = (m.args || []).slice(1);
    const a0 = (args[0] || "").toLowerCase();
    if (a0 === "clear" || a0 === "reset" || a0 === "hapus") {
      u.tim = [];
      return m.reply("Daftar tim favorit dikosongin.");
    }
    if (a0 === "list" || a0 === "daftar" || args.length === 0) {
      return m.reply(raraWrap("briefing", u.tim.length ? "Tim favorit kamu: " + u.tim.join(", ") : "Belum ada tim favorit. Contoh: .briefing tim arsenal", "guide"));
    }
    const nama = args.join(" ").trim();
    if (nama.length > 30) return m.reply("Nama tim kepanjangan.");
    if (u.tim.some((t) => t.toLowerCase() === nama.toLowerCase())) {
      return m.reply(nama + " udah ada di daftar kamu.");
    }
    if (u.tim.length >= MAX_TIM) return m.reply("Maksimal " + MAX_TIM + " tim. Hapus dulu: .briefing tim clear");
    u.tim.push(nama);
    return m.reply("Siap! " + nama + " masuk daftar tim favorit (" + u.tim.length + "/" + MAX_TIM + "). Jadwalnya saya cek dari Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UCL, UEL, BRI Super League, sama Saudi Pro League.");
  }

  // ── STATUS ──
  if (sub === "status") {
    const lines = [
      "status: " + (u.on ? "aktif, tiap hari jam " + u.jam + " WIB" : "mati"),
      "lokasi cuaca: " + u.lokasi,
      "tim favorit: " + (u.tim.length ? u.tim.join(", ") : "-"),
      "terakhir dikirim: " + (u.lastSent ? new Date(u.lastSent).toLocaleString("id-ID") : "belum pernah"),
    ];
    return m.reply(lines.join("\n"));
  }

  return m.reply("Subperintah gak dikenal. Yang tersedia: on / off / jam / lokasi / tim / status / tes");
}

export { pluginConfig as config, handler };
