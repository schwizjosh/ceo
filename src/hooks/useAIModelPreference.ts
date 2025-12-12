import { useCallback, useEffect, useState } from 'react';
import type { AIModel } from '../components/common/AIModelSwitcher';

const STORAGE_KEY = 'andora:last-model';

type Subscriber = (model: AIModel) => void;

const subscribers = new Set<Subscriber>();
let cachedModel: AIModel | null = null;

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const readStoredModel = <T extends AIModel>(fallback: T): T => {
  if (!isBrowser) {
    return fallback;
  }

  if (cachedModel) {
    return cachedModel as T;
  }

  const stored = localStorage.getItem(STORAGE_KEY) as AIModel | null;
  cachedModel = (stored as AIModel | null) || fallback;
  return cachedModel as T;
};

const persistModel = (model: AIModel) => {
  cachedModel = model;
  if (isBrowser) {
    localStorage.setItem(STORAGE_KEY, model);
  }
  subscribers.forEach(listener => listener(model));
};

export const useAIModelPreference = <T extends AIModel>(defaultModel: T): [AIModel, (model: AIModel) => void] => {
  const [model, setModel] = useState<AIModel>(() => readStoredModel(defaultModel));

  useEffect(() => {
    const listener: Subscriber = value => setModel(value);
    subscribers.add(listener);
    return () => {
      subscribers.delete(listener);
    };
  }, []);

  const updateModel = useCallback((value: AIModel) => {
    persistModel(value);
  }, []);

  return [model, updateModel];
};

export const getStoredAIModel = <T extends AIModel>(fallback: T): AIModel => {
  return readStoredModel(fallback);
};

export const setStoredAIModel = (model: AIModel) => {
  persistModel(model);
};
