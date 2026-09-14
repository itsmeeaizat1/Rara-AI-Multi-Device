import fs from "node:fs";
import axios from "axios";
const t0 = Date.now();
const url = "https://www.youtube.com/watch?v=GNfRXKsvG04";
// Try 2: IkyyXD ytmp4 (Try 1 nova-ytdlp udah gue tes FAIL)
let buffer = null;
try {
  const { data } = await axios.get("https://api.ikyyxd.my.id/download/ytmp4", { params: { q: url, apikey: "kyzz" }, timeout: 60000 });
  const dl = data?.result?.VideoUrl?.url || data?.result?.download_url || data?.result?.url;
  console.log("ikyy dl url:", dl ? dl.slice(0, 60) : "NONE", "| status:", data?.status);
  if (data?.status && dl) {
    const { data: buf } = await axios.get(dl, { responseType: "arraybuffer", timeout: 120000 });
    if (buf && buf.length > 10000) buffer = Buffer.from(buf);
  }
} catch (e) { console.log("ikyy fail:", String(e.message).slice(0, 120)); }
if (!buffer) {
  try {
    const { ytdl } = await import("./src/scraper/ytdl.js");
    const result = await ytdl(url, "mp4");
    console.log("ytdl.js status:", result?.status, "| dl:", result?.dl ? result.dl.slice(0, 60) : "NONE");
    if (result?.status && result?.dl) {
      const { data: buf } = await axios.get(result.dl, { responseType: "arraybuffer", timeout: 120000 });
      if (buf && buf.length > 10000) buffer = Buffer.from(buf);
    }
  } catch (e) { console.log("ytdl.js fail:", String(e.message).slice(0, 120)); }
}
if (buffer) {
  fs.writeFileSync("../tmp-clip/full.mp4", buffer);
  console.log("FULL DL OK:", buffer.length, "bytes in", ((Date.now()-t0)/1000).toFixed(1)+"s");
} else console.log("ALL FAIL", ((Date.now()-t0)/1000).toFixed(1)+"s");
