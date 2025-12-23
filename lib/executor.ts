import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export type Language = 'javascript' | 'typescript' | 'python' | 'go';

export interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

interface LanguageConfig {
  extension: string;
  command: string;
  args: (filePath: string) => string[];
}

// Use the virtual environment's Python if available
const venvPython = join(process.cwd(), '.venv', 'bin', 'python');

const languageConfigs: Record<Language, LanguageConfig> = {
  javascript: {
    extension: '.js',
    command: 'node',
    args: (filePath) => [filePath],
  },
  typescript: {
    extension: '.ts',
    command: 'npx',
    args: (filePath) => ['ts-node', '--transpile-only', filePath],
  },
  python: {
    extension: '.py',
    command: venvPython,
    args: (filePath) => [filePath],
  },
  go: {
    extension: '.go',
    command: 'go',
    args: (filePath) => ['run', filePath],
  },
};

const EXECUTION_TIMEOUT = 10000; // 10 seconds

export async function executeCode(
  code: string,
  language: Language
): Promise<ExecutionResult> {
  const config = languageConfigs[language];
  if (!config) {
    return {
      output: '',
      error: `Unsupported language: ${language}`,
      exitCode: 1,
      executionTime: 0,
    };
  }

  const tempDir = join(tmpdir(), 'interview-ide');
  const fileName = `code_${randomUUID()}${config.extension}`;
  const filePath = join(tempDir, fileName);

  try {
    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true });

    // Write code to temp file
    await writeFile(filePath, code, 'utf-8');

    // Execute the code
    const startTime = Date.now();
    const result = await runProcess(config.command, config.args(filePath));
    const executionTime = Date.now() - startTime;

    return {
      ...result,
      executionTime,
    };
  } catch (err) {
    return {
      output: '',
      error: err instanceof Error ? err.message : 'Unknown error occurred',
      exitCode: 1,
      executionTime: 0,
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function runProcess(
  command: string,
  args: string[]
): Promise<{ output: string; error: string; exitCode: number }> {
  return new Promise((resolve) => {
    const process = spawn(command, args, {
      timeout: EXECUTION_TIMEOUT,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      process.kill('SIGTERM');
      stderr += '\n[Execution timed out after 10 seconds]';
    }, EXECUTION_TIMEOUT);

    process.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code ?? 1,
      });
    });

    process.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        output: stdout,
        error: `Failed to start process: ${err.message}`,
        exitCode: 1,
      });
    });
  });
}

export function isValidLanguage(lang: string): lang is Language {
  return ['javascript', 'typescript', 'python', 'go'].includes(lang);
}

