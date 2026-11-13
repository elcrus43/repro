import { useState, useEffect } from 'react';
import { getStoredDevelopments, fetchLatestDevelopments } from '../data/developmentsData';
import { fetchKsmLots } from '../lib/ksmLots';
import { fetchKsskLots } from '../lib/ksskLots';

/**
 * Loads stored + latest developments catalog and optionally cached live developer lots.
 * @param {{ includeLiveLots?: boolean }} [options]
 */
export function useDevelopmentsCatalog({ includeLiveLots = false } = {}) {
  const [developments, setDevelopments] = useState(() => getStoredDevelopments());
  const [liveLotsState, setLiveLotsState] = useState({
    ksmLots: [],
    ksmProjects: [],
    ksskLots: [],
    ksskProjects: [],
  });

  useEffect(() => {
    let active = true;

    fetchLatestDevelopments()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res?.developments) && res.developments.length > 0) {
          setDevelopments(res.developments);
        }
      })
      .catch(() => {});

    if (includeLiveLots) {
      Promise.allSettled([fetchKsmLots(), fetchKsskLots()]).then(([ksmRes, ksskRes]) => {
        if (!active) return;
        setLiveLotsState({
          ksmLots: ksmRes.status === 'fulfilled' ? (ksmRes.value?.lots || []) : [],
          ksmProjects: ksmRes.status === 'fulfilled' ? (ksmRes.value?.projects || []) : [],
          ksskLots: ksskRes.status === 'fulfilled' ? (ksskRes.value?.lots || []) : [],
          ksskProjects: ksskRes.status === 'fulfilled' ? (ksskRes.value?.projects || []) : [],
        });
      });
    }

    return () => {
      active = false;
    };
  }, [includeLiveLots]);

  return {
    developments,
    ...liveLotsState,
  };
}
