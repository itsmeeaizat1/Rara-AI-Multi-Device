// RARA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { raraWrap, raraGuideV2, raraSalahV2 } from "../../src/lib/rara-menu-style.js";
import { f } from '../../src/lib/rara-http.js';
import te from '../../src/lib/rara-error.js';
import { callIkyy } from "../../src/lib/rara-ai-service.js";

const pluginConfig = {
    name: "muslimai",
    alias: ["muslimai"],
    category: 'ai',
    description: 'AI untuk bertanya tentang Islam dan Al-Quran',
    usage: '.muslimai <pertanyaan>',
    example: '.muslimai Apa itu sholat?',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    energi: 1,
    isEnabled: true
}

class MuslimAI {
    constructor() {
        this.url = "https://www.muslimai.io/api/chat";
        this.headers = { "Content-Type": "application/json" };
    }

    _id() {
        return "019e7d1d-e8a4-702d-96b8-defd87522114";
    }

    _body(q) {
        return JSON.stringify({ query: q, distinctId: this._id() });
    }

    _opts(q) {
        return { method: "POST", headers: this.headers, body: this._body(q) };
    }

    _parse(res) {
        let txt = "";
        for (const l of res.split("\n")) {
            try {
                const p = JSON.parse(l);
                if (p.type === "text") txt += p.data;
            } catch (e) {
                // skip non-JSON lines
            }
        }
        return txt || res;
    }

    async chat(q) {
        const req = await fetch(this.url, this._opts(q));
        const res = await req.text();
        return this._parse(res);
    }
}

async function handler(m, { sock }) {
    const text = m.args.join(' ')
    if (!text) {
        return m.reply(raraGuideV2("muslimai", {
 kaomoji: "(⌒‿⌒)",
 sapaan: "nanya apa aja seputar Islam, dijawab dengan landasan yang benar! (ᵔ◡ᵔ)",
          cara: "ketik pertanyaannya tentang Islam sesudah command",
          contoh: `${m.prefix}muslimai Apa itu sholat?`,
          spec: ["⚡ energi 1", "⏱ 5dtk", "💸 gratis"],
        }))
    }
    try {
    await m.react("🕒");
        const data = await new MuslimAI().chat(text)
        await m.react("🐣");
        await m.reply(data)
    } catch (error) {
        // IkyyXD fallback
        try {
            const ikyyReply = await callIkyy(text, { sessionKey: "satuan:" + m.sender });
            if (ikyyReply) return m.reply(ikyyReply);
        } catch (ikyyErr) {
            console.error("[muslimai.js] IkyyXD fallback failed:", ikyyErr.message);
        }
        m.reply(raraWrap("Muslim AI", te(m.prefix, m.command, m.pushName), "error"))
    }
}

export { pluginConfig as config, handler }
