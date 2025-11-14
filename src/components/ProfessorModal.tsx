import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import profPhoto from "@/assets/prof-cristhian-lima.jpg";
import { Globe, Instagram, Youtube, FileText } from "lucide-react";

interface ProfessorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfessorModal = ({ open, onOpenChange }: ProfessorModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-[#a0755f]">Sobre o Professor</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={profPhoto} 
                alt="Prof. Dr. Cristhian Lima" 
                className="rounded-xl shadow-xl w-full max-w-md object-cover"
              />
              {/* Social Icons Overlay - Always visible with subtle floating animation */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl" style={{ perspective: '1000px' }}>
                <div className="flex justify-center gap-4">
                  <a 
                    href="https://profcristhianlima.lovable.app" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full hover:scale-110 transition-all duration-500 animate-float-gentle"
                    style={{ 
                      animationDelay: '0s',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                      transform: 'translateZ(30px) rotateX(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                    aria-label="Site pessoal"
                  >
                    <Globe className="w-6 h-6 text-white drop-shadow-lg" />
                  </a>
                  <a 
                    href="https://www.instagram.com/srcrlima/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-full hover:scale-110 transition-all duration-500 animate-float-gentle"
                    style={{ 
                      animationDelay: '0.5s',
                      boxShadow: '0 10px 25px rgba(236, 72, 153, 0.5), 0 0 30px rgba(236, 72, 153, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                      transform: 'translateZ(30px) rotateX(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                    aria-label="Instagram"
                  >
                    <Instagram className="w-6 h-6 text-white drop-shadow-lg" />
                  </a>
                  <a 
                    href="https://www.youtube.com/@sociologandocursos" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gradient-to-br from-red-500 to-red-700 rounded-full hover:scale-110 transition-all duration-500 animate-float-gentle"
                    style={{ 
                      animationDelay: '1s',
                      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.5), 0 0 30px rgba(239, 68, 68, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                      transform: 'translateZ(30px) rotateX(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                    aria-label="YouTube"
                  >
                    <Youtube className="w-6 h-6 text-white drop-shadow-lg" />
                  </a>
                  <a 
                    href="http://lattes.cnpq.br/1542213940535701" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full hover:scale-110 transition-all duration-500 animate-float-gentle"
                    style={{ 
                      animationDelay: '1.5s',
                      boxShadow: '0 10px 25px rgba(250, 204, 21, 0.5), 0 0 30px rgba(250, 204, 21, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)',
                      transform: 'translateZ(30px) rotateX(5deg)',
                      transformStyle: 'preserve-3d'
                    }}
                    aria-label="Currículo Lattes"
                  >
                    <FileText className="w-6 h-6 text-white drop-shadow-lg" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Biography */}
          <div className="space-y-4 text-[#5a4a42]">
            <h2 className="text-2xl font-bold text-[#a0755f]">Prof. Dr. Cristhian Lima</h2>
            <p className="text-base leading-relaxed">
              Há três décadas caminhando pelos corredores da educação brasileira — das salas de aula da educação básica aos cursos de pós-graduação — o Prof. Cristhian Lima constrói pontes entre a teoria social e as urgências do nosso tempo. Doutor em Ciências Sociais pela UFRRJ, dedica sua pesquisa às cartografias invisíveis: territórios sagrados afro-brasileiros, segregações urbanas, saberes e práticas que resistem pelas brechas e insterstícios.
            </p>
            <p className="text-base leading-relaxed">
              Como ex-coordenador do NEABI no IF Goiano e pesquisador das relações étnico-raciais, desenvolveu um olhar atento aos processos de heteroidentificação — espaços delicados onde política pública encontra histórias pessoais, onde critérios técnicos dialogam com memórias ancestrais. Sua atuação nasce da escuta: compreender os fenótipos que o racismo brasileiro marca, honrar as vidas e corpos que as cotas buscam reparar.
            </p>
            
            <div className="space-y-2 pt-4">
              <p className="text-sm font-semibold">📍 Professor efetivo do IF Goiano, Campus Urutaí</p>
            </div>
            
            <p className="text-lg font-semibold italic pt-4 text-[#a0755f]">
              "O Corpo sabe, o que o livro não diz."
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
