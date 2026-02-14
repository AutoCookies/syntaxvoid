import { CompositeDisposable } from 'atom';
import { SessionState } from '../core/sessionState';

export class LiveFeedPanel {
    element: HTMLElement;
    private subscriptions = new CompositeDisposable();
    private state = SessionState.getInstance();
    private list: HTMLElement;
    private maxEntries = 50;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-collab-feed';

        this.list = document.createElement('ul');
        this.element.appendChild(this.list);

        this.subscriptions.add(this.state.onDidAddLog((entry: string) => this._addEntry(entry)));
    }

    private _addEntry(text: string) {
        const div = document.createElement('div');
        div.className = 'feed-entry';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        div.innerHTML = `<span class="timestamp">[${time}]</span> ${text}`;

        this.element.appendChild(div);
        this.element.scrollTop = this.element.scrollHeight;
    }

    destroy() {
        this.subscriptions.dispose();
        this.element.remove();
    }
}
