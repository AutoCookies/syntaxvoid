export function add(target: string | Element, commands: Record<string, (...args: unknown[]) => unknown>) {
  return atom.commands.add(target as never, commands as never);
}

export function dispatch(target: Element, commandName: string) {
  return atom.commands.dispatch(target, commandName);
}
