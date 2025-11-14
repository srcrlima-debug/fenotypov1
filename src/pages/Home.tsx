import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { ArrowRight } from "lucide-react";
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
          <div className="space-y-4 px-4">
            <p className="text-lg text-[#5a4a42] dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold">FENOTYPO</span> é uma aplicação web desenvolvida pelo Prof. Dr. Cristhian Lima, doutor 
              em Ciências Sociais, para treinar pessoas que irão atuar em bancas de confirmação 
              fenotípica para acesso por meio de ações afirmativas.
            </p>
          </div>

          {/* Main CTA Button */}
          <div className="pt-4">
            <Button
              onClick={() => navigate("/training/1")}
              size="lg"
              className="h-16 px-12 text-lg font-semibold bg-[#a0755f] hover:bg-[#8a6350] dark:bg-[#a0755f] dark:hover:bg-[#8a6350] text-white shadow-lg transition-all hover:scale-105 rounded-xl"
            >
              Iniciar Treinamento
              <ArrowRight className="ml-2 h-5 w-5" />
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

          {/* Secondary Actions */}
          <div className="pt-6 flex gap-4 justify-center flex-wrap">
            <Button
              onClick={() => navigate("/como-funciona")}
              variant="outline"
              size="lg"
              className="border-[#a0755f] text-[#a0755f] hover:bg-[#a0755f] hover:text-white dark:border-[#c09977] dark:text-[#c09977] dark:hover:bg-[#c09977] dark:hover:text-gray-900"
            >
              Como Funciona
            </Button>
            <Button
              onClick={() => navigate("/admin")}
              variant="outline"
              size="lg"
              className="border-[#a0755f] text-[#a0755f] hover:bg-[#a0755f] hover:text-white dark:border-[#c09977] dark:text-[#c09977] dark:hover:bg-[#c09977] dark:hover:text-gray-900"
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
