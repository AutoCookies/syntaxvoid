'use strict';

function getProjectDirectories() {
  return atom.project.getDirectories();
}

function relativize(projectPath) {
  return atom.project.relativize(projectPath);
}

module.exports = { getProjectDirectories, relativize };
