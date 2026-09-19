import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JsonRpcBridge } from '../src/core/json-rpc-bridge';
import { BmadRpcEnvelope } from '../src/core/types';

describe('JsonRpcBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully send a request and resolve with response payload', async () => {
    let clientMessage: BmadRpcEnvelope | undefined;

    const hostBridge = new JsonRpcBridge();
    const clientBridge = new JsonRpcBridge((envelope) => {
      clientMessage = envelope;
    });

    hostBridge.setSender((envelope) => {
      clientBridge.handleMessage(envelope);
    });

    hostBridge.registerHandler('ping', (payload: { message: string }) => {
      return { echo: payload.message, timestamp: 12345 };
    });

    const requestPromise = clientBridge.sendRequest('ping', { message: 'hello' });

    expect(clientMessage).toBeDefined();
    expect(clientMessage?.type).toBe('request');
    expect(clientMessage?.command).toBe('ping');
    expect(clientMessage?.payload).toEqual({ message: 'hello' });

    // Host receives client message
    await hostBridge.handleMessage(clientMessage);

    const result = await requestPromise;
    expect(result).toEqual({ echo: 'hello', timestamp: 12345 });
  });

  it('should timeout requests after 5000ms if no response is received', async () => {
    const clientBridge = new JsonRpcBridge(() => {
      // Do not respond
    });

    const requestPromise = clientBridge.sendRequest('unansweredCommand', { data: 1 });

    // Advance timers by 4999ms - should still be pending
    vi.advanceTimersByTime(4999);

    // Advance 1ms to reach 5000ms - should reject
    vi.advanceTimersByTime(1);

    await expect(requestPromise).rejects.toThrow(
      "RPC request 'unansweredCommand' timed out after 5000ms"
    );
  });

  it('should reject request when host handler throws an error', async () => {
    const hostBridge = new JsonRpcBridge();
    const clientBridge = new JsonRpcBridge((envelope) => {
      hostBridge.handleMessage(envelope);
    });
    hostBridge.setSender((envelope) => {
      clientBridge.handleMessage(envelope);
    });

    hostBridge.registerHandler('failingCommand', () => {
      throw new Error('Database connection failed');
    });

    await expect(clientBridge.sendRequest('failingCommand')).rejects.toThrow('Database connection failed');
  });

  it('should reject request when command has no registered handler', async () => {
    const hostBridge = new JsonRpcBridge();
    const clientBridge = new JsonRpcBridge((envelope) => {
      hostBridge.handleMessage(envelope);
    });
    hostBridge.setSender((envelope) => {
      clientBridge.handleMessage(envelope);
    });

    await expect(clientBridge.sendRequest('nonExistentCommand')).rejects.toThrow(
      "No handler registered for command 'nonExistentCommand'"
    );
  });

  it('should dispatch events to registered listeners and allow unsubscribing', () => {
    let capturedEnvelope: BmadRpcEnvelope | undefined;
    const bridge = new JsonRpcBridge((env) => {
      capturedEnvelope = env;
    });

    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsubscribe1 = bridge.on('stateChanged', listener1);
    bridge.on('stateChanged', listener2);

    bridge.sendEvent('stateChanged', { status: 'ready' });

    expect(capturedEnvelope).toBeDefined();
    expect(capturedEnvelope?.type).toBe('event');
    expect(capturedEnvelope?.command).toBe('stateChanged');
    expect(capturedEnvelope?.payload).toEqual({ status: 'ready' });

    // Handle the event
    bridge.handleMessage(capturedEnvelope);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener1).toHaveBeenCalledWith({ status: 'ready' });
    expect(listener2).toHaveBeenCalledTimes(1);

    // Unsubscribe listener1 and send another event
    unsubscribe1();
    bridge.handleMessage(capturedEnvelope);

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it('should reject all pending requests on disposal and prevent new requests', async () => {
    const bridge = new JsonRpcBridge(() => {});

    const p1 = bridge.sendRequest('cmd1');
    const p2 = bridge.sendRequest('cmd2');

    bridge.dispose();

    await expect(p1).rejects.toThrow('RPC Bridge disposed');
    await expect(p2).rejects.toThrow('RPC Bridge disposed');

    await expect(bridge.sendRequest('cmd3')).rejects.toThrow('RPC Bridge is disposed');
  });

  it('should gracefully ignore malformed or non-envelope messages', async () => {
    const bridge = new JsonRpcBridge();
    expect(async () => {
      await bridge.handleMessage(null);
      await bridge.handleMessage(undefined);
      await bridge.handleMessage('string');
      await bridge.handleMessage(123);
      await bridge.handleMessage({});
      await bridge.handleMessage({ id: '1' });
    }).not.toThrow();
  });
});
