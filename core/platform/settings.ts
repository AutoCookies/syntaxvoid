export function get<T = unknown>(key: string, defaultValue?: T): T | undefined {
  const value = atom.config.get(key) as T | undefined;
  return value === undefined ? defaultValue : value;
}

export function set<T = unknown>(key: string, value: T) {
  return atom.config.set(key, value);
}

export function observe<T = unknown>(key: string, callback: (value: T) => void) {
  return atom.config.observe(key, callback as never);
}
