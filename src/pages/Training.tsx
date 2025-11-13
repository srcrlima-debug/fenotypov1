import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, BookOpen } from "lucide-react";

const Training = () => {
  const { page } = useParams<{ page: string }>();
  const navigate = useNavigate();
  const currentPage = parseInt(page || "1");
  const totalPages = 30;
  const progress = (currentPage / totalPages) * 100;

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

  // Redirect invalid pages
  useEffect(() => {
    if (currentPage < 1 || currentPage > totalPages) {
      navigate("/");
    }
  }, [currentPage, navigate]);

  const handleNext = () => {
    if (currentPage < totalPages) {
      navigate(`/training/${currentPage + 1}`);
    } else {
      navigate("/results");
    }
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
        <div className="max-w-3xl w-full space-y-8 animate-fade-in">
          <div className="bg-card rounded-xl border border-border p-12 shadow-soft">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary text-primary-foreground text-2xl font-bold shadow-soft">
                {currentPage}
              </div>
              
              <h1 className="text-4xl font-bold text-foreground">
                Página {currentPage}
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Este é o conteúdo da página {currentPage} do treinamento de avaliação fenotípica.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleNext}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-soft px-8 py-6 h-auto text-lg"
            >
              {currentPage < totalPages ? "Próxima Página" : "Ver Resultados"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Training;
