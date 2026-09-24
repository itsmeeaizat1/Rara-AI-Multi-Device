import axios from "axios";

const BASE = "https://stemsplit.io/api/v1";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function apiKey() {
  const key = String(process.env.STEMSPLIT_API_KEY || "").trim();
  if (!key) throw new Error("STEMSPLIT_API_KEY belum dikonfigurasi");
  return key;
}

function headers(key) {
  return { Authorization: `Bearer ${key}` };
}

/** Pisahkan audio menjadi vocal dan instrumental via StemSplit REST API. */
export async function separateStems(buffer, { filename = "audio.mp3", contentType = "audio/mpeg", timeoutMs = 180000 } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("Audio kosong");
  const key = apiKey();
  const config = { timeout: 30000, headers: { ...headers(key), "Content-Type": "application/json" } };
  const upload = await axios.post(`${BASE}/upload`, { filename, contentType }, config);
  const uploadUrl = upload.data?.uploadUrl;
  const uploadKey = upload.data?.uploadKey;
  if (!uploadUrl || !uploadKey) throw new Error("StemSplit gagal memberi upload URL");

  await axios.put(uploadUrl, buffer, {
    timeout: 60000,
    maxBodyLength: Infinity,
    headers: { "Content-Type": contentType, "Content-Length": buffer.length },
  });

  const jobRes = await axios.post(`${BASE}/jobs`, {
    uploadKey,
    outputType: "BOTH",
    quality: "BEST",
    outputFormat: "MP3",
  }, config);
  const jobId = jobRes.data?.id;
  if (!jobId) throw new Error("StemSplit tidak mengembalikan job ID");

  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    const result = await axios.get(`${BASE}/jobs/${encodeURIComponent(jobId)}`, { timeout: 30000, headers: headers(key) });
    last = result.data;
    if (last?.status === "COMPLETED") {
      const vocals = last.outputs?.vocals?.url;
      const instrumental = last.outputs?.instrumental?.url;
      if (!vocals || !instrumental) throw new Error("StemSplit selesai tanpa URL hasil");
      return { jobId, vocals, instrumental };
    }
    if (last?.status === "FAILED") throw new Error(last.error || "StemSplit gagal memproses audio");
    await sleep(5000);
  }
  throw new Error(`StemSplit timeout (job ${jobId})`);
}
