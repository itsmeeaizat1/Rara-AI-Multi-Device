// E2E FIX .ping + HAPUS .ping2 (11 Sep 2026)
// Request owner: "fitur .ping itu rusak, hps ping2"
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config as pingConfig, handler as pingHandler } from "../../plugins/main/ping.js";

let pass = 0, fail = 0;
const w = (s) => process.stdout.write(s + "\n");
const check = (name, ok, extra) => { w((ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : extra ? ` — ${extra}` : "")); ok ? pass++ : fail++; };
const SC_MAP = { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', y: 'ʏ', z: 'ᴢ' };
// UPDATE 1 Okt: teks bot kini plain — toSC lokal jadi passthrough
const toSC = (s) => String(s ?? "");

w("\n— 1. .ping2 DIHAPUS —");
{
  const p2 = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "plugins", "main", "ping2.js");
  check("plugins/main/ping2.js gak ada lagi", !fs.existsSync(p2), p2);
  check("gak ada file kode laen yang nyebut ping2", !/ping2/.test(await globPlugins()));
}
async function globPlugins() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "plugins");
  let all = "";
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else if (f.endsWith(".js")) all += fs.readFileSync(fp, "utf-8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"); } };
  walk(dir);
  return all;
}

w("\n— 2. .ping baru — tanpa upload eksternal —");
{
  const replies = [];
  const m = { text: ".ping", chat: "x", sender: "s", pushName: "P", react: async () => true, reply: async (t) => { replies.push(String(t)); } };
  const r0 = await pingHandler(m, { sock: {} });
  const r = replies[0] || "";
  check("1 reply + handled", r0?.handled === true && replies.length === 1);
  check("mulai 🏓 ᴘᴏɴɢ! (Xms)", r.toLowerCase().startsWith(`🏓 pong! (`) && /\(\d+(\.\d+)?ms\)/.test(r), r.slice(0, 30));
  check("section 『 *ꜱɪꜱᴛᴇᴍ* 』", r.includes(`『 *${toSC("Sistem")}* 』`));
  check("section 『 *ᴄᴘᴜ* 』", r.includes(`『 *${toSC("CPU")}* 』`));
  check("section 『 *ᴍᴇᴍᴏʀɪ* 』", r.includes(`『 *${toSC("Memori")}* 』`));
  check("value verbatim (Node.js v20/v di output)", /v\d+\.\d+/.test(r));
}

w("\n— 3. pluginConfig —");
check("name ping (alias .speed pindah ke speedtest)", pingConfig.name === "ping" && !pingConfig.alias.includes("speed"));

w(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
