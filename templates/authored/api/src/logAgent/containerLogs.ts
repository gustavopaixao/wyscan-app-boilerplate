/**
 * Reading container logs off the Docker socket.
 *
 * Lives in the log-agent sidecar rather than in the API, because it needs
 * `/var/run/docker.sock` and the API deliberately does not get it. Compose
 * already mounts the socket read-only into the `log-agent` service and gives it
 * `LOG_AGENT_SECRET` plus the container names it may read; this is the code that
 * was missing.
 *
 * Nothing here trusts a caller-supplied container name: the allowlist is built
 * from the environment, so the agent can never be talked into dumping the logs
 * of an unrelated container sharing the host daemon.
 */
import Docker from "dockerode";

export type LogStream = "stdout" | "stderr";

export type RawLogLine = {
  /** Docker's own RFC3339 timestamp, when it emitted one. */
  timestamp?: string;
  stream: LogStream;
  message: string;
};

/** Distinguishes "your Docker setup is wrong" from "that container is down". */
export class DockerSocketError extends Error {}
export class ContainerUnavailableError extends Error {}

export function isSocketPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException).code;
  return (
    code === "EACCES" ||
    code === "EPERM" ||
    /permission denied|connect EACCES|ENOENT.*docker\.sock/i.test(error.message)
  );
}

/**
 * The containers this agent may be asked about, keyed by the service name the
 * admin console uses. Absent env var means that service is simply not offered.
 */
export function allowedContainers(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const map: Record<string, string> = {};
  if (env.LOG_CONTAINER_API) map.api = env.LOG_CONTAINER_API;
  if (env.LOG_CONTAINER_REALTIME) map.realtime = env.LOG_CONTAINER_REALTIME;
  return map;
}

const TIMESTAMPED = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+([\s\S]*)$/;

function toLine(stream: LogStream, text: string): RawLogLine {
  const trimmed = text.replace(/\r$/, "");
  const match = trimmed.match(TIMESTAMPED);
  if (!match) return { stream, message: trimmed };
  return { stream, timestamp: match[1], message: match[2] ?? "" };
}

/**
 * Split Docker's multiplexed log stream into lines.
 *
 * Without a TTY the daemon frames every chunk with an 8-byte header — one byte
 * of stream id, three reserved, then a big-endian payload length. Reading it as
 * plain text leaves those bytes embedded in the output, which is why the log
 * viewer would otherwise show a stray glyph before every line.
 *
 * A frame boundary is not a line boundary, so partial lines are carried between
 * frames per stream.
 */
export function demuxDockerLogs(buffer: Buffer): RawLogLine[] {
  const lines: RawLogLine[] = [];
  const pending: Record<LogStream, string> = { stdout: "", stderr: "" };
  let offset = 0;

  const consume = (stream: LogStream, chunk: string) => {
    const parts = (pending[stream] + chunk).split("\n");
    // The last element is whatever came before the next newline — not a line yet.
    pending[stream] = parts.pop() ?? "";
    for (const part of parts) {
      const line = toLine(stream, part);
      if (line.message) lines.push(line);
    }
  };

  while (offset + 8 <= buffer.length) {
    const stream: LogStream = buffer[offset] === 2 ? "stderr" : "stdout";
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    // A truncated final frame means the tail cut mid-chunk; stop rather than
    // reading past the end.
    if (offset + size > buffer.length) break;
    consume(stream, buffer.subarray(offset, offset + size).toString("utf8"));
    offset += size;
  }

  for (const stream of ["stdout", "stderr"] as const) {
    if (!pending[stream]) continue;
    const line = toLine(stream, pending[stream]);
    if (line.message) lines.push(line);
  }

  return lines;
}

export class ContainerLogReader {
  private readonly docker: Docker;

  constructor(socketPath = "/var/run/docker.sock") {
    this.docker = new Docker({ socketPath });
  }

  /** Newest `tail` lines. Throws `ContainerUnavailableError` when it is not running. */
  async tail(containerName: string, tail: number): Promise<RawLogLine[]> {
    try {
      const container = this.docker.getContainer(containerName);
      const info = await container.inspect();
      if (!info.State?.Running) {
        throw new ContainerUnavailableError(`${containerName} is not running`);
      }

      const buffer = (await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
        follow: false,
      })) as unknown as Buffer;

      return demuxDockerLogs(Buffer.from(buffer));
    } catch (error) {
      if (error instanceof ContainerUnavailableError) throw error;
      if (isSocketPermissionError(error)) {
        throw new DockerSocketError("Docker socket is not readable");
      }
      // dockerode reports a missing container as a 404 on the inspect call.
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw new ContainerUnavailableError(`${containerName} does not exist`);
      }
      throw error;
    }
  }
}
