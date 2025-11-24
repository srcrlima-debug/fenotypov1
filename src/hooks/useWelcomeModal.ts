import { useState, useEffect } from 'react';

export const useWelcomeModal = (userId: string | undefined) => {
  const [shouldShowModal, setShouldShowModal] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const storageKey = `fenotypo_welcome_modal_seen_${userId}`;
    const hasSeenModal = localStorage.getItem(storageKey);

    if (!hasSeenModal) {
      setShouldShowModal(true);
    }
  }, [userId]);

  const markAsViewed = () => {
    if (!userId) return;
    
    const storageKey = `fenotypo_welcome_modal_seen_${userId}`;
    localStorage.setItem(storageKey, 'true');
    setShouldShowModal(false);
  };

  return { shouldShowModal, markAsViewed };
};
