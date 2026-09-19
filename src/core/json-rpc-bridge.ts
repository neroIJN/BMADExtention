import {
  BmadRpcEnvelope,
  BmadRpcHandler,
  BmadRpcEventListener
} from './types';

export interface JsonRpcBridgeOptions {
  timeoutMs?: number;
  sender?: (envelope: BmadRpcEnvelope) => void;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
  command: string;
}

/**
 * Domain-isolated JSON-RPC 2-way asynchronous communication bridge (AD-6).
 * Manages request correlation, timeout handling (default 5000ms),
 * command dispatching, and bidirectional event broadcasting.
 */
export class JsonRpcBridge {
  private readonly _timeoutMs: number;
  private _sender?: (envelope: BmadRpcEnvelope) => void;
  private readonly _handlers = new Map<string, BmadRpcHandler>();
  private readonly _listeners = new Map<string, Set<BmadRpcEventListener>>();
  private readonly _pendingRequests = new Map<string, PendingRequest>();
  private _sequence = 0;
  private _disposed = false;

  constructor(optionsOrSender?: JsonRpcBridgeOptions | ((envelope: BmadRpcEnvelope) => void)) {
    if (typeof optionsOrSender === 'function') {
      this._sender = optionsOrSender;
      this._timeoutMs = 5000;
    } else {
      this._timeoutMs = optionsOrSender?.timeoutMs ?? 5000;
      this._sender = optionsOrSender?.sender;
    }
  }

  public setSender(sender: (envelope: BmadRpcEnvelope) => void): void {
    this._sender = sender;
  }

  public registerHandler<T = any, R = any>(command: string, handler: BmadRpcHandler<T, R>): void {
    this._handlers.set(command, handler);
  }

  public unregisterHandler(command: string): void {
    this._handlers.delete(command);
  }

  public on<T = any>(command: string, listener: BmadRpcEventListener<T>): () => void {
    let set = this._listeners.get(command);
    if (!set) {
      set = new Set();
      this._listeners.set(command, set);
    }
    set.add(listener);

    return () => {
      set?.delete(listener);
      if (set && set.size === 0) {
        this._listeners.delete(command);
      }
    };
  }

  public async sendRequest<T = unknown, R = unknown>(command: string, payload?: T): Promise<R> {
    if (this._disposed) {
      throw new Error('RPC Bridge is disposed');
    }
    if (!this._sender) {
      throw new Error('No sender transport configured for RPC Bridge');
    }

    const id = `req-${Date.now()}-${++this._sequence}-${Math.random().toString(36).slice(2, 7)}`;
    const envelope: BmadRpcEnvelope<T> = {
      id,
      type: 'request',
      command,
      payload: (payload !== undefined ? payload : ({} as T))
    };

    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(id);
        reject(new Error(`RPC request '${command}' timed out after ${this._timeoutMs}ms`));
      }, this._timeoutMs);

      this._pendingRequests.set(id, {
        resolve,
        reject,
        timer,
        command
      });

      try {
        this._sender!(envelope);
      } catch (err) {
        clearTimeout(timer);
        this._pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  public sendResponse<T = unknown>(id: string, command: string, payload: T, error?: string): void {
    if (this._disposed || !this._sender) {
      return;
    }
    const envelope: BmadRpcEnvelope<T> = {
      id,
      type: 'response',
      command,
      payload,
      error
    };
    this._sender(envelope);
  }

  public sendEvent<T = unknown>(command: string, payload: T): void {
    if (this._disposed || !this._sender) {
      return;
    }
    const id = `evt-${Date.now()}-${++this._sequence}-${Math.random().toString(36).slice(2, 7)}`;
    const envelope: BmadRpcEnvelope<T> = {
      id,
      type: 'event',
      command,
      payload
    };
    this._sender(envelope);
  }

  public async handleMessage(rawMessage: unknown): Promise<void> {
    if (this._disposed) {
      return;
    }
    if (!rawMessage || typeof rawMessage !== 'object') {
      return;
    }

    const envelope = rawMessage as Partial<BmadRpcEnvelope>;
    if (!envelope.id || !envelope.type || !envelope.command) {
      return;
    }

    switch (envelope.type) {
      case 'request': {
        const handler = this._handlers.get(envelope.command);
        if (!handler) {
          this.sendResponse(
            envelope.id,
            envelope.command,
            null,
            `No handler registered for command '${envelope.command}'`
          );
          return;
        }

        try {
          const result = await handler(envelope.payload);
          this.sendResponse(envelope.id, envelope.command, result);
        } catch (err: any) {
          this.sendResponse(
            envelope.id,
            envelope.command,
            null,
            err?.message || String(err)
          );
        }
        break;
      }

      case 'response': {
        const pending = this._pendingRequests.get(envelope.id);
        if (pending) {
          clearTimeout(pending.timer);
          this._pendingRequests.delete(envelope.id);
          if (envelope.error) {
            pending.reject(new Error(envelope.error));
          } else {
            pending.resolve(envelope.payload);
          }
        }
        break;
      }

      case 'event': {
        const listeners = this._listeners.get(envelope.command);
        if (listeners) {
          for (const listener of listeners) {
            try {
              listener(envelope.payload);
            } catch (err) {
              console.error(`Error in RPC event listener for '${envelope.command}':`, err);
            }
          }
        }
        break;
      }
    }
  }

  public dispose(): void {
    if (this._disposed) {
      return;
    }
    this._disposed = true;

    for (const [, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('RPC Bridge disposed'));
    }
    this._pendingRequests.clear();
    this._handlers.clear();
    this._listeners.clear();
  }
}
