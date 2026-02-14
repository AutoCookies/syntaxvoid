export interface PeerInfo {
    id: string;
    name: string;
    color: string;
}

export type MessageType =
    | 'session.join'
    | 'session.welcome'
    | 'session.presence'
    | 'view.focus'
    | 'view.follow';

export interface BaseMessage {
    type: MessageType;
}

export interface JoinMessage extends BaseMessage {
    type: 'session.join';
    payload: {
        name: string;
        version: string;
    };
}

export interface WelcomeMessage extends BaseMessage {
    type: 'session.welcome';
    payload: {
        peerId: string;
        peers: PeerInfo[];
    };
}

export interface PresenceMessage extends BaseMessage {
    type: 'session.presence';
    payload: {
        peers: PeerInfo[];
    };
}

export interface FocusMessage extends BaseMessage {
    type: 'view.focus';
    payload: {
        peerId: string;
        pathOrNodeId: string;
        depth?: number;
        source: 'project-map' | 'impact' | 'editor';
    };
}

export interface FollowMessage extends BaseMessage {
    type: 'view.follow';
    payload: {
        peerId: string;
        enabled: boolean;
    };
}

export type CollabMessage =
    | JoinMessage
    | WelcomeMessage
    | PresenceMessage
    | FocusMessage
    | FollowMessage;

export function validateMessage(raw: any): CollabMessage | null {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.type !== 'string') return null;

    try {
        switch (raw.type) {
            case 'session.join':
                if (typeof raw.payload?.name === 'string' && typeof raw.payload?.version === 'string') {
                    if (raw.payload.name.length > 32) return null; // Limit name length
                    return raw as JoinMessage;
                }
                break;
            case 'session.welcome':
                if (Array.isArray(raw.payload?.peers) && typeof raw.payload?.peerId === 'string') {
                    return raw as WelcomeMessage;
                }
                break;
            case 'session.presence':
                if (Array.isArray(raw.payload?.peers)) {
                    return raw as PresenceMessage;
                }
                break;
            case 'view.focus':
                if (typeof raw.payload?.peerId === 'string' &&
                    typeof raw.payload?.pathOrNodeId === 'string' &&
                    (raw.payload.source === 'project-map' || raw.payload.source === 'impact' || raw.payload.source === 'editor')) {
                    return raw as FocusMessage;
                }
                break;
            case 'view.follow':
                if (typeof raw.payload?.peerId === 'string' && typeof raw.payload?.enabled === 'boolean') {
                    return raw as FollowMessage;
                }
                break;
        }
    } catch (e) {
        return null;
    }
    return null;
}
