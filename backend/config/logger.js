import winston from 'winston';
import fs from 'fs';

export function createLogger({ level = 'info', file = '' } = {}) {
  const transports = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    })
  ];

  if (file) {
    const dir = file.includes('/') ? file.split('/').slice(0, -1).join('/') : '';
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    transports.push(
      new winston.transports.File({ filename: file, level, format: winston.format.json() })
    );
  }

  const logger = winston.createLogger({
    level,
    transports,
  });

  return logger;
}