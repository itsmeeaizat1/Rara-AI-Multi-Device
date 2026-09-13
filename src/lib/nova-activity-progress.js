// NOVA ACTIVITY PROGRESS — PROGRES LEVEL AKTIVITAS (13 Sep 2026)
// Request owner: "buatkan fitur progres level jd setiap user ada aktivitas
// melakukan aksi ketik cmd atau bermain game, klo level naik jd level 2
// dikasih pesan selamat level naik 1 - 2 atau pemberitahuan penghargaan".
//
// Tiap command valid yang sukses dieksekusi (handler.js hook) kasih EXP ke
// sistem level global (nova-level.js, EXP_PER_LEVEL 10000):
//   - command biasa   : +15 EXP
//   - kategori game/rpg: +40 EXP (aktivitas bermain game lebih berbobot)
// Saat EXP nyebrang batas level (mis. 1 → 2), checkAndNotifyLevelUp
// ngirim KARTU SELAMAT (anime bg + progress bar) + PENGHARGAAN koin
// (level baru × 500) — udah otomatis dari nova-level.js.
//
// Fire-and-forget: gagal apapun diem aja, gak ganggu command utama.

const BASE_CMD_EXP = 15;
const GAME_CMD_EXP = 40;
const GAME_CATEGORIES = new Set(["game", "rpg"]);

/**
 * Kasih EXP aktivitas ke user setelah command sukses.
 * @param {object} sock - koneksi WA (buat kirim kartu level-up)
 * @param {object} m - pesan (m.sender, m.chat, m.pushName)
 * @param {object} opts { category } - kategori plugin yang barusan jalan
 * @returns {Promise<object|null>} hasil addExpWithLevelCheck atau null
 */
export async function grantActivityExp(sock, m, { category = "" } = {}) {
  try {
    if (!sock || !m?.sender || m.isNewsletter) return null;
    const { getDatabase } = await import("./nova-database.js");
    const db = getDatabase(); // bisa throw di env tanpa path db — dielus senyap
    const user = db.getUser(m.sender) || db.setUser(m.sender);
    if (!user) return null;
    const { addExpWithLevelCheck } = await import("./nova-level.js");
    const amount = GAME_CATEGORIES.has(String(category || "").toLowerCase())
      ? GAME_CMD_EXP
      : BASE_CMD_EXP;
    return await addExpWithLevelCheck(sock, m, db, user, amount);
  } catch {
    return null; // aktivitas gak pernah boleh ngerusak command
  }
}

export { BASE_CMD_EXP, GAME_CMD_EXP, GAME_CATEGORIES };
