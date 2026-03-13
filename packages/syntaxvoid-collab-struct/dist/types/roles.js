"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.ROLE_PERMISSIONS = {
    host: {
        canBroadcastFocus: true,
        canCreateProposals: true,
        canChangePolicy: true,
        isReadOnly: false
    },
    member: {
        canBroadcastFocus: true,
        canCreateProposals: true,
        canChangePolicy: false,
        isReadOnly: false
    },
    spectator: {
        canBroadcastFocus: false,
        canCreateProposals: false,
        canChangePolicy: false,
        isReadOnly: true
    }
};
