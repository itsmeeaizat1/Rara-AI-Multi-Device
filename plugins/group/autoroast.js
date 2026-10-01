// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "../../src/lib/rara-database.js";
import { raraWrap, raraError, raraEmpty, raraGuide, raraNoInput } from "../../src/lib/rara-menu-style.js";

const pluginConfig = {
  name: "autoroast",
  alias: ["autoroast"],
  category: "group",
  description: "Bot roast member grup acak secara otomatis tiap interval (toggle on/off)",
  usage: ".autoroast on [menit] | .autoroast off | .autoroast status | .autoroast now",
  example: ".autoroast on 60",
  isGroupOnly: true,
  isGroupAdminOnly: true,
};

const ROASTS = [
  "Kamu itu seperti WiFi gratis, lemot dan susah connect.",
  "Muka kamu itu seperti kode error, gak ada yang mau perbaiki.",
  "Otakmu itu seperti ruang kosong, luas tapi gak ada isinya.",
  "Kamu itu seperti charger rusak, ada tapi gak berguna.",
  "Senyummu itu seperti sinyal 3G, ada tapi lemah banget.",
  "Kamu itu seperti TV analog, gak ada yang mau nonton.",
  "Gaya kamu itu seperti browser lama, loading terus gak selesai.",
  "Kamu itu seperti mantan, muncul cuma pas lagi butuh doang.",
  "Eksistensi kamu di grup itu seperti batrei 1%, tinggal menunggu mati.",
  "Kamu itu seperti aplikasi bawaan HP, gak bisa di-uninstall tapi gak berguna.",
  "Kepintaranmu itu seperti jangkrik, kecil dan sebentar bunyinya.",
  "Kamu itu seperti iklan pop-up, nanggung ganggu terus.",
  "Wajahmu itu seperti file corrupt, gak bisa dibuka.",
  "Kamu itu seperti tanggal tua, selalu ditunggu-tunggu tapi bikin susah.",
  "Gaya bicaramu itu seperti Google Translate era 2010, lucu tapi gak nyambung.",
  "Kamu itu seperti lagu remix, aslinya bagus tapi versi kamu rusak.",
  "Karismatikmu itu seperti lampu LED 1 watt, redup dan gak menarik.",
  "Kamu itu seperti kuota habis, gak bisa apapun.",
  "Kepribadianmu itu seperti Word file ukuran 500MB, berat tapi isinya sedikit.",
  "Kamu itu seperti slider volume di mute, ada tapi gak ada suaranya.",
  "Penampilanmu itu seperti screenshot burik, blur dan gak jelas.",
  "Kamu itu seperti pesan draft, gak pernah dikirim tapi gak dihapus juga.",
  "Logika kamu itu seperti jalan berlubang, banyak bolongnya.",
  "Kamu itu seperti notifikasi spam, gak penting tapi selalu muncul.",
  "Eksistensimu itu seperti folder 'Baru', isinya gak baru tapi tetap disimpen.",
  "Kamu itu seperti captcha error, susah banget dimengerti.",
  "Gaya mainmu itu seperti kalkulator rusak, hasilnya selalu salah.",
  "Kamu itu seperti cursor yang lag, gerak tapi telat.",
  "Muka kamu itu seperti update Windows, lama dan gak ada perubahan.",
  "Kamu itu seperti lagu di repeat, bikin bosan tapi gak bisa di-skip.",
  "Karismatikmu itu seperti jeda iklan, bikin orang pindah channel.",
  "Kamu itu seperti file format .tmp, gak ada yang peduli.",
  "Eksistensimu di grup itu seperti 'last seen recently', ada tapi gak kelihatan.",
  "Kamu itu seperti extension browser, dibutuhin tapi bikin berat.",
  "Penampilanmu itu seperti resolusi 144p, gak jelas tapi tetap ada.",
  "Kamu itu seperti kalkulator tanpa baterai, ada tapi gak berfungsi.",
  "Gaya kamu itu seperti template gratis, standar dan gak menarik.",
  "Kamu itu seperti komentar spam, banyak tapi gak ada guna.",
  "Karismatikmu itu seperti sinyal 2G, ada tapi gak bisa dipakai.",
  "Kamu itu seperti file tanpa ekstensi, gak ada yang tahu formatnya.",
  "Eksistensimu itu seperti recycle bin, penuh tapi gak berani dikosongin.",
  "Kamu itu seperti loading bar yang stuck di 99%, gak pernah selesai.",
  "Gaya bicaramu itu seperti subtitle yang telat, gak sinkron.",
  "Kamu itu seperti zoom yang glitch, beku di satu frame.",
  "Karismatikmu itu seperti wallpaper default, gak ada yang ingat.",
  "Kamu itu seperti cookie expired, gak bisa dipakai lagi.",
  "Eksistensimu itu seperti RAM 256MB, gak cukup buat apapun.",
  "Kamu itu seperti error 404, gak ditemukan.",
  "Gaya kamu itu seperti BIOS, lama dan gak ada yang ngerti.",
];

const DEFAULT_INTERVAL = 60;
const MIN_INTERVAL = 20;
const MAX_INTERVAL = 360;

let intervals = {};

