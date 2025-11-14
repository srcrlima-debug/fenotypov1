import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useAuth } from "@/contexts/AuthContext";
import logoVertical from "@/assets/logo-fenotypo-vert-2.png";
import fistIcon from "@/assets/fist-icon.png";
import profPhoto from "@/assets/prof-cristhian-lima.jpg";

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
              className="button-3d h-20 px-16 text-xl font-bold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-2xl rounded-xl border-4 border-green-700 transition-all duration-300"
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
                  className="h-14 px-12 text-lg font-semibold bg-gradient-to-r from-[#a0755f] to-[#8a6350] hover:from-[#8a6350] hover:to-[#75533f] text-white shadow-xl rounded-lg w-full sm:w-auto transition-all duration-300"
                >
                  📝 Cadastre-se
                </Button>
                <Button
                  onClick={() => navigate("/login")}
                  size="lg"
                  className="h-14 px-12 text-lg font-semibold bg-gradient-to-r from-[#c9a588] to-[#b8936f] hover:from-[#b8936f] hover:to-[#a77d5e] text-white shadow-xl rounded-lg w-full sm:w-auto transition-all duration-300"
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

        {/* Sobre o Professor Section */}
        <div className="max-w-6xl w-full mt-24 px-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border-4 border-[#a0755f]">
            <div className="grid md:grid-cols-2 gap-8 items-center p-8">
              {/* Photo */}
              <div className="flex justify-center">
                <div className="relative">
                  <img 
                    src={profPhoto} 
                    alt="Prof. Dr. Cristhian Lima" 
                    className="rounded-xl shadow-xl w-full max-w-md object-cover"
                  />
                </div>
              </div>
              
              {/* Biography */}
              <div className="space-y-4 text-[#5a4a42]">
                <h2 className="text-3xl font-bold text-[#a0755f] mb-4">Prof. Dr. Cristhian Lima</h2>
                <p className="text-base leading-relaxed">
                  Há três décadas caminhando pelos corredores da educação brasileira — da sala de aula básica aos seminários de pós-graduação — o Prof. Cristhian Lima constrói pontes entre a teoria social e as urgências do nosso tempo. Doutor em Ciências Sociais pela UFRRJ, dedica sua pesquisa às cartografias invisíveis: territórios sagrados afro-brasileiros, segregações urbanas, saberes que resistem nas margens.
                </p>
                <p className="text-base leading-relaxed">
                  Como ex-coordenador do NEABI no IF Goiano e pesquisador das relações raciais, desenvolveu olhar atento às bancas de heteroidentificação — espaços delicados onde política pública encontra histórias pessoais, onde critérios técnicos dialogam com memórias ancestrais. Sua atuação nasce da escuta: compreender os fenótipos que o racismo brasileiro marca, honrar as trajetórias que as cotas buscam reparar.
                </p>
                
                <div className="space-y-2 pt-4">
                  <p className="text-sm font-semibold">📍 Professor efetivo do IF Goiano, Campus Urutaí</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <a href="https://profcristhianlima.lovable.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#a0755f] transition-colors">🌐 Site</a>
                    <a href="https://instagram.com/srcrlima" target="_blank" rel="noopener noreferrer" className="hover:text-[#a0755f] transition-colors">📱 Instagram</a>
                    <a href="https://youtube.com/@sociologandocursos" target="_blank" rel="noopener noreferrer" className="hover:text-[#a0755f] transition-colors">🎥 YouTube</a>
                    <a href="http://lattes.cnpq.br/1542213940535701" target="_blank" rel="noopener noreferrer" className="hover:text-[#a0755f] transition-colors">📄 Lattes</a>
                  </div>
                </div>
                
                <p className="text-lg font-semibold italic pt-4 text-[#a0755f]">
                  "O Corpo sabe, o que o livro não diz."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2 text-base font-bold text-muted-foreground">
              <span>Feito pelo Prof. Cristhian Lima</span>
              <img 
                src={fistIcon} 
                alt="Punho cerrado" 
                className="h-16 w-16 inline-block animate-bounce-slow"
                style={{ animationDuration: '1.5s' }}
              />
              <span>Compromisso Antirracista 2025</span>
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
