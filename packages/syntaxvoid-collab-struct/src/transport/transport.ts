import { CollabMessage } from '../protocol/messages';

export interface Transport {
    start(config?: any): Promise<void>;
    stop(): Promise<void>;
    send(msg: CollabMessage): void; // Broadcast or direct? 
    // Usually Transport on client sends to server. Transport on server broadcasts?
    // Let's keep it simple: send() sends to "the other side".
    // For Host transport, it might need send(msg, peerId?)

    // Abstracting:
    sendTo(peerId: string, msg: CollabMessage): void;
    broadcast(msg: CollabMessage, excludeId?: string): void;

    onMessage(callback: (msg: CollabMessage, peerId?: string) => void): void;
    // peerId is undefined if from server (on client), defined if from client (on server)

    onConnect(callback: (peerId: string) => void): void; // When a peer connects
    onDisconnect(callback: (peerId: string) => void): void;

    // Status
    isConnected(): boolean;
}
