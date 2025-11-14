import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import profPhoto from "@/assets/prof-cristhian-lima.jpg";

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
            </div>
          </div>
          
          {/* Biography */}
          <div className="space-y-4 text-[#5a4a42]">
            <h2 className="text-2xl font-bold text-[#a0755f]">Prof. Dr. Cristhian Lima</h2>
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
      </DialogContent>
    </Dialog>
  );
};
