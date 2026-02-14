export function panelRoot(className?: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `syntaxvoid-ui sv-panel sv-skin-clean ${className || ''}`;
    return el;
}

export function header(title: string, icon?: string): HTMLElement {
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

export function wrapper(className?: string): HTMLElement {
    const el = document.createElement('div');
    if (className) el.className = className;
    return el;
}

export function button(text: string, options: { variant?: 'primary' | 'danger' | 'ghost', onClick?: () => void } = {}): HTMLButtonElement {
    const el = document.createElement('button');
    el.textContent = text;
    el.className = `sv-btn ${options.variant || ''}`;
    if (options.onClick) el.onclick = options.onClick;
    return el;
}

export function badge(text: string, variant: 'info' | 'warning' | 'error' | 'success' = 'info'): HTMLElement {
    const el = document.createElement('span');
    el.className = `sv-badge ${variant}`;
    el.textContent = text;
    return el;
}
