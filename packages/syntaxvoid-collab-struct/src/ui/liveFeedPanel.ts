import { CompositeDisposable } from 'atom';
import { SessionState } from '../sessionState';

export class LiveFeedPanel {
    element: HTMLElement;
    private subscriptions = new CompositeDisposable();
    private state = SessionState.getInstance();
    private feedContainer!: HTMLElement;

    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-collab-feed';
        this.subscriptions.add(this.state.onDidAddLog(entry => this._addEntry(entry)));
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
