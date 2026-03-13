"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanClientTransport = void 0;
const ws_1 = require("ws");
const validator_1 = require("../protocol/validator");
class LanClientTransport {
    constructor() {
        this.ws = null;
        this._onMessage = null;
        this._onDisconnect = null;
    }
    async start(url) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new ws_1.WebSocket(url);
                this.ws.on('open', () => resolve());
                this.ws.on('error', (err) => reject(err));
                this.ws.on('message', (data) => {
                    let parsed;
                    try {
                        if (typeof data === 'string')
                            parsed = JSON.parse(data);
                        else if (Buffer.isBuffer(data))
                            parsed = JSON.parse(data.toString());
                        else
                            return;
                        const msg = (0, validator_1.validateMessage)(parsed);
                        if (msg && this._onMessage) {
                            this._onMessage(msg);
                        }
                    }
                    catch (e) { }
                });
                this.ws.on('close', () => {
                    if (this._onDisconnect)
                        this._onDisconnect();
                    this.ws = null;
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    async stop() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    send(msg) {
        if (this.ws && this.ws.readyState === ws_1.WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }
    sendTo(peerId, msg) {
        // Client can only send to server. It doesn't route directly to peers.
        // So this is just send() effectively.
        this.send(msg);
    }
    broadcast(msg) {
        this.send(msg); // Client broadcasting means sending to server to redistribute
    }
    onMessage(cb) {
        this._onMessage = cb;
    }
    onConnect(cb) {
        // Client doesn't really have peerId on connect in this model unless server assigns it.
        // But interface requires it.
        // We can just call it with 'server' or empty string.
        // Or transport needs to adhere.
        // Let's invoke cb with 'server' if connected.
        if (this.isConnected())
            cb('server');
    }
    onDisconnect(cb) {
        this._onDisconnect = () => cb('server');
    }
    isConnected() {
        return !!this.ws && this.ws.readyState === ws_1.WebSocket.OPEN;
    }
}
exports.LanClientTransport = LanClientTransport;
