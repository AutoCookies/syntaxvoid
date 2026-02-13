export function getProjectDirectories() {
  return atom.project.getDirectories();
}

export function relativize(projectPath: string) {
  return atom.project.relativize(projectPath);
}
