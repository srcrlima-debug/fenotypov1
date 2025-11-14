import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuth } from "@/contexts/AuthContext";
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
        <div className="max-w-3xl w-full text-center space-y-8">
          
          {/* Logo */}
          <div className="mb-8 animate-fade-slide-up">
            <img 
              src={logoVertical} 
              alt="Fenotypo" 
              className="h-48 mx-auto animate-float-gentle"
            />
          </div>
          
          {/* Description */}
          <div 
            ref={descRef}
            className={`space-y-6 px-4 scroll-reveal ${descVisible ? 'revealed' : ''}`}
          >
            <p className="text-lg text-[#5a4a42] leading-relaxed max-w-2xl mx-auto">
              <span className="font-bold">FENOTYPO</span> é uma aplicação web desenvolvida pelo Prof. Dr. Cristhian Lima, doutor 
              em Ciências Sociais, para treinar pessoas que irão atuar em bancas de confirmação 
              fenotípica para acesso por meio de ações afirmativas.
            </p>
            
            <div className="card-3d bg-[#a0755f]/10 border-2 border-[#a0755f] rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-base text-[#5a4a42] font-medium">
                📧 Os links de acesso ao treinamento serão enviados por e-mail quando o administrador iniciar a sessão.
              </p>
            </div>
          </div>

          {/* Main CTA Button */}
          <div 
            ref={ctaRef}
            className={`pt-6 scroll-reveal ${ctaVisible ? 'revealed' : ''}`}
          >
            <Button
              onClick={() => navigate("/como-funciona")}
              size="lg"
              className="button-3d h-20 px-16 text-xl font-bold bg-[#a0755f] hover:bg-[#8a6350] text-white shadow-2xl rounded-xl border-4 border-[#8a6350]"
            >
              📖 Como Funciona
            </Button>
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
                  className="h-14 px-12 text-lg font-semibold bg-[#a0755f] hover:bg-[#8a6350] text-white shadow-xl rounded-lg w-full sm:w-auto"
                >
                  📝 Cadastre-se
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  size="lg"
                  variant="outline"
                  className="h-14 px-12 text-lg font-semibold border-2 border-[#5a4a42] text-[#5a4a42] hover:bg-[#5a4a42]/10 shadow-xl rounded-lg w-full sm:w-auto"
                >
                  🔐 Entrar
                </Button>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                (se já cadastrado, clique em Entrar)
              </p>
            </div>
          )}

          {/* Dashboard Link for Authenticated Users */}
          {user && (
            <div 
              className={`pt-4 scroll-reveal ${ctaVisible ? 'revealed' : ''}`}
            >
              <Button
                onClick={() => navigate("/admin")}
                size="lg"
                className="h-14 px-12 text-lg font-semibold bg-[#5a4a42] hover:bg-[#4a3a32] text-white shadow-xl rounded-lg"
              >
                📊 Acessar Dashboard
              </Button>
            </div>
          )}

          {/* Features */}
          <div 
            ref={featuresRef}
            className={`pt-8 flex items-center justify-center gap-12 text-[#5a4a42] flex-wrap scroll-reveal ${featuresVisible ? 'revealed' : ''}`}
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
          <p className="text-base font-bold text-muted-foreground flex items-center justify-center gap-3">
            Feito em 2025 
            <img 
              src={fistIcon} 
              alt="Punho cerrado" 
              className="h-16 w-16 inline-block animate-bounce-slow"
              style={{ animationDuration: '1.5s' }}
            />
            Educadores Antirracistas
          </p>
        </footer>
      </div>
    </>
  );
};

export default Home;
