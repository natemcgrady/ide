import { spawn } from "child_process";
import { once } from "events";
import {
  writeFile,
  unlink,
  mkdir,
  readFile as readTextFile,
} from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { PassThrough } from "stream";
import { Sandbox } from "@vercel/sandbox";
import { isSupportedLanguage, type SupportedLanguage } from "@/lib/languages";

export type Language = SupportedLanguage;

export interface ExecutionResult {
  output: string;
  error: string;
  exitCode: number;
  executionTime: number;
}

export interface ExecutionLogChunk {
  stream: "stdout" | "stderr";
  chunk: string;
}

export interface ExecuteCodeOptions {
  signal?: AbortSignal;
  onLog?: (chunk: ExecutionLogChunk) => void;
}

interface LanguageConfig {
  extension: string;
  command: string;
  args: (filePath: string) => string[];
}

// Use the virtual environment's Python if available
const venvPython = join(process.cwd(), ".venv", "bin", "python");
const localPythonCandidates = [venvPython, "python3", "python"] as const;
const pythonRequirementsCandidates = [
  "python-requirements.txt",
  "requirements.txt",
] as const;

const languageConfigs: Record<Language, LanguageConfig> = {
  typescript: {
    extension: ".ts",
    command: "npx",
    args: (filePath) => ["ts-node", "--transpile-only", filePath],
  },
  python: {
    extension: ".py",
    command: venvPython,
    args: (filePath) => [filePath],
  },
};

const EXECUTION_TIMEOUT = 60000; // 1 minute
const PYTHON_SANDBOX_TIMEOUT = 120000; // 2 minutes
const PYTHON_INSTALL_TIMEOUT = 60000; // 1 minute
const SANDBOX_WORKDIR = "/vercel/sandbox";

function emitSandboxStep(options: ExecuteCodeOptions | undefined, message: string) {
  options?.onLog?.({
    stream: "stdout",
    chunk: `[sandbox] ${message}\n`,
  });
}

function shouldUseSandboxForPython(): boolean {
  return (
    process.env.VERCEL === "1" || process.env.USE_VERCEL_SANDBOX === "true"
  );
}

async function getPythonRequirements(): Promise<string | null> {
  for (const candidate of pythonRequirementsCandidates) {
    try {
      const content = await readTextFile(
        join(process.cwd(), candidate),
        "utf-8",
      );
      if (content.trim().length > 0) {
        return content;
      }
    } catch {
      // Try the next candidate
    }
  }

  return null;
}

async function runLocalPython(
  filePath: string,
  options?: ExecuteCodeOptions,
): Promise<{ output: string; error: string; exitCode: number }> {
  let lastFailure: { output: string; error: string; exitCode: number } | null =
    null;

  for (const command of localPythonCandidates) {
    const result = await runProcess(command, [filePath], options);
    if (!result.error.startsWith("Failed to start process:")) {
      return result;
    }
    lastFailure = result;
  }

  return (
    lastFailure ?? {
      output: "",
      error: "Unable to locate a Python interpreter",
      exitCode: 1,
    }
  );
}

async function runSandboxCommand(
  sandbox: Sandbox,
  command: string,
  args: string[],
  timeoutMs: number,
  options?: ExecuteCodeOptions,
): Promise<{
  output: string;
  error: string;
  exitCode: number;
  timedOut: boolean;
}> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  const externalSignal = options?.signal;
  const onExternalAbort = () => abortController.abort();
  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort);
  }

  try {
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();
    let output = "";
    let error = "";

    stdoutStream.on("data", (data) => {
      const chunk = data.toString();
      output += chunk;
      options?.onLog?.({ stream: "stdout", chunk });
    });
    stderrStream.on("data", (data) => {
      const chunk = data.toString();
      error += chunk;
      options?.onLog?.({ stream: "stderr", chunk });
    });

    const cmd = await sandbox.runCommand({
      cmd: command,
      args,
      cwd: SANDBOX_WORKDIR,
      signal: abortController.signal,
      stdout: stdoutStream,
      stderr: stderrStream,
    });

    await Promise.allSettled([once(stdoutStream, "finish"), once(stderrStream, "finish")]);

    return {
      output,
      error,
      exitCode: cmd.exitCode,
      timedOut: false,
    };
  } catch (err) {
    if (abortController.signal.aborted) {
      return {
        output: "",
        error: `[Execution timed out after ${Math.round(timeoutMs / 1000)} seconds]`,
        exitCode: 1,
        timedOut: true,
      };
    }

    throw err;
  } finally {
    clearTimeout(timeout);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }
}

