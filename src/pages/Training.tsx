import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, XCircle, ImageOff } from "lucide-react";
import { useAssessment } from "@/contexts/AssessmentContext";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { getImageByPage } from "@/data/images";

const Training = () => {
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const { addAssessment } = useAssessment();
  const currentPage = parseInt(page || "1");
  const totalPages = 30;
  const progress = (currentPage / totalPages) * 100;
  const startTimeRef = useRef<number>(Date.now());
  const [timerKey, setTimerKey] = useState(0);
  const [imageError, setImageError] = useState(false);
  const currentImage = getImageByPage(currentPage);

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

  // Redirect invalid pages and reset timer
  useEffect(() => {
    if (currentPage < 1 || currentPage > totalPages) {
      navigate("/");
    }
    startTimeRef.current = Date.now();
    setTimerKey((prev) => prev + 1);
    setImageError(false);
  }, [currentPage, navigate]);

  const handleDecision = (decision: "DEFERIDO" | "INDEFERIDO" | "NÃO_RESPONDIDO") => {
    addAssessment(currentPage, decision, startTimeRef.current);
    if (currentPage < totalPages) {
      navigate(`/training/${currentPage + 1}`);
    } else {
      navigate("/results");
    }
  };

  const handleTimeComplete = () => {
    handleDecision("NÃO_RESPONDIDO");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Progress */}
      <div className="border-b border-border bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-5 h-5 text-primary" />
              <span className="font-medium">Treinamento Fenotípico</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% completo
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8 animate-fade-in">
          {/* Timer Display */}
          <div className="flex justify-center">
            <div className="relative">
              <CountdownCircleTimer
                key={timerKey}
                isPlaying
                duration={60}
                colors={["#10b981", "#f59e0b", "#ef4444"]}
                colorsTime={[60, 30, 0]}
                size={120}
                strokeWidth={8}
                onComplete={handleTimeComplete}
              >
                {({ remainingTime }) => (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground">
                      {remainingTime}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      segundos
                    </div>
                  </div>
                )}
              </CountdownCircleTimer>
            </div>
          </div>

          {/* Image Display Area */}
          <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center relative">
              {currentImage && !imageError ? (
                <img
                  src={currentImage.imageUrl}
                  alt={currentImage.nome}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted-foreground/10 text-muted-foreground">
                    <ImageOff className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">
                      Foto #{currentPage}
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {imageError ? "Erro ao carregar imagem" : "Aguardando upload"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Assessment Instruction */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Avalie a imagem acima
            </h2>
            <p className="text-muted-foreground">
              Escolha uma das opções abaixo para continuar
            </p>
          </div>

          {/* Decision Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Button
              onClick={() => handleDecision("DEFERIDO")}
              size="lg"
              className="h-auto py-8 flex flex-col gap-3 bg-green-600 hover:bg-green-700 text-white shadow-soft"
            >
              <CheckCircle className="w-10 h-10" />
              <span className="text-2xl font-bold">DEFERIDO</span>
              <span className="text-sm opacity-90">Aprovar avaliação</span>
            </Button>

            <Button
              onClick={() => handleDecision("INDEFERIDO")}
              size="lg"
              className="h-auto py-8 flex flex-col gap-3 bg-red-600 hover:bg-red-700 text-white shadow-soft"
            >
              <XCircle className="w-10 h-10" />
              <span className="text-2xl font-bold">INDEFERIDO</span>
              <span className="text-sm opacity-90">Rejeitar avaliação</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
