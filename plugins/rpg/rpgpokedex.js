// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// RPG Pokedex — Catch real Pokemon dari PokeAPI, battle & koleksi
import { getDatabase } from "../../src/lib/nova-database.js";
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import fetch from "node-fetch";

const pluginConfig = {
  name: "rpgpokedex",
  alias: ["rpgpokemon", "pokedexrpg", "rpghuntmon", "tangkepokemon"],
  category: "rpg",
  description: "RPG Pokedex — catch Pokemon real dari PokeAPI, battle, dan koleksi!",
  usage: ".rpgpokedex catch | .rpgpokedex list | .rpgpokedex info <nama> | .rpgpokedex battle <nomor>",
  example: ".rpgpokedex catch\n.rpgpokedex info pikachu",
  isGroup: true,
  cooldown: 15,
  energi: 8,
  isEnabled: true,
};

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const TYPE_EMOJI = {
  fire: "Api", water: "Air", grass: "Rumput", electric: "Listrik",
  ice: "Es", fighting: "Tinju", poison: "Racun", ground: "Tanah",
  flying: "Terbang", psychic: "Psikis", bug: "Serangga", rock: "Batu",
  ghost: "Hantu", dark: "Gelap", dragon: "Naga", steel: "Baja", fairy: "Peri", normal: "Normal",
};

async function fetchPokemon(nameOrId) {
  try {
    const res = await fetch(POKEAPI_BASE + "/pokemon/" + nameOrId);
    if (!res.ok) return null;
    const data = await res.json();
    const speciesRes = await fetch(POKEAPI_BASE + "/pokemon-species/" + data.id);
    let flavorText = "";
    if (speciesRes.ok) {
      const speciesData = await speciesRes.json();
      const entry = speciesData.flavor_text_entries.find((e) => e.language.name === "en");
      if (entry) flavorText = entry.flavor_text.replace(/\f/g, " ").trim();
    }
    return {
      id: data.id,
      name: data.name,
      types: data.types.map((t) => t.type.name),
      height: data.height / 10, // meter
      weight: data.weight / 10, // kg
      stats: {
        hp: data.stats[0].base_stat,
        attack: data.stats[1].base_stat,
        defense: data.stats[2].base_stat,
        speed: data.stats[5].base_stat,
      },
      sprite: data.sprites.front_default,
      official: data.sprites.other["official-artwork"]?.front_default,
      flavorText,
    };
  } catch (e) {
    console.error("[Pokedex] fetch error:", e);
    return null;
  }
}

function calcPower(stats) {
  return stats.hp + stats.attack + stats.defense + stats.speed;
}

