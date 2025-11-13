import { createContext, useContext, useState, ReactNode } from "react";

type Assessment = "DEFERIDO" | "INDEFERIDO";

interface AssessmentData {
  page: number;
  decision: Assessment;
}

interface AssessmentContextType {
  assessments: AssessmentData[];
  addAssessment: (page: number, decision: Assessment) => void;
  resetAssessments: () => void;
  getStats: () => { deferido: number; indeferido: number };
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);

  const addAssessment = (page: number, decision: Assessment) => {
    setAssessments((prev) => {
      const filtered = prev.filter((a) => a.page !== page);
      return [...filtered, { page, decision }].sort((a, b) => a.page - b.page);
    });
  };

  const resetAssessments = () => {
    setAssessments([]);
  };

  const getStats = () => {
    return {
      deferido: assessments.filter((a) => a.decision === "DEFERIDO").length,
      indeferido: assessments.filter((a) => a.decision === "INDEFERIDO").length,
    };
  };

  return (
    <AssessmentContext.Provider
      value={{ assessments, addAssessment, resetAssessments, getStats }}
    >
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error("useAssessment must be used within AssessmentProvider");
  }
  return context;
};
