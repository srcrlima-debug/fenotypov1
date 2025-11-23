import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpenText, LayoutDashboard, UserPlus, LogIn } from "lucide-react";
import logoVertical from "@/assets/logo-fenotypo-vert-2.png";
import fistIcon from "@/assets/fist-icon.png";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref: descRef, isVisible: descVisible } = useScrollReveal();
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollReveal();
  const { ref: featuresRef, isVisible: featuresVisible } = useScrollReveal();

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#f5f1eb] page-transition">
        <div className="max-w-3xl w-full text-center space-y-4">
          
          {/* Logo */}
          <div className="mb-4 animate-fade-slide-up">
            <img 
              src={logoVertical} 
              alt="Fenotypo" 
              className="h-48 mx-auto animate-float-gentle"
            />
          </div>
          
          {/* Description */}
          <div 
            ref={descRef}
            className={`space-y-3 px-4 scroll-reveal ${descVisible ? 'revealed' : ''}`}
          >
            <p className="text-lg text-[#5a4a42] leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold">FENOTYPO</span> é uma aplicação web desenvolvida pelo Prof. Dr. Cristhian Lima, doutor 
              em Ciências Sociais, para treinar pessoas que irão atuar em bancas de confirmação 
              fenotípica para acesso por meio de ações afirmativas.
            </p>
            
            <div className="card-3d bg-[#a0755f]/10 border-2 border-[#a0755f] rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-base text-[#5a4a42] font-medium">
                💬 Os links de acesso ao treinamento serão enviados pelo chat quando o administrador iniciar a sessão.
              </p>
            </div>
          </div>

          {/* Main CTA Buttons */}
          <div 
            ref={ctaRef}
            className={`pt-3 scroll-reveal ${ctaVisible ? 'revealed' : ''}`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
              <Button
                onClick={() => navigate("/como-funciona")}
                size="lg"
                className="button-3d h-20 w-full sm:flex-1 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-2xl rounded-xl border-4 border-green-700 transition-all duration-300 group"
              >
                <BookOpenText className="inline-block mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                Como Funciona
              </Button>
              {user && (
                <Button
                  onClick={() => navigate("/admin")}
                  size="lg"
                  className="button-3d h-20 w-full sm:flex-1 text-xl font-bold bg-gradient-to-r from-[#5a4a42] to-[#4a3a32] hover:from-[#4a3a32] hover:to-[#3a2a22] text-white shadow-2xl rounded-xl border-4 border-[#5a4a42] transition-all duration-300 group"
                >
                  <LayoutDashboard className="inline-block mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  Acessar Dashboard
                </Button>
              )}
            </div>
          </div>

          {/* Login/Register Buttons for Non-Authenticated Users */}
          {!user && (
            <div 
              className={`pt-4 space-y-3 scroll-reveal ${ctaVisible ? 'revealed' : ''}`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate("/registro")}
                  size="lg"
                  className="h-14 px-12 text-lg font-semibold bg-gradient-to-r from-[#a0755f] to-[#8a6350] hover:from-[#8a6350] hover:to-[#75533f] text-white shadow-xl rounded-lg w-full sm:w-auto transition-all duration-300 group"
                >
                  <UserPlus className="inline-block mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12" />
                  Cadastre-se
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  size="lg"
                  className="h-14 px-12 text-lg font-semibold bg-gradient-to-r from-[#c9a588] to-[#b8936f] hover:from-[#b8936f] hover:to-[#a77d5e] text-white shadow-xl rounded-lg w-full sm:w-auto transition-all duration-300 group"
                >
                  <LogIn className="inline-block mr-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  Entrar
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                (se já cadastrado, clique em Entrar)
              </p>
            </div>
          )}

          {/* Features */}
          <div 
            ref={featuresRef}
            className={`pt-4 flex items-center justify-center gap-12 text-[#5a4a42] flex-wrap scroll-reveal ${featuresVisible ? 'revealed' : ''}`}
          >
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
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2 text-base font-bold text-muted-foreground">
              <span>Feito pelo Prof. Cristhian Lima - 2025</span>
              <img 
                src={fistIcon} 
                alt="Punho cerrado" 
                className="h-16 w-16 inline-block animate-bounce-slow"
                style={{ animationDuration: '1.5s' }}
              />
              <span>Compromisso com a Educação Antirracista</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>©</span>
              <span>Todos os direitos protegidos</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;
