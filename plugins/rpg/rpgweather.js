// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Weather Quest — Battle dipengaruhi cuaca real-time dari WTTR.in API
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";

const pluginConfig = {
  name: "rpgweather",
  alias: ["rpgcuaca", "weatherrpg", "rpgweathersystem", "cuacarpg"],
  category: "rpg",
  description: "RPG Weather Quest — battle dipengaruhi cuaca real-time dari WTTR.in API!",
  usage: ".rpgweather | .rpgweather check <kota> | .rpgweather status",
  example: ".rpgweather\n.rpgweather check Jakarta",
  isGroup: true,
  cooldown: 15,
  energi: 6,
  isEnabled: true,
};

const WEATHER_EFFECTS = {
  "Sunny": { label: "Cerah", element: "Api", atkBoost: 30, defBoost: -10, desc: "Api +30% ATK, Bumi -10% DEF" },
  "Clear": { label: "Cerah", element: "Api", atkBoost: 30, defBoost: -10, desc: "Api +30% ATK, Bumi -10% DEF" },
  "Partly cloudy": { label: "Berawan Sebagian", element: "Angin", atkBoost: 15, defBoost: 0, desc: "Angin +15% ATK, normal" },
  "Cloudy": { label: "Berawan", element: "Air", atkBoost: 10, defBoost: 10, desc: "Air +10% ATK, Es +10% DEF" },
  "Overcast": { label: "Mendung", element: "Air", atkBoost: 15, defBoost: 15, desc: "Air +15% ATK, Es +15% DEF" },
  "Mist": { label: "Berkabut", element: "Gelap", atkBoost: 20, defBoost: 5, desc: "Gelap +20% ATK, akurasi turun" },
  "Fog": { label: "Kabut Tebal", element: "Gelap", atkBoost: 25, defBoost: 10, desc: "Gelap +25% ATK, Es +10% DEF" },
  "Rain": { label: "Hujan", element: "Air", atkBoost: 25, defBoost: 20, desc: "Air +25% ATK, Petir +20% DEF" },
  "Drizzle": { label: "Gerimis", element: "Air", atkBoost: 15, defBoost: 10, desc: "Air +15% ATK, Es +10% DEF" },
  "Snow": { label: "Salju", element: "Es", atkBoost: 30, defBoost: 25, desc: "Es +30% ATK/DEF, Api lemah" },
  "Thunderstorm": { label: "Badai Petir", element: "Petir", atkBoost: 50, defBoost: 0, desc: "Petir +50% ATK! Berbahaya!" },
  "Thunder": { label: "Guntur", element: "Petir", atkBoost: 35, defBoost: 5, desc: "Petir +35% ATK" },
  "Wind": { label: "Angin Kencang", element: "Angin", atkBoost: 30, defBoost: -5, desc: "Angin +30% ATK" },
  "Haze": { label: "Udara Kabur", element: "Gelap", atkBoost: 15, defBoost: 5, desc: "Gelap +15% ATK" },
};

const MONSTERS = [
  { name: "Fire Imp", element: "Api", hp: 50, atk: 20 },
  { name: "Water Naga", element: "Air", hp: 60, atk: 18 },
  { name: "Ice Golem", element: "Es", hp: 80, atk: 15 },
  { name: "Thunder Bird", element: "Petir", hp: 55, atk: 25 },
  { name: "Dark Wraith", element: "Gelap", hp: 70, atk: 22 },
  { name: "Wind Spirit", element: "Angin", hp: 45, atk: 28 },
];

async function fetchWeather(city) {
  try {
    const res = await fetch("https://wttr.in/" + encodeURIComponent(city) + "?format=j1");
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;
    const desc = current.weatherDesc?.[0]?.value || "Clear";
    const tempC = current.temp_C;
    const humidity = current.humidity;
    const windSpeed = current.windspeedKmph;
    const area = data.nearest_area?.[0]?.areaName?.[0]?.value || city;
    return { desc, tempC, humidity, windSpeed, area, feelsLike: current.FeelsLikeC };
  } catch (e) {
    console.error("[Weather API] error:", e);
    return null;
  }
}

