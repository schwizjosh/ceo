import type { AIModel } from '../components/common/AIModelSwitcher';

export interface AICallLog {
  id: string;
  timestamp: number;
  endpoint: string;
  status: number;
  model?: string | AIModel;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

type Subscriber = (logs: AICallLog[]) => void;

let logs: AICallLog[] = [];
const subscribers = new Set<Subscriber>();

const MAX_LOGS = 5;

const truncateString = (value: string): string => {
  const limit = 2000;
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}…`;
};

const sanitizePayload = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([key, item]) => [key, sanitizePayload(item)]);
    return Object.fromEntries(entries);
  }

  return value;
};

export const recordAICall = (entry: Omit<AICallLog, 'id' | 'timestamp'> & { id?: string; timestamp?: number }) => {
  const safeEntry: AICallLog = {
    id: entry.id || crypto.randomUUID?.() || `ai-log-${Date.now()}`,
    timestamp: entry.timestamp || Date.now(),
    endpoint: entry.endpoint,
    status: entry.status,
    model: entry.model,
    requestBody: sanitizePayload(entry.requestBody),
    responseBody: sanitizePayload(entry.responseBody),
    error: entry.error,
  };

  logs = [safeEntry, ...logs].slice(0, MAX_LOGS);
  subscribers.forEach(listener => listener(logs));
};

export const getAICallLogs = (): AICallLog[] => logs;

export const subscribeToAICalls = (subscriber: Subscriber): (() => void) => {
  subscribers.add(subscriber);
  subscriber(logs);
  return () => {
    subscribers.delete(subscriber);
  };
};
