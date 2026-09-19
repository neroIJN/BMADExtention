import { JsonRpcBridge } from '../core/json-rpc-bridge';
import { BmadRpcEnvelope, BmadRpcHandler } from '../core/types';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeApi: VsCodeApi | undefined;

function getVsCodeApi(): VsCodeApi {
  if (!vscodeApi) {
    if (typeof acquireVsCodeApi === 'function') {
      vscodeApi = acquireVsCodeApi();
    } else {
      // Fallback for development / browser testing environments
      vscodeApi = {
        postMessage: (msg: unknown) => console.log('[WebviewRpcClient] postMessage:', msg),
        getState: () => ({}),
        setState: () => {}
      };
    }
  }
  return vscodeApi;
}

/**
 * Browser-side RPC client interfacing with the VS Code Webview messaging API.
 * Uses JsonRpcBridge internally for 5000ms timeouts and correlation.
 */
export class WebviewRpcClient {
  private readonly _bridge: JsonRpcBridge;
  private readonly _api: VsCodeApi;

  constructor() {
    this._api = getVsCodeApi();
    this._bridge = new JsonRpcBridge((envelope: BmadRpcEnvelope) => {
      this._api.postMessage(envelope);
    });

    window.addEventListener('message', (event: MessageEvent) => {
      this._bridge.handleMessage(event.data);
    });
  }

  public async sendRequest<T = unknown, R = unknown>(command: string, payload?: T): Promise<R> {
    return this._bridge.sendRequest<T, R>(command, payload);
  }

  public registerHandler<T = any, R = any>(command: string, handler: BmadRpcHandler<T, R>): void {
    this._bridge.registerHandler<T, R>(command, handler);
  }

  public onEvent<T = any>(command: string, listener: (payload: T) => void): () => void {
    return this._bridge.on<T>(command, listener);
  }

  public dispose(): void {
    this._bridge.dispose();
  }
}

export const rpcClient = new WebviewRpcClient();
