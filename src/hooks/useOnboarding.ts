import { useState, useEffect } from "react";

export function useOnboarding() {
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("fenotypo-tutorial-completed");
    const hasSeen = completed === "true";
    setHasSeenTutorial(hasSeen);
    setShouldShowTutorial(!hasSeen);
  }, []);

  const markTutorialComplete = () => {
    localStorage.setItem("fenotypo-tutorial-completed", "true");
    setHasSeenTutorial(true);
    setShouldShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem("fenotypo-tutorial-completed");
    setHasSeenTutorial(false);
    setShouldShowTutorial(true);
  };

  return {
    hasSeenTutorial,
    shouldShowTutorial,
    markTutorialComplete,
    resetTutorial,
  };
}
