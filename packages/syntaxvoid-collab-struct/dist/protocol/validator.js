"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMessage = validateMessage;
function validateMessage(raw, maxBytes = 4096) {
    if (!raw)
        return null;
    // Size check handled at transport buffer level usually, but object size approximation:
    const size = JSON.stringify(raw).length;
    if (size > maxBytes)
        return null;
    if (typeof raw !== 'object' || typeof raw.type !== 'string')
        return null;
    try {
        switch (raw.type) {
            case 'session.join':
                if (typeof raw.token === 'string' && raw.token.length < 1024) {
                    return raw;
                }
                break;
            case 'view.focus':
                if (typeof raw.payload?.pathOrNodeId === 'string' &&
                    (raw.payload.sourcePanel === 'project-map' || raw.payload.sourcePanel === 'impact' || raw.payload.sourcePanel === 'editor')) {
                    return raw;
                }
                break;
            // Add other validators as needed, specifically for critical control messages
        }
        // Allow pass-through for less critical messages if structure 'looks' ok?
        // Or strict whitelist:
        if (['session.presence', 'session.welcome', 'session.reject', 'system.error', 'view.follow'].includes(raw.type)) {
            return raw;
        }
    }
    catch (e) {
        return null;
    }
    return null;
}
