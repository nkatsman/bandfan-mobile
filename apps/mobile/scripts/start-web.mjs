import { spawn } from 'node:child_process';

const webEnv = {
  ...process.env,
  EXPO_PUBLIC_WEB_API_PROXY_URL: process.env.EXPO_PUBLIC_WEB_API_PROXY_URL || `http://localhost:${process.env.BANDFAN_PROXY_PORT ?? 8787}`,
};

const proxy = spawn('npm', ['run', 'proxy'], {
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

const web = spawn('npx', ['expo', 'start', '--web'], {
  env: webEnv,
  shell: true,
  stdio: 'inherit',
});

function shutdown(code = 0) {
  if (!proxy.killed) {
    proxy.kill();
  }

  if (!web.killed) {
    web.kill();
  }

  process.exit(code);
}

proxy.on('exit', (code) => {
  shutdown(code ?? 0);
});

web.on('exit', (code) => {
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));