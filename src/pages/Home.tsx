import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { HelpCircle } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Bem-vindo!</h1>
            <p className="text-muted-foreground">
              Escolha uma opção para começar seu treinamento
            </p>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg"
              onClick={() => navigate("/como-funciona")}
            >
              <HelpCircle className="mr-2 h-5 w-5" />
              Como Funciona
            </Button>

            <Button
              size="lg"
              className="w-full h-14 text-lg"
              onClick={() => navigate("/training/1")}
            >
              Iniciar Treinamento
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full h-14 text-lg"
              onClick={() => navigate("/admin")}
            >
              Área Administrativa
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
