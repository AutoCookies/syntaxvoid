import * as crypto from 'crypto';

export class TokenManager {
    private secret: Buffer;
    private sessionId: string;

    constructor(sessionId: string) {
        this.sessionId = sessionId;
        this.secret = crypto.randomBytes(32); // 256-bit secret, never shared
    }

    /**
     * Generate a secure token.
     * Format: base64(sessionId.timestamp.nonce.role.signature)
     * Payload: sessionId.timestamp.nonce.role
     */
    public generateToken(role: string = 'member'): string {
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
    public validateToken(token: string): { role: string, nonce: string, timestamp: number } | null {
        try {
            const raw = Buffer.from(token, 'base64').toString('utf8');
            const parts = raw.split('.');
            if (parts.length !== 5) return null;

            const [sid, ts, nonce, role, sig] = parts;

            // 1. Session ID Check
            if (sid !== this.sessionId) return null;

            // 2. Timestamp Window (±5 mins)
            const time = parseInt(ts, 10);
            const now = Date.now();
            if (Math.abs(now - time) > 300000) return null; // 5 min window

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

        } catch (e) {
            return null;
        }
    }
}
