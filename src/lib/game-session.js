// RARA AI - MULTI DEVICE, AIZAT, MADE IN INDONESIA
// game-session.js — Game Session Manager (singleton)
// Menyimpan state game per-user agar bot "ingat" user sedang main
import { EventEmitter } from 'events';

class GameManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map(); // userJid -> session data
    this._cleanupInterval = setInterval(() => this.cleanup(), 60000); // auto cleanup tiap 1 menit
    this.setMaxListeners(50); // banyak game bisa listen sekaligus
  }

  /**
   * Start game session untuk user
   * @param {string} userJid - User JID (m.sender)
   * @param {string} chatJid - Chat JID (m.chat)
   * @param {string} gameType - 'tebak-kata', 'math', 'rpg-battle', dll
   * @param {Object} data - { jawaban, nyawa, point, soal, attempts, maxAttempts, ... }
   * @param {number} timeoutMs - Timeout dalam ms (default 60s)
   * @returns {Object} session
   */
  start(userJid, chatJid, gameType, data = {}, timeoutMs = 60000) {
    // Kalau user sudah punya game aktif, tolak
    if (this.sessions.has(userJid)) {
      return null;
    }

    const session = {
      userJid,
      chatJid,
      gameType,
      data: {
        attempts: 0,
        maxAttempts: 3,
        ...data,
      },
      startTime: Date.now(),
      expiresAt: Date.now() + timeoutMs,
      messageKey: null, // key pesan soal (untuk reply detection)
      isActive: true,
    };

    this.sessions.set(userJid, session);
    return session;
  }

  /**
   * Get active session untuk user
   */
  get(userJid) {
    const session = this.sessions.get(userJid);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.end(userJid, 'timeout');
      return null;
    }
    return session;
  }

  /**
   * Check apakah user sedang main game
   */
  has(userJid) {
    return this.get(userJid) !== null;
  }

  /**
   * Update data session
   */
  update(userJid, newData) {
    const session = this.sessions.get(userJid);
    if (!session) return null;
    session.data = { ...session.data, ...newData };
    return session;
  }

  /**
   * End game session
   */
  end(userJid, reason = 'finished') {
    const session = this.sessions.get(userJid);
    if (!session) return null;
    session.isActive = false;
    this.sessions.delete(userJid);
    this.emit('end', { session: { ...session }, reason });
    return { ...session, reason };
  }

  /**
   * Simpan key pesan soal (untuk reply detection)
   */
  setMessageKey(userJid, key) {
    const session = this.sessions.get(userJid);
    if (session) session.messageKey = key;
  }

  /**
   * Get semua session aktif (untuk debug)
   */
  getAll() {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    for (const [jid, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.end(jid, 'timeout');
      }
    }
  }

  /**
   * Destroy manager (untuk testing/shutdown)
   */
  destroy() {
    clearInterval(this._cleanupInterval);
    this.sessions.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const gameManager = new GameManager();
export const delay = ms => new Promise(r => setTimeout(r, ms));
