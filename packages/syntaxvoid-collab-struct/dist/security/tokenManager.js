"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenManager = void 0;
const crypto = __importStar(require("crypto"));
class TokenManager {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.secret = crypto.randomBytes(32); // 256-bit secret, never shared
    }
    /**
     * Generate a secure token.
     * Format: base64(sessionId.timestamp.nonce.role.signature)
     * Payload: sessionId.timestamp.nonce.role
     */
    generateToken(role = 'member') {
        const timestamp = Date.now().toString();
        const nonce = crypto.randomBytes(8).toString('hex');
        const payload = `${this.sessionId}.${timestamp}.${nonce}.${role}`;
        const hmac = crypto.createHmac('sha256', this.secret);
        hmac.update(payload);
        const signature = hmac.digest('base64url'); // URL-safe base64
        const fullString = `${payload}.${signature}`;
        return Buffer.from(fullString).toString('base64');
    }
    /**
     * Validate a token.
     * Returns the role if valid, null otherwise.
     */
    validateToken(token) {
        try {
            const raw = Buffer.from(token, 'base64').toString('utf8');
            const parts = raw.split('.');
            if (parts.length !== 5)
                return null;
            const [sid, ts, nonce, role, sig] = parts;
            // 1. Session ID Check
            if (sid !== this.sessionId)
                return null;
            // 2. Timestamp Window (±5 mins)
            const time = parseInt(ts, 10);
            const now = Date.now();
            if (Math.abs(now - time) > 300000)
                return null; // 5 min window
            // 3. Signature Check
            const payload = `${sid}.${ts}.${nonce}.${role}`;
            const hmac = crypto.createHmac('sha256', this.secret);
            hmac.update(payload);
            const expectedSig = hmac.digest('base64url');
            // Constant-time comparison to prevent timing attacks
            if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
                return null;
            }
            return { role, nonce, timestamp: time };
        }
        catch (e) {
            return null;
        }
    }
}
exports.TokenManager = TokenManager;
