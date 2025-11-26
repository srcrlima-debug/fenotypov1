import { useState, useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
  highlight?: boolean;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao FENOTYPO! 🎉",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades do sistema. Você pode pular a qualquer momento clicando no X ou no botão 'Pular tutorial'.",
    target: "",
    position: "bottom",
  },
  {
    id: "como-funciona",
    title: "📚 Como Funciona",
    description: "Clique aqui para entender todo o processo de avaliação fotográfica, desde o cadastro até a emissão do certificado. É essencial ler antes de participar!",
    target: "[data-tour='como-funciona']",
    position: "bottom",
    highlight: true,
  },
  {
    id: "login",
    title: "🔐 Área do Administrador",
    description: "Professores e administradores podem acessar esta área para gerenciar treinamentos, criar sessões e acompanhar o progresso dos participantes.",
    target: "[data-tour='login']",
    position: "bottom",
    highlight: true,
  },
  {
    id: "features",
    title: "✨ Recursos Principais",
    description: "O FENOTYPO oferece análise de 30 casos reais, navegação sequencial guiada e certificado digital ao final do treinamento.",
    target: "",
    position: "top",
  },
  {
    id: "complete",
    title: "🎊 Pronto para começar!",
    description: "Agora você já conhece as principais funcionalidades. Quando receber o link de acesso ao treinamento, você estará preparado para participar!",
    target: "",
    position: "bottom",
  },
];

interface OnboardingTutorialProps {
  onComplete?: () => void;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("fenotypo-tutorial-completed");
    if (!hasSeenTutorial) {
      // Esperar um pouco para a página carregar completamente
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const updateTooltipPosition = () => {
      const step = tutorialSteps[currentStep];
      
      if (!step.target) {
        // Posição central para o primeiro step
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 3;
        setTooltipPosition({ top: centerY, left: centerX });
        return;
      }

      const targetElement = document.querySelector(step.target);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
      const tooltipWidth = tooltipRef.current?.offsetWidth || 300;

      let top = 0;
      let left = 0;

      switch (step.position) {
        case "top":
          top = rect.top - tooltipHeight - 16;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + 16;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - 16;
          break;
        case "right":
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + 16;
          break;
      }

      // Ajustar para não sair da tela
      top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));
      left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

      setTooltipPosition({ top, left });

      // Adicionar highlight ao elemento
      if (step.highlight) {
        targetElement.classList.add("tutorial-highlight");
        return () => targetElement.classList.remove("tutorial-highlight");
      }
    };

    updateTooltipPosition();
    window.addEventListener("resize", updateTooltipPosition);
    window.addEventListener("scroll", updateTooltipPosition);

    return () => {
      window.removeEventListener("resize", updateTooltipPosition);
      window.removeEventListener("scroll", updateTooltipPosition);
    };
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      
      // Scroll suave para o próximo elemento
      const nextStep = tutorialSteps[currentStep + 1];
      if (nextStep.target) {
        const element = document.querySelector(nextStep.target);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      
      const prevStep = tutorialSteps[currentStep - 1];
      if (prevStep.target) {
        const element = document.querySelector(prevStep.target);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleSkip = () => {
    localStorage.setItem("fenotypo-tutorial-completed", "true");
    setIsActive(false);
    onComplete?.();
  };

  const handleComplete = async () => {
    localStorage.setItem("fenotypo-tutorial-completed", "true");
    setIsActive(false);
    
    // Award tutorial badge
    if (user) {
      try {
        await supabase.functions.invoke('check-badges', {
          body: {
            userId: user.id,
            action: 'complete_tutorial',
          },
        });
      } catch (error) {
        console.error('Error awarding tutorial badge:', error);
      }
    }
    
    onComplete?.();
  };

  if (!isActive) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <>
      {/* Overlay escuro */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-fade-in"
        onClick={handleSkip}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[9999] animate-scale-in"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: step.target ? "translate(-50%, 0)" : "translate(-50%, -50%)",
        }}
      >
        <Card className="w-[90vw] max-w-md shadow-2xl border-primary/20">
          <CardContent className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-primary to-primary/60 flex items-center justify-center shadow-lg animate-float-gentle">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    {step.title}
                  </h3>
                  <Badge variant="secondary" className="mt-1.5 shadow-sm">
                    Passo {currentStep + 1} de {tutorialSteps.length}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSkip}
                className="hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:scale-110"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-base text-muted-foreground leading-relaxed">
              {step.description}
            </p>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso do tutorial</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              >
                Pular tutorial
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    className="hover:scale-105 transition-all duration-300 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="hover:scale-105 transition-all duration-300 shadow-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
                >
                  {currentStep === tutorialSteps.length - 1 ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Finalizar
                    </>
                  ) : (
                    <>
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
