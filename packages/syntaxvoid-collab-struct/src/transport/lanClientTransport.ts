import { WebSocket } from 'ws';
import { Transport } from './transport';
import { CollabMessage } from '../protocol/messages';
import { validateMessage as rawValidator } from '../protocol/validator';

export class LanClientTransport implements Transport {
    private ws: WebSocket | null = null;

    private _onMessage: ((msg: CollabMessage) => void) | null = null;
    private _onDisconnect: (() => void) | null = null;

    async start(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                this.ws.on('open', () => resolve());
                this.ws.on('error', (err) => reject(err));

                this.ws.on('message', (data) => {
                    let parsed: any;
                    try {
                        if (typeof data === 'string') parsed = JSON.parse(data);
                        else if (Buffer.isBuffer(data)) parsed = JSON.parse((data as Buffer).toString());
                        else return;

                        const msg = rawValidator(parsed);
                        if (msg && this._onMessage) {
                            this._onMessage(msg);
                        }
                    } catch (e) { }
                });

                this.ws.on('close', () => {
                    if (this._onDisconnect) this._onDisconnect();
                    this.ws = null;
                });

            } catch (e) {
                reject(e);
            }
        });
    }

    async stop(): Promise<void> {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(msg: CollabMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    sendTo(peerId: string, msg: CollabMessage): void {
        // Client can only send to server. It doesn't route directly to peers.
        // So this is just send() effectively.
        this.send(msg);
    }

    broadcast(msg: CollabMessage): void {
        this.send(msg); // Client broadcasting means sending to server to redistribute
    }

    onMessage(cb: (msg: CollabMessage) => void): void {
        this._onMessage = cb;
    }

    onConnect(cb: (peerId: string) => void): void {
        // Client doesn't really have peerId on connect in this model unless server assigns it.
        // But interface requires it.
        // We can just call it with 'server' or empty string.
        // Or transport needs to adhere.
        // Let's invoke cb with 'server' if connected.
        if (this.isConnected()) cb('server');
    }

    onDisconnect(cb: (peerId: string) => void): void {
        this._onDisconnect = () => cb('server');
    }

    isConnected(): boolean {
        return !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}
