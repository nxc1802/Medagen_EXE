import pino from 'pino';

// Set UTF-8 encoding for stdout/stderr on Windows
if (process.platform === 'win32') {
  if (process.stdout.isTTY) {
    process.stdout.setDefaultEncoding('utf8');
  }
  if (process.stderr.isTTY) {
    process.stderr.setDefaultEncoding('utf8');
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
      hideObject: false
    }
  }
});

