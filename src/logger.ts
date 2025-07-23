// logger.ts
import fs from 'fs';
import path from 'path';

const executionStart = new Date();
const logFileName = executionStart.toISOString().replace(/[:.]/g, '-') + '.txt';
const errorLogDir = path.resolve('error-logs');
const errorLogPath = path.join(errorLogDir, logFileName);

if (!fs.existsSync(errorLogDir)) {
  fs.mkdirSync(errorLogDir);
}

let errorsLogged = false;

export function logError(type: string, item: string, error: any) {
  errorsLogged = true;
  const errorMessage = `[${type}]: Item ${item}: ${error?.message || error}\n`;
  fs.appendFileSync(errorLogPath, errorMessage);
}

export function clearLogIfEmpty() {
  if (!errorsLogged && fs.existsSync(errorLogPath)) {
    fs.unlinkSync(errorLogPath);
    console.log('✅ No errors occurred during execution — deleted empty error log.');
  }
}

export function getErrorsLogged() {
  return errorsLogged;
}