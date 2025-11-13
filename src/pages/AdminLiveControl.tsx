import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, SkipForward, BarChart3, Users, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { getImageByPage } from "@/data/images";
import { Progress } from "@/components/ui/progress";

interface SessionData {
  id: string;
  nome: string;
  data: string;
  current_photo: number;
  session_status: string;
  photo_start_time: string | null;
  photo_duration: number;
}

interface RealtimeStats {
  total_participants: number;
  responses_current_photo: number;
  deferido: number;
  indeferido: number;
  nao_respondido: number;
  by_gender: Record<string, { deferido: number; indeferido: number; nao_respondido: number }>;
  by_age: Record<string, { deferido: number; indeferido: number; nao_respondido: number }>;
  by_region: Record<string, { deferido: number; indeferido: number; nao_respondido: number }>;
  avg_time: number;
}

export default function AdminLiveControl() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [stats, setStats] = useState<RealtimeStats>({
    total_participants: 0,
    responses_current_photo: 0,
    deferido: 0,
    indeferido: 0,
    nao_respondido: 0,
    by_gender: {},
    by_age: {},
    by_region: {},
    avg_time: 0,
  });
  const [timeRemaining, setTimeRemaining] = useState(60);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        navigate("/");
        return;
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (!sessionId) return;

    fetchSession();
    
    // Subscribe to session changes
    const sessionChannel = supabase
      .channel('session-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSession(payload.new as SessionData);
        }
      )
      .subscribe();

    // Subscribe to avaliacoes changes
    const avaliationsChannel = supabase
      .channel('avaliations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(avaliationsChannel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!session || session.session_status !== 'active' || !session.photo_start_time) return;

    const interval = setInterval(() => {
      const startTime = new Date(session.photo_start_time!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, session.photo_duration - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0) {
        handleShowResults();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const fetchSession = async () => {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar a sessão",
        variant: "destructive",
      });
      return;
    }

    setSession(data);
    fetchStats();
  };

  const fetchStats = async () => {
    if (!session) return;

    // Get all participants
    const { data: participants } = await supabase
      .from("profiles")
      .select("user_id");

    // Get responses for current photo
    const { data: avaliacoes } = await supabase
      .from("avaliacoes")
      .select(`
        *,
        profiles!inner(genero, faixa_etaria, estado)
      `)
      .eq("session_id", sessionId)
      .eq("foto_id", session.current_photo);

    const total_participants = participants?.length || 0;
    const responses = avaliacoes || [];

    const deferido = responses.filter(r => r.resposta === "DEFERIDO").length;
    const indeferido = responses.filter(r => r.resposta === "INDEFERIDO").length;
    const nao_respondido = responses.filter(r => r.resposta === "NÃO_RESPONDIDO").length;

    // Group by demographics
    const by_gender: Record<string, any> = {};
    const by_age: Record<string, any> = {};
    const by_region: Record<string, any> = {};

    responses.forEach((r: any) => {
      const profile = r.profiles;
      
      // Gender
      if (!by_gender[profile.genero]) {
        by_gender[profile.genero] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      by_gender[profile.genero][r.resposta.toLowerCase().replace("_", "_")] += 1;

      // Age
      if (!by_age[profile.faixa_etaria]) {
        by_age[profile.faixa_etaria] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      by_age[profile.faixa_etaria][r.resposta.toLowerCase().replace("_", "_")] += 1;

      // Region
      if (!by_region[profile.estado]) {
        by_region[profile.estado] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      by_region[profile.estado][r.resposta.toLowerCase().replace("_", "_")] += 1;
    });

    const avg_time = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.tempo_gasto, 0) / responses.length / 1000
      : 0;

    setStats({
      total_participants,
      responses_current_photo: responses.length,
      deferido,
      indeferido,
      nao_respondido,
      by_gender,
      by_age,
      by_region,
      avg_time,
    });
  };

  const handleStartSession = async () => {
    const { error } = await supabase.rpc("start_session", {
      session_id_param: sessionId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a sessão",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sessão Iniciada",
      description: "A primeira foto foi liberada para os participantes",
    });
  };

  const handleNextPhoto = async () => {
    if (!session || session.current_photo >= 30) {
      toast({
        title: "Sessão Concluída",
        description: "Todas as fotos foram avaliadas",
      });
      return;
    }

    const { error } = await supabase.rpc("next_photo", {
      session_id_param: sessionId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível avançar para a próxima foto",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Próxima Foto",
      description: `Foto ${session.current_photo + 1} liberada`,
    });
  };

  const handleShowResults = async () => {
    const { error } = await supabase.rpc("show_results", {
      session_id_param: sessionId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exibir resultados",
        variant: "destructive",
      });
    }
  };

  const handleRestartPhoto = async () => {
    if (!session) return;

    const { error } = await supabase.rpc("restart_current_photo", {
      session_id_param: sessionId,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível reiniciar a foto",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Foto Reiniciada",
      description: `Foto ${session.current_photo} foi reiniciada. Todas as respostas foram apagadas e o timer foi resetado.`,
    });
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const currentImage = getImageByPage(session.current_photo);
  const progress = (session.current_photo / 30) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{session.nome}</h1>
            <p className="text-muted-foreground">Controle Ao Vivo - Foto {session.current_photo}/30</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            Voltar
          </Button>
        </div>

        <Progress value={progress} className="w-full" />

        {/* Control Panel */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Controles da Sessão</h2>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-medium capitalize">{session.session_status}</span>
              </p>
            </div>
            <div className="flex gap-4">
              {session.session_status === 'waiting' && (
                <Button onClick={handleStartSession} size="lg" className="gap-2">
                  <Play className="w-5 h-5" />
                  Iniciar Sessão
                </Button>
              )}
              {session.session_status === 'showing_results' && session.current_photo < 30 && (
                <div className="flex gap-2">
                  <Button onClick={handleNextPhoto} size="lg" className="gap-2">
                    <SkipForward className="w-5 h-5" />
                    Próxima Foto
                  </Button>
                  <Button onClick={handleRestartPhoto} size="lg" variant="outline" className="gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Reiniciar Foto
                  </Button>
                </div>
              )}
              {session.session_status === 'active' && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{timeRemaining}s</div>
                    <div className="text-sm text-muted-foreground">Tempo Restante</div>
                  </div>
                  <Button onClick={handleShowResults} variant="outline" className="gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Mostrar Resultados Agora
                  </Button>
                  <Button onClick={handleRestartPhoto} size="default" variant="destructive" className="gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Reiniciar Foto
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Current Photo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Foto Atual</h3>
            {currentImage && (
              <img
                src={currentImage.imageUrl}
                alt={currentImage.nome}
                className="w-full rounded-lg shadow-lg"
              />
            )}
          </Card>

          {/* Real-time Stats */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participação em Tempo Real
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">{stats.total_participants}</div>
                  <div className="text-sm text-muted-foreground">Total Participantes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.responses_current_photo}</div>
                  <div className="text-sm text-muted-foreground">Respostas Recebidas</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Resultados da Foto Atual</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Deferido</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stats.deferido} ({stats.responses_current_photo > 0 ? Math.round((stats.deferido / stats.responses_current_photo) * 100) : 0}%)
                  </div>
                </div>
                <Progress value={stats.responses_current_photo > 0 ? (stats.deferido / stats.responses_current_photo) * 100 : 0} className="bg-green-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span>Indeferido</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stats.indeferido} ({stats.responses_current_photo > 0 ? Math.round((stats.indeferido / stats.responses_current_photo) * 100) : 0}%)
                  </div>
                </div>
                <Progress value={stats.responses_current_photo > 0 ? (stats.indeferido / stats.responses_current_photo) * 100 : 0} className="bg-red-100" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span>Não Respondido</span>
                  </div>
                  <div className="text-xl font-bold">
                    {stats.nao_respondido} ({stats.responses_current_photo > 0 ? Math.round((stats.nao_respondido / stats.responses_current_photo) * 100) : 0}%)
                  </div>
                </div>
                <Progress value={stats.responses_current_photo > 0 ? (stats.nao_respondido / stats.responses_current_photo) * 100 : 0} className="bg-yellow-100" />

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span>Tempo Médio</span>
                  </div>
                  <div className="text-xl font-bold">{stats.avg_time.toFixed(1)}s</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Demographic Analysis - Only shown when results are being displayed */}
        {session.session_status === 'showing_results' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Por Gênero</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_gender).map(([gender, data]) => (
                  <div key={gender} className="text-sm">
                    <div className="font-medium capitalize mb-1">{gender}</div>
                    <div className="pl-4 text-muted-foreground">
                      <div>Deferido: {data.deferido}</div>
                      <div>Indeferido: {data.indeferido}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Por Faixa Etária</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_age).map(([age, data]) => (
                  <div key={age} className="text-sm">
                    <div className="font-medium mb-1">{age}</div>
                    <div className="pl-4 text-muted-foreground">
                      <div>Deferido: {data.deferido}</div>
                      <div>Indeferido: {data.indeferido}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Por Região</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_region).map(([region, data]) => (
                  <div key={region} className="text-sm">
                    <div className="font-medium mb-1">{region}</div>
                    <div className="pl-4 text-muted-foreground">
                      <div>Deferido: {data.deferido}</div>
                      <div>Indeferido: {data.indeferido}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
