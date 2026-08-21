import { sendReplyWithNav } from "../../src/lib/nova-nav-buttons.js";

import { tipText,  claraWrap } from "../../src/lib/nova-menu-style.js";

const pluginConfig = {
  name: "mathquiz",
  alias: ["mathquiz", "math2", "kuismath"],
  category: "game",
  description: "Jawab soal matematika acak",
  usage: ".mathquiz",
  example: ".mathquiz",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 15,
  energi: 0,
  isEnabled: true,
};

function generateMath() {
  const ops = [
    () => {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      return { text: `${a} + ${b} = ?`, answer: a + b };
    },
    () => {
      const a = Math.floor(Math.random() * 20) + 10;
      const b = Math.floor(Math.random() * 10) + 1;
      return { text: `${a} - ${b} = ?`, answer: a - b };
    },
    () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      return { text: `${a} × ${b} = ?`, answer: a * b };
    },
  ];
  return ops[Math.floor(Math.random() * ops.length)]();
}

async function handler(m, { sock, config: botConfig }) {
  try {
    const prefix = botConfig.command?.prefix || ".";
    const { text, answer } = generateMath();

    const reply =
      claraWrap("Math Quiz", [`◦ Soal: *${text}*`].join("\n")) +
      "\n" +
      tipText(`Ketik ${prefix}mathquiz untuk soal lain`) +
      "\n" +
      tipText(`Ketik ${prefix}menu untuk kembali`);

    await m.reply(claraWrap("mathquiz", reply));
  } catch (error) {
    const prefix = botConfig.command?.prefix || ".";
    const reply =
      claraWrap("Gagal", [`◦ Status: *Gagal*`,
        `◦ Alasan: *${error.message}*`].join("\n")) +
      "\n" +
      tipText(`Coba lagi nanti atau hubungi owner`);

    await sendReplyWithNav(sock, m, reply, "mathquiz");
  }

  return { handled: true };
}

export { pluginConfig as config, handler }
