import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CountdownCircleTimer } from "react-countdown-circle-timer";
import { getImageByPage } from "@/data/images";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Users, 
  Clock, 
  CircleCheck, 
  CircleX, 
  ZoomIn, 
  TriangleAlert,
  Loader,
  Info,
  MessageSquare,
  Send
} from "lucide-react";
import { Header } from "@/components/Header";
import { WelcomeModal } from "@/components/WelcomeModal";
import { VotingFooter } from "@/components/VotingFooter";
import { VotingStats } from "@/components/VotingStats";
import { useWelcomeModal } from "@/hooks/useWelcomeModal";

interface SessionData {
  id: string;
  nome: string;
  data: string;
  current_photo: number;
  session_status: string;
  photo_start_time: string | null;
  photo_duration: number;
}

export default function SessionTraining() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { shouldShowModal, markAsViewed } = useWelcomeModal(user?.id);

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [canRespond, setCanRespond] = useState(true);
  const [timerKey, setTimerKey] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [votedCount, setVotedCount] = useState(0);
  const [userCompletedEvaluations, setUserCompletedEvaluations] = useState(false);
  const [userTotalVotes, setUserTotalVotes] = useState(0);

  // Function to play notification sound when session starts
  const playStartSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create a pleasant notification sound (two beeps)
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
    }, 150);
  };

  useEffect(() => {
    const checkSessionAndUser = async () => {
      if (!sessionId || !user) {
        navigate("/");
        return;
      }

      // Check how many evaluations the user has completed
      const { count: userVotesCount } = await supabase
        .from("avaliacoes")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      setUserTotalVotes(userVotesCount || 0);
      setUserCompletedEvaluations((userVotesCount || 0) >= 30);

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
        toast({
          title: "Sessão não encontrada",
          description: "Esta sessão não existe ou foi encerrada.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Check if session has ended
      if (session.session_status === "completed") {
        toast({
          title: "Sessão encerrada",
          description: "Esta sessão foi encerrada pelo administrador.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setSessionData(session);
      setLoading(false);
    };

    checkSessionAndUser();
  }, [sessionId, user, navigate]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('session-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sessions', 
        filter: `id=eq.${sessionId}` 
      }, (payload) => {
        const newSession = payload.new as SessionData;
        
        // If session completed, redirect
        if (newSession.session_status === "completed") {
          toast({
            title: "Sessão encerrada",
            description: "O administrador encerrou esta sessão.",
          });
          navigate("/");
          return;
        }
        
        // Play sound when session starts
        if (sessionData?.session_status === 'waiting' && newSession.session_status === 'active') {
          playStartSound();
          toast({
            title: "O teste começou!",
            description: "Prepare-se para avaliar as imagens.",
          });
        }
        
        setSessionData(newSession);
        setStartTime(Date.now());
        setTimerKey(prev => prev + 1);
        setCanRespond(newSession.session_status === 'active');
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, navigate, toast, sessionData?.session_status]);

  useEffect(() => {
    if (!sessionData || !sessionData.current_photo || sessionData.session_status !== 'active') return;
    
    // Reset start time when photo changes
    console.log('Foto mudou para:', sessionData.current_photo, 'resetando startTime');
    setStartTime(Date.now());
  }, [sessionData?.current_photo]);

  // Track participants using Realtime Presence
  useEffect(() => {
    if (!sessionId || !user) return;

    const presenceChannel = supabase.channel(`session-${sessionId}-presence`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        setParticipantCount(count);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('Participant joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('Participant left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId, user]);

  // Track votes for current photo in real-time
  useEffect(() => {
    if (!sessionId || !sessionData?.current_photo) return;

    const fetchVotesCount = async () => {
      const { count } = await supabase
        .from("avaliacoes")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId)
        .eq("foto_id", sessionData.current_photo);
      
      setVotedCount(count || 0);
    };

    fetchVotesCount();

    // Listen for new votes
    const votesChannel = supabase
      .channel(`votes-${sessionId}-${sessionData.current_photo}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'avaliacoes',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        fetchVotesCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(votesChannel);
    };
  }, [sessionId, sessionData?.current_photo]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const saveAvaliacao = async (resposta: string): Promise<boolean> => {
    if (!user || !sessionData) return false;

    const tempoDecorrido = Date.now() - startTime;
    console.log("Saving avaliacao for user:", user.id, "tempo desde início:", tempoDecorrido, "ms");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("genero, faixa_etaria, estado, regiao")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      toast({
        title: "Erro",
        description: "Não foi possível buscar seus dados de perfil",
        variant: "destructive",
      });
      return false;
    }

    if (!profile) {
      console.error("Profile not found for user:", user.id);
      toast({
        title: "Perfil incompleto",
        description: "Complete seu perfil antes de participar da sessão.",
        variant: "destructive",
      });
      navigate("/complete-profile");
      return false;
    }

    console.log("Profile data:", profile);

    const avaliacaoData = {
      session_id: sessionId,
      user_id: user.id,
      foto_id: sessionData.current_photo,
      resposta,
      tempo_gasto: Math.max(0, Date.now() - startTime),
      genero: profile.genero,
      faixa_etaria: profile.faixa_etaria,
      regiao: profile.regiao || profile.estado,
    };

    console.log("Inserting avaliacao with tempo_gasto (ms):", avaliacaoData.tempo_gasto);

    const { error } = await supabase.from("avaliacoes").insert(avaliacaoData);

    if (error) {
      console.error("Error saving avaliacao:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar sua resposta",
        variant: "destructive",
      });
      return false;
    }

    console.log("Avaliacao saved successfully");
    return true;
  };

  const handleDecision = async (decision: string) => {
    if (!canRespond) return;
    if (await saveAvaliacao(decision)) {
      setCanRespond(false);
      const newTotal = userTotalVotes + 1;
      setUserTotalVotes(newTotal);
      
      // Check if user completed all 30 evaluations
      if (newTotal >= 30) {
        setUserCompletedEvaluations(true);
        toast({
          title: "🎉 Parabéns!",
          description: "Você completou todas as 30 avaliações! Agora você pode deixar seu feedback sobre a experiência.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Resposta registrada",
          description: `Aguardando próxima foto. Você completou ${newTotal} de 30 análises.`,
        });
      }
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader className="w-12 h-12 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!sessionData) return null;

  const currentImage = getImageByPage(sessionData.current_photo);
  const progress = (sessionData.current_photo / 30) * 100;

  // Waiting state - before admin starts
  if (sessionData.session_status === "waiting") {
    return (
      <div className="min-h-screen flex flex-col">
        <WelcomeModal open={shouldShowModal} onAccept={markAsViewed} />
        <Header />
        <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
          <Card className="max-w-2xl w-full p-8 space-y-6 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Clock className="w-10 h-10 text-primary animate-pulse" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Sala de Espera</h1>
              <p className="text-lg text-muted-foreground">
                Sessão: <span className="font-semibold text-foreground">{sessionData.nome}</span>
              </p>
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center space-y-3">
              <p className="text-lg font-medium">
                O Prof. Cristhian em breve começará a realizar o teste.
              </p>
              <p className="text-sm text-muted-foreground">
                Aguarde na sala de espera. O teste iniciará automaticamente.
              </p>
              
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-primary/20">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{participantCount}</span>
                <span className="text-sm text-muted-foreground">
                  {participantCount === 1 ? 'participante aguardando' : 'participantes aguardando'}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold">Como funciona o teste:</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Você verá 30 imagens, uma de cada vez</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Todos os participantes verão a mesma imagem ao mesmo tempo</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Cada imagem terá um tempo limitado para avaliação</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Clique em <strong>DEFERIDO</strong> ou <strong>INDEFERIDO</strong> conforme sua avaliação</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Use os atalhos: <kbd className="px-2 py-1 bg-muted rounded text-xs">D</kbd> para Deferido e <kbd className="px-2 py-1 bg-muted rounded text-xs">I</kbd> para Indeferido</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>Aguardando Prof. Cristhian iniciar o teste...</span>
            </div>
          </Card>
        </div>
        <VotingFooter />
      </div>
    );
  }

  // Showing results state
  if (sessionData.session_status === "showing_results") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-xl w-full p-8 text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-4">
              <CircleCheck className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold">Sessão Concluída!</h1>
            <p className="text-muted-foreground">
              Obrigado por participar. O administrador está exibindo os resultados.
            </p>
            <Button onClick={() => navigate("/")} size="lg" className="w-full">
              Voltar ao Início
            </Button>
          </Card>
        </div>
        <VotingFooter />
      </div>
    );
  }

  // Active state - showing current photo
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-4xl space-y-4 animate-fade-in">
          {/* Progress bar */}
          <div className="bg-card rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Foto {sessionData.current_photo} de 30
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% completo
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          <div className="flex justify-center">
            <CountdownCircleTimer
              key={timerKey}
              isPlaying={canRespond}
              duration={sessionData.photo_duration || 60}
              colors={["#10b981", "#f59e0b", "#ef4444"]}
              colorsTime={[sessionData.photo_duration || 60, 10, 0]}
              size={120}
              strokeWidth={8}
            >
              {({ remainingTime }) => (
                <div className="text-center">
                  <div className={`text-3xl font-bold ${remainingTime <= 10 ? 'text-red-500 animate-pulse' : ''}`}>
                    {remainingTime}
                  </div>
                  <div className="text-sm text-muted-foreground">segundos</div>
                </div>
              )}
            </CountdownCircleTimer>
          </div>

          {/* Voting Stats */}
          <VotingStats votedCount={votedCount} totalParticipants={participantCount} />

          {/* Feedback Card - Shows when user completes 30 evaluations OR session is completed/showing results */}
          {(userCompletedEvaluations || sessionData.session_status === 'completed' || sessionData.session_status === 'showing_results') && (
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      {userCompletedEvaluations ? '🎉 Avaliação completa!' : 'Compartilhe sua experiência'}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {userCompletedEvaluations 
                        ? 'Você completou todas as 30 avaliações! Deixe seu feedback e concorra a badges exclusivos.'
                        : 'Sua opinião é muito importante para melhorarmos continuamente o sistema de avaliação.'
                      }
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(`/feedback/${sessionId}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Deixar Feedback
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Image and buttons */}
          <Card className="p-6 space-y-4">
            <div className="relative group">
              <img
                src={currentImage?.imageUrl}
                alt={`Imagem ${sessionData.current_photo}`}
                className="w-full h-auto rounded-lg object-contain max-h-96 cursor-zoom-in transition-transform hover:scale-[1.02]"
                onClick={() => setZoomOpen(true)}
              />
              <button
                onClick={() => setZoomOpen(true)}
                className="absolute top-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                aria-label="Ampliar imagem"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                size="lg"
                onClick={() => handleDecision("DEFERIDO")}
                disabled={!canRespond}
                className="h-16 text-lg font-semibold bg-green-600 hover:bg-green-700 active:scale-95 transition-transform disabled:opacity-50"
              >
                <CircleCheck className="mr-2 h-6 w-6" />
                DEFERIDO
                <kbd className="ml-2 px-2 py-1 bg-green-700/50 rounded text-xs hidden sm:inline">D</kbd>
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleDecision("INDEFERIDO")}
                disabled={!canRespond}
                className="h-16 text-lg font-semibold active:scale-95 transition-transform disabled:opacity-50"
              >
                <CircleX className="mr-2 h-6 w-6" />
                INDEFERIDO
                <kbd className="ml-2 px-2 py-1 bg-red-700/50 rounded text-xs hidden sm:inline">I</kbd>
              </Button>
            </div>

            {!canRespond && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-primary">
                  ✓ Voto registrado! Aguardando liberação da próxima imagem...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você completou {userTotalVotes} de 30 análises
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-7xl w-full p-0">
          <img
            src={currentImage?.imageUrl}
            alt="Visualização ampliada"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
      <VotingFooter />
    </div>
  );
}
