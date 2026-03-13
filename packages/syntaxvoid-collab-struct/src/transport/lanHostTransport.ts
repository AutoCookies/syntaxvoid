import { WebSocketServer, WebSocket } from 'ws';
import * as crypto from 'crypto';
import { Transport } from './transport';
import { CollabMessage } from '../protocol/messages';
import { validateMessage as rawValidator } from '../protocol/validator';

export class LanHostTransport implements Transport {
    private wss: WebSocketServer | null = null;
    private clients = new Map<WebSocket, string>(); // ws -> tempId
    private clientSockets = new Map<string, WebSocket>(); // tempId -> ws

    // Callbacks
    private _onMessage: ((msg: CollabMessage, peerId: string) => void) | null = null;
    private _onConnect: ((peerId: string) => void) | null = null;
    private _onDisconnect: ((peerId: string) => void) | null = null;

    async start(port: number = 4217): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new WebSocketServer({ port, host: '0.0.0.0' });
                this.wss.on('listening', () => resolve());
                this.wss.on('error', (err) => reject(err));

                this.wss.on('connection', (ws: WebSocket) => {
                    const tempId = crypto.randomUUID();
                    this.clients.set(ws, tempId);
                    this.clientSockets.set(tempId, ws);

                    if (this._onConnect) this._onConnect(tempId);

                    ws.on('message', (data) => {
                        let parsed: any;
                        try {
                            if (typeof data === 'string') parsed = JSON.parse(data);
                            else if (Buffer.isBuffer(data)) parsed = JSON.parse((data as Buffer).toString());
                            else return;

                            const msg = rawValidator(parsed);
                            if (msg && this._onMessage) {
                                this._onMessage(msg, tempId);
                            }
                        } catch (e) {
                            // Drop
                        }
                    });

                    ws.on('close', () => {
                        const id = this.clients.get(ws);
                        if (id) {
                            if (this._onDisconnect) this._onDisconnect(id);
                            this.clientSockets.delete(id);
                            this.clients.delete(ws);
                        }
                    });

                    ws.on('error', () => ws.close());
                });

            } catch (e) {
                reject(e);
            }
        });
    }

    async stop(): Promise<void> {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.clients.clear();
        this.clientSockets.clear();
    }

    sendTo(peerId: string, msg: CollabMessage): void {
        const ws = this.clientSockets.get(peerId);
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }

    broadcast(msg: CollabMessage, excludeId?: string): void {
        const data = JSON.stringify(msg);
        for (const [ws, id] of this.clients) {
            if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }

    onMessage(cb: (msg: CollabMessage, peerId: string) => void): void {
        this._onMessage = cb;
    }

    onConnect(cb: (peerId: string) => void): void {
        this._onConnect = cb;
    }

    onDisconnect(cb: (peerId: string) => void): void {
        this._onDisconnect = cb;
    }

    // Host logic sends to clients vs broadcast logic is handled by manager usually
    // But Transport interface requires send(msg).
    // Let's implement generic send as "Broadcast to all" for Host? 
    // No, strictly use sendTo/broadcast.
    send(msg: CollabMessage): void {
        this.broadcast(msg);
    }

    isConnected(): boolean {
        return !!this.wss;
    }
}
