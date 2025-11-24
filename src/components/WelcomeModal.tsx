import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Keyboard, BarChart3, Monitor, Link as LinkIcon } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onAccept: () => void;
}

export const WelcomeModal = ({ open, onAccept }: WelcomeModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            🎯 Bem-vindo ao Treinamento FENOTYPO
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-2">REGRAS IMPORTANTES</h3>
                <p className="text-sm text-muted-foreground">
                  Leia atentamente antes de começar
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Regra 1 */}
            <div className="flex gap-4 p-4 bg-card rounded-lg border">
              <LinkIcon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold mb-2">1. ACESSO EXCLUSIVO VIA LINK</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Só é possível acessar através do link de convite</li>
                  <li>• Link criado pelo Prof. Cristhian para cada sessão</li>
                  <li>• Não é possível acessar diretamente pela página inicial</li>
                </ul>
              </div>
            </div>

            {/* Regra 2 */}
            <div className="flex gap-4 p-4 bg-card rounded-lg border">
              <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold mb-2">2. TEMPO LIMITADO</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Cada imagem tem cronômetro</li>
                  <li>• Últimos 10 segundos: alerta vermelho</li>
                  <li>• Sem resposta = "Não Respondido"</li>
                </ul>
              </div>
            </div>

            {/* Regra 3 */}
            <div className="flex gap-4 p-4 bg-card rounded-lg border">
              <Keyboard className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold mb-2">3. ATALHOS DE TECLADO</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Pressione <kbd className="px-2 py-1 bg-muted rounded border">D</kbd> = Deferido</li>
                  <li>• Pressione <kbd className="px-2 py-1 bg-muted rounded border">I</kbd> = Indeferido</li>
                </ul>
              </div>
            </div>

            {/* Regra 4 */}
            <div className="flex gap-4 p-4 bg-card rounded-lg border">
              <BarChart3 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold mb-2">4. TOTAL DE AVALIAÇÕES</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• 30 imagens para avaliar</li>
                  <li>• Todos veem a mesma imagem simultaneamente</li>
                </ul>
              </div>
            </div>

            {/* Regra 5 */}
            <div className="flex gap-4 p-4 bg-card rounded-lg border">
              <Monitor className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h4 className="font-bold mb-2">5. DISPOSITIVOS RECOMENDADOS</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Computador, notebook ou tablet</li>
                  <li>• ⚠️ Evite telefones móveis</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={onAccept}
              className="w-full h-12 text-lg"
              size="lg"
            >
              Entendi e Aceito as Regras
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
