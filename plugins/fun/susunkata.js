// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { tipText, claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "susunkata", alias: ["wordscramble", "tebakkata"], category: "fun",
  description: "Tebak susunan kata", usage: ".susunkata",
  example: ".susunkata", isOwner: false, isPremium: false,
  isGroup: true, isPrivate: true, cooldown: 10, energi: 0, isEnabled: true,
};

const WORDS = ["javascript","kalkulator","indonesia","pemrograman","komputer","algoritma","database","internet","aplikasi","framework","variable","function","modulus","server","frontend","backend","terminal","delpoyment","container","virtual"];

function scramble(word) {
  const arr = word.split("");
  for (let i = arr.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr.join("");
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const word = WORDS[Math.floor(Math.random()*WORDS.length)];
    const scrambled = scramble(word);
    { const __navText = (claraWrap("Susun Kata", [`  ┊  ➶ Acak: *${scrambled}*`,
      `  ┊  ➶ Hint: ${word.length} huruf`].join("\n")) + "\n" + tipText("Balas dengan jawabanmu!")); await m.reply(__navText); };
    if (!global.susunkataAnswer) global.susunkataAnswer = {};
    global.susunkataAnswer[m.sender] = word;
  } catch (e) {
    await m.reply("Error: " + e.message);
  }
  return { handled: true };
}
export { pluginConfig as config, handler };