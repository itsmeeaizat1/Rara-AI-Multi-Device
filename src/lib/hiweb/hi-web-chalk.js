// hi-web-chalk.js — shim chalk gaya engine lama (log polos, identity proxy)
const chalk = new Proxy(function (...a) { return a.join(" "); }, { get: () => chalk });
export default chalk;
