// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { getDatabase } from "./rara-database.js";
import { logger } from "./rara-logger.js";
import { CronJob } from "cron";
import config from "../../config.js";
import * as timeHelper from "./rara-time.js";
import { saluranCtx } from "./rara-context.js";
import { getTodaySchedule, extractPrayerTimes, searchKota } from "./rara-sholat-api.js";
import { resolveAutoTargets } from "./rara-auto-target.js";

const TZ = "Asia/Jakarta";

// Menit pengingat sebelum adzan
const REMINDER_MINUTES = 15;

// Delay iqamah per sholat (menit setelah adzan)
const IQAMAH_DELAY = {
  subuh: 15,
  dzuhur: 10,
  ashar: 10,
  maghrib: 5,
  isya: 10,
};

// Waktu adzan yang akan dikirim audio + iqamah
const ADZAN_SHOLAT = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

const REMINDER_MESSAGES = {
  subuh: "⏰ *PENGINGAT SHOLAT SUBUH*\n\n> Waktu Subuh Sebentar Lagi!\n> Segera Siap-Siap, Jangan Sampai Terlewat.",
  dzuhur: "⏰ *PENGINGAT SHOLAT DZUHUR*\n\n> Waktu Dzuhur Sebentar Lagi!\n> Segera Siap-Siap, Jangan Sampai Terlewat.",
  ashar: "⏰ *PENGINGAT SHOLAT ASHAR*\n\n> Waktu Ashar Sebentar Lagi!\n> Segera Siap-Siap, Jangan Sampai Terlewat.",
  maghrib: "⏰ *PENGINGAT SHOLAT MAGHRIB*\n\n> Waktu Maghrib Sebentar Lagi!\n> Segera Siap-Siap, Jangan Sampai Terlewat.",
  isya: "⏰ *PENGINGAT SHOLAT ISYA*\n\n> Waktu Isya Sebentar Lagi!\n> Segera Siap-Siap, Jangan Sampai Terlewat.",
};

const IQAMAH_MESSAGES = {
  subuh: "🕌 *WAKTU IQAMAH SUBUH*\n\n> Silakan Berdiri Untuk Iqamah.\n> Semoga Sholat Kita Diterima Allah SWT.",
  dzuhur: "🕌 *WAKTU IQAMAH DZUHUR*\n\n> Silakan Berdiri Untuk Iqamah.\n> Semoga Sholat Kita Diterima Allah SWT.",
  ashar: "🕌 *WAKTU IQAMAH ASHAR*\n\n> Silakan Berdiri Untuk Iqamah.\n> Semoga Sholat Kita Diterima Allah SWT.",
  maghrib: "🕌 *WAKTU IQAMAH MAGHRIB*\n\n> Silakan Berdiri Untuk Iqamah.\n> Semoga Sholat Kita Diterima Allah SWT.",
  isya: "🕌 *WAKTU IQAMAH ISYA*\n\n> Silakan Berdiri Untuk Iqamah.\n> Semoga Sholat Kita Diterima Allah SWT.",
};

const SHOLAT_MESSAGES = {
  imsak:
    "🌙 *WAKTU IMSAK*\n\n> Hai Sahabat, waktu Imsak telah tiba.\n> Segera makan sahur sebelum waktu habis.",
  subuh:
    "🌅 *WAKTU SUBUH*\n\n> Hai Sahabat, waktu Sholat Subuh telah tiba.\n> Ambilah air wudhu dan segeralah sholat.",
  terbit:
    "☀️ *WAKTU TERBIT*\n\n> Matahari telah terbit.\n> Selamat beraktivitas hari ini!",
  dhuha:
    "🌤️ *WAKTU DHUHA*\n\n> Hai Sahabat, waktu Sholat Dhuha telah tiba.\n> Jangan lupa sholat Dhuha 2-8 rakaat.",
  dzuhur:
    "🌞 *WAKTU DZUHUR*\n\n> Hai Sahabat, waktu Sholat Dzuhur telah tiba.\n> Ambilah air wudhu dan segeralah sholat.",
  ashar:
    "🌇 *WAKTU ASHAR*\n\n> Hai Sahabat, waktu Sholat Ashar telah tiba.\n> Ambilah air wudhu dan segeralah sholat.",
  maghrib:
    "🌆 *WAKTU MAGHRIB*\n\n> Hai Sahabat, waktu Sholat Maghrib telah tiba.\n> Ambilah air wudhu dan segeralah sholat.",
  isya: "🌙 *WAKTU ISYA*\n\n> Hai Sahabat, waktu Sholat Isya telah tiba.\n> Ambilah air wudhu dan segeralah sholat.",
};

