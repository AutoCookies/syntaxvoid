"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataManager = void 0;
/// <reference path="./atom.d.ts" />
const atom_1 = require("atom");
class DataManager {
    constructor() {
        this.riskService = null;
        this.patchService = null;
        this.emitter = new atom_1.Emitter();
        // Cache
        this.cachedStats = null;
    }
    setRiskService(service) {
        this.riskService = service;
        this.fetchData();
    }
    setPatchService(service) {
        this.patchService = service;
        this.fetchData();
    }
    onDidUpdate(callback) {
        return this.emitter.on('did-update', callback);
    }
    fetchData() {
        // use requestIdleCallback if available, else setTimeout
        const runner = window.requestIdleCallback || ((cb) => setTimeout(cb, 100));
        runner(() => {
            const data = {
                risk: this.getRiskData(),
                activity: this.getPatchActivity()
            };
            this.cachedStats = data;
            this.emitter.emit('did-update', data);
        });
    }
    getRiskData() {
        if (!this.riskService) {
            return {
                score: 0,
                nodes: 0,
                edges: 0,
                circular: 0,
                topRisks: []
            };
        }
        // Mocking structure if service doesn't expose raw data yet
        // In real impl, calling service methods
        // Assuming riskService has 'getSnapshot()'
        try {
            return this.riskService.getSnapshot ? this.riskService.getSnapshot() : {
                score: 42, // Mock for visual
                nodes: 128,
                edges: 312,
                circular: 1,
                topRisks: [
                    { path: 'src/core/legacy.ts', score: 95 },
                    { path: 'src/utils/unsafe.js', score: 82 }
                ]
            };
        }
        catch (e) {
            return { error: true };
        }
    }
    getPatchActivity() {
        if (!this.patchService)
            return [];
        // Mock
        return [
            { id: 'patch-101', description: 'Fix Critical Bug', author: 'AutoCookie', time: '2h ago' },
            { id: 'patch-102', description: 'Update Deps', author: 'System', time: '5h ago' }
        ];
    }
}
exports.DataManager = DataManager;
//# sourceMappingURL=dataManager.js.map