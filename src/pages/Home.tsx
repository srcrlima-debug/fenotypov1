import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Handshake } from "lucide-react";
import logoVertical from "@/assets/logo-fenotypo-vert-2.png";

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
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#f5f1eb]">
        <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
          
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logoVertical} 
              alt="Fenotypo" 
              className="h-48 mx-auto animate-float-gentle"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-6 px-4">
            <p className="text-lg text-[#5a4a42] leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold">FENOTYPO</span> é uma aplicação web desenvolvida pelo Prof. Dr. Cristhian Lima, doutor 
              em Ciências Sociais, para treinar pessoas que irão atuar em bancas de confirmação 
              fenotípica para acesso por meio de ações afirmativas.
            </p>
            
            <div className="bg-[#a0755f]/10 border-2 border-[#a0755f] rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-base text-[#5a4a42] font-medium">
                📧 Os links de acesso ao treinamento serão enviados por e-mail quando o administrador iniciar a sessão.
              </p>
            </div>
          </div>

          {/* Main CTA Button */}
          <div className="pt-6">
            <Button
              onClick={() => navigate("/como-funciona")}
              size="lg"
              className="h-20 px-16 text-xl font-bold bg-[#a0755f] hover:bg-[#8a6350] text-white shadow-2xl transition-all hover:scale-105 rounded-xl border-4 border-[#8a6350]"
            >
              📖 Como Funciona
            </Button>
          </div>

          {/* Features */}
          <div className="pt-8 flex items-center justify-center gap-12 text-[#5a4a42] flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f]" />
              <span className="text-base">30 Páginas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f]" />
              <span className="text-base">Navegação Sequencial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f]" />
              <span className="text-base">Certificado Final</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            Feito em 2025 <Handshake className="h-4 w-4" /> Educadores Antirracistas
          </p>
        </footer>
      </div>
    </>
  );
};

export default Home;