async function executePythonInSandbox(
  code: string,
  options?: ExecuteCodeOptions,
): Promise<ExecutionResult> {
  const startTime = Date.now();
  let sandbox: Sandbox | null = null;

  try {
    const snapshotId = process.env.VERCEL_PYTHON_SANDBOX_SNAPSHOT_ID;
    emitSandboxStep(
      options,
      snapshotId
        ? `Creating sandbox from snapshot ${snapshotId}...`
        : "Creating Python sandbox...",
    );

    // Sandbox creation and requirements discovery are independent I/O; run in parallel
    const [createdSandbox, requirements] = await Promise.all([
      snapshotId
        ? Sandbox.create({
            source: { type: "snapshot", snapshotId },
            timeout: PYTHON_SANDBOX_TIMEOUT,
          })
        : Sandbox.create({
            runtime: "python3.13",
            timeout: PYTHON_SANDBOX_TIMEOUT,
          }),
      getPythonRequirements(),
    ]);

    sandbox = createdSandbox;
    emitSandboxStep(options, "Sandbox ready.");

    const pythonFileName = `code_${randomUUID()}.py`;
    const pythonFilePath = `${SANDBOX_WORKDIR}/${pythonFileName}`;

    emitSandboxStep(options, "Uploading script...");
    await sandbox.writeFiles([
      {
        path: pythonFilePath,
        content: Buffer.from(code, "utf-8"),
      },
    ]);

    let installWarning = "";
    if (!snapshotId && requirements) {
      emitSandboxStep(options, "Installing Python dependencies...");
      await sandbox.writeFiles([
        {
          path: `${SANDBOX_WORKDIR}/requirements.txt`,
          content: Buffer.from(requirements, "utf-8"),
        },
      ]);

      const installResult = await runSandboxCommand(
        sandbox,
        "pip",
        ["install", "--disable-pip-version-check", "-r", "requirements.txt"],
        PYTHON_INSTALL_TIMEOUT,
        options,
      );

      if (installResult.exitCode !== 0) {
        emitSandboxStep(options, "Dependency installation failed.");
        installWarning = `Dependency install warning:\n${installResult.error || installResult.output}`;
      } else {
        emitSandboxStep(options, "Dependencies installed.");
      }
    }

    emitSandboxStep(options, "Running Python command...");
    const result = await runSandboxCommand(
      sandbox,
      "python",
      [pythonFilePath],
      EXECUTION_TIMEOUT,
      options,
    );
    emitSandboxStep(
      options,
      `Python command finished with exit code ${result.exitCode}.`,
    );
    const error = [installWarning, result.error].filter(Boolean).join("\n");

    return {
      output: result.output,
      error,
      exitCode: result.exitCode,
      executionTime: Date.now() - startTime,
    };
  } catch (err) {
    return {
      output: "",
      error:
        err instanceof Error
          ? `Sandbox execution failed: ${err.message}`
          : "Sandbox execution failed: Unknown error occurred",
      exitCode: 1,
      executionTime: Date.now() - startTime,
    };
  } finally {
    if (sandbox) {
      try {
        emitSandboxStep(options, "Stopping sandbox...");
        await sandbox.stop({ blocking: false });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

export async function executeCode(
  code: string,
  language: Language,
  options?: ExecuteCodeOptions,
): Promise<ExecutionResult> {
  if (language === "python" && shouldUseSandboxForPython()) {
    return executePythonInSandbox(code, options);
  }

  const config = languageConfigs[language];
  if (!config) {
    return {
      output: "",
      error: `Unsupported language: ${language}`,
      exitCode: 1,
      executionTime: 0,
    };
  }

  const tempDir = join(tmpdir(), "ide");
  const fileName = `code_${randomUUID()}${config.extension}`;
  const filePath = join(tempDir, fileName);

  try {
    // Ensure temp directory exists
    await mkdir(tempDir, { recursive: true });

    // Write code to temp file
    await writeFile(filePath, code, "utf-8");

    // Execute the code
    const startTime = Date.now();
    const result =
      language === "python"
        ? await runLocalPython(filePath, options)
        : await runProcess(config.command, config.args(filePath), options);
    const executionTime = Date.now() - startTime;

    return {
      ...result,
      executionTime,
    };
  } catch (err) {
    return {
      output: "",
      error: err instanceof Error ? err.message : "Unknown error occurred",
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
  args: string[],
  options?: ExecuteCodeOptions,
): Promise<{ output: string; error: string; exitCode: number }> {
  return new Promise((resolve) => {
    const externalSignal = options?.signal;
    if (externalSignal?.aborted) {
      resolve({
        output: "",
        error: "Execution cancelled",
        exitCode: 130,
      });
      return;
    }

    const process = spawn(command, args, {
      timeout: EXECUTION_TIMEOUT,
      shell: false,
      signal: externalSignal,
    });

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      options?.onLog?.({ stream: "stdout", chunk });
    });

    process.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      options?.onLog?.({ stream: "stderr", chunk });
    });

    const timeout = setTimeout(() => {
      process.kill("SIGTERM");
      stderr += "\n[Execution timed out after 60 seconds]";
    }, EXECUTION_TIMEOUT);

    process.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code ?? 1,
      });
    });

    process.on("error", (err) => {
      clearTimeout(timeout);
      if ((err as { name?: string }).name === "AbortError") {
        resolve({
          output: stdout,
          error: "Execution cancelled",
          exitCode: 130,
        });
        return;
      }
      resolve({
        output: stdout,
        error: `Failed to start process: ${err.message}`,
        exitCode: 1,
      });
    });
  });
}

export function isValidLanguage(lang: string): lang is Language {
  return isSupportedLanguage(lang);
}