const GAMBAR_SUASANA = {
  imsak: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  subuh: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  terbit: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  dhuha: "https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif",
  dzuhur:
    "https://cdn.gimita.id/download/qf2d6868_sheikh-zayed-grand-mosque_625x300_04_March_25_1769502237718_92212561.webp",
  ashar:
    "https://cdn.gimita.id/download/18537d69-a2e0-4dc2-a144-57dde0f359b5_1769502389063_5c004902.jpg",
  maghrib:
    "https://cdn.gimita.id/download/mosque-5950407_1280_1769502206553_660ae15c.webp",
  isya: "https://cdn.gimita.id/download/pngtree-nighttime-mosque-illustration-with-realistic-details-celebrating-ramadan-kareem-mubarak-image_3814083_1769502091988_e4cf3326.jpg",
};

const AUDIO_ADZAN = "https://media.vocaroo.com/mp3/1ofLT2YUJAjQ";

let sock = null;
let cachedSchedule = null;
let cacheDate = "";
const sholatCronJobs = new Map();
let dailyRefreshJob = null;

function getTodayDateString() {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

async function loadTodaySchedule() {
  const todayStr = getTodayDateString();
  if (cachedSchedule && cacheDate === todayStr) return cachedSchedule;

  const db = getDatabase();
  const kotaSetting = db.setting("autoSholatKota") || {
    id: "1301",
    nama: "KOTA JAKARTA",
  };

  try {
    const jadwalData = await getTodaySchedule(kotaSetting.id);
    const schedule = extractPrayerTimes(jadwalData);
    const daerah = jadwalData.daerah || "DKI JAKARTA";
    
    let cityTz = "Asia/Jakarta";
    const d = daerah.toUpperCase();
    if (d.includes("SULAWESI") || d.includes("BALI") || d.includes("NUSA TENGGARA") || d.includes("KALIMANTAN SELATAN") || d.includes("KALIMANTAN TIMUR") || d.includes("KALIMANTAN UTARA")) {
      cityTz = "Asia/Makassar";
    } else if (d.includes("MALUKU") || d.includes("PAPUA")) {
      cityTz = "Asia/Jayapura";
    }

    cachedSchedule = { schedule, cityTz, daerah };
    cacheDate = todayStr;
    return cachedSchedule;
  } catch (e) {
    logger.error("SholatScheduler", `Gagal fetch jadwal: ${e.message}`);
    return null;
  }
}

function clearSholatCronJobs() {
  for (const [, job] of sholatCronJobs) job.stop();
  sholatCronJobs.clear();
}

// Label zona waktu dari nama zona
function tzLabel(cityTz) {
  if (cityTz === "Asia/Makassar") return "WITA";
  if (cityTz === "Asia/Jayapura") return "WIT";
  return "WIB";
}

// Urutan waktu sholat dalam sehari
const SHOLAT_ORDER = ["imsak", "subuh", "terbit", "dhuha", "dzuhur", "ashar", "maghrib", "isya"];
const SHOLAT_EMOJI = {
  imsak: "🌙", subuh: "🌅", terbit: "☀️", dhuha: "🕊️",
  dzuhur: "🕐", ashar: "🕒", maghrib: "🌇", isya: "🌃",
};

// Notif adzan format lengkap ala UPDATE CUACA (request owner 8 Sep 2026):
// sumber + waktu + tanggal + jadwal hari ini + sholat berikutnya.
export function formatAdzanMessage(sholat, waktu, { schedule, cityTz, daerah }, kotaNama, extra = "") {
  const tz = tzLabel(cityTz);
  const now = new Date();
  const tanggal = new Intl.DateTimeFormat("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: cityTz,
  }).format(now);

  let msg = `${SHOLAT_MESSAGES[sholat] || `🕌 *WAKTU ${String(sholat).toUpperCase()}*`}\n\n`;
  msg += `🕌 *WAKTU ADZAN ${String(sholat).toUpperCase()} - ${kotaNama}*\n`;
  msg += `📡 *Sumber: Jadwal Sholat Kemenag (myquran.com)*\n`;
  msg += `🕐 *Waktu Adzan: ${waktu} ${tz} (${tanggal})*\n\n`;

  msg += `📅 *Jadwal Hari Ini:*\n`;
  const t = (k) => (schedule && schedule[k] && schedule[k] !== "-") ? schedule[k] : "-";
  msg += `   ${SHOLAT_EMOJI.imsak} Imsak: ${t("imsak")} | ${SHOLAT_EMOJI.subuh} Subuh: ${t("subuh")}\n`;
  msg += `   ${SHOLAT_EMOJI.terbit} Terbit: ${t("terbit")} | ${SHOLAT_EMOJI.dhuha} Dhuha: ${t("dhuha")}\n`;
  msg += `   ${SHOLAT_EMOJI.dzuhur} Dzuhur: ${t("dzuhur")} | ${SHOLAT_EMOJI.ashar} Ashar: ${t("ashar")}\n`;
  msg += `   ${SHOLAT_EMOJI.maghrib} Maghrib: ${t("maghrib")} | ${SHOLAT_EMOJI.isya} Isya: ${t("isya")}\n`;

  // Sholat berikutnya (waktu > waktu sekarang, urutan sehari)
  const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
  let next = null;
  for (const k of SHOLAT_ORDER) {
    const tw = t(k);
    if (tw === "-") continue;
    if (toMin(tw) > toMin(waktu)) { next = { key: k, waktu: tw }; break; }
  }
  if (next) {
    const selisih = toMin(next.waktu) - toMin(waktu);
    msg += `\n🕒 *Sholat berikutnya: ${String(next.key).toUpperCase()} ${next.waktu}*`;
    msg += selisih > 0 ? ` (± ${Math.floor(selisih / 60)} jam ${selisih % 60} menit lagi)` : "";
    msg += `\n`;
  } else {
    msg += `\n🕒 *Jadwal hari ini selesai — sampai besok* 🌙\n`;
  }

  if (extra) msg += `\n${extra}`;
  return msg;
}

