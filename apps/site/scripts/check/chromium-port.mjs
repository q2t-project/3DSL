import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// CI and Pages may take longer to start Chrome than to run a single browser case.
export async function chromiumPort(proc, profileDir, diagnostics = { stderr: '' }) {
  let spawnError;
  proc.stderr.on('data', chunk => { diagnostics.stderr = (diagnostics.stderr + chunk).slice(-16000); });
  proc.once('error', error => { spawnError = error; });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (proc.exitCode !== null || proc.signalCode !== null) {
      throw new Error(`Chromium exited (${proc.exitCode ?? proc.signalCode}): ${diagnostics.stderr}`);
    }
    const active = await readFile(path.join(profileDir, 'DevToolsActivePort'), 'utf8').catch(() => '');
    const port = active.split('\n')[0];
    if (/^\d+$/.test(port)) return port;
    await delay(100);
  }
  throw new Error(`Chromium debugger did not start within 45 seconds: ${diagnostics.stderr}`);
}
