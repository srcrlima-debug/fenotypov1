import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Eye, MessageSquare, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { AntessalaParticipantsMonitor } from "@/components/AntessalaParticipantsMonitor";

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
  const { sessionId, trainingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [onlineParticipants, setOnlineParticipants] = useState(0);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  const { ref: ref1, isVisible: isVisible1 } = useScrollReveal();
  const { ref: ref2, isVisible: isVisible2 } = useScrollReveal();
  const { ref: ref3, isVisible: isVisible3 } = useScrollReveal();
  const { ref: ref4, isVisible: isVisible4 } = useScrollReveal();

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardTilts = [
    useCardTilt(),
    useCardTilt(),
    useCardTilt(),
  ];

  const handleMouseMove = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    // Simplified without tilt effect
  };

  const handleMouseLeave = (index: number) => {
    // Simplified without tilt effect
  };

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
      if (!sessionId && trainingId) {
        console.log("No sessionId in URL, searching for active session in training:", trainingId);
        
        if (!user) {
          toast({
            title: "Login necessário",
            description: "Faça login para acessar este treinamento",
          });
          navigate(`/training/${trainingId}/login`);
          return;
        }

        const { data: participant } = await supabase
          .from("training_participants")
          .select("*")
          .eq("training_id", trainingId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!participant) {
          toast({
            title: "Cadastro necessário",
            description: "Você precisa se cadastrar neste treinamento",
          });
          navigate(`/training/${trainingId}/register`);
          return;
        }

        const { data: activeSession } = await supabase
          .from("sessions")
          .select("*")
          .eq("training_id", trainingId)
          .in("session_status", ["waiting", "active"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSession) {
          console.log("Active session found, updating URL:", activeSession.id);
          window.history.replaceState(
            null,
            "",
            `/training/${trainingId}/session/${activeSession.id}/antessala`
          );
          setSessionData(activeSession);
          setLoading(false);

          if (activeSession.session_status === "active") {
            playStartSound();
            setTimeout(() => {
              navigate(`/treino/${activeSession.id}`);
            }, 1000);
          }
          return;
        } else {
          console.log("No active session found, showing waiting screen");
          setSessionData(null);
          setLoading(false);
          return;
        }
      }

      if (!sessionId) {
        console.error("No sessionId or trainingId provided");
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÕES IMPLEMENTADAS (Etapa 3)
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*, training_id, created_by")
        .eq("id", sessionId)
        .maybeSingle();

      // ✅ VALIDAÇÃO 1: Erro de query
      if (error) {
        console.error("❌ Erro ao buscar sessão:", error.message, error);
        toast({
          title: "Erro ao acessar sessão",
          description: "Não foi possível carregar os dados da sessão. Tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 2: Sessão não existe OU sem permissão (RLS bloqueou)
      if (!session) {
        console.error("❌ Sessão não encontrada ou acesso negado:", sessionId);
        toast({
          title: "Acesso Negado",
          description: "Esta sessão não existe ou você não tem permissão para acessá-la.",
          variant: "destructive",
        });
        setLoading(false);
        navigate("/");
        return;
      }

      // ✅ VALIDAÇÃO 3: ALERTA se órfã (não deveria mais existir)
      if (!session.training_id) {
        console.error("⚠️ ALERTA CRÍTICO: Sessão órfã detectada:", {
          sessionId: session.id,
          sessionName: session.nome,
          createdBy: session.created_by,
          createdAt: session.created_at
        });

        toast({
          title: "⚠️ Sessão sem Treinamento",
          description: "Esta sessão não está vinculada a um treinamento. Contate o suporte.",
          variant: "destructive",
        });
      }

      // Continuar fluxo normal...
      setSessionData(session);
      setLoading(false);

      if (session.session_status === "active") {
        playStartSound();
        setTimeout(() => {
          navigate(`/treino/${session.id}`);
        }, 1000);
        return;
      }

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
            console.log("Session updated:", payload);
            const updatedSession = payload.new as SessionData;
            setSessionData(updatedSession);

            if (updatedSession.session_status === "active") {
              playStartSound();
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

    if (loading || !user) {
      return;
    }

    loadSession();
  }, [sessionId, trainingId, user, navigate, playStartSound, loading]);

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

          <div className="grid md:grid-cols-3 gap-6">
            <Card
              ref={(el) => (cardRefs.current[0] = el)}
              className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50"
            >
              <CardHeader className="bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl text-center">
                  Observação de Fotos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center leading-relaxed">
                  Você verá uma série de fotografias, uma de cada vez. Observe
                  cada imagem com atenção aos detalhes.
                </p>
              </CardContent>
            </Card>

            <Card
              ref={(el) => (cardRefs.current[1] = el)}
              className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50"
            >
              <CardHeader className="bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl text-center">
                  Avaliação Rápida
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center leading-relaxed">
                  Para cada foto, você responderá a uma pergunta específica
                  sobre a imagem. Seja preciso e rápido.
                </p>
              </CardContent>
            </Card>

            <Card
              ref={(el) => (cardRefs.current[2] = el)}
              className="group hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50"
            >
              <CardHeader className="bg-gradient-to-br from-primary/20 to-primary/5">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl text-center">
                  Tempo Limitado
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center leading-relaxed">
                  Cada foto tem um tempo limite para avaliação. Mantenha o foco
                  e confie na sua primeira impressão.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card
          ref={ref4}
          className={`shadow-xl border-2 transition-all duration-1000 delay-500 ${
            isVisible4 ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
        >
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