function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

async function schedulePrayerTimes() {
  clearSholatCronJobs();

  const db = getDatabase();
  const globalEnabled = db.setting("autoSholat");
  if (!globalEnabled) return;

  const data = await loadTodaySchedule();
  if (!data) return;

  const { schedule, cityTz } = data;
  const kotaSetting = db.setting("autoSholatKota") || { nama: "KOTA JAKARTA" };

  for (const [sholat, waktu] of Object.entries(schedule)) {
    if (waktu === "-") continue;

    const [hour, minute] = waktu.split(":").map(Number);
    const cronExpr = `${minute} ${hour} * * *`;

    // Job 1: Adzan notification at prayer time
    const adzanJob = new CronJob(
      cronExpr,
      async () => {
        await sendSholatNotifications(sholat, waktu);
      },
      null,
      true,
      cityTz,
    );
    sholatCronJobs.set(`${sholat}_adzan`, adzanJob);

    // Job 2: Reminder 15 minutes before (only for 5 daily prayers)
    if (ADZAN_SHOLAT.includes(sholat)) {
      const reminderTime = addMinutesToTime(waktu, -REMINDER_MINUTES);
      const [rH, rM] = reminderTime.split(":").map(Number);
      const reminderCron = `${rM} ${rH} * * *`;

      const reminderJob = new CronJob(
        reminderCron,
        async () => {
          await sendReminderNotification(sholat, reminderTime, kotaSetting.nama);
        },
        null,
        true,
        cityTz,
      );
      sholatCronJobs.set(`${sholat}_reminder`, reminderJob);

      // Job 3: Iqamah notification after adzan
      const iqamahDelay = IQAMAH_DELAY[sholat] || 10;
      const iqamahTime = addMinutesToTime(waktu, iqamahDelay);
      const [iH, iM] = iqamahTime.split(":").map(Number);
      const iqamahCron = `${iM} ${iH} * * *`;

      const iqamahJob = new CronJob(
        iqamahCron,
        async () => {
          await sendIqamahNotification(sholat, iqamahTime, kotaSetting.nama);
        },
        null,
        true,
        cityTz,
      );
      sholatCronJobs.set(`${sholat}_iqamah`, iqamahJob);
    }
  }

  logger.info(
    "SholatScheduler",
    `Scheduled ${sholatCronJobs.size} cron jobs: reminders + adzan + iqamah (TZ: ${cityTz})`,
  );
}

