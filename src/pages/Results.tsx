import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, RotateCcw } from "lucide-react";

const Results = () => {
  const navigate = useNavigate();

  // Disable browser back button
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, "", window.location.href);
    };

    preventBack();
    window.addEventListener("popstate", preventBack);

    return () => {
      window.removeEventListener("popstate", preventBack);
    };
  }, []);

  const handleRestart = () => {
    navigate("/training/1");
  };

  const handleHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent mb-4 shadow-soft animate-fade-in">
          <CheckCircle2 className="w-14 h-14 text-accent-foreground" />
        </div>
        
        <div className="space-y-4 text-primary-foreground">
          <h1 className="text-5xl font-bold tracking-tight">
            Treinamento Concluído!
          </h1>
          <p className="text-xl opacity-90 max-w-lg mx-auto">
            Parabéns! Você completou todas as 30 páginas do treinamento de avaliação fenotípica.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <div className="grid grid-cols-3 gap-6 text-primary-foreground">
            <div className="space-y-2">
              <div className="text-3xl font-bold">30</div>
              <div className="text-sm opacity-80">Páginas Completas</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm opacity-80">Progresso</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">✓</div>
              <div className="text-sm opacity-80">Certificado</div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleHome}
            size="lg"
            variant="secondary"
            className="px-8 py-6 h-auto text-lg"
          >
            <Home className="mr-2 h-5 w-5" />
            Página Inicial
          </Button>
          <Button
            onClick={handleRestart}
            size="lg"
            className="bg-white text-primary hover:bg-white/90 shadow-soft px-8 py-6 h-auto text-lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Refazer Treinamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
