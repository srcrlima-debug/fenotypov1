import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { Button } from "@/components/ui/button";
import { useAssessment } from "@/contexts/AssessmentContext";
import { getImageByPage } from "@/data/images";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Header } from "@/components/Header";
import { LiveStats } from "@/components/LiveStats";

const Training = () => {
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const { addAssessment, assessments } = useAssessment();
  const currentPage = parseInt(page || "1");
  const totalPages = 30;
  const progress = (currentPage / totalPages) * 100;
  const image = getImageByPage(currentPage);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const startTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (currentPage < 1 || currentPage > totalPages) {
      navigate("/");
    }
    startTimeRef.current = new Date();
    setImageError(false);
    setShowTimeWarning(false);
  }, [currentPage, navigate, totalPages]);

  const handleDecision = async (decision: "DEFERIDO" | "INDEFERIDO" | "NÃO_RESPONDIDO") => {
    if (!startTimeRef.current || isLoading) return;

    setIsLoading(true);
    const endTime = new Date();
    const tempoGasto = Math.floor(
      (endTime.getTime() - startTimeRef.current.getTime())
    );

    addAssessment(currentPage, decision, tempoGasto);

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    if (currentPage < totalPages) {
      navigate(`/training/${currentPage + 1}`);
    } else {
      navigate("/results");
    }
    
    setIsLoading(false);
  };

  const handleTimeComplete = () => {
    handleDecision("NÃO_RESPONDIDO");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isZoomed || showExitDialog || isLoading) return;
      
      if (e.key.toLowerCase() === 'd') {
        handleDecision("DEFERIDO");
      } else if (e.key.toLowerCase() === 'i') {
        handleDecision("INDEFERIDO");
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isZoomed, showExitDialog, isLoading, currentPage]);

  // Prevent back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setShowExitDialog(true);
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleExitConfirm = () => {
    setShowExitDialog(false);
    navigate("/");
  };

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-6xl space-y-6 animate-fade-in">
          
          {/* Live Stats - visible after completing at least one assessment */}
          {assessments.length > 0 && (
            <LiveStats 
              assessments={assessments}
              currentPage={currentPage}
              totalPages={totalPages}
            />
          )}

          <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Treinamento de Avaliação</h1>
            <p className="text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso: ${progress}% completo`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Atalhos: <kbd className="px-2 py-1 bg-muted rounded text-xs">D</kbd> = Deferido, <kbd className="px-2 py-1 bg-muted rounded text-xs">I</kbd> = Indeferido
            </p>
          </div>

          <div className="flex justify-center">
            <CountdownCircleTimer
              key={currentPage}
              isPlaying
              duration={30}
              colors={["#10b981", "#f59e0b", "#ef4444"]}
              colorsTime={[30, 10, 0]}
              size={120}
              strokeWidth={8}
              onComplete={handleTimeComplete}
              onUpdate={(remainingTime) => {
                if (remainingTime === 10 && !showTimeWarning) {
                  setShowTimeWarning(true);
                }
              }}
            >
              {({ remainingTime }) => (
                <div className="text-center" role="timer" aria-live="polite" aria-atomic="true">
                  <div className={`text-3xl font-bold transition-colors ${remainingTime <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
                    {remainingTime}
                  </div>
                  <div className="text-sm text-muted-foreground">segundos</div>
                </div>
              )}
            </CountdownCircleTimer>
          </div>

          {showTimeWarning && (
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Tempo acabando!</span>
            </div>
          )}

          <div className="bg-card rounded-lg shadow-lg p-6 space-y-4">
            {imageError ? (
              <div className="flex flex-col items-center justify-center h-96 text-muted-foreground" role="alert">
                <p className="text-lg">Erro ao carregar a imagem</p>
                <p className="text-sm">Foto {currentPage}</p>
              </div>
            ) : (
              <div className="relative group">
                <img
                  src={image?.imageUrl}
                  alt={`Imagem de avaliação número ${currentPage} de ${totalPages}`}
                  className="w-full h-auto rounded-lg object-contain max-h-96 cursor-zoom-in transition-transform hover:scale-[1.02]"
                  onClick={() => setIsZoomed(true)}
                  onError={() => setImageError(true)}
                  loading="eager"
                />
                <button
                  onClick={() => setIsZoomed(true)}
                  className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                  aria-label="Ampliar imagem para visualização detalhada"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                variant="default"
                onClick={() => handleDecision("DEFERIDO")}
                disabled={isLoading}
                className="h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 active:scale-95 transition-transform"
                aria-label="Marcar como deferido (tecla D)"
              >
                <CheckCircle className="mr-2 h-6 w-6" />
                DEFERIDO
                <kbd className="ml-2 px-2 py-1 bg-green-700/50 rounded text-xs hidden sm:inline">D</kbd>
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleDecision("INDEFERIDO")}
                disabled={isLoading}
                className="h-16 text-lg font-semibold active:scale-95 transition-transform"
                aria-label="Marcar como indeferido (tecla I)"
              >
                <XCircle className="mr-2 h-6 w-6" />
                INDEFERIDO
                <kbd className="ml-2 px-2 py-1 bg-red-700/50 rounded text-xs hidden sm:inline">I</kbd>
              </Button>
            </div>
          </div>
          </div>
        </div>
      </div>

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-7xl w-full p-0" aria-describedby="zoom-description">
          <p id="zoom-description" className="sr-only">
            Visualização ampliada da imagem de avaliação
          </p>
          <img
            src={image?.imageUrl}
            alt={`Visualização ampliada: ${image?.nome || `Imagem ${currentPage}`}`}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja sair do treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se você sair agora, seu progresso será perdido e você precisará começar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Treinamento</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitConfirm}>
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Training;
