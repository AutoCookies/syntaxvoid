export function info(message: string, ...args: unknown[]) {
  console.info(`[pomai] ${message}`, ...args);
}

export function warn(message: string, ...args: unknown[]) {
  console.warn(`[pomai] ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]) {
  console.error(`[pomai] ${message}`, ...args);
}
