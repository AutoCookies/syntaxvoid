'use strict';

function add(target, commands) {
  return atom.commands.add(target, commands);
}

function dispatch(target, commandName) {
  return atom.commands.dispatch(target, commandName);
}

module.exports = { add, dispatch };
