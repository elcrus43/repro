import { useEffect, useRef, useCallback } from 'react';
import {
  startScenario,
  recordStep,
  recordError,
  finishScenario,
  cancelScenario,
  recordFeedback,
} from '../utils/uxTracker.js';

/**
 * useUxScenario - хук жизненного цикла UX-сценария для страниц и модалок REA CRM.
 * Автоматически замеряет время, переходы по шагам, ошибки и фиксирует drop-off при уходе.
 * 
 * @param {string} scenarioName - имя сценария (например, 'create_property')
 * @param {Object} [metadata={}] - контекст (источник, роль, устройство)
 * @param {boolean} [autoStart=true] - запускать ли замер автоматически при монтировании
 */
export function useUxScenario(scenarioName, metadata = {}, autoStart = true) {
  const isCompletedRef = useRef(false);
  const scenarioNameRef = useRef(scenarioName);
  scenarioNameRef.current = scenarioName;

  useEffect(() => {
    if (autoStart && scenarioName) {
      isCompletedRef.current = false;
      startScenario(scenarioName, metadata);
    }

    return () => {
      // Если сценарий не был завершен явно (риелтор закрыл форму или ушел со страницы)
      if (autoStart && !isCompletedRef.current) {
        cancelScenario('navigated_away');
      }
    };
  }, [scenarioName, autoStart]);

  const trackStep = useCallback((stepName) => {
    return recordStep(stepName);
  }, []);

  const trackError = useCallback((fieldName, message) => {
    return recordError(fieldName, message);
  }, []);

  const completeScenario = useCallback(() => {
    isCompletedRef.current = true;
    return finishScenario();
  }, []);

  const abandonScenario = useCallback((reason = 'manual_cancel') => {
    isCompletedRef.current = true;
    return cancelScenario(reason);
  }, []);

  const submitFeedback = useCallback(
    ({ score, metricType = 'CES', comment = '' }) => {
      return recordFeedback(scenarioNameRef.current, { score, metricType, comment });
    },
    []
  );

  return {
    trackStep,
    trackError,
    completeScenario,
    abandonScenario,
    submitFeedback,
  };
}
