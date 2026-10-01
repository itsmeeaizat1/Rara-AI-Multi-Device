// RARA REMINDER ENGINE — persist reminder di db + pasang ulang timer pas
// bot restart (request owner 13 Sep: sweep data RAM yang rawan ilang).
// Reminder yang waktunya KELEWATAN pas bot mati → dikirim notif "terlewat"
// begitu bot nyala, biar user tetep dapet kabar.
import { getDatabase } from "./rara-database.js";
import { raraWrap } from "./rara-menu-style.js";
import { formatDuration } from "./rara-afk.js";

const KEY = "raraReminders";
if (!global.raraReminders) global.raraReminders = [];

function safeDb() {
  try { return getDatabase(); } catch { return null; }
}

/** Simpen reminder AKTIF ke db (timerId dibuang — gak bisa diserialisasi) */
export function persistReminders() {
  try {
    const db = safeDb();
    if (!db) return;
    db.setting(KEY, global.raraReminders
      .filter((r) => r && !r.fired)
      .map(({ timerId, ...rest }) => rest));
  } catch {}
}

/** Kirim pesan reminder ke chat asal */
export async function fireReminder(sock, reminder, missed = false) {
  const { jid, sender, message, createdAt } = reminder;
  const num = String(sender || "").split("@")[0];
  const timeSpent = formatDuration(Date.now() - (createdAt || Date.now()));
  const isSched = reminder.kind === "pesanjadwal";
  const lines = [
    `@${num}`,
    ``,
    `Pesan: ${message}`,
    `Dibuat: ${timeSpent} yang lalu`,
    ``,
    missed
      ? (isSched
          ? "⏰ Jadwalnya udah lewat pas bot lagi mati — tapi tetep aku kirim pesannya!"
          : "⏰ Waktunya udah lewat pas bot lagi mati — tapi tetep aku ingetin!")
      : (isSched ? "📋 Pesan terjadwal kamu — tepat waktu!" : "Sudah waktunya!"),
  ];
  const text = raraWrap(
    isSched ? (missed ? "Pesan Terjadwal Terlewat" : "Pesan Terjadwal Tiba") : (missed ? "Reminder Terlewat" : "Reminder Berbunyi"),
    lines
  );
  await sock.sendMessage(jid, { text, mentions: [sender] });
}

/** Batalkan satu reminder milik sender — clearTimeout + persist. Balikin reminder/null. */
export function cancelReminder(id, sender) {
  const r = global.raraReminders.find(
    (x) => x && x.id === id && x.sender === sender && !x.fired
  );
  if (!r) return null;
  if (r.timerId) clearTimeout(r.timerId);
  r.fired = true;
  r.cancelled = true; // marker buat live ticker → closing "DIBATALKAN" (bukan "tiba")
  persistReminders();
  return r;
}

/** Daftar reminder aktif milik sender (belum fired). */
export function listActiveReminders(sender) {
  return global.raraReminders.filter(
    (r) => r && r.sender === sender && !r.fired
  );
}

/** Pasang timer reminder (dipakai plugin pas buat baru & restore pas startup) */
export function armReminder(sock, reminder) {
  const delay = Math.max(0, Number(reminder.fireAt) - Date.now());
  reminder.timerId = setTimeout(async () => {
    try {
      reminder.fired = true;
      await fireReminder(sock, reminder);
    } catch {}
    persistReminders();
  }, delay);
}

/**
 * Dipanggil connection.js pas startup: reminder aktif dari db dipasang ulang
 * timer-nya; yang kelewat dikirim notif "terlewat" sekali.
 * Balikin { rearmed, missed }.
 */
export function restoreReminders(sock) {
  let rearmed = 0, missed = 0;
  try {
    const db = safeDb();
    const saved = db?.setting(KEY) || [];
    const now = Date.now();
    const activeIds = new Set(global.raraReminders.filter((r) => !r.fired).map((r) => r.id));
    for (const r of saved) {
      if (!r || r.fired || activeIds.has(r.id)) continue;
      if (Number(r.fireAt) > now) {
        global.raraReminders.push(r);
        armReminder(sock, r);
        rearmed++;
      } else {
        global.raraReminders.push(r);
        fireReminder(sock, r, true).catch(() => {}).finally(() => {
          r.fired = true;
          persistReminders();
        });
        missed++;
      }
    }
    persistReminders();
  } catch {}
  return { rearmed, missed };
}
