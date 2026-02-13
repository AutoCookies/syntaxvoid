export function info(message: string, ...args: unknown[]) {
  console.info(`[syntaxvoid] ${message}`, ...args);
}

export function warn(message: string, ...args: unknown[]) {
  console.warn(`[syntaxvoid] ${message}`, ...args);
}

export function error(message: string, ...args: unknown[]) {
  console.error(`[syntaxvoid] ${message}`, ...args);
}
