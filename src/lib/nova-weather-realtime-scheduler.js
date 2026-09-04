// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Scheduler untuk notifikasi cuaca realtime (.autoweatherrealtime notification on)
// Cek setiap menit, kirim cuaca ke grup target sesuai jadwal

import { getDatabase } from "./nova-database.js";
import { getWeatherDetail, clearWeatherCache } from "./nova-weather-footer.js";

let schedulerInterval = null;
let lastSent = {}; // { "pagi": "2026-09-02", ... } — track per key per day

export function startWeatherRealtimeScheduler(sock) {
  if (schedulerInterval) return; // already running

  console.log("[weather-realtime] Scheduler started");
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndSend(sock);
    } catch (e) {
      console.error("[weather-realtime] Error:", e.message);
    }
  }, 60_000); // cek tiap 1 menit
}

export function stopWeatherRealtimeScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[weather-realtime] Scheduler stopped");
  }
}

// Di-export untuk testing (scripts/test-weather-realtime.mjs) —
// jadwal palsu yang match menit ini dipakai buat verifikasi trigger.
export async function checkAndSend(sock) {
  const db = getDatabase();
  const settings = db.setting("weatherRealtime");
  if (!settings || !settings.notification || !settings.target) return;

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

  for (const sched of (settings.schedules || [])) {
    if (sched.hour === hour && sched.minute === minute) {
      const key = sched.key || `${hour}:${minute}`;
      // Cek apakah sudah dikirim hari ini
      if (lastSent[key] === today) continue;
      lastSent[key] = today;

      console.log(`[weather-realtime] Sending ${sched.label} notification to ${settings.target}`);
      try {
        clearWeatherCache();
        const detail = await getWeatherDetail();
        if (!detail) {
          console.log("[weather-realtime] No weather data, skipping");
          continue;
        }

        // Owner request: notifikasi cuaca BUKAN menu → plain text natural,
        // tanpa box-drawing & tanpa smallcaps.
        const greeting = getGreeting(hour);
        const message =
          `${greeting}! ${detail.emoji}\n` +
          `Cuaca ${detail.location} hari ini: ${detail.kondisi}, suhu ${detail.suhu} (terasa seperti ${detail.terasa})\n` +
          `Kelembapan ${detail.kelembapan}, angin ${detail.angin} dari ${detail.arahAngin}, tutupan awan ${detail.tutupanAwan}, UV ${detail.uv}, curah hujan ${detail.curahHujan}.`;

        await sock.sendMessage(settings.target, { text: message });
        console.log("[weather-realtime] ✅ Sent to", settings.target);
      } catch (e) {
        console.error("[weather-realtime] Send error:", e.message);
      }
    }
  }
}

function getGreeting(hour) {
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function getSchedulerStatus() {
  return {
    running: !!schedulerInterval,
    lastSent: { ...lastSent },
  };
}
