import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Timer, Image, Keyboard, AlertCircle, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useCardTilt } from "@/hooks/useCardTilt";
import { useToast } from "@/hooks/use-toast";
import fistIcon from "@/assets/fist-icon.png";

interface SessionData {
  id: string;
  nome: string;
  session_status: string;
  current_photo: number;
}

export default function Antessala() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  const { ref: card1Ref, isVisible: card1Visible } = useScrollReveal();
  const { ref: card2Ref, isVisible: card2Visible } = useScrollReveal();
  const { ref: card3Ref, isVisible: card3Visible } = useScrollReveal();
  const { ref: card4Ref, isVisible: card4Visible } = useScrollReveal();
  const { ref: card5Ref, isVisible: card5Visible } = useScrollReveal();
  
  const tilt1 = useCardTilt();
  const tilt2 = useCardTilt();
  const tilt3 = useCardTilt();
  const tilt4 = useCardTilt();

  // Function to play notification sound when session starts
  const playStartSound = () => {
    if (hasPlayedSound) return;
    
    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification sound (three beeps)
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Second beep
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

      // Third beep
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

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.email) {
        // Extract name from email (part before @) and capitalize
        const emailName = profile.email.split("@")[0];
        const capitalized = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        setUserName(capitalized);
      }
    };

    loadProfile();
  }, [user]);

  // Load session data and setup realtime
  useEffect(() => {
    if (!sessionId || !user) {
      navigate("/");
      return;
    }

    const loadSession = async () => {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !session) {
        toast({
          title: "Sessão não encontrada",
          description: "Esta sessão não existe.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setSessionData(session);
      setLoading(false);

      // If session is already active, redirect immediately
      if (session.session_status === "active") {
        playStartSound();
        setTimeout(() => {
          navigate(`/treino/${sessionId}`);
        }, 1000);
      }
    };

    loadSession();

    // Setup realtime subscription
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
          const updatedSession = payload.new as SessionData;
          setSessionData(updatedSession);

          // Play sound and redirect when session becomes active
          if (updatedSession.session_status === "active") {
            playStartSound();
            toast({
              title: "🎯 Sessão Iniciada!",
              description: "O treinamento foi liberado. Redirecionando...",
            });
            setTimeout(() => {
              navigate(`/treino/${sessionId}`);
            }, 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container max-w-4xl py-8 px-4 page-transition">
        {/* Welcome Section */}
        <div className="text-center mb-12 animate-fade-slide-up">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-4 text-[#5a4a42]">
              Bem-vindo(a), {userName}! 👋
            </h1>
            <p className="text-xl text-[#a0755f] font-semibold mb-2">
              {sessionData?.nome}
            </p>
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#a0755f]/10 border-2 border-[#a0755f] rounded-xl">
              <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-lg font-medium text-[#5a4a42]">
                Aguardando início da sessão...
              </span>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-[#a0755f]/20 to-[#8a6350]/20 border-2 border-[#a0755f] rounded-2xl p-8 shadow-xl">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src={fistIcon} 
                alt="Punho cerrado" 
                className="h-12 w-12 animate-pulse-zoom"
              />
              <h2 className="text-2xl font-bold text-[#5a4a42]">
                Juntos na Luta Antirracista
              </h2>
              <img 
                src={fistIcon} 
                alt="Punho cerrado" 
                className="h-12 w-12 animate-pulse-zoom"
              />
            </div>
            <p className="text-lg text-[#5a4a42] leading-relaxed">
              Seu compromisso com a construção de uma educação antirracista é fundamental. 
              Este treinamento é mais um passo na nossa jornada por equidade racial e justiça social. 
              Obrigado por estar conosco nesta missão transformadora!
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="text-center mb-8 animate-fade-slide-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-3xl font-bold mb-3 text-[#5a4a42]">Como Funciona o Treinamento</h2>
          <p className="text-lg text-muted-foreground">
            Entenda como realizar a avaliação das imagens de forma rápida e eficiente
          </p>
        </div>

        <div className="grid gap-6 mb-8">
          <div ref={card1Ref} className={card1Visible ? 'revealed' : ''}>
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

          <div ref={card2Ref} className={card2Visible ? 'revealed' : ''}>
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

          <div ref={card3Ref} className={card3Visible ? 'revealed' : ''}>
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
                        <span><strong>Deferido:</strong> Quando você considera que a pessoa na foto se autodeclara e pode ser considerada negra</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span><strong>Indeferido:</strong> Quando você considera que a pessoa na foto não se autodeclara ou não pode ser considerada negra</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span><strong>Não Respondido:</strong> Quando o tempo se esgota antes de você responder</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div ref={card4Ref} className={card4Visible ? 'revealed' : ''}>
            <Card ref={tilt4} className="card-3d-tilt">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5 text-primary" />
                  Atalhos de Teclado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Para agilizar suas respostas, você pode usar os seguintes atalhos:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                    <kbd className="px-3 py-2 bg-green-500 text-white rounded font-mono text-sm font-bold">D</kbd>
                    <span>Registrar como <strong>DEFERIDO</strong></span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                    <kbd className="px-3 py-2 bg-red-500 text-white rounded font-mono text-sm font-bold">I</kbd>
                    <span>Registrar como <strong>INDEFERIDO</strong></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div ref={card5Ref} className={card5Visible ? 'revealed' : ''}>
            <Card className="bg-[#a0755f]/10 border-2 border-[#a0755f]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#5a4a42]">
                  <AlertCircle className="h-5 w-5" />
                  Importante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-[#5a4a42]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#a0755f] mt-1">•</span>
                    <span>O treinamento é <strong>sequencial</strong> - você não pode voltar para imagens anteriores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#a0755f] mt-1">•</span>
                    <span>Aguarde o administrador liberar cada foto antes de prosseguir</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#a0755f] mt-1">•</span>
                    <span>Suas respostas são registradas automaticamente e não podem ser alteradas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#a0755f] mt-1">•</span>
                    <span>Um lembrete sonoro será tocado quando a sessão for iniciada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#a0755f] mt-1">•</span>
                    <span>Ao final, você receberá um certificado de participação</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Waiting Message */}
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500/10 border-2 border-blue-500 rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-lg font-semibold text-blue-700">
              Aguardando o administrador iniciar a sessão...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
