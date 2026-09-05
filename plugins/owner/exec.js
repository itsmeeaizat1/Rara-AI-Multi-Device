// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import os from 'os'
import { getDatabase } from '../../src/lib/nova-database.js'
import config from '../../config.js'
import util from 'util'
import { claraWrap, claraLine } from "../../src/lib/nova-menu-style.js";
const pluginConfig = {
    name: 'exec',
    alias: ["exec"],
    category: 'owner',
    description: 'Jalankan kode JS dari pesan yang di-reply (Owner Only)',
    usage: '.> (reply pesan berisi kode)',
    example: '.> (reply)',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock, store }) {
    if (!config.isOwner(m.sender)) {
        return m.reply(claraWrap("exec", "Owner only!", "error")) }

    let code = null

    if (m.quoted) {
        code = m.quoted.text || m.quoted.body || m.quoted.caption
    }

    if (!code) {
        code = m.fullArgs?.trim() || m.text?.trim()
    }

    if (!code) {
        return m.reply(claraWrap("exec", [
            "Reply pesan berisi kode JavaScript!",
            "",
            "*Atau:*",
            "`.> <code>`",
            "",
            "💡 Contoh:",
            "Reply pesan: `return m.chat`",
            "Lalu ketik: .>",
        ]))
    }

    code = code.trim()

    if (code.startsWith('```') && code.endsWith('```')) {
        code = code.slice(3, -3)
        if (code.startsWith('javascript') || code.startsWith('js')) {
            code = code.replace(/^(javascript|js)\n?/, '')
        }
    }

    const db = getDatabase()

    let result
    let isError = false

    try {
        result = await eval(`(async () => { ${code} })()`)
    } catch (e) {
        isError = true
        result = e
    }

    let output
    if (typeof result === 'undefined') {
        output = 'undefined'
    } else if (result === null) {
        output = 'null'
    } else if (typeof result === 'object') {
        try {
            output = util.inspect(result, { depth: 2, maxArrayLength: 50 })
        } catch {
            output = String(result)
        }
    } else {
        output = String(result)
    }

    if (output.length > 3000) {
        output = output.slice(0, 3000) + '\n\n... (truncated)'
    }

    const status = isError ? '❌ Error' : '✅ Success'
    const type = isError ? result?.name || 'Error' : typeof result

    const codePreview = code.length > 100 ? code.slice(0, 100) + '...' : code

    await m.reply(
        `⚙️ *Exec Result*\n\n` +
        `\`${codePreview}\`\n` +
        `---\n\n` +
        `${status}\n` +
        `Type: ${type}\n` +
        `---\n\n` +
        `\`\`\`${output}\`\`\``
    )
}

export { pluginConfig as config, handler }