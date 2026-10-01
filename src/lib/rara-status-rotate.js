// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// 🔹 ROTASI STATUS LOADING (request owner 12 Sep 2026: "kenapa loading
// raraagent cm sedang berpikir, gak ad loading sedang mencari / sedang
// eksekusi / sedang mengerjakan"): fase 1 pesan status edit-in-place
// di-edit berputar tiap interval biar keliatan ada aktivitas selama proses
// AI panjang (fallback provider bisa 35 dtk/each). Berhenti otomatis di
// fase terakhir — dan stopper() wajib dipanggil di finally.
export function startStatusRotation(setStatus, phases, intervalMs = 8000) {
  if (typeof setStatus !== "function" || !Array.isArray(phases) || phases.length === 0) {
    return () => {};
  }
  let idx = 0;
  let stopped = false;
  const timer = setInterval(async () => {
    if (stopped) return;
    idx += 1;
    if (idx >= phases.length) { stopped = true; clearInterval(timer); return; }
    try { await setStatus(phases[idx]); } catch {}
  }, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}
