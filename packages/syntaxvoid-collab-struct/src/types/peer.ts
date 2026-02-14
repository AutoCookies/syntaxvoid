import { Role } from './roles';

export interface PeerInfo {
    id: string;
    name: string;
    color: string;
    role: Role;
    lastSeen: number;
}
