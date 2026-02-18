/**
 * Local fork of ink-testing-library v4.0.0
 * https://github.com/vadimdemedes/ink-testing-library/blob/v4.0.0/source/index.ts
 *
 * Fix: Stdin.addListener('readable', ...) re-emits 'readable' if data is
 * already buffered. This handles the race condition where stdin.write() is
 * called before React's useEffect has registered the 'readable' listener via
 * setRawMode(true). See:
 * - https://github.com/vadimdemedes/ink/pull/616
 * - https://github.com/vadimdemedes/ink-testing-library/issues/29
 */
import { EventEmitter } from "node:events";
import { type Instance as InkInstance, render as inkRender } from "ink";
import type { ReactElement } from "react";

class Stdout extends EventEmitter {
  get columns() {
    return 100;
  }

  readonly frames: string[] = [];
  #lastFrame?: string;

  write = (frame: string) => {
    this.frames.push(frame);
    this.#lastFrame = frame;
  };

  lastFrame = () => this.#lastFrame;
}

class Stderr extends EventEmitter {
  readonly frames: string[] = [];
  #lastFrame?: string;

  write = (frame: string) => {
    this.frames.push(frame);
    this.#lastFrame = frame;
  };

  lastFrame = () => this.#lastFrame;
}

class Stdin extends EventEmitter {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  isTTY = true;
  // Use a queue instead of a single value so that consecutive write() calls
  // don't overwrite each other before the data is read.
  #queue: string[] = [];
  // Whether a 'readable' listener has been registered (i.e. setRawMode(true)
  // has been called by useInput's useEffect).
  #rawModeEnabled = false;

  constructor(options: { isTTY?: boolean } = {}) {
    super();
    this.isTTY = options.isTTY ?? true;
  }

  write = (data: string) => {
    this.#queue.push(data);
    if (this.#rawModeEnabled) {
      // Listener is already registered: emit immediately
      this.emit("readable");
    }
    // Also emit 'data' for any other listeners
    this.emit("data", data);
  };

  /**
   * Override addListener so that if 'readable' is subscribed after write()
   * has already buffered data (but the event was missed), we re-emit
   * 'readable' on the next tick for each buffered item. This fixes the race
   * between stdin.write() and useInput's useEffect registering the listener
   * via setRawMode(true).
   */
  override addListener(event: string, listener: (...args: unknown[]) => void): this {
    super.addListener(event, listener);
    if (event === "readable") {
      this.#rawModeEnabled = true;
      // Drain any items already in the queue (one flush per item)
      const pending = this.#queue.length;
      for (let i = 0; i < pending; i++) {
        // Use Promise.resolve() (microtask) so the flush happens before
        // setImmediate/setTimeout but after the current synchronous call stack,
        // giving React time to finish attaching the listener before we emit.
        Promise.resolve().then(() => {
          if (this.#queue.length > 0) {
            this.emit("readable");
          }
        });
      }
    }
    return this;
  }

  override removeListener(event: string, listener: (...args: unknown[]) => void): this {
    super.removeListener(event, listener);
    if (event === "readable" && this.listenerCount("readable") === 0) {
      this.#rawModeEnabled = false;
    }
    return this;
  }

  setEncoding() {
    // Do nothing
  }

  setRawMode() {
    // Do nothing
  }

  resume() {
    // Do nothing
  }

  pause() {
    // Do nothing
  }

  ref() {
    // Do nothing
  }

  unref() {
    // Do nothing
  }

  read: () => string | null = () => {
    return this.#queue.shift() ?? null;
  };
}

type Instance = {
  rerender: (tree: ReactElement) => void;
  unmount: () => void;
  cleanup: () => void;
  stdout: Stdout;
  stderr: Stderr;
  stdin: Stdin;
  frames: string[];
  lastFrame: () => string | undefined;
};

const instances: InkInstance[] = [];

export const render = (tree: ReactElement): Instance => {
  const stdout = new Stdout();
  const stderr = new Stderr();
  const stdin = new Stdin();

  const instance = inkRender(tree, {
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    stderr: stderr as never,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    stdin: stdin as never,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    stdout: stdout as never,
  });

  instances.push(instance);

  return {
    cleanup: instance.cleanup,
    frames: stdout.frames,
    lastFrame: stdout.lastFrame,
    rerender: instance.rerender,
    stderr,
    stdin,
    stdout,
    unmount: instance.unmount,
  };
};

export const cleanup = () => {
  for (const instance of instances) {
    instance.unmount();
    instance.cleanup();
  }
};
