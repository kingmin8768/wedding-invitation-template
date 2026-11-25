import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';

const DEV_HOST = process.env.DEV_HOST || '0.0.0.0';

const getNetworkHosts = () => {
  const interfaces = os.networkInterfaces();
  const hosts = [];

  Object.values(interfaces).forEach((entries) => {
    entries?.forEach((entry) => {
      if (
        entry &&
        entry.family === 'IPv4' &&
        !entry.internal &&
        !hosts.includes(entry.address)
      ) {
        hosts.push(entry.address);
      }
    });
  });

  return hosts;
};

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });

const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (await isPortOpen(port)) {
    port += 1;
  }
  return port;
};

const run = async () => {
  const backendPort = await findAvailablePort(3000);
  const frontendPort = await findAvailablePort(5173);
  const children = [];
  const networkHosts = getNetworkHosts();

  const shutdown = (signal = 'SIGINT') => {
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  };

  const spawnProcess = (name, color, command, args, env = {}) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      env: {
        ...process.env,
        ...env,
      },
      shell: false,
    });

    children.push(child);

    const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
    child.stdout.on('data', (chunk) => {
      process.stdout.write(`${prefix} ${chunk}`);
    });
    child.stderr.on('data', (chunk) => {
      process.stderr.write(`${prefix} ${chunk}`);
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        process.stdout.write(`${prefix} exited with signal ${signal}\n`);
      } else if (code && code !== 0) {
        process.stderr.write(`${prefix} exited with code ${code}\n`);
        shutdown();
        process.exitCode = code ?? 1;
      }
    });
  };

  process.stdout.write(`Starting backend on http://127.0.0.1:${backendPort}\n`);
  process.stdout.write(`Starting frontend on http://127.0.0.1:${frontendPort}\n`);
  if (networkHosts.length) {
    process.stdout.write(
      `Frontend network URL${networkHosts.length > 1 ? 's' : ''}:\n${networkHosts
        .map((host) => `  http://${host}:${frontendPort}`)
        .join('\n')}\n`,
    );
  }

  spawnProcess('backend', '32', 'npm', ['--prefix', 'backend', 'run', 'start:dev'], {
    PORT: String(backendPort),
    HOST: DEV_HOST,
  });

  spawnProcess(
    'frontend',
    '34',
    'npm',
    ['--prefix', 'frontend', 'run', 'dev', '--', '--host', DEV_HOST, '--port', String(frontendPort)],
    {
      VITE_API_PROXY_TARGET: `http://127.0.0.1:${backendPort}`,
      VITE_API_BASE_URL: '',
    },
  );

  process.on('SIGINT', () => {
    shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
    process.exit(0);
  });
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