async function sendReminderNotification(sholat, reminderTime, kotaNama) {
  try {
    // Target terpusat (.switch auto autosholat set) — default semua grup
    let groupList = [];
    try {
      const t = await resolveAutoTargets(sock, "autosholat");
      groupList = t.jids;
    } catch (e) {
      logger.error("SholatScheduler", `Failed to resolve targets: ${e.message}`);
      return;
    }
    if (groupList.length === 0) return;

    const db = getDatabase();
    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    const msg = `${REMINDER_MESSAGES[sholat] || ""}\n\n⏰ *${reminderTime} WIB*\n📍 *${kotaNama}*\n\n> _${REMINDER_MINUTES} menit lagi menuju waktu sholat_`;

    let sent = 0;
    for (const groupId of groupList) {
      const groupData = db.data?.groups?.[groupId] || {};
      if (groupData.notifSholat === false) continue;

      try {
        await sock.sendMessage(groupId, {
          text: msg,
          contextInfo: {
            ...saluranCtx(),
          },
        });
        sent++;
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        logger.error("SholatScheduler", `Reminder failed to ${groupId}: ${err.message}`);
      }
    }
    if (sent > 0) logger.info("SholatScheduler", `Reminder ${sholat} sent to ${sent} groups`);
  } catch (error) {
    logger.error("SholatScheduler", `Reminder error: ${error.message}`);
  }
}

async function sendIqamahNotification(sholat, iqamahTime, kotaNama) {
  try {
    // Target terpusat (.switch auto autosholat set) — default semua grup
    let groupList = [];
    try {
      const t = await resolveAutoTargets(sock, "autosholat");
      groupList = t.jids;
    } catch (e) {
      logger.error("SholatScheduler", `Failed to resolve targets: ${e.message}`);
      return;
    }
    if (groupList.length === 0) return;

    const db = getDatabase();
    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    const delay = IQAMAH_DELAY[sholat] || 10;
    const msg = `${IQAMAH_MESSAGES[sholat] || ""}\n\n⏰ *${iqamahTime} WIB*\n📍 *${kotaNama}*\n\n> _Iqamah ${delay} menit setelah adzan_`;

    let sent = 0;
    for (const groupId of groupList) {
      const groupData = db.data?.groups?.[groupId] || {};
      if (groupData.notifSholat === false) continue;

      try {
        await sock.sendMessage(groupId, {
          text: msg,
          contextInfo: {
            ...saluranCtx(),
          },
        });
        sent++;
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        logger.error("SholatScheduler", `Iqamah failed to ${groupId}: ${err.message}`);
      }
    }
    if (sent > 0) logger.info("SholatScheduler", `Iqamah ${sholat} sent to ${sent} groups`);
  } catch (error) {
    logger.error("SholatScheduler", `Iqamah error: ${error.message}`);
  }
}

async function sendSholatNotifications(sholat, waktu) {
  try {
    const db = getDatabase();

    const closeGroup = db.setting("autoSholatCloseGroup") || false;
    const duration = db.setting("autoSholatDuration") || 5;
    const sendAudio = db.setting("autoSholatAudio") !== false;
    const kotaSetting = db.setting("autoSholatKota") || {
      nama: "KOTA JAKARTA",
    };

    const saluranId = config.saluran?.id || "@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Rara-AI";

    // Target terpusat (.switch auto autosholat set) — default semua grup
    let groupList = [];
    try {
      const t = await resolveAutoTargets(sock, "autosholat");
      groupList = t.jids;
    } catch (e) {
      logger.error("SholatScheduler", `Failed to resolve targets: ${e.message}`);
      return;
    }

    if (groupList.length === 0) return;

    let sentCount = 0;
    const closedGroups = [];
    const isSholatTime = [
      "subuh",
      "dzuhur",
      "ashar",
      "maghrib",
      "isya",
    ].includes(sholat);

    // Format lengkap ala UPDATE CUACA (request owner 8 Sep 2026):
    // sumber + waktu + tanggal + jadwal hari ini + sholat berikutnya
    const todayData = await loadTodaySchedule();
    const extra = closeGroup && isSholatTime
      ? `> 🔒 _Grup ditutup ${duration} menit untuk sholat_`
      : "";
    let message = todayData
      ? formatAdzanMessage(sholat, waktu, todayData, (kotaSetting.nama || "KOTA JAKARTA").toUpperCase(), extra)
      : `${SHOLAT_MESSAGES[sholat] || `🕌 *WAKTU ${sholat.toUpperCase()}*`}\n\n⏰ *${waktu} ${tzLabel(todayData?.cityTz || "Asia/Jakarta")}*\n📍 *${kotaSetting.nama}*${extra ? "\n\n" + extra : ""}`;

    for (const groupId of groupList) {
      const groupData = db.data?.groups?.[groupId] || {};
      if (groupData.notifSholat === false) continue;

      try {
        if (sendAudio && isSholatTime) {
          try {
            await sock.sendMessage(groupId, {
              audio: { url: AUDIO_ADZAN },
              mimetype: "audio/mpeg",
              ptt: false,
              contextInfo: {
                ...saluranCtx(),
              },
            });
          } catch (audioErr) {
            logger.error("SholatScheduler", `Failed to send audio to ${groupId}: ${audioErr.message}`);
          }
        }

        await sock.sendMessage(groupId, {
          text: message,
          contextInfo: {
            ...saluranCtx(),
          },
        });

        if (closeGroup && isSholatTime && groupId.endsWith("@g.us")) {
          try {
            await sock.groupSettingUpdate(groupId, "announcement");
            closedGroups.push(groupId);
          } catch (e) {
            logger.error(
              "SholatScheduler",
              `Failed to close ${groupId}: ${e.message}`,
            );
          }
        }

        sentCount++;
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        logger.error(
          "SholatScheduler",
          `Failed to send to ${groupId}: ${err.message}`,
        );
      }
    }

    if (closeGroup && closedGroups.length > 0) {
      setTimeout(
        async () => {
          for (const groupId of closedGroups) {
            try {
              await sock.groupSettingUpdate(groupId, "not_announcement");
              await sock.sendMessage(groupId, {
                text: `✅ Grup dibuka kembali setelah sholat ${sholat}.\n\n> Semoga sholat kita diterima. Aamiin 🤲`,
                contextInfo: {
                  forwardingScore: 0,
                  isForwarded: false,
                },
              });
              await new Promise((r) => setTimeout(r, 600));
            } catch (e) {
              logger.error(
                "SholatScheduler",
                `Failed to open ${groupId}: ${e.message}`,
              );
            }
          }
          logger.info(
            "SholatScheduler",
            `Opened ${closedGroups.length} groups after ${sholat}`,
          );
        },
        duration * 60 * 1000,
      );
    }

    if (sentCount > 0) {
      logger.info(
        "SholatScheduler",
        `Sent ${sholat} notification to ${sentCount} groups` +
          (closedGroups.length > 0 ? ` (${closedGroups.length} closed)` : ""),
      );
    }
  } catch (error) {
    logger.error("SholatScheduler", `Error: ${error.message}`);
  }
}

function initSholatScheduler(socketInstance) {
  sock = socketInstance;

  if (dailyRefreshJob) dailyRefreshJob.stop();

  dailyRefreshJob = new CronJob(
    "1 0 * * *",
    async () => {
      cachedSchedule = null;
      await schedulePrayerTimes();
    },
    null,
    true,
    TZ,
  );

  schedulePrayerTimes();
  logger.info(
    "SholatScheduler",
    "Prayer time scheduler started (CronJob, precise per-prayer)",
  );
}

function stopSholatScheduler() {
  clearSholatCronJobs();
  if (dailyRefreshJob) {
    dailyRefreshJob.stop();
    dailyRefreshJob = null;
  }
  logger.info("SholatScheduler", "Prayer time scheduler stopped");
}

export {
  initSholatScheduler,
  stopSholatScheduler,
  sendSholatNotifications,
  SHOLAT_MESSAGES,
  REMINDER_MESSAGES,
  IQAMAH_MESSAGES,
  GAMBAR_SUASANA,
  AUDIO_ADZAN,
  REMINDER_MINUTES,
  IQAMAH_DELAY,
  ADVANCE_REMINDER_MINUTES,
  PRAYER_LABELS,
  PRAYER_EMOJIS,
  fetchPrayerTimes,
  buildPrayerMessage,
};

// ============================================================
// V15 COMPATIBILITY LAYER — exports for V15 sholat plugin
// ============================================================

// Constants needed by V15 sholat plugin
const ADVANCE_REMINDER_MINUTES = 5;
const PRAYER_LABELS = {
  Fajr: "Subuh",
  Dhuhr: "Dzuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya",
};
const PRAYER_EMOJIS = {
  Fajr: "🌅",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌇",
  Isha: "🌙",
};

// Map Indonesian prayer names to API keys
const PRAYER_KEY_MAP = {
  subuh: "Fajr",
  dzuhur: "Dhuhr",
  ashar: "Asr",
  maghrib: "Maghrib",
  isya: "Isha",
};

// Fetch prayer times using existing rara-sholat-api (myquran.com)
// Returns timings in Aladhan format for V15 compatibility
async function fetchPrayerTimes(city) {
  try {
    const kota = await searchKota(city);
    if (!kota) throw new Error(`Kota "${city}" tidak ditemukan`);
    const schedule = await getTodaySchedule(kota.id);
    const times = extractPrayerTimes(schedule);
    
    // Convert to Aladhan-style key format
    return {
      Fajr: times.subuh || "-",
      Dhuhr: times.dzuhur || "-",
      Asr: times.ashar || "-",
      Maghrib: times.maghrib || "-",
      Isha: times.isya || "-",
      Imsak: times.imsak || "-",
      Sunrise: times.terbit || "-",
      City: schedule.daerah || city,
      _kotaId: kota.id,
    };
  } catch (err) {
    throw new Error(`Gagal mengambil jadwal sholat: ${err.message}`);
  }
}

// Build formatted prayer message (V15 compatible)
function buildPrayerMessage(city, timings, next) {
  const PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const prayerLines = PRAYER_KEYS.map((key) => {
    const label = PRAYER_LABELS[key] || key;
    const emoji = PRAYER_EMOJIS[key] || "🕌";
    const time = timings[key] || "-";
    return `${emoji} ${label}: *${time}*`;
  });

  let nextLine = "";
  if (next) {
    nextLine = `\n\n⏰ *Berikutnya: ${next.label} ${next.emoji} dalam ~${next.remainingMinutes} menit (${next.time})*`;
  }

  return (
    `🕌 *JADWAL SHOLAT*\n` +
    `📍 Kota: *${timings.City || city}*\n\n` +
    prayerLines.join("\n") +
    nextLine
  );
}

// Re-export for V15 compatibility
