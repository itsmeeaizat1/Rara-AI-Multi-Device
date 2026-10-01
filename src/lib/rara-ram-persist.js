// RARA RAM PERSIST — jembatan global.* ↔ database (13 Sep 2026, request owner
// "sweep fitur yang datanya di RAM — rawan ilang pas restart").
// Pola: persistLoad(key) di awal handler (sekali per proses, isi global yang
// masih kosong dari db) + persistSave(key) tiap habis mutasi.
// Cuma buat data JSON-safe (array/object murni) — timer/sock GAK BOLEH lewat sini.
import { getDatabase } from "./rara-database.js";

const dbKey = (k) => "ramPersist:" + k;
const loaded = new Set();

/** Isi global[key] dari db kalau masih kosong — idempoten per proses */
export function persistLoad(key) {
  if (loaded.has(key)) return;
  loaded.add(key);
  try {
    const db = getDatabase();
    const saved = db.setting(dbKey(key));
    const cur = global[key];
    const curEmpty = Array.isArray(cur) ? cur.length === 0 : !cur || Object.keys(cur).length === 0;
    if (saved !== undefined && saved !== null && curEmpty) global[key] = saved;
  } catch {}
}

/** Simpen global[key] ke db — dipanggil tiap habis mutasi */
export function persistSave(key) {
  try {
    const db = getDatabase();
    db.setting(dbKey(key), global[key]);
  } catch {}
}

/** seam test: reset catatan "udah ke-load" */
export function _resetPersistForTest() { loaded.clear(); }
