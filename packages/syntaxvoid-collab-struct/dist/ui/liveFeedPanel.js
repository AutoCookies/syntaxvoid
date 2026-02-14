"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveFeedPanel = void 0;
const atom_1 = require("atom");
const sessionState_1 = require("../core/sessionState");
class LiveFeedPanel {
    constructor() {
        this.subscriptions = new atom_1.CompositeDisposable();
        this.state = sessionState_1.SessionState.getInstance();
        this.maxEntries = 50;
        this.element = document.createElement('div');
        this.element.className = 'syntaxvoid-collab-feed';
        this.list = document.createElement('ul');
        this.element.appendChild(this.list);
        this.subscriptions.add(this.state.onDidAddLog((entry) => this._addEntry(entry)));
    }
    _addEntry(text) {
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
exports.LiveFeedPanel = LiveFeedPanel;
