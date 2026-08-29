// NOVA AI WHATSAPP BOT, AIZAT, MADE IN INDONESIA
import { claraWrap } from "../../src/lib/nova-menu-style.js";
import { spawn } from 'child_process'
import path from 'path'
import te from '../../src/lib/nova-error.js'
const pluginConfig = {
    name: 'restart',
    alias: ["restart"],
    category: 'owner',
    description: 'Restart bot process (real restart)',
    usage: '.restart',
    example: '.restart',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    energi: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    try {
        const startTime = Date.now()
        
        await sock.sendMessage(m.chat, {
            text: `🔄 *Restarting Bot...*\n\n` +
                  `╭──「 *Info* 」\n` +
                  `│ ⏰ Time: ${new Date().toLocaleTimeString('id-ID')}\n` +
                  `│ 🔧 Method: Process Spawn\n` +
                  `│ 📦 PID: ${process.pid}\n` +
                  `╰──────────\n\n` +
                  `Bot akan restart dalam 2 detik...\n` +
                  `Proses mungkin memakan waktu 10-30 detik`
        }, { quoted: m })
        
        console.log('[Restart] Command triggered by:', m.sender)
        console.log('[Restart] Initiating graceful restart...')
        
        setTimeout(() => {
            const cwd = process.cwd()
            const isWindows = process.platform === 'win32'
            
            let command, args
            
            if (isWindows) {
                command = 'cmd.exe'
                args = ['/c', 'start', '/b', 'node', 'index.js']
            } else {
                command = 'node'
                args = ['index.js']
            }
            
            const child = spawn(command, args, {
                cwd: cwd,
                detached: true,
                stdio: 'ignore',
                shell: isWindows,
                env: { ...process.env, RESTARTED: 'true', RESTART_TIME: startTime.toString() }
            })
            
            child.unref()
            
            console.log('[Restart] New process spawned, exiting current process...')
            
            setTimeout(() => {
                process.exit(0)
            }, 500)
            
        }, 2000)
        
    } catch (error) {
        await m.reply(claraWrap("restart", te(m.prefix, m.command, m.pushName), "error"))}
}

export { pluginConfig as config, handler }