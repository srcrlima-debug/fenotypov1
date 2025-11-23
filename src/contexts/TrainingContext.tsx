import { createContext, useContext, useState, ReactNode } from 'react';

interface Training {
  id: string;
  nome: string;
  data: string;
  descricao: string | null;
  status: string;
  created_at: string;
}

interface TrainingContextType {
  currentTraining: Training | null;
  setCurrentTraining: (training: Training | null) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within TrainingProvider');
  }
  return context;
};

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [currentTraining, setCurrentTraining] = useState<Training | null>(null);

  return (
    <TrainingContext.Provider value={{ currentTraining, setCurrentTraining }}>
      {children}
    </TrainingContext.Provider>
  );
};
