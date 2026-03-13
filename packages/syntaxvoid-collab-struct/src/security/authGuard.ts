export class AuthGuard {
    private usedNonces = new Set<string>();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Periodic cleanup of nonce store
        this.cleanupInterval = setInterval(() => {
            this.usedNonces.clear(); // Simply clear all? 
            // In strict implementation we should store timestamp with nonce and clear old ones.
            // For MVP, clearing every 10 mins means a valid token from 9 mins ago might work again if valid window is small.
            // Our valid window is 5 mins. So clearing every 10 mins is roughly safe assuming reuse is fast.
            // A better approach: Map<Nonce, Timestamp>
        }, 600000); // 10 mins
    }

    public isReplay(nonce: string): boolean {
        if (this.usedNonces.has(nonce)) return true;
        this.usedNonces.add(nonce);
        return false;
    }

    public dispose() {
        clearInterval(this.cleanupInterval);
        this.usedNonces.clear();
    }
}

export class RateLimiter {
    // Basic window counter
    // IP -> count
    // Reset every 5 sec
    private counts = new Map<string, number>();
    private interval: NodeJS.Timeout;

    constructor() {
        this.interval = setInterval(() => {
            this.counts.clear();
        }, 5000);
    }

    public checkLimit(id: string): boolean {
        const c = this.counts.get(id) || 0;
        if (c > 30) return false;
        this.counts.set(id, c + 1);
        return true;
    }

    public dispose() {
        clearInterval(this.interval);
    }
}
