import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Timer, Image, Keyboard, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCardTilt } from "@/hooks/useCardTilt";

const ComoFunciona = () => {
  const navigate = useNavigate();
  const { ref: card1Ref, isVisible: card1Visible } = useScrollReveal();
  const { ref: card2Ref, isVisible: card2Visible } = useScrollReveal();
  const { ref: card3Ref, isVisible: card3Visible } = useScrollReveal();
  const { ref: card4Ref, isVisible: card4Visible } = useScrollReveal();
  const { ref: card5Ref, isVisible: card5Visible } = useScrollReveal();
  
  const tilt1 = useCardTilt();
  const tilt2 = useCardTilt();
  const tilt3 = useCardTilt();
  const tilt4 = useCardTilt();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container max-w-4xl py-8 px-4 page-transition">
        <div className="text-center mb-8 animate-fade-slide-up">
          <h1 className="text-4xl font-bold mb-4">Como Funciona o Treinamento</h1>
          <p className="text-lg text-muted-foreground">
            Entenda como realizar a avaliação das imagens de forma rápida e eficiente
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <div ref={card1Ref} className={`scroll-reveal ${card1Visible ? 'revealed' : ''}`}>
            <Card ref={tilt1} className="card-3d-tilt">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Visualização das Imagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Você verá uma série de imagens, uma de cada vez. Para cada imagem, você terá um tempo
                limitado para fazer sua avaliação.
              </p>
            </CardContent>
          </Card>
          </div>

          <div ref={card2Ref} className={`scroll-reveal ${card2Visible ? 'revealed' : ''}`}>
          <Card ref={tilt2} className="card-3d-tilt">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                Tempo de Resposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Cada imagem tem um cronômetro. Quando o tempo acabar, a resposta será automaticamente
                registrada como "Não Respondido".
              </p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  <strong>Atenção:</strong> Nos últimos 10 segundos, o cronômetro ficará vermelho
                  para alertá-lo sobre o tempo restante.
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={card3Ref} className={`scroll-reveal ${card3Visible ? 'revealed' : ''}`}>
          <Card ref={tilt3} className="card-3d-tilt">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Como Avaliar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Opções de Resposta:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <strong className="text-green-700 dark:text-green-400">DEFERIDO:</strong>
                      <span className="text-muted-foreground">Se a imagem atende aos critérios</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <strong className="text-red-700 dark:text-red-400">INDEFERIDO:</strong>
                      <span className="text-muted-foreground">Se a imagem não atende aos critérios</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={card4Ref} className={`scroll-reveal ${card4Visible ? 'revealed' : ''}`}>
          <Card ref={tilt4} className="card-3d-tilt">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                Atalhos de Teclado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Para agilizar sua avaliação, você pode usar atalhos de teclado:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-background border rounded font-mono text-sm font-semibold">D</kbd>
                  <span className="text-sm">Deferido</span>
                </div>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                  <kbd className="px-3 py-1.5 bg-background border rounded font-mono text-sm font-semibold">I</kbd>
                  <span className="text-sm">Indeferido</span>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>

        <div className="flex justify-center gap-4 animate-fade-slide-up">
          <Button variant="outline" onClick={() => navigate(-1)} size="lg" className="button-3d">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComoFunciona;
