import { useEffect, useState } from 'react';
import { AICallLog, getAICallLogs, subscribeToAICalls } from '../lib/aiDebugStore';

export const useAIDebugLogs = (): AICallLog[] => {
  const [logs, setLogs] = useState<AICallLog[]>(() => getAICallLogs());

  useEffect(() => {
    const unsubscribe = subscribeToAICalls(setLogs);
    return () => unsubscribe();
  }, []);

  return logs;
};
