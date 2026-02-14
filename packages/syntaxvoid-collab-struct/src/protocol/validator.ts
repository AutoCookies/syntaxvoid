import { CollabMessage, JoinMessage, FocusMessage } from './messages';

export function validateMessage(raw: any, maxBytes: number = 4096): CollabMessage | null {
    if (!raw) return null;

    // Size check handled at transport buffer level usually, but object size approximation:
    const size = JSON.stringify(raw).length;
    if (size > maxBytes) return null;

    if (typeof raw !== 'object' || typeof raw.type !== 'string') return null;

    try {
        switch (raw.type) {
            case 'session.join':
                if (typeof raw.token === 'string' && raw.token.length < 1024) {
                    return raw as JoinMessage;
                }
                break;
            case 'view.focus':
                if (typeof raw.payload?.pathOrNodeId === 'string' &&
                    (raw.payload.sourcePanel === 'project-map' || raw.payload.sourcePanel === 'impact' || raw.payload.sourcePanel === 'editor')) {
                    return raw as FocusMessage;
                }
                break;
            // Add other validators as needed, specifically for critical control messages
        }
        // Allow pass-through for less critical messages if structure 'looks' ok?
        // Or strict whitelist:
        if (['session.presence', 'session.welcome', 'session.reject', 'system.error', 'view.follow'].includes(raw.type)) {
            return raw as CollabMessage;
        }

    } catch (e) {
        return null;
    }
    return null;
}
