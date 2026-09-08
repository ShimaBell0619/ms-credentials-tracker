import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const host = '127.0.0.1';
const port = 4176;
const baseUrl = `http://${host}:${port}`;
const frameRate = 8;
const holdFrames = 8;
const scrollFrames = 48;
const viewport = { width: 1100, height: 720 };
const tempDir = path.resolve('.readme-gif-frames');
const outputDir = path.resolve('docs/assets');
const outputPath = path.join(outputDir, 'readme-overview.gif');

function demoEnvelope() {
  return {
    version: 1,
    credentials: [
      {
        id: 'readme:az104',
        credentialDefinitionId: 'cert.azure-administrator-associate',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-104',
        firstEarnedOn: '2023-11-19',
        currentExpiresOn: '2026-11-20',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'readme:az305',
        credentialDefinitionId: 'cert.azure-solutions-architect-expert',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-305',
        firstEarnedOn: '2024-06-28',
        currentExpiresOn: '2027-06-29',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'readme:az500',
        credentialDefinitionId: 'cert.azure-security-engineer-associate',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-500',
        firstEarnedOn: '2025-01-01',
        currentExpiresOn: '2026-08-01',
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
      {
        id: 'readme:az900',
        credentialDefinitionId: 'cert.azure-fundamentals',
        source: 'learnTranscriptPdf',
        sourceRecordId: null,
        sourceTitle: 'AZ-900',
        firstEarnedOn: '2023-07-16',
        currentExpiresOn: null,
        confirmedAt: '2026-09-08T00:00:00.000Z',
      },
    ],
  };
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

async function waitForServer(server, log) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Vite exited before the capture started:\n${log.value}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Retry while Vite starts.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Vite did not become ready:\n${log.value}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;

  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill('SIGTERM');
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);

  if (server.exitCode === null) {
    server.kill('SIGKILL');
    await exited;
  }
}

function runFfmpeg(args) {
  const result = spawnSync('ffmpeg', args, { stdio: 'inherit' });
  if (result.error?.code === 'ENOENT') {
    throw new Error('ffmpeg is required on PATH to generate the README GIF.');
  }
  if (result.status !== 0) {
    throw new Error(`ffmpeg exited with status ${result.status}.`);
  }
}

await rm(tempDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

const viteCommand = path.resolve(
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);
const serverLog = { value: '' };
const server = spawn(
  viteCommand,
  ['--host', host, '--port', String(port), '--strictPort'],
  { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BROWSER: 'none' } },
);
server.stdout.on('data', (chunk) => {
  serverLog.value += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverLog.value += chunk.toString();
});

let browser;
try {
  await waitForServer(server, serverLog);
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();

  await page.clock.setFixedTime(new Date('2026-09-08T12:00:00Z'));
  await page.addInitScript((data) => {
    window.localStorage.setItem(
      'ms-credentials-tracker:credentials:v1',
      JSON.stringify(data),
    );
  }, demoEnvelope());
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    const badge = document.createElement('div');
    badge.textContent = 'README DEMO · sample data';
    Object.assign(badge.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '2147483647',
      padding: '7px 10px',
      border: '1px solid #7d8793',
      borderRadius: '4px',
      background: 'rgba(255, 255, 255, 0.96)',
      color: '#27313c',
      font: '600 12px/1.2 system-ui, sans-serif',
      letterSpacing: '0.03em',
      pointerEvents: 'none',
    });
    document.body.append(badge);
  });

  const maxScroll = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  );

  const positions = [
    ...Array.from({ length: holdFrames }, () => 0),
    ...Array.from({ length: scrollFrames }, (_, index) => {
      const progress = index / (scrollFrames - 1);
      return Math.round(maxScroll * smoothstep(progress));
    }),
    ...Array.from({ length: holdFrames }, () => maxScroll),
  ];

  for (const [index, y] of positions.entries()) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(20);
    await page.screenshot({
      path: path.join(tempDir, `frame-${String(index).padStart(3, '0')}.png`),
      animations: 'disabled',
    });
  }

  const palettePath = path.join(tempDir, 'palette.png');
  const framePattern = path.join(tempDir, 'frame-%03d.png');

  runFfmpeg([
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(frameRate),
    '-i',
    framePattern,
    '-vf',
    'fps=8,scale=960:-1:flags=lanczos,palettegen=stats_mode=diff',
    palettePath,
  ]);

  runFfmpeg([
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(frameRate),
    '-i',
    framePattern,
    '-i',
    palettePath,
    '-lavfi',
    'fps=8,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    outputPath,
  ]);
} finally {
  await browser?.close();
  await stopServer(server);
  await rm(tempDir, { recursive: true, force: true });
}

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
