// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// joke.js — Random joke from JokeAPI (no API key, safe-mode)
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import te from "../../src/lib/nova-error.js";

const pluginConfig = {
  name: "joke",
  alias: ["joke"],
  category: "fun",
  description: "Random joke dari JokeAPI (dengan kategori)",
  usage: ".joke [kategori]",
  example: ".joke\n.joke programming\n.joke misc\n.joke pun",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 1,
  isEnabled: true,
};

const VALID_CATS = ["programming", "misc", "dark", "pun", "spooky", "christmas"];

async function getJoke(category) {
  const cat = category || "Any";
  const url = `https://v2.jokeapi.dev/joke/${cat}?safe-mode`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`JokeAPI ${res.status}`);
  return await res.json();
}

async function handler(m, { sock, config, db }) {
  try {
    const input = (m.args?.[0] || "").toLowerCase();

    if (input === "help" || input === "list") {
      return m.reply(claraWrap("Joke", [
        "Random joke dari JokeAPI",
        "",
        "📌 *Cara Pakai:*",
        `${m.prefix}joke — joke random`,
        `${m.prefix}joke <kategori> — joke per kategori`,
        "",
        "Kategori: programming, misc, dark, pun, spooky, christmas",
      ]));
    }

    let category = "";
    if (input && VALID_CATS.includes(input)) {
      category = input;
    }

    await m.react("🕒");

    const joke = await getJoke(category);

    if (joke.error) {
      await m.react("🐣");
      return m.reply(claraWrap("Joke", `Error: ${joke.message || "Gagal mengambil joke"}`));
    }

    let text = "";
    if (joke.type === "single") {
      text = joke.joke || "No joke found";
    } else if (joke.type === "twopart") {
      text = `${joke.setup}\n\n${joke.delivery}`;
    } else {
      text = "Format joke tidak dikenal.";
    }

    if (joke.category) {
      text += `\n\nKategori: ${joke.category}`;
    }

    await m.react("🐣");
    return m.reply(claraWrap("Joke", text));
  } catch (e) {
    console.error("[joke] error:", e.message);
    await m.react("❌");
    return m.reply(te(m.prefix, m.command, m.pushName), "joke");
  }
}

export { pluginConfig as config, handler };
