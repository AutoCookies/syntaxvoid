"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanHostTransport = void 0;
const ws_1 = require("ws");
const crypto = __importStar(require("crypto"));
const validator_1 = require("../protocol/validator");
class LanHostTransport {
    constructor() {
        this.wss = null;
        this.clients = new Map(); // ws -> tempId
        this.clientSockets = new Map(); // tempId -> ws
        // Callbacks
        this._onMessage = null;
        this._onConnect = null;
        this._onDisconnect = null;
    }
    async start(port = 4217) {
        return new Promise((resolve, reject) => {
            try {
                this.wss = new ws_1.WebSocketServer({ port, host: '0.0.0.0' });
                this.wss.on('listening', () => resolve());
                this.wss.on('error', (err) => reject(err));
                this.wss.on('connection', (ws) => {
                    const tempId = crypto.randomUUID();
                    this.clients.set(ws, tempId);
                    this.clientSockets.set(tempId, ws);
                    if (this._onConnect)
                        this._onConnect(tempId);
                    ws.on('message', (data) => {
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
                                this._onMessage(msg, tempId);
                            }
                        }
                        catch (e) {
                            // Drop
                        }
                    });
                    ws.on('close', () => {
                        const id = this.clients.get(ws);
                        if (id) {
                            if (this._onDisconnect)
                                this._onDisconnect(id);
                            this.clientSockets.delete(id);
                            this.clients.delete(ws);
                        }
                    });
                    ws.on('error', () => ws.close());
                });
            }
            catch (e) {
                reject(e);
            }
        });
    }
    async stop() {
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        this.clients.clear();
        this.clientSockets.clear();
    }
    sendTo(peerId, msg) {
        const ws = this.clientSockets.get(peerId);
        if (ws && ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(msg));
        }
    }
    broadcast(msg, excludeId) {
        const data = JSON.stringify(msg);
        for (const [ws, id] of this.clients) {
            if (id !== excludeId && ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    onMessage(cb) {
        this._onMessage = cb;
    }
    onConnect(cb) {
        this._onConnect = cb;
    }
    onDisconnect(cb) {
        this._onDisconnect = cb;
    }
    // Host logic sends to clients vs broadcast logic is handled by manager usually
    // But Transport interface requires send(msg).
    // Let's implement generic send as "Broadcast to all" for Host? 
    // No, strictly use sendTo/broadcast.
    send(msg) {
        this.broadcast(msg);
    }
    isConnected() {
        return !!this.wss;
    }
}
exports.LanHostTransport = LanHostTransport;
