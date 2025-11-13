import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoVertical from "@/assets/logo-fenotypo-vert.png";

const Home = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();

  const handleStart = () => {
    navigate("/training/1");
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Logout realizado',
        description: 'Até logo!',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        {user && (
          <div className="absolute top-6 right-6 flex gap-2">
            {isAdmin && (
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                size="sm"
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        )}

        <div className="mb-8">
          <img src={logoVertical} alt="Fenotypo" className="h-56 mx-auto" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Treinamento de Avaliação Fenotípica
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Desenvolva suas habilidades através de um programa estruturado de 30 páginas
          </p>
        </div>

        <div className="pt-4 space-y-4">
          {!loading && !user ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">Faça login para iniciar o treinamento</p>
              <div className="flex gap-3 justify-center">
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Login
                  </Button>
                </Link>
                <Link to="/registro">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-soft">
                    Criar Conta
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-soft text-lg px-8 py-6 h-auto"
              disabled={loading}
            >
              Iniciar Treinamento
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
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
