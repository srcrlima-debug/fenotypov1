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
import { Users, Clock } from "lucide-react";

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

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(Date.now());
  const [canRespond, setCanRespond] = useState(true);
  const [timerKey, setTimerKey] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    const checkSessionAndUser = async () => {
      if (!sessionId || !user) {
        navigate("/");
        return;
      }

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError || !session) {
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const newSession = payload.new as SessionData;
          setSessionData(newSession);
          setStartTime(Date.now());
          setTimerKey(prev => prev + 1);
          setCanRespond(newSession.session_status === 'active');
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const saveAvaliacao = async (resposta: string): Promise<boolean> => {
    if (!user || !sessionData) return false;

    const { data: profile } = await supabase.from("profiles").select("genero, faixa_etaria, estado").eq("user_id", user.id).single();
    const { error } = await supabase.from("avaliacoes").insert({
      session_id: sessionId, user_id: user.id, foto_id: sessionData.current_photo, resposta,
      tempo_gasto: Date.now() - startTime, genero: profile?.genero, faixa_etaria: profile?.faixa_etaria, regiao: profile?.estado,
    });

    if (error) { toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" }); return false; }
    return true;
  };

  const handleDecision = async (decision: string) => {
    if (!canRespond) return;
    if (await saveAvaliacao(decision)) { setCanRespond(false); toast({ title: "Resposta registrada" }); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!sessionData) return null;

  const currentImage = getImageByPage(sessionData.current_photo);
  const progress = (sessionData.current_photo / 30) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{sessionData.nome}</h1>
          <p className="text-muted-foreground">Foto {sessionData.current_photo} de 30</p>
          <div className="w-full bg-secondary rounded-full h-2"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        {sessionData.session_status === 'waiting' && <Card className="p-8 text-center"><Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><h2 className="text-2xl font-bold mb-2">Aguardando Início</h2><p className="text-muted-foreground">O administrador ainda não iniciou a sessão</p></Card>}
        {sessionData.session_status === 'showing_results' && <Card className="p-8 text-center"><Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /><h2 className="text-2xl font-bold mb-2">Resultados</h2><p className="text-muted-foreground">Aguarde a próxima foto...</p></Card>}
        {sessionData.session_status === 'completed' && <Card className="p-8 text-center"><h2 className="text-2xl font-bold mb-2">Sessão Finalizada</h2><Button onClick={() => navigate("/")} className="mt-4">Voltar</Button></Card>}

        {sessionData.session_status === 'active' && (
          <div className="flex flex-col items-center space-y-8">
            <CountdownCircleTimer key={timerKey} isPlaying duration={sessionData.photo_duration} colors={["#10b981", "#f59e0b", "#ef4444"]} colorsTime={[40, 20, 0]} size={120} strokeWidth={8} onComplete={() => { if (canRespond) handleDecision("NÃO_RESPONDIDO"); }}>
              {({ remainingTime }) => <div className="text-center"><div className="text-3xl font-bold">{remainingTime}</div><div className="text-sm text-muted-foreground">segundos</div></div>}
            </CountdownCircleTimer>
            <div className="w-full bg-card rounded-xl shadow-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setZoomOpen(true)}>
              {currentImage && <img src={currentImage.imageUrl} alt={currentImage.nome} className="w-full h-auto" />}
            </div>
            <div className="flex gap-4 w-full max-w-md">
              <Button onClick={() => handleDecision("DEFERIDO")} disabled={!canRespond} className="flex-1 h-16 text-lg bg-green-500 hover:bg-green-600">DEFERIDO</Button>
              <Button onClick={() => handleDecision("INDEFERIDO")} disabled={!canRespond} className="flex-1 h-16 text-lg bg-red-500 hover:bg-red-600">INDEFERIDO</Button>
            </div>

            <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
                {currentImage && (
                  <img src={currentImage.imageUrl} alt={currentImage.nome} className="w-full h-full object-contain" />
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
