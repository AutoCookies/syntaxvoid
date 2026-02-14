/// <reference path="./atom.d.ts" />
import { CompositeDisposable } from 'atom';

export function registerCommands(subscriptions: CompositeDisposable) {
    subscriptions.add(atom.commands.add('atom-workspace', {
        'structure:build-graph': () => {
            // Alias to project-map
            const target = atom.views.getView(atom.workspace);
            atom.commands.dispatch(target, 'syntaxvoid-project-map:toggle');
        },
        'structure:view-impact': () => {
            const target = atom.views.getView(atom.workspace);
            atom.commands.dispatch(target, 'syntaxvoid-risk-overlay:toggle');
        },
        'structure:toggle-risk': () => {
            console.log('Toggling Risk Mode');
            // Future: Toggle risk visualization
        },
        'structure:open-dashboard': () => {
            console.log('Opening Dashboard');
        }
    }));
}
