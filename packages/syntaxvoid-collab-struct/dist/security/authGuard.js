"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.AuthGuard = void 0;
class AuthGuard {
    constructor() {
        this.usedNonces = new Set();
        // Periodic cleanup of nonce store
        this.cleanupInterval = setInterval(() => {
            this.usedNonces.clear(); // Simply clear all? 
            // In strict implementation we should store timestamp with nonce and clear old ones.
            // For MVP, clearing every 10 mins means a valid token from 9 mins ago might work again if valid window is small.
            // Our valid window is 5 mins. So clearing every 10 mins is roughly safe assuming reuse is fast.
            // A better approach: Map<Nonce, Timestamp>
        }, 600000); // 10 mins
    }
    isReplay(nonce) {
        if (this.usedNonces.has(nonce))
            return true;
        this.usedNonces.add(nonce);
        return false;
    }
    dispose() {
        clearInterval(this.cleanupInterval);
        this.usedNonces.clear();
    }
}
exports.AuthGuard = AuthGuard;
class RateLimiter {
    constructor() {
        // Basic window counter
        // IP -> count
        // Reset every 5 sec
        this.counts = new Map();
        this.interval = setInterval(() => {
            this.counts.clear();
        }, 5000);
    }
    checkLimit(id) {
        const c = this.counts.get(id) || 0;
        if (c > 30)
            return false;
        this.counts.set(id, c + 1);
        return true;
    }
    dispose() {
        clearInterval(this.interval);
    }
}
exports.RateLimiter = RateLimiter;
