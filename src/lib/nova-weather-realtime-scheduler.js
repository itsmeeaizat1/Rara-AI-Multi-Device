// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// Scheduler untuk notifikasi cuaca realtime (.autoweatherrealtime notification on)
// Cek setiap menit, kirim cuaca ke grup target sesuai jadwal

import { getDatabase } from "./nova-database.js";
import { getWeatherFooter, clearWeatherCache } from "./nova-weather-footer.js";
import { toSC } from "./nova-menu-style.js";

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

async function checkAndSend(sock) {
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
        const footer = await getWeatherFooter(true);
        if (!footer) {
          console.log("[weather-realtime] No weather data, skipping");
          continue;
        }

        const greeting = getGreeting(hour);
        const message =
          "╭─「 ✦ " + toSC("Cuaca " + (sched.label || "")) + " ✦ 」\n" +
          "│\n" +
          "│ " + greeting + "\n" +
          "│ " + toSC("Cuaca terkini untuk hari ini") + "\n" +
          "│\n" +
          footer + "\n" +
          "╰────  •  ────";

        await sock.sendMessage(settings.target, { text: message });
        console.log("[weather-realtime] ✅ Sent to", settings.target);
      } catch (e) {
        console.error("[weather-realtime] Send error:", e.message);
      }
    }
  }
}

function getGreeting(hour) {
  if (hour < 11) return toSC("Selamat pagi");
  if (hour < 15) return toSC("Selamat siang");
  if (hour < 18) return toSC("Selamat sore");
  return toSC("Selamat malam");
}

export function getSchedulerStatus() {
  return {
    running: !!schedulerInterval,
    lastSent: { ...lastSent },
  };
}