function matchWeatherEffect(desc) {
  const key = Object.keys(WEATHER_EFFECTS).find((k) => desc.toLowerCase().includes(k.toLowerCase()));
  return key ? WEATHER_EFFECTS[key] : WEATHER_EFFECTS["Clear"];
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // STATUS
    if (sub === "status" || sub === "cek") {
      return m.reply(claraWrap("RPG Weather Quest", [
        "STATUS WEATHER QUEST",
        "",
        "Level: " + (user.wqLevel || 1),
        "Battles menang: " + (user.wqWins || 0),
        "Battles kalah: " + (user.wqLosses || 0),
        "Kota default: " + (user.wqCity || "Jakarta"),
        "Koin: " + (user.koin || 0),
        "",
        "Ketik .rpgweather untuk mulai battle!",
        "Ketik .rpgweather check <kota> untuk cek cuaca",
      ]));
    }

    // CHECK WEATHER
    if (sub === "check" || sub === "cuaca" || sub === "cekcuaca") {
      const city = args.slice(1).join(" ").trim() || user.wqCity || "Jakarta";
      m.reply(claraWrap("RPG Weather Quest", "Mengambil cuaca real-time dari WTTR.in..."));
      const weather = await fetchWeather(city);
      if (!weather) return m.reply(claraWrap("RPG Weather Quest", "Gagal mengambil cuaca. Coba kota lain!"));

      const effect = matchWeatherEffect(weather.desc);
      user.wqCity = city;
      db.data.users[sender] = user;
      await db.save();

      return m.reply(claraWrap("RPG Weather Quest", [
        "CUACA REAL-TIME",
        "",
        "Lokasi: " + weather.area,
        "Cuaca: " + weather.desc + " (" + effect.label + ")",
        "Suhu: " + weather.tempC + "C (Feels like " + weather.feelsLikeC + "C)",
        "Kelembapan: " + weather.humidity + "%",
        "Angin: " + weather.windSpeed + " km/h",
        "",
        "EFEK RPG:",
        "Elemen boost: " + effect.element,
        "ATK bonus: " + (effect.atkBoost >= 0 ? "+" : "") + effect.atkBoost + "%",
        "DEF bonus: " + (effect.defBoost >= 0 ? "+" : "") + effect.defBoost + "%",
        "",
        effect.desc,
        "",
        "Ketik .rpgweather untuk battle dengan efek cuaca ini!",
      ], "info"));
    }

    // BATTLE
    if ((user.energi || 0) < pluginConfig.energi) {
      return m.reply(claraWrap("RPG Weather Quest", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
    }

    const city = user.wqCity || "Jakarta";
    m.reply(claraWrap("RPG Weather Quest", "Mengambil cuaca " + city + " untuk menentukan battle..."));

    const weather = await fetchWeather(city);
    if (!weather) return m.reply(claraWrap("RPG Weather Quest", "Gagal mengambil cuaca. Coba .rpgweather check <kota> dulu!"));

    const effect = matchWeatherEffect(weather.desc);
    const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];

    // User stats
    const userAtk = (user.attack || 20) + (user.level || 1) * 5;
    const userDef = (user.defense || 10) + (user.level || 1) * 3;
    const userHp = (user.hp || 100) + (user.maxHp || 100) / 2;

    // Apply weather effect
    const weatherAtkMult = 1 + (effect.atkBoost / 100);
    const weatherDefMult = 1 + (effect.defBoost / 100);

    // Monster gets weather boost if same element
    const monsterWeatherBoost = monster.element === effect.element ? 1.5 : 1;
    const monsterAtk = monster.atk * monsterWeatherBoost;
    const monsterHp = monster.hp * (1 + (user.wqLevel || 1) * 0.1);

    // User gets weather boost if their "class element" matches
    const userElement = user.rpgElement || "Api"; // default
    const userWeatherBoost = userElement === effect.element ? 1.5 : 1;
    const finalUserAtk = userAtk * weatherAtkMult * userWeatherBoost;
    const finalUserDef = userDef * weatherDefMult;

    // Battle simulation
    let mHp = monsterHp;
    let uHp = userHp;
    let rounds = 0;
    let log = [];

    while (mHp > 0 && uHp > 0 && rounds < 15) {
      rounds++;
      const dmgToM = Math.max(1, finalUserAtk - Math.floor(monsterAtk * 0.15));
      mHp -= dmgToM;
      log.push("R" + rounds + ": Kamu " + dmgToM + " DMG");
      if (mHp <= 0) break;
      const dmgToU = Math.max(1, monsterAtk - finalUserDef);
      uHp -= dmgToU;
      log.push("R" + rounds + ": Musuh " + dmgToU + " DMG");
    }

    const won = mHp <= 0;
    user.energi -= pluginConfig.energi;

    let reward = 0;
    let expGain = 0;
    if (won) {
      reward = 60 + Math.floor(monsterHp) + (monster.element === effect.element ? 30 : 0);
      expGain = 25 + Math.floor(monsterHp / 3);
      user.koin = (user.koin || 0) + reward;
      user.exp = (user.exp || 0) + expGain;
      user.wqWins = (user.wqWins || 0) + 1;
      if (user.exp >= (user.wqLevel || 1) * 120) {
        user.wqLevel = (user.wqLevel || 1) + 1;
      }
    } else {
      user.wqLosses = (user.wqLosses || 0) + 1;
    }
    db.data.users[sender] = user;
    await db.save();

    let lines = [
      "WEATHER QUEST BATTLE",
      "",
      "Lokasi: " + weather.area,
      "Cuaca: " + weather.desc + " (" + effect.label + ")",
      "Suhu: " + weather.tempC + "C",
      "",
      "EFEK CUACA:",
      "Elemen boost: " + effect.element,
      "ATK " + (effect.atkBoost >= 0 ? "+" : "") + effect.atkBoost + "% | DEF " + (effect.defBoost >= 0 ? "+" : "") + effect.defBoost + "%",
      "",
      "MUSUH: " + monster.name + " [" + monster.element + "]",
      monster.element === effect.element ? "Monster DAPAT BONUS cuaca! (x1.5)" : "",
      "User element: " + userElement + (userElement === effect.element ? " (BOOST x1.5!)" : ""),
      "",
      "BATTLE LOG:",
      "",
    ];
    log.forEach((l) => lines.push(l));
    lines.push("");
    lines.push(won ? "MENANG!" : "KALAH!");
    if (won) {
      lines.push("Reward: " + reward + " koin, +" + expGain + " exp");
      lines.push("Level: " + (user.wqLevel || 1));
    }
    lines.push("", "Energi: " + user.energi);
    lines.push("Record: " + (user.wqWins || 0) + "W / " + (user.wqLosses || 0) + "L");

    return m.reply(claraWrap("RPG Weather Quest", lines, won ? "success" : "warn"));
  } catch (e) {
    console.error("[RPG Weather Quest]", e);
    m.reply(claraWrap("RPG Weather Quest", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
