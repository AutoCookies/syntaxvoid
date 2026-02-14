import { CompositeDisposable, Disposable } from 'atom';
import { SessionState } from '../sessionState';
import { CollabServer } from '../collabServer';
import { CollabClient } from '../collabClient';
import { FocusMessage } from '../protocol';
import { PeerInfo } from '../protocol';

export class ProjectMapAdapter {
    private subscriptions = new CompositeDisposable();

    constructor(
        private projectMap: any,
        private state: SessionState,
        private server: CollabServer,
        private client: CollabClient
    ) {
        // 1. Listen to Local Selection -> Broadcast
        this.subscriptions.add(
            this.projectMap.onDidSelectNode((event: { path: string, source: string }) => {
                if (this.state.mode === 'standalone') return;

                // Validate path (basic)
                if (!event.path) return;

                const msg: FocusMessage = {
                    type: 'view.focus',
                    payload: {
                        peerId: this.state.localPeerId || 'unknown',
                        pathOrNodeId: event.path,
                        source: 'project-map' // or event.source
                    }
                };

                if (this.state.mode === 'host') {
                    this.server.broadcast(msg);
                } else if (this.state.mode === 'client') {
                    this.client.send(msg);
                }

                // Log local action for feedback
                this.state.addLog(`You focused ${event.path}`);
            })
        );

        // 2. Listen to Remote Selection -> Highlight
        this.subscriptions.add(
            this.state.onDidPeerFocus((event) => {
                // Check if following
                if (this.state.followingPeerId === event.peerId) {
                    this.projectMap.highlightNodes([event.path], 'search');
                    this.state.addLog(`Following ${this.state.getPeerName(event.peerId)} to ${event.path}`);
                }
            })
        );
    }

    dispose() {
        this.subscriptions.dispose();
    }
}
