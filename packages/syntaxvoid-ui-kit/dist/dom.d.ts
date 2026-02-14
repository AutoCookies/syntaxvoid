export declare function panelRoot(className?: string): HTMLElement;
export declare function header(title: string, icon?: string): HTMLElement;
export declare function wrapper(className?: string): HTMLElement;
export declare function button(text: string, options?: {
    variant?: 'primary' | 'danger' | 'ghost';
    onClick?: () => void;
}): HTMLButtonElement;
export declare function badge(text: string, variant?: 'info' | 'warning' | 'error' | 'success'): HTMLElement;
