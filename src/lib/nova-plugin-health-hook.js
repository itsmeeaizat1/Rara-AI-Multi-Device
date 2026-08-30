// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
// nova-plugin-health-hook.js — Bridge antara handler.js dan autoplugin plugin
// Dipanggil setiap plugin execution untuk track success/error rate
import { recordPluginExecution, postExecutionCheck } from "../../plugins/owner/autoplugin.js";

export { recordPluginExecution, postExecutionCheck };
