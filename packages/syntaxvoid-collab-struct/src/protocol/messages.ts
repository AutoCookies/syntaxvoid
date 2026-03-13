import { PeerInfo } from '../types/peer';

export type MessageType =
    | 'session.join'
    | 'session.welcome'
    | 'session.reject'
    | 'session.presence'
    | 'view.focus'
    | 'view.follow'
    | 'system.error';

export interface BaseMessage {
    type: MessageType;
}

export interface JoinMessage extends BaseMessage {
    type: 'session.join';
    token: string;
    name: string;
    requestRole?: 'member' | 'spectator';
}


export interface WelcomeMessage extends BaseMessage {
    type: 'session.welcome';
    payload: {
        peerId: string;
        role: string;
        peers: PeerInfo[];
    };
}

export interface RejectMessage extends BaseMessage {
    type: 'session.reject';
    reason: string;
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
        peerId?: string; // Optional on send, stamped by server
        pathOrNodeId: string;
        depth?: number;
        sourcePanel: 'project-map' | 'impact' | 'editor';
    };
}

export interface FollowMessage extends BaseMessage {
    type: 'view.follow';
    payload: {
        peerId: string;
        enabled: boolean;
    };
}

export interface SystemErrorMessage extends BaseMessage {
    type: 'system.error';
    message: string;
    code?: string;
}

export type CollabMessage =
    | JoinMessage
    | WelcomeMessage
    | RejectMessage
    | PresenceMessage
    | FocusMessage
    | FollowMessage
    | SystemErrorMessage;
