// nova-rpg-weather.js — Sistem cuaca dunia RPG (upgrade owner 15 Sep 2026)
// Cuaca harian GLOBAL deterministik (seed dari tanggal WIB): semua player se-dunia
// merasakan cuaca yang sama hari itu, tahan restart (gak butuh db), ganti tiap
// tengah malam WIB. Pengaruh NYATA ke mekanik:
//   🎣 mancing : peluang ikan langka & mutiara (weightedFish) ×fishMult
//   ⚔️ berburu : EXP + Gold hasil buruan ×huntMult
//   ⛏️ mining  : peluang ore + gold ×mineMult
// Command: .weathersystemrpg (plugins/rpg/weathersystemrpg.js)

// ─── deterministic PRNG dari string (xmur3 + mulberry32) ───
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── jenis cuaca + efek (fish/hunt/mine multiplier) ───
export const RPG_WEATHER_KINDS = {
  cerah: { label: "Cerah",   emoji: "☀️", desc: "Langit biru bersih, kondisi ideal menjelajah.", fish: 1.0,  hunt: 1.0,  mine: 1.0 },
  hujan:{ label: "Hujan",    emoji: "🌧️", desc: "Ikan lapar muncul ke permukaan, hutan basah & licin.", fish: 1.3,  hunt: 0.9,  mine: 0.9 },
  badai: { label: "Badai",   emoji: "⛈️", desc: "Ombak besar bawa ikan langka — monster ganas keluar sarang!", fish: 1.6,  hunt: 1.3,  mine: 0.7 },
  kabut: { label: "Berkabut",emoji: "🌫️", desc: "Jarak pandang rendah, manglia mudah kabur.", fish: 0.9,  hunt: 0.85, mine: 1.0 },
  salju: { label: "Salju",   emoji: "❄️", desc: "Tanah beku — bijih mudah retak & terlihat.", fish: 0.85, hunt: 0.9,  mine: 1.2 },
};
const KIND_IDS = Object.keys(RPG_WEATHER_KINDS);

// tanggal WIB hari ini (YYYY-MM-DD, en-CA format pakai 2 digit)
function todayWib(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// ─── override seam untuk e2e/live debug ───
let _weatherOverride = null;
export function _setRpgWeatherForTest(kind) {
  _weatherOverride = kind === null || kind === undefined ? null : String(kind);
}
export function _getRpgWeatherOverride() { return _weatherOverride; }

/**
 * Cuaca RPG hari tertentu (default: hari ini WIB).
 * Deterministik: tanggal sama = cuaca sama, gak peduli siapa/kapan ngecek.
 * @param {string|number} [date] YYYY-MM-DD (string) atau offset hari (number)
 */
export function getRpgWeather(date) {
  if (_weatherOverride) {
    const k = RPG_WEATHER_KINDS[_weatherOverride];
    if (k) return { kind: _weatherOverride, ...k };
  }
  const dateStr = typeof date === "number" ? todayWib(date) : (date || todayWib());
  const roll = mulberry32(hashStr("rpg-weather:" + dateStr))();
  const kind = KIND_IDS[Math.floor(roll * KIND_IDS.length)];
  return { kind, ...RPG_WEATHER_KINDS[kind] };
}

// cuaca besok (prakiraan) — offset +1 hari
export function getRpgWeatherForecast(days = 1) {
  return getRpgWeather(todayWib(days));
}

// ─── helper murni: terapkan multiplier ke bobot tangkapan (mancing) ───
// rare naik saat fishMult > 1, sampah turun; kebalikannya saat < 1.
export function applyWeatherToFishWeights(weights, fishMult) {
  const mult = Number(fishMult) || 1;
  return weights.map((w) => {
    let nw = w;
    if (mult > 1) {
      if (w.rarity === "Trash") nw = { ...w, weight: Math.max(0.05, w.weight / mult) };
      else if (["S", "SS", "SSS"].includes(w.rarity)) nw = { ...w, weight: w.weight * mult };
    } else if (mult < 1) {
      if (["S", "SS", "SSS"].includes(w.rarity)) nw = { ...w, weight: w.weight * mult };
      else if (w.rarity === "Trash") nw = { ...w, weight: w.weight * (1 + (1 - mult)) };
    }
    return nw;
  });
}

// tag 1 baris buat kartu hasil RPG
export function rpgWeatherTag(w) {
  const parts = [];
  if (w.fish !== 1) parts.push(`mancing ${w.fish > 1 ? "+" : ""}${Math.round((w.fish - 1) * 100)}%`);
  if (w.hunt !== 1) parts.push(`berburu ${w.hunt > 1 ? "+" : ""}${Math.round((w.hunt - 1) * 100)}%`);
  if (w.mine !== 1) parts.push(`mining ${w.mine > 1 ? "+" : ""}${Math.round((w.mine - 1) * 100)}%`);
  return `${w.emoji} Cuaca: ${w.label}${parts.length ? ` (${parts.join(", ")})` : " (normal)"}`;
}
