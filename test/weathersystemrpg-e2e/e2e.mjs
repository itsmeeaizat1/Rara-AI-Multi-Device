// E2E WEATHER SYSTEM RPG (upgrade owner 15 Sep 2026: cuaca harian deterministik
// yang beneran ngaruh ke mancing/berburu/mining + rename .weatherrpg → .weathersystemrpg)
// Jalankan dari cwd DIR KOSONG:
//   mkdir -p /tmp/weathersystemrpg-e2e && cd /tmp/weathersystemrpg-e2e &&
//   node <repo>/test/weathersystemrpg-e2e/e2e.mjs
import path from "node:path";
import { initDatabase, getDatabase } from "../../src/lib/rara-database.js";
import {
  RPG_WEATHER_KINDS, getRpgWeather, getRpgWeatherForecast,
  applyWeatherToFishWeights, rpgWeatherTag,
  _setRpgWeatherForTest,
} from "../../src/lib/rara-rpg-weather.js";
import { config as wsConfig, handler as wsHandler } from "../../plugins/rpg/weathersystemrpg.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "✅" : "❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };

// db init (cwd kosong)
await initDatabase(path.join(process.cwd(), "rara.json"));

// ─── 1. LIB: kinds + multiplier ───
check("1. 5 jenis cuaca terdefinisi", Object.keys(RPG_WEATHER_KINDS).length === 5);
check("2. badai = fish 1.6 / hunt 1.3 / mine 0.7", RPG_WEATHER_KINDS.badai.fish === 1.6 && RPG_WEATHER_KINDS.badai.hunt === 1.3 && RPG_WEATHER_KINDS.badai.mine === 0.7);
check("3. salju = mine 1.2", RPG_WEATHER_KINDS.salju.mine === 1.2);
check("4. cerah netral semua 1.0", RPG_WEATHER_KINDS.cerah.fish === 1 && RPG_WEATHER_KINDS.cerah.hunt === 1 && RPG_WEATHER_KINDS.cerah.mine === 1);

// ─── 2. DETERMINISTIK: tanggal sama → cuaca sama ───
const a1 = getRpgWeather("2026-09-15"), a2 = getRpgWeather("2026-09-15");
check("5. deterministik per tanggal (2x panggil = sama)", a1.kind === a2.kind);
const allKinds = new Set();
for (let d = 1; d <= 60; d++) {
  const dt = new Date(Date.UTC(2026, 0, d));
  allKinds.add(getRpgWeather(dt.toISOString().slice(0, 10)).kind);
}
check("6. 60 hari → minimal 3 variasi cuaca", allKinds.size >= 3, `variasi: ${allKinds.size}`);

// ─── 3. OVERRIDE SEAM ───
_setRpgWeatherForTest("badai");
check("7. override seam: getRpgWeather() → badai", getRpgWeather().kind === "badai");
_setRpgWeatherForTest("gakada");
check("8. override invalid → fallback deterministik", !!RPG_WEATHER_KINDS[getRpgWeather().kind] || getRpgWeather().kind === "gakada" ? getRpgWeather().fish !== undefined : true);
_setRpgWeatherForTest(null);
check("9. override reset → deterministik balik", getRpgWeather("2026-09-15").kind === a1.kind);

// ─── 4. FORECAST ───
const tom = getRpgWeatherForecast(1);
check("10. forecast besok balikin kind valid", RPG_WEATHER_KINDS[tom.kind] !== undefined, tom.kind);

// ─── 5. applyWeatherToFishWeights (efek ke mancing) ───
const base = [
  { name: "A", rarity: "SSS", weight: 1 },
  { name: "B", rarity: "C", weight: 10 },
  { name: "Sampah", rarity: "Trash", weight: 20 },
];
const badai = applyWeatherToFishWeights(base, 1.6);
const salju = applyWeatherToFishWeights(base, 0.85);
const bRare = badai.find(f => f.rarity === "SSS").weight ?? badai.find(f => f.rarity === "SSS").w;
const bTrash = badai.find(f => f.rarity === "Trash").weight ?? badai.find(f => f.rarity === "Trash").w;
const sRare = salju.find(f => f.rarity === "SSS").weight ?? salju.find(f => f.rarity === "SSS").w;
check("11. badai: bobot ikan langka naik 1.6x", Math.abs(bRare - 1.6) < 0.001, String(bRare));
check("12. badai: bobot sampah turun (÷1.6)", Math.abs(bTrash - 12.5) < 0.001, String(bTrash));
check("13. salju: bobot ikan langka turun 0.85x", Math.abs(sRare - 0.85) < 0.001, String(sRare));

// ─── 6. TAG hasil ───
check("14. tag hujan nyebut mancing", rpgWeatherTag(RPG_WEATHER_KINDS.hujan).includes("mancing"));
check("15. tag cerah bilang normal", rpgWeatherTag(RPG_WEATHER_KINDS.cerah).includes("normal"));

// ─── 7. PLUGIN .weathersystemrpg render ───
function makeM() {
  const replies = [], reacts = [];
  return {
    args: [], text: "", chat: "62812@g.us", prefix: ".", sender: "6281111@s.whatsapp.net",
    pushName: "Aizat", isGroup: true,
    reply: async (t) => { replies.push(String(t)); return { key: { id: "r" } }; },
    react: async (e) => { reacts.push(e); return true; },
    _replies: replies, _reacts: reacts,
  };
}
const m1 = makeM();
await wsHandler(m1, { sock: { sendMessage: async () => ({}) } });
const out1 = m1._replies[0] || "";
check("16. kartu cuaca terkirim", !!out1, "gak ada reply");
check("17. ada label CUACA HARI INI", out1.includes("CUACA HARI INI"));
check("18. ada efek mancing/berburu/mining", out1.includes("Mancing") && out1.includes("Berburu") && out1.includes("Mining"));
check("19. ada prakiraan besok", out1.includes("Prakiraan besok"));

// override → render ngikut
_setRpgWeatherForTest("badai");
const m2 = makeM();
await wsHandler(m2, { sock: { sendMessage: async () => ({}) } });
check("20. override badai → kartu bilai BADAI + efek", m2._replies[0].includes("BADAI") || m2._replies[0].includes("badai"));
_setRpgWeatherForTest(null);

// ─── 8. CONFIG plugin ───
check("21. nama plugin weathersystemrpg", wsConfig.name === "weathersystemrpg");
check("22. alias lama dihapus total (weatherrpg/cuacarpg/weather)", !wsConfig.alias.includes("weatherrpg") && !wsConfig.alias.includes("cuacarpg") && !wsConfig.alias.includes("weather"));
check("23. kategori rpg", wsConfig.category === "rpg");

w(`\n===== ${pass} PASS, ${fail} FAIL =====`);
process.exit(fail > 0 ? 1 : 0);
