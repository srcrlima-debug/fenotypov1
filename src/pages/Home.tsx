import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTraining } from "@/contexts/TrainingContext";
import logo from "@/assets/fenotypo-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const { clearEvaluations } = useTraining();

  const handleStart = () => {
    clearEvaluations();
    navigate("/training/1");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <div className="mb-4">
          <img src={logo} alt="Fenotypo" className="h-16 mx-auto" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Treinamento de Avaliação Fenotípica
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Desenvolva suas habilidades através de um programa estruturado de 30 páginas
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-soft text-lg px-8 py-6 h-auto"
          >
            Iniciar Treinamento
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>30 Páginas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Navegação Sequencial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Certificado Final</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
