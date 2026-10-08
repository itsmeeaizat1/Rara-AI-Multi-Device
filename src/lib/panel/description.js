// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// Deskripsi server panel Pterodactyl (kolom "Server Description" di Settings panel).
// Satu pintu buat semua jalur create (.cpanel/.cp/.createserver/auto-order) biar
// watermark nama bot + "by Aizat" seragam.
export const PANEL_WATERMARK = "RARA AI - MULTI DEVICE | by Aizat";

// buildServerDescription("Created at 8 Oktober 2026 08:00 [V1] [CLIENT]")
// → "Created at ... [V1] [CLIENT]\n— RARA AI - MULTI DEVICE | by Aizat"
export function buildServerDescription(base) {
  const core = String(base || "").trim();
  if (core.includes(PANEL_WATERMARK)) return core;
  return core ? `${core}\n— ${PANEL_WATERMARK}` : `— ${PANEL_WATERMARK}`;
}
