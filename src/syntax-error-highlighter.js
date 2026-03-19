'use strict';

const { CompositeDisposable, Emitter } = require('event-kit');

class SyntaxErrorHighlighter {
    constructor(workspace) {
        this.workspace = workspace;
        this.disposables = new CompositeDisposable();
        this.editorHighlighters = new Map();

        this.disposables.add(
            this.workspace.observeTextEditors(editor => {
                this.highlightEditor(editor);
            })
        );
    }

    destroy() {
        this.disposables.dispose();
        for (const highlighter of this.editorHighlighters.values()) {
            highlighter.destroy();
        }
        this.editorHighlighters.clear();
    }

    highlightEditor(editor) {
        if (this.editorHighlighters.has(editor)) return;

        const editorHighlighter = new EditorSyntaxErrorHighlighter(editor);
        this.editorHighlighters.set(editor, editorHighlighter);

        const onDidDestroy = editor.onDidDestroy(() => {
            editorHighlighter.destroy();
            this.editorHighlighters.delete(editor);
            onDidDestroy.dispose();
        });
    }
}

class EditorSyntaxErrorHighlighter {
    constructor(editor) {
        this.editor = editor;
        this.buffer = editor.getBuffer();
        this.markerLayer = editor.addMarkerLayer();
        this.disposables = new CompositeDisposable();

        this.disposables.add(
            this.editor.onDidStopChanging(() => this.updateErrors()),
            this.editor.onDidChangeGrammar(() => this.updateErrors())
        );

        // Initial check
        this.updateErrors();
    }

    destroy() {
        this.disposables.dispose();
        this.markerLayer.destroy();
    }

    updateErrors() {
        const grammar = this.editor.getGrammar();
        if (!['source.c', 'source.cpp'].includes(grammar.scopeName)) {
            this.markerLayer.clear();
            return;
        }

        const languageMode = this.buffer.getLanguageMode();
        if (!languageMode || typeof languageMode.atTransactionEnd !== 'function') {
            return;
        }

        // Wait for parsing to finish
        languageMode.atTransactionEnd().then(() => {
            if (this.editor.isDestroyed()) return;
            this.applyErrorsFromTree(languageMode.tree);
        });
    }

    applyErrorsFromTree(tree) {
        this.markerLayer.clear();
        if (!tree) return;

        const ranges = [];
        const cursor = tree.walk();

        let visitedChildren = false;
        while (true) {
            const node = cursor.currentNode;
            if (!visitedChildren && node) {
                if (node.type === 'ERROR' || node.isMissing) {
                    ranges.push([
                        [node.startPosition.row, node.startPosition.column],
                        [node.endPosition.row, node.endPosition.column]
                    ]);
                }
                if (cursor.gotoFirstChild()) {
                    visitedChildren = false;
                    continue;
                }
            }

            if (cursor.gotoNextSibling()) {
                visitedChildren = false;
            } else if (cursor.gotoParent()) {
                visitedChildren = true;
            } else {
                break;
            }
        }
        cursor.delete();

        for (const range of ranges) {
            const marker = this.markerLayer.markBufferRange(range);
            this.editor.decorateMarker(marker, {
                type: 'highlight',
                class: 'syntax-error-underline'
            });
        }
    }
}

module.exports = SyntaxErrorHighlighter;
