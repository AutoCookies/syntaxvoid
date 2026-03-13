"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMessage = validateMessage;
function validateMessage(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    if (typeof raw.type !== 'string')
        return null;
    try {
        switch (raw.type) {
            case 'session.join':
                if (typeof raw.payload?.name === 'string' && typeof raw.payload?.version === 'string') {
                    if (raw.payload.name.length > 32)
                        return null; // Limit name length
                    return raw;
                }
                break;
            case 'session.welcome':
                if (Array.isArray(raw.payload?.peers) && typeof raw.payload?.peerId === 'string') {
                    return raw;
                }
                break;
            case 'session.presence':
                if (Array.isArray(raw.payload?.peers)) {
                    return raw;
                }
                break;
            case 'view.focus':
                if (typeof raw.payload?.peerId === 'string' &&
                    typeof raw.payload?.pathOrNodeId === 'string' &&
                    (raw.payload.source === 'project-map' || raw.payload.source === 'impact' || raw.payload.source === 'editor')) {
                    return raw;
                }
                break;
            case 'view.follow':
                if (typeof raw.payload?.peerId === 'string' && typeof raw.payload?.enabled === 'boolean') {
                    return raw;
                }
                break;
        }
    }
    catch (e) {
        return null;
    }
    return null;
}
