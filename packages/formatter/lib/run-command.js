'use strict';

const { spawn } = require('child_process');

/**
 * Run an external command, piping `input` to stdin.
 * Returns a Promise<string> with the formatted stdout, or rejects with an Error
 * that has `.stderr` attached.
 *
 * @param {string}   cmd        executable name or path
 * @param {string[]} args       argument list
 * @param {string}   input      text to pipe into stdin
 * @param {object}   [spawnOpts]  extra options forwarded to spawn()
 */
function runCommand(cmd, args, input, spawnOpts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      ...spawnOpts,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        err.message = `Formatter not found: '${cmd}'. Install it or update the path in Settings → formatter.`;
      }
      err.stderr = stderr;
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        const err  = new Error(`'${cmd}' exited with code ${code}.`);
        err.stderr = stderr;
        reject(err);
      }
    });

    // Write source text and close stdin so the formatter starts.
    proc.stdin.write(input, 'utf8');
    proc.stdin.end();
  });
}

module.exports = runCommand;
