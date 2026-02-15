'use strict';

/**
 * Manages the static identity of the agent.
 */
class IdentityRegistry {
    constructor() {
        this.identity = {
            agentId: 'eris-001',
            name: 'Eris', // Default name, could be configurable
            department: 'DEV',
            skinId: 'eris-standard',
            capabilities: ['diagnostics', 'git-aware', 'presence']
        };
    }

    getIdentity() {
        return this.identity;
    }
}

module.exports = new IdentityRegistry();
