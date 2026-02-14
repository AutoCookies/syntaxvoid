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
exports.AuditLogger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * Append-only audit logger.
 * Location: ~/.syntaxvoid/audit-log.jsonl
 */
class AuditLogger {
    constructor() {
        const homeDir = os.homedir();
        const syntaxVoidDir = path.join(homeDir, '.syntaxvoid');
        if (!fs.existsSync(syntaxVoidDir)) {
            fs.mkdirSync(syntaxVoidDir, { recursive: true });
        }
        this.filePath = path.join(syntaxVoidDir, 'audit-log.jsonl');
    }
    log(entry) {
        try {
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.filePath, line);
        }
        catch (e) {
            console.error('[AuditLogger] Failed to write audit log:', e);
            // Backup logging to console
            console.log('[AuditLogger] Entry:', entry);
        }
    }
    // Optional: read logs
    getLogs() {
        if (!fs.existsSync(this.filePath))
            return [];
        try {
            const content = fs.readFileSync(this.filePath, 'utf8');
            return content.split('\n')
                .filter(l => l.trim().length > 0)
                .map(l => JSON.parse(l));
        }
        catch (e) {
            return [];
        }
    }
}
exports.AuditLogger = AuditLogger;
