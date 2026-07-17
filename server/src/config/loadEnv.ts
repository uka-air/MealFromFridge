import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const entries = fileContents.split(/\r?\n/);

  entries.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex < 0) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const unquotedValue = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = unquotedValue;
    }
  });
}

export function loadServerEnv() {
  const candidateFiles = [
    path.resolve(process.cwd(), 'server/.env'),
    path.resolve(__dirname, '../../.env'),
    ...(path.basename(process.cwd()) === 'server'
      ? [path.resolve(process.cwd(), '.env')]
      : []),
  ];
  const uniqueCandidateFiles = [...new Set(candidateFiles)];

  const envFilePath = uniqueCandidateFiles.find((candidate) => fs.existsSync(candidate));
  if (!envFilePath) {
    return;
  }

  parseEnvFile(envFilePath);

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsPath && !path.isAbsolute(credentialsPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
      path.dirname(envFilePath),
      credentialsPath
    );
  }
}
