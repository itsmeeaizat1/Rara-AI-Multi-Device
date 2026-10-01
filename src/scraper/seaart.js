// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
import axios from "axios";
import config from "../../config.js";
import { ImageUploadService } from "node-upload-images";

const OBS_KEY = config.APIkey.obscura;

async function uploadBuf(buf) {
  // uguu duluan (cepat & stabil, live verified 8 Sep 2026); gagal → pixhost
  const FormData = (await import("form-data")).default;
  const form = new FormData();
  form.append("files[]", buf, { filename: "img.jpg", contentType: "image/jpeg" });
  try {
    const r = await axios.post("https://uguu.se/upload.php", form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    const url = r.data?.files?.[0]?.url;
    if (url) return url;
  } catch (e) {
    console.error("seaart uguu down:", e.message);
  }
  const service = new ImageUploadService("pixhost.to");
  const { directLink } = await service.uploadFromBinary(buf, "img.jpg");
  if (!directLink) throw new Error("Upload gambar gagal (uguu + pixhost)");
  return directLink;
}

async function live3d(
  imageBuffer,
  prompt = "Make this person the skin is very black, but skin tone still natural",
) {
  const imgUrl = await uploadBuf(imageBuffer);
  const r = await axios.get(
    `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(imgUrl)}&prompt=${encodeURIComponent(prompt)}`,
    {
      responseType: "arraybuffer",
      timeout: 300000,
    },
  );
  const image = Buffer.from(r.data);
  return { image };
}

async function fluxImage(message, ratio = "1:1") {
  const r = await axios.post(
    "https://api.yuulabs.web.id/api/ai/flux-img",
    {
      message,
      ratio,
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 300000,
    },
  );

  const data = r.data;
  if (!data?.status || !data?.result?.url) {
    throw new Error(data?.message || data?.error || "Gagal membuat gambar");
  }

  return data.result;
}

export { live3d, fluxImage };
