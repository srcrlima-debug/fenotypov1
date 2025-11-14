import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Header } from "@/components/Header";
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
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#f5f1eb] dark:bg-gradient-to-b dark:from-[#3d2817] dark:to-[#2a1810]">
        <div className="max-w-3xl w-full text-center space-y-8 animate-fade-in">
          
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logoVertical} 
              alt="Fenotypo" 
              className="h-48 mx-auto dark:brightness-150 dark:contrast-125 transition-all"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-6 px-4">
            <p className="text-lg text-[#5a4a42] dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold">FENOTYPO</span> é uma aplicação web desenvolvida pelo Prof. Dr. Cristhian Lima, doutor 
              em Ciências Sociais, para treinar pessoas que irão atuar em bancas de confirmação 
              fenotípica para acesso por meio de ações afirmativas.
            </p>
            
            <div className="bg-[#a0755f]/10 dark:bg-[#a0755f]/20 border-2 border-[#a0755f] dark:border-[#c09977] rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-base text-[#5a4a42] dark:text-gray-300 font-medium">
                📧 Os links de acesso ao treinamento serão enviados por e-mail quando o administrador iniciar a sessão.
              </p>
            </div>
          </div>

          {/* Main CTA Button */}
          <div className="pt-6">
            <Button
              onClick={() => navigate("/como-funciona")}
              size="lg"
              className="h-20 px-16 text-xl font-bold bg-[#a0755f] hover:bg-[#8a6350] dark:bg-[#a0755f] dark:hover:bg-[#8a6350] text-white shadow-2xl transition-all hover:scale-105 rounded-xl border-4 border-[#8a6350] dark:border-[#c09977]"
            >
              📖 Como Funciona
            </Button>
          </div>

          {/* Features */}
          <div className="pt-8 flex items-center justify-center gap-12 text-[#5a4a42] dark:text-gray-300 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f] dark:bg-[#c09977]" />
              <span className="text-base">30 Páginas</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f] dark:bg-[#c09977]" />
              <span className="text-base">Navegação Sequencial</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#a0755f] dark:bg-[#c09977]" />
              <span className="text-base">Certificado Final</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