export function startAutoRoast(groupId, sock, db) {
  stopAutoRoast(groupId);
  const cfg = db.data.autoRoast?.[groupId];
  if (!cfg || !cfg.enabled) return;

  const intervalMs = (cfg.interval || DEFAULT_INTERVAL) * 60 * 1000;

  intervals[groupId] = setInterval(async () => {
    try {
      const db2 = await getDatabase();
      const g = db2.data.autoRoast?.[groupId];
      if (!g || !g.enabled) {
        stopAutoRoast(groupId);
        return;
      }

      // Ambil metadata grup untuk dapat list member
      let target = null;
      try {
        const metadata = await sock.groupMetadata(groupId);
        const participants = metadata.participants || [];
        const eligible = participants.filter((p) => p.id !== sock.user?.id);
        if (eligible.length > 0) {
          target = eligible[Math.floor(Math.random() * eligible.length)];
        }
      } catch (e) { console.error('[autoroast.js]:', e.message); }

      const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      g.lastRoast = roast;
      g.lastSent = Date.now();
      g.totalSent = (g.totalSent || 0) + 1;
      if (target) g.lastTarget = target.id;
      await db2.save();

      let msg = "Roast dari bot:\n\n";
      if (target) {
        msg = "Roast untuk @" + target.id.split("@")[0] + ":\n\n";
      }
      msg += roast;
      msg += "\n\nMode: Otomatis tiap " + g.interval + " menit";

      const payload = { text: raraWrap("Auto Roast", msg, "warn") };
      if (target) payload.mentions = [target.id];

      await sock.sendMessage(groupId, payload);
    } catch (e) {
      console.error("[AutoRoast interval]", e);
    }
  }, intervalMs);
}

export function stopAutoRoast(groupId) {
  if (intervals[groupId]) {
    clearInterval(intervals[groupId]);
    delete intervals[groupId];
  }
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const groupId = m.key.remoteJid;
    const sender = m.key.participant || m.sender;
    const sub = (args[0] || "").toLowerCase();

    if (!db.data.autoRoast) db.data.autoRoast = {};
    if (!db.data.autoRoast[groupId]) {
      db.data.autoRoast[groupId] = { enabled: false, interval: DEFAULT_INTERVAL, lastSent: null, totalSent: 0, lastRoast: null, lastTarget: null, activatedBy: null, activatedAt: null };
      await db.save();
    }
    const cfg = db.data.autoRoast[groupId];

    // ON
    if (sub === "on" || sub === "aktif") {
      const intervalArg = parseInt(args[1]);
      const interval = intervalArg && intervalArg >= MIN_INTERVAL && intervalArg <= MAX_INTERVAL ? intervalArg : DEFAULT_INTERVAL;

      cfg.enabled = true;
      cfg.interval = interval;
      cfg.activatedBy = sender;
      cfg.activatedAt = Date.now();
      await db.save();

      startAutoRoast(groupId, conn, db);

      return m.reply(raraWrap("Auto Roast", [
        "Roast otomatis DIAKTIFKAN!",
        "",
        "Interval: " + interval + " menit",
        "Mode: Bot bakal roast member acak tiap " + interval + " menit",
        "",
        "Ketik .autoroast off untuk matikan.",
        "Ketik .autoroast now untuk roast sekarang.",
      ], "success"));
    }

    // OFF
    if (sub === "off" || sub === "mati" || sub === "nonaktif") {
      cfg.enabled = false;
      await db.save();
      stopAutoRoast(groupId);

      return m.reply(raraWrap("Auto Roast", "Roast otomatis DIMATIKAN.\nKetik .autoroast on untuk aktifkan lagi."));
    }

    // STATUS
    if (sub === "status" || sub === "cek" || sub === "info") {
      const lastSentStr = cfg.lastSent ? new Date(cfg.lastSent).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "Belum pernah";
      const lastTargetStr = cfg.lastTarget ? "@" + cfg.lastTarget.split("@")[0] : "Belum ada";

      return m.reply(raraWrap("Auto Roast", [
        "Status: " + (cfg.enabled ? "*aktif*" : "Nonaktif"),
        "Interval: " + (cfg.interval || DEFAULT_INTERVAL) + " menit",
        "Total roast: " + (cfg.totalSent || 0),
        "Terakhir kirim: " + lastSentStr,
        "Target terakhir: " + lastTargetStr,
        "Roast tersedia: " + ROASTS.length,
      ]));
    }

    // NOW
    if (sub === "now" || sub === "sekarang") {
      let target = null;
      try {
        const metadata = await conn.groupMetadata(groupId);
        const participants = metadata.participants || [];
        const eligible = participants.filter((p) => p.id !== conn.user?.id);
        if (eligible.length > 0) {
          target = eligible[Math.floor(Math.random() * eligible.length)];
        }
      } catch (e) { console.error('[autoroast.js]:', e.message); }

      const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      cfg.lastRoast = roast;
      cfg.lastSent = Date.now();
      cfg.totalSent = (cfg.totalSent || 0) + 1;
      if (target) cfg.lastTarget = target.id;
      await db.save();

      let msg = "Roast dari bot:\n\n" + roast;
      if (target) msg = "Roast untuk @" + target.id.split("@")[0] + ":\n\n" + roast;
      msg += "\n\nTotal roast: " + cfg.totalSent;

      const payload = { text: raraWrap("Auto Roast", msg, "warn") };
      if (target) payload.mentions = [target.id];

      return m.reply(payload);
    }

    // HELP
    return m.reply(raraGuide(
      "Auto Roast",
      "Bot roast member grup acak secara otomatis tiap interval.\n\nCommands:\n- .autoroast on [menit]\n- .autoroast off\n- .autoroast status\n- .autoroast now",
      `${usedPrefix}autoroast on 30`
    ));
  } catch (e) {
    console.error("[Auto Roast]", e);
    m.reply(raraError("Auto Roast", "Terjadi kendala: " + (e.message || "coba lagi nanti ya")));
  }
}

export { pluginConfig as config, handler };
