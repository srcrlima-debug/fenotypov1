import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home, CheckCircle, XCircle, Clock, Timer, AlertCircle } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { Card } from "@/components/ui/card";

const Results = () => {
  const navigate = useNavigate();
  const { assessments, getStats } = useAssessment();
  const stats = getStats();

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-primary-foreground mb-6">
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Clock className="w-8 h-8" />
                <div className="text-4xl font-bold">{formatTime(stats.averageTime)}</div>
              </div>
              <div className="text-sm opacity-80">Tempo Médio</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Timer className="w-8 h-8" />
                <div className="text-4xl font-bold">{formatTime(stats.totalTime)}</div>
              </div>
              <div className="text-sm opacity-80">Tempo Total</div>
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
                      : assessment.decision === "INDEFERIDO"
                      ? "bg-red-600/20 border border-red-500/30"
                      : "bg-gray-600/20 border border-gray-500/30"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-primary-foreground font-medium">
                      Página {assessment.page}
                    </span>
                    <span className="text-xs text-primary-foreground/70">
                      {formatTime(assessment.timeSpent)}
                    </span>
                  </div>
                  {assessment.decision === "DEFERIDO" ? (
                    <CheckCircle className="w-5 h-5 text-green-300" />
                  ) : assessment.decision === "INDEFERIDO" ? (
                    <XCircle className="w-5 h-5 text-red-300" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-blue-500/40 mb-6">
          <div className="flex items-start gap-3 text-primary-foreground">
            <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="font-semibold mb-2">Acesso Controlado</h4>
              <p className="text-sm opacity-90">
                O treinamento só pode ser realizado mediante convite por link enviado pelo administrador. 
                Para participar de uma nova sessão, aguarde o convite do Prof. Cristhian Lima.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-center">
          <Button
            onClick={handleHome}
            size="lg"
            variant="secondary"
            className="px-12 py-6 h-auto text-lg font-semibold"
          >
            <Home className="mr-2 h-5 w-5" />
            Voltar à Página Inicial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Results;
