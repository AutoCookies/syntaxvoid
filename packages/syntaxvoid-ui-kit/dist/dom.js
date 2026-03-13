"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.panelRoot = panelRoot;
exports.header = header;
exports.wrapper = wrapper;
exports.button = button;
exports.badge = badge;
function panelRoot(className) {
    const el = document.createElement('div');
    el.className = `syntaxvoid-ui sv-panel sv-skin-clean ${className || ''}`;
    return el;
}
function header(title, icon) {
    const el = document.createElement('header');
    el.className = 'sv-header';
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    if (icon) {
        const iconEl = document.createElement('span');
        iconEl.className = `icon icon-${icon}`;
        titleEl.appendChild(iconEl);
    }
    const textEl = document.createElement('span');
    textEl.textContent = title;
    titleEl.appendChild(textEl);
    el.appendChild(titleEl);
    return el;
}
function wrapper(className) {
    const el = document.createElement('div');
    if (className)
        el.className = className;
    return el;
}
function button(text, options = {}) {
    const el = document.createElement('button');
    el.textContent = text;
    el.className = `sv-btn ${options.variant || ''}`;
    if (options.onClick)
        el.onclick = options.onClick;
    return el;
}
function badge(text, variant = 'info') {
    const el = document.createElement('span');
    el.className = `sv-badge ${variant}`;
    el.textContent = text;
    return el;
}
