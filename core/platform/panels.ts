export function addOpener(callback: (uri: string) => unknown) {
  return atom.workspace.addOpener(callback);
}

export function toggle(uri: string) {
  return atom.workspace.toggle(uri);
}

export function observeTextEditors(callback: (editor: TextEditor) => void) {
  return atom.workspace.observeTextEditors(callback as never);
}
