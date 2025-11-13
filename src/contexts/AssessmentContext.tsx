import { createContext, useContext, useState, ReactNode } from "react";

type Assessment = "DEFERIDO" | "INDEFERIDO" | "NÃO_RESPONDIDO";

interface AssessmentData {
  page: number;
  decision: Assessment;
  startTime: number;
  endTime: number;
  timeSpent: number;
}

interface AssessmentContextType {
  assessments: AssessmentData[];
  addAssessment: (page: number, decision: Assessment, startTime: number) => void;
  resetAssessments: () => void;
  getStats: () => { 
    deferido: number; 
    indeferido: number; 
    naoRespondido: number;
    averageTime: number;
    totalTime: number;
  };
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider = ({ children }: { children: ReactNode }) => {
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);

  const addAssessment = (page: number, decision: Assessment, startTime: number) => {
    const endTime = Date.now();
    const timeSpent = endTime - startTime;
    
    setAssessments((prev) => {
      const filtered = prev.filter((a) => a.page !== page);
      return [...filtered, { page, decision, startTime, endTime, timeSpent }].sort((a, b) => a.page - b.page);
    });
  };

  const resetAssessments = () => {
    setAssessments([]);
  };

  const getStats = () => {
    const totalTime = assessments.reduce((sum, a) => sum + a.timeSpent, 0);
    const averageTime = assessments.length > 0 ? totalTime / assessments.length : 0;
    
    return {
      deferido: assessments.filter((a) => a.decision === "DEFERIDO").length,
      indeferido: assessments.filter((a) => a.decision === "INDEFERIDO").length,
      naoRespondido: assessments.filter((a) => a.decision === "NÃO_RESPONDIDO").length,
      averageTime,
      totalTime,
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