async function handler(m, { conn, text, args, usedPrefix, command }) {
  try {
    const db = await getDatabase();
    const sender = m.sender;
    const user = db.data.users?.[sender] || {};
    const sub = (args[0] || "").toLowerCase();

    // LIST
    if (sub === "list" || sub === "daftar" || sub === "koleksi") {
      const dex = user.pokedex || [];
      if (dex.length === 0) {
        return m.reply(claraWrap("RPG Pokedex", "Pokedex kosong! Ketik .rpgpokedex catch untuk mulai menangkap Pokemon!"));
      }
      let lines = ["Pokedex Kamu (" + dex.length + " Pokemon)", ""];
      dex.forEach((p, i) => {
        const types = p.types.map((t) => TYPE_EMOJI[t] || t).join(", ");
        lines.push((i + 1) + ". " + p.name.toUpperCase() + " #" + p.id + " [" + types + "]");
        lines.push("   Power: " + calcPower(p.stats) + " | HP " + p.stats.hp + " ATK " + p.stats.attack + " DEF " + p.stats.defense);
      });
      lines.push("", "Ketik .rpgpokedex battle <nomor> untuk bertarung");
      lines.push("Ketik .rpgpokedex info <nama> untuk lihat detail");
      return m.reply(claraWrap("RPG Pokedex", lines));
    }

    // INFO
    if (sub === "info" || sub === "cek") {
      const name = args.slice(1).join(" ").trim().toLowerCase();
      if (!name) return m.reply(claraWrap("RPG Pokedex", "Masukkan nama Pokemon!\nContoh: .rpgpokedex info pikachu"));
      m.reply(claraWrap("RPG Pokedex", "Mencari Pokemon di PokeAPI..."));
      const pokemon = await fetchPokemon(name);
      if (!pokemon) {
        return m.reply(claraWrap("RPG Pokedex", "Pokemon tidak ditemukan! Cek nama lagi."));
      }
      const types = pokemon.types.map((t) => TYPE_EMOJI[t] || t).join(" / ");
      let lines = [
        "POKEDEX ENTRY #" + pokemon.id,
        "",
        "Nama: " + pokemon.name.toUpperCase(),
        "Tipe: " + types,
        "Tinggi: " + pokemon.height + " m",
        "Berat: " + pokemon.weight + " kg",
        "",
        "STATS:",
        "HP: " + pokemon.stats.hp,
        "Attack: " + pokemon.stats.attack,
        "Defense: " + pokemon.stats.defense,
        "Speed: " + pokemon.stats.speed,
        "Total Power: " + calcPower(pokemon.stats),
        "",
        "Deskripsi: " + pokemon.flavorText,
      ];
      // Kirim gambar + info
      if (pokemon.official) {
        try {
          await conn.sendMessage(m.key.remoteJid, {
            image: { url: pokemon.official },
            caption: claraWrap("RPG Pokedex", lines),
          });
          return;
        } catch {}
      }
      return m.reply(claraWrap("RPG Pokedex", lines, "info"));
    }

    // CATCH
    if (sub === "catch" || sub === "tangkap" || sub === "" || sub === "buru") {
      if ((user.energi || 0) < pluginConfig.energi) {
        return m.reply(claraWrap("RPG Pokedex", "Energi kurang! Butuh " + pluginConfig.energi + " energi."));
      }

      // Random Pokemon ID (1-898 = Gen 1-8, 10001-10220 = special forms)
      const randomId = Math.floor(Math.random() * 898) + 1;
      m.reply(claraWrap("RPG Pokedex", "Menjelajah liar... mencari Pokemon..."));

      const pokemon = await fetchPokemon(randomId);
      if (!pokemon) {
        return m.reply(claraWrap("RPG Pokedex", "Gagal terhubung ke PokeAPI. Coba lagi nanti!"));
      }

      user.energi -= pluginConfig.energi;

      // Catch chance berdasarkan power (makin kuat makin susah)
      const catchRate = Math.max(20, 90 - Math.floor(calcPower(pokemon.stats) / 10));
      const caught = Math.random() * 100 < catchRate;

      if (caught) {
        if (!user.pokedex) user.pokedex = [];
        user.pokedex.push(pokemon);
        user.pokemonCaught = (user.pokemonCaught || 0) + 1;
        db.data.users[sender] = user;
        await db.save();

        const types = pokemon.types.map((t) => TYPE_EMOJI[t] || t).join(" / ");
        let lines = [
          "BERHASIL DITANGKAP!",
          "",
          "Pokemon: " + pokemon.name.toUpperCase() + " #" + pokemon.id,
          "Tipe: " + types,
          "Power: " + calcPower(pokemon.stats),
          "Catch rate: " + catchRate + "%",
          "",
          "HP " + pokemon.stats.hp + " | ATK " + pokemon.stats.attack + " | DEF " + pokemon.stats.defense + " | SPD " + pokemon.stats.speed,
          "",
          "Total di Pokedex: " + user.pokedex.length,
        ];

        // Kirim gambar + info
        if (pokemon.official) {
          try {
            await conn.sendMessage(m.key.remoteJid, {
              image: { url: pokemon.official },
              caption: claraWrap("RPG Pokedex", lines, "success"),
            });
            return;
          } catch {}
        }
        return m.reply(claraWrap("RPG Pokedex", lines, "success"));
      } else {
        db.data.users[sender] = user;
        await db.save();
        return m.reply(claraWrap("RPG Pokedex", [
          "GAGAL TANGKAP!",
          "",
          "Pokemon: " + pokemon.name.toUpperCase() + " #" + pokemon.id,
          "Catch rate: " + catchRate + "%",
          "",
          "Pokemon liar ini terlalu kuat dan kabur!",
          "Coba lagi dengan .rpgpokedex catch",
        ], "warn"));
      }
    }

    // BATTLE
    if (sub === "battle" || sub === "lawan") {
      const idx = parseInt(args[1]) - 1;
      const dex = user.pokedex || [];
      if (isNaN(idx) || idx < 0 || idx >= dex.length) {
        return m.reply(claraWrap("RPG Pokedex", "Nomor tidak valid. Ketik .rpgpokedex list untuk lihat koleksi."));
      }
      const myPokemon = dex[idx];

      // Random wild Pokemon
      const wildId = Math.floor(Math.random() * 898) + 1;
      m.reply(claraWrap("RPG Pokedex", "Pokemon liar muncul! Menghubungkan ke PokeAPI..."));

      const wild = await fetchPokemon(wildId);
      if (!wild) return m.reply(claraWrap("RPG Pokedex", "Gagal memuat Pokemon liar. Coba lagi!"));

      // Battle simulation
      const myPower = calcPower(myPokemon.stats) + Math.floor(Math.random() * 50);
      const wildPower = calcPower(wild.stats) + Math.floor(Math.random() * 50);
      const won = myPower >= wildPower;

      let reward = 0;
      let expGain = 0;
      if (won) {
        reward = 50 + wildPower;
        expGain = Math.floor(wildPower / 5);
        user.koin = (user.koin || 0) + reward;
        user.exp = (user.exp || 0) + expGain;
        user.pokemonWins = (user.pokemonWins || 0) + 1;
      } else {
        user.pokemonLosses = (user.pokemonLosses || 0) + 1;
      }
      db.data.users[sender] = user;
      await db.save();

      let lines = [
        "POKEMON BATTLE!",
        "",
        "Kamu: " + myPokemon.name.toUpperCase() + " (Power: " + calcPower(myPokemon.stats) + ")",
        "Liar: " + wild.name.toUpperCase() + " (Power: " + calcPower(wild.stats) + ")",
        "",
        "Battle Power Kamu: " + myPower,
        "Battle Power Liar: " + wildPower,
        "",
        won ? "MENANG! Pokemon liar dikalahkan!" : "KALAH! Pokemon liarmu terlalu kuat.",
      ];
      if (won) {
        lines.push("Reward: " + reward + " koin, +" + expGain + " exp");
      }
      lines.push("", "Battle record: " + (user.pokemonWins || 0) + "W / " + (user.pokemonLosses || 0) + "L");

      // Kirim gambar wild pokemon
      if (wild.official) {
        try {
          await conn.sendMessage(m.key.remoteJid, {
            image: { url: wild.official },
            caption: claraWrap("RPG Pokedex", lines, won ? "success" : "warn"),
          });
          return;
        } catch {}
      }
      return m.reply(claraWrap("RPG Pokedex", lines, won ? "success" : "warn"));
    }

    // HELP
    return m.reply(claraWrap("RPG Pokedex", [
      "Catch & koleksi Pokemon real dari PokeAPI",
      "",
      "CARA PAKAI:",
      usedPrefix + "rpgpokedex catch — Tangkap Pokemon random",
      usedPrefix + "rpgpokedex list — Lihat koleksi Pokedex",
      usedPrefix + "rpgpokedex info <nama> — Info detail Pokemon",
      usedPrefix + "rpgpokedex battle <nomor> — Battle Pokemon liar",
      "",
      "Data dari: pokeapi.co (898 Pokemon dari Gen 1-8)",
      "Catch rate berdasarkan power Pokemon!",
    ]));
  } catch (e) {
    console.error("[RPG Pokedex]", e);
    m.reply(claraWrap("RPG Pokedex", "Error: " + e.message));
  }
}

export { pluginConfig as config, handler };
