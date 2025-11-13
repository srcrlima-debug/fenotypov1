import React, { createContext, useContext, useState, ReactNode } from "react";

type Decision = "DEFERIDO" | "INDEFERIDO";

interface PageEvaluation {
  page: number;
  decision: Decision;
}

interface TrainingContextType {
  evaluations: PageEvaluation[];
  addEvaluation: (page: number, decision: Decision) => void;
  clearEvaluations: () => void;
  getStats: () => { deferido: number; indeferido: number };
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [evaluations, setEvaluations] = useState<PageEvaluation[]>([]);

  const addEvaluation = (page: number, decision: Decision) => {
    setEvaluations((prev) => {
      const filtered = prev.filter((e) => e.page !== page);
      return [...filtered, { page, decision }].sort((a, b) => a.page - b.page);
    });
  };

  const clearEvaluations = () => {
    setEvaluations([]);
  };

  const getStats = () => {
    return {
      deferido: evaluations.filter((e) => e.decision === "DEFERIDO").length,
      indeferido: evaluations.filter((e) => e.decision === "INDEFERIDO").length,
    };
  };

  return (
    <TrainingContext.Provider value={{ evaluations, addEvaluation, clearEvaluations, getStats }}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error("useTraining must be used within TrainingProvider");
  }
  return context;
};
