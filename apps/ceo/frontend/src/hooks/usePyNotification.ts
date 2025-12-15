/**
 * useAndoraNotification Hook
 *
 * Manages the AndoraNotification state and messages
 * Shows ONE random message at a time - no rotation
 */

import { useState, useCallback } from 'react';
import { LoadingMessageType, getLoadingMessage } from '../utils/loadingMessages';

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface UsePyNotificationReturn {
  message: string;
  modelInfo?: string;
  isVisible: boolean;
  action?: NotificationAction;
  showNotification: (type: LoadingMessageType, model?: string, action?: NotificationAction) => void;
  hideNotification: () => void;
  updateMessage: (message: string, model?: string, action?: NotificationAction) => void;
}

export const usePyNotification = (): UsePyNotificationReturn => {
  const [message, setMessage] = useState<string>('');
  const [modelInfo, setModelInfo] = useState<string | undefined>(undefined);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [action, setAction] = useState<NotificationAction | undefined>(undefined);

  const showNotification = useCallback((type: LoadingMessageType, model?: string, newAction?: NotificationAction) => {
    const randomMessage = getLoadingMessage(type);
    setMessage(randomMessage);
    setModelInfo(model);
    setIsVisible(true);
    setAction(newAction);
  }, []);

  const hideNotification = useCallback(() => {
    setIsVisible(false);
    setMessage('');
    setModelInfo(undefined);
    setAction(undefined);
  }, []);

  const updateMessage = useCallback((newMessage: string, model?: string, newAction?: NotificationAction) => {
    setMessage(newMessage);
    setModelInfo(model);
    setIsVisible(true);
    setAction(newAction);
  }, []);

  return {
    message,
    modelInfo,
    isVisible,
    action,
    showNotification,
    hideNotification,
    updateMessage,
  };
};
