import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { Card } from "@/components/ui/card";

const Results = () => {
  const navigate = useNavigate();
  const { assessments, getStats, resetAssessments } = useAssessment();
  const stats = getStats();

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
    resetAssessments();
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
          <div className="grid grid-cols-2 gap-8 text-primary-foreground mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle className="w-8 h-8" />
                <div className="text-4xl font-bold">{stats.deferido}</div>
              </div>
              <div className="text-sm opacity-80">Deferidos</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <XCircle className="w-8 h-8" />
                <div className="text-4xl font-bold">{stats.indeferido}</div>
              </div>
              <div className="text-sm opacity-80">Indeferidos</div>
            </div>
          </div>
        </div>

        {/* Detailed Results List */}
        {assessments.length > 0 && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-xl font-bold text-primary-foreground mb-4">
              Resumo das Avaliações
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
              {assessments.map((assessment) => (
                <div
                  key={assessment.page}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    assessment.decision === "DEFERIDO"
                      ? "bg-green-600/20 border border-green-500/30"
                      : "bg-red-600/20 border border-red-500/30"
                  }`}
                >
                  <span className="text-primary-foreground font-medium">
                    Página {assessment.page}
                  </span>
                  {assessment.decision === "DEFERIDO" ? (
                    <CheckCircle className="w-5 h-5 text-green-300" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-300" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

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
