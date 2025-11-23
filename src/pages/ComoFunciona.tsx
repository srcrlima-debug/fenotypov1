import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleCheck, Timer, Image, Keyboard, TriangleAlert, Monitor, UserCheck, KeyRound, Calendar, Link2 } from "lucide-react";
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
  const { ref: card6Ref, isVisible: card6Visible } = useScrollReveal();
  const { ref: card7Ref, isVisible: card7Visible } = useScrollReveal();
  const { ref: card8Ref, isVisible: card8Visible } = useScrollReveal();
  
  const tilt1 = useCardTilt();
  const tilt2 = useCardTilt();
  const tilt3 = useCardTilt();
  const tilt4 = useCardTilt();
  const tilt5 = useCardTilt();
  const tilt6 = useCardTilt();
  const tilt7 = useCardTilt();

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
          {/* Preparação Prévia */}
          <div ref={card1Ref} className={`scroll-reveal ${card1Visible ? 'revealed' : ''}`}>
            <Card ref={tilt1} className="card-3d-tilt bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Monitor className="h-6 w-6" />
                Preparação Prévia - Antes do Treinamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-semibold mb-3">
                Use preferencialmente <strong>computador, notebook ou tablet</strong> para melhor experiência:
              </p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">1</span>
                  <span>Acesse previamente o endereço: <a href="https://fenotypo.lovable.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">https://fenotypo.lovable.app</a></span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">2</span>
                  <span>Clique no botão Cadastre-se e crie seu usuário. Complete seu perfil com todas as informações solicitadas</span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">3</span>
                  <span>Certifique-se de que está funcionando fazendo login com suas credenciais</span>
                </li>
              </ol>
            </CardContent>
          </Card>
          </div>

          <div ref={card2Ref} className={`scroll-reveal ${card2Visible ? 'revealed' : ''}`}>
            <Card ref={tilt2} className="card-3d-tilt bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-2 border-amber-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <KeyRound className="h-6 w-6" />
                Guarde Suas Credenciais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-start gap-3">
                <TriangleAlert className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200 mb-2">Importante!</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    Anote ou salve seu <strong>e-mail e senha cadastrados</strong> em local seguro. Você precisará dessas informações no dia do treinamento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={card3Ref} className={`scroll-reveal ${card3Visible ? 'revealed' : ''}`}>
            <Card ref={tilt3} className="card-3d-tilt bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Calendar className="h-6 w-6" />
                No Dia do Treinamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <Link2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Acesse a página <strong>apenas pelo link que será enviado</strong> pelo Prof. Cristhian no chat</span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <UserCheck className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Faça <strong>login</strong> com o e-mail e senha que você cadastrou</span>
                </li>
                <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                  <Timer className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Aguarde o início da apresentação dos casos de avaliação fenotípica pelo Prof. Cristhian</span>
                </li>
              </ol>
            </CardContent>
          </Card>
          </div>

          <div ref={card4Ref} className={`scroll-reveal ${card4Visible ? 'revealed' : ''}`}>
            <Card ref={tilt4} className="card-3d-tilt">
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

          <div ref={card5Ref} className={`scroll-reveal ${card5Visible ? 'revealed' : ''}`}>
          <Card ref={tilt5} className="card-3d-tilt">
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
                <TriangleAlert className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  <strong>Atenção:</strong> Nos últimos 10 segundos, o cronômetro ficará vermelho
                  para alertá-lo sobre o tempo restante.
                </p>
              </div>
            </CardContent>
          </Card>
          </div>

          <div ref={card6Ref} className={`scroll-reveal ${card6Visible ? 'revealed' : ''}`}>
          <Card ref={tilt6} className="card-3d-tilt">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleCheck className="h-5 w-5 text-primary" />
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

          <div ref={card7Ref} className={`scroll-reveal ${card7Visible ? 'revealed' : ''}`}>
          <Card ref={tilt7} className="card-3d-tilt">
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
