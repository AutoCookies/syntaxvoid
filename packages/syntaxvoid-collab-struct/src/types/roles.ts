export type Role = 'host' | 'member' | 'spectator';

export interface RolePermissions {
    canBroadcastFocus: boolean;
    canCreateProposals: boolean;
    canChangePolicy: boolean;
    isReadOnly: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
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
