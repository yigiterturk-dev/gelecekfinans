import { AsyncLocalStorage } from "node:async_hooks";

const requestSignal = new AsyncLocalStorage<AbortSignal>();

export function withBotRequestSignal<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  return requestSignal.run(signal, work);
}

export function botRequestOptions(): { signal?: AbortSignal } {
  const signal = requestSignal.getStore();
  return signal ? { signal } : {};
}

export function isBotRequestAborted(): boolean {
  return requestSignal.getStore()?.aborted ?? false;
}

export function throwIfBotRequestAborted(): void {
  const signal = requestSignal.getStore();
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("Bot request was aborted");
  }
}
