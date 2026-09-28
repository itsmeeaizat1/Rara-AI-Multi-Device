// hiro-web-axios.js — shim axios gaya HIROBOT (get only) via fetch global
import { Readable } from "stream";

const axios = {
  async get(url, opts = {}) {
    const res = await fetch(url, {
      signal: opts.signal,
      headers: opts.headers || {},
      redirect: "follow",
    });
    let data = null;
    if (opts.responseType === "stream" && res.body) {
      data = Readable.fromWeb(res.body);
    } else {
      data = Buffer.from(await res.arrayBuffer());
    }
    return { status: res.status, data, headers: { get: (k) => res.headers.get(k) } };
  },
};
export default axios;
