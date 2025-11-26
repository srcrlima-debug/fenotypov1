import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, CircleCheck, Timer, Image, Keyboard, TriangleAlert, Monitor, UserCheck, KeyRound, Calendar, Link2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { AntessalaParticipantsMonitor } from "@/components/AntessalaParticipantsMonitor";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { cn } from "@/lib/utils";
import { useSessionNavigation } from "@/hooks/useSessionNavigation";

interface SessionData {
  id: string;
  nome: string;
  data: string;
  session_status: string;
  current_photo: number;
  training_id?: string;
  created_by?: string;
}

export default function Antessala() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ✅ CORREÇÃO: Extrair APENAS de query params (fonte única)
  const sessionId = searchParams.get('sessionId');
  const trainingId = searchParams.get('trainingId');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // ✅ Usar useSessionNavigation para validação
  const { validateSessionId, logAccess } = useSessionNavigation({
    autoRedirectIfAuthenticated: false
  });
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [onlineParticipants, setOnlineParticipants] = useState(0);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>();

  const { ref: ref1, isVisible: isVisible1 } = useScrollReveal();
  const { ref: ref2, isVisible: isVisible2 } = useScrollReveal();
  const { ref: ref3, isVisible: isVisible3 } = useScrollReveal();

  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  const totalSlides = 8;

  const playStartSound = () => {
    if (hasPlayedSound) return;
    
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
      }, 200);

      setTimeout(() => {
        const oscillator3 = audioContext.createOscillator();
        const gainNode3 = audioContext.createGain();
        oscillator3.connect(gainNode3);
        gainNode3.connect(audioContext.destination);
        oscillator3.frequency.value = 1200;
        oscillator3.type = 'sine';
        gainNode3.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator3.start(audioContext.currentTime);
        oscillator3.stop(audioContext.currentTime + 0.5);
      }, 400);

      setHasPlayedSound(true);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  useEffect(() => {
    const extractUserName = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.email) {
        const emailName = profile.email.split("@")[0];
        const capitalized = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        setUserName(capitalized);
      }
    };

    extractUserName();
  }, [user]);

  useEffect(() => {
    const loadSession = async () => {
      // ✅ VALIDAÇÃO 1: sessionId E trainingId são obrigatórios
      if (!sessionId || !trainingId) {
        console.error('[Antessala] sessionId ou trainingId ausentes');
        toast({
          title: "Acesso Inválido",
          description: "É necessário um link válido com ID de sessão e treinamento.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 2: Validar formato UUID do sessionId
      if (!validateSessionId(sessionId)) {
        console.error('[Antessala] sessionId inválido:', sessionId);
        toast({
          title: "Link Corrompido",
          description: "O link de acesso está inválido. Solicite um novo link.",
          variant: "destructive",
        });
        await logAccess('invalid_sessionid_antessala', { 
          error: 'Invalid UUID format',
          trainingId 
        });
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 3: Buscar sessão ESPECÍFICA (não genérica)
      console.log('[Antessala] Buscando sessão:', sessionId);
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*, training_id, created_by")
        .eq("id", sessionId)
        .maybeSingle();

      // ✅ VALIDAÇÃO 4: Erro de query
      if (error) {
        console.error("❌ [Antessala] Erro ao buscar sessão:", error.message, error);
        toast({
          title: "Erro ao acessar sessão",
          description: "Não foi possível carregar os dados da sessão. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 5: Sessão não existe OU sem permissão (RLS bloqueou)
      if (!session) {
        console.error("❌ [Antessala] Sessão não encontrada ou acesso negado:", sessionId);
        toast({
          title: "Acesso Negado",
          description: "Esta sessão não existe ou você não tem permissão para acessá-la.",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 6: Verificar se training_id bate com o esperado
      if (session.training_id !== trainingId) {
        console.error("❌ [Antessala] training_id da sessão não bate:", {
          esperado: trainingId,
          recebido: session.training_id
        });
        toast({
          title: "Erro de Configuração",
          description: "Esta sessão não pertence ao treinamento especificado.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // ✅ ALERTA: Sessão órfã (não deveria mais existir após migração)
      if (!session.training_id) {
        console.error("⚠️ [Antessala] ALERTA CRÍTICO: Sessão órfã detectada:", {
          sessionId: session.id,
          sessionName: session.nome,
          createdBy: session.created_by
        });

        toast({
          title: "⚠️ Sessão sem Treinamento",
          description: "Esta sessão não está vinculada a um treinamento. Contate o suporte.",
          variant: "destructive",
        });
        // ✅ Bloquear acesso a sessões órfãs
        navigate("/");
        return;
      }

      // ✅ Tudo validado, carregar sessão
      console.log('[Antessala] Sessão válida carregada:', session.id);
      setSessionData(session);
      setLoading(false);

      if (session.session_status === "active") {
        playStartSound();
        toast({
          title: "Treinamento Iniciado!",
          description: "Redirecionando para a sala de avaliação...",
        });
        setTimeout(() => {
          navigate(`/treino/${session.id}`);
        }, 1000);
        return;
      }

      // ✅ Setup realtime para updates
      const channel = supabase
        .channel(`session-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessions",
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("[Antessala] Session updated:", payload);
            const updatedSession = payload.new as SessionData;
            setSessionData(updatedSession);

            if (updatedSession.session_status === "active") {
              console.log("[Antessala] Session is now active, redirecting...");
              playStartSound();
              toast({
                title: "Treinamento Iniciado!",
                description: "Redirecionando...",
              });
              setTimeout(() => {
                navigate(`/treino/${sessionId}`);
              }, 1000);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    if (!user) {
      return;
    }

    loadSession();
  }, [sessionId, trainingId, user, navigate]);

  useEffect(() => {
    if (!carouselApi) return;

    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  useEffect(() => {
    if (!sessionId || !userName) return;

    const presenceChannel = supabase.channel(`antessala-${sessionId}`, {
      config: {
        presence: {
          key: userName,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const participants = Object.keys(state).length;
        setOnlineParticipants(participants);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            user: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId, userName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-2xl border-2">
          <CardContent className="p-12 text-center space-y-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground">
              Aguardando Início do Treinamento
            </h1>
            
            <p className="text-lg text-muted-foreground">
              O administrador ainda não criou a sessão de treinamento.
            </p>

            <div className="pt-6">
              <p className="text-sm text-muted-foreground">
                Você será redirecionado automaticamente quando a sessão estiver disponível.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="mt-6"
            >
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div
          ref={ref1}
          className={`mb-12 text-center transition-all duration-1000 ${
            isVisible1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Bem-vindo(a){userName && `, ${userName}`}!
          </h1>
          <p className="text-xl text-muted-foreground">
            Prepare-se para uma experiência única de treinamento
          </p>
        </div>

        <Card
          ref={ref2}
          className={`mb-12 shadow-xl border-2 transition-all duration-1000 delay-200 ${
            isVisible2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Informações do Treinamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nome da Sessão</p>
                  <p className="text-lg font-semibold text-foreground">{sessionData.nome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Data</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(sessionData.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge
                    variant={
                      sessionData.session_status === "waiting"
                        ? "secondary"
                        : "default"
                    }
                    className="text-sm px-3 py-1"
                  >
                    {sessionData.session_status === "waiting"
                      ? "Aguardando Início"
                      : "Em Andamento"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Participantes Online
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-lg font-semibold text-foreground">
                      {onlineParticipants} online
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div
          ref={ref3}
          className={`mb-8 transition-all duration-1000 delay-300 ${
            isVisible3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-3xl font-bold mb-8 text-center text-foreground">
            Como Funciona?
          </h2>

          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[autoplayPlugin.current]}
            onMouseEnter={() => autoplayPlugin.current.stop()}
            onMouseLeave={() => autoplayPlugin.current.play()}
            setApi={setCarouselApi}
            className="w-full max-w-5xl mx-auto"
          >
            <CarouselContent>
              {/* Card 1: Acesso Exclusivo */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-2 border-red-500 mx-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-6 w-6" />
                      Acesso Exclusivo via Link de Convite
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                      <TriangleAlert className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-800 dark:text-red-200 mb-2">Muito Importante!</p>
                        <p className="text-red-700 dark:text-red-300 mb-2">
                          O acesso ao aplicativo <strong>só é possível através de link de convite</strong> criado pelo administrador (Prof. Cristhian Lima) a cada sessão de treinamento e enviado aos participantes cadastrados.
                        </p>
                        <p className="text-red-700 dark:text-red-300">
                          <strong>Não é possível acessar o treinamento diretamente pela página inicial.</strong> Aguarde receber o link de convite específico para sua sessão.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 2: Preparação Prévia */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-500 mx-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Monitor className="h-6 w-6" />
                      Preparação Prévia - Após Receber o Convite
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground font-semibold mb-3">
                      Use preferencialmente <strong>computador, notebook ou tablet</strong> para melhor experiência:
                    </p>
                    <ol className="space-y-3">
                      <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">1</span>
                        <span>Acesse <strong>apenas através do link de convite</strong> que você recebeu do Prof. Cristhian</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">2</span>
                        <span>Cadastre-se através do link e complete seu perfil com todas as informações solicitadas</span>
                      </li>
                      <li className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold text-sm">3</span>
                        <span>Teste suas credenciais fazendo login antes da sessão começar</span>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 3: Guarde Credenciais */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-2 border-amber-500 mx-2">
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
              </CarouselItem>

              {/* Card 4: No Dia do Treinamento */}
              <CarouselItem>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-500 mx-2">
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
              </CarouselItem>

              {/* Card 5: Visualização das Imagens */}
              <CarouselItem>
                <Card className="mx-2">
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
              </CarouselItem>

              {/* Card 6: Tempo de Resposta */}
              <CarouselItem>
                <Card className="mx-2">
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
                      <p className="text-sm text-red-700 dark:text-red-300">
                        <strong>Atenção:</strong> Nos últimos 10 segundos, o cronômetro ficará vermelho
                        para alertá-lo sobre o tempo restante.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Card 7: Como Avaliar */}
              <CarouselItem>
                <Card className="mx-2">
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
              </CarouselItem>

              {/* Card 8: Atalhos de Teclado */}
              <CarouselItem>
                <Card className="mx-2">
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
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>

          {/* Indicadores de progresso (dots) */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => carouselApi?.scrollTo(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  currentSlide === index
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <Card className="shadow-xl border-2 mb-8">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-foreground">
              Aguardando Início
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              O treinamento começará em breve. Fique atento!
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
              <div
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </CardContent>
        </Card>

        {sessionId && (
          <div className="mt-8">
            <AntessalaParticipantsMonitor sessionId={sessionId} />
          </div>
        )}
      </main>
    </div>
  );
}
