import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, SkipForward, BarChart3, Users, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw, Download, FileText, AlertTriangle, Activity } from "lucide-react";
import { getImageByPage } from "@/data/images";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Header } from '@/components/Header';
import { Badge } from "@/components/ui/badge";
import { RealtimeMetricsDashboard } from '@/components/RealtimeMetricsDashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [onlineParticipants, setOnlineParticipants] = useState(0);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [newVotePulse, setNewVotePulse] = useState(false);
  const [adminVote, setAdminVote] = useState<string | null>(null);
  const [savingAdminVote, setSavingAdminVote] = useState(false);
  const [canEarlyAdvance, setCanEarlyAdvance] = useState(false);
  const [resultsShownForPhoto, setResultsShownForPhoto] = useState<number | null>(null);
  const [showNextPhotoDialog, setShowNextPhotoDialog] = useState(false);
  const [showCompleteSessionDialog, setShowCompleteSessionDialog] = useState(false);
  const [allVotedSoundPlayed, setAllVotedSoundPlayed] = useState(false);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        navigate("/");
        return;
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  // Track online participants using Realtime Presence
  useEffect(() => {
    if (!sessionId) return;

    const presenceChannel = supabase.channel(`session-${sessionId}-presence`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        console.log("Presence sync - online participants:", count, state);
        setOnlineParticipants(count);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log("Presence join:", key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log("Presence leave:", key, leftPresences);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [sessionId]);

  // Function to play notification sound when new vote arrives
  const playVoteSound = () => {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // Function to play notification sound when all users have voted
  const playAllVotedSound = () => {
    const audioContext = new AudioContext();
    
    // Play a triple beep sound to indicate all users have voted
    [600, 750, 900].forEach((freq, index) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }, index * 100);
    });
  };

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
          const updatedSession = payload.new as SessionData;
          console.log("Session updated:", updatedSession);
          
          // Reset sound flag when photo changes
          if (session && updatedSession.current_photo !== session.current_photo) {
            setAllVotedSoundPlayed(false);
            setResultsShownForPhoto(null);
          }
          
          setSession(updatedSession);
          // Buscar stats com a sessão atualizada
          fetchStats(updatedSession);
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
        (payload) => {
          console.log("New avaliacao inserted:", payload);
          // Trigger pulse animation
          setNewVotePulse(true);
          setTimeout(() => setNewVotePulse(false), 4500);
          // Play notification sound
          playVoteSound();
          // Refazer busca de stats para garantir dados atualizados
          fetchSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(avaliationsChannel);
    };
  }, [sessionId]);

  // Enable early-advance button when everyone has voted and time remains
  useEffect(() => {
    if (!session || session.session_status !== 'active') {
      setCanEarlyAdvance(false);
      return;
    }
    if (onlineParticipants <= 0) {
      setCanEarlyAdvance(false);
      return;
    }

    const allVoted = stats.responses_current_photo > 0 &&
      stats.responses_current_photo === onlineParticipants;
    const can = allVoted && timeRemaining > 0;

    setCanEarlyAdvance(can);
    
    // Play sound and show toast when all users vote (only once per photo)
    if (can && !allVotedSoundPlayed) {
      setAllVotedSoundPlayed(true);
      playAllVotedSound();
      toast({
        title: "✓ Todos votaram!",
        description: "Você pode liberar a próxima foto agora.",
        duration: 5000,
      });
    }
    
    console.log('Early-advance eligibility:', {
      responses: stats.responses_current_photo,
      online: onlineParticipants,
      timeRemaining,
      can,
    });
  }, [stats.responses_current_photo, onlineParticipants, session, timeRemaining, allVotedSoundPlayed, toast]);

  useEffect(() => {
    if (!session || session.session_status !== 'active' || !session.photo_start_time) return;

    const interval = setInterval(() => {
      const startTime = new Date(session.photo_start_time!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, session.photo_duration - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining === 0 && resultsShownForPhoto !== session.current_photo) {
        setResultsShownForPhoto(session.current_photo);
        handleShowResults();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, resultsShownForPhoto]);

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
    // Passar os dados da sessão para fetchStats
    fetchStats(data);
  };

  const fetchStats = async (sessionData?: SessionData) => {
    const currentSession = sessionData || session;
    if (!currentSession) return;

    console.log("Fetching stats for session:", sessionId, "photo:", currentSession.current_photo);

    // Check if admin has voted on current photo
    const { data: adminVoteData } = await supabase
      .from("avaliacoes")
      .select("resposta")
      .eq("session_id", sessionId)
      .eq("foto_id", currentSession.current_photo)
      .eq("user_id", user?.id)
      .eq("is_admin_vote", true)
      .maybeSingle();
    
    setAdminVote(adminVoteData?.resposta || null);

    // Get all participants
    const { data: participants } = await supabase
      .from("profiles")
      .select("user_id");

    // Get responses for current photo - use data directly from avaliacoes table
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from("avaliacoes")
      .select("*")
      .eq("session_id", sessionId)
      .eq("foto_id", currentSession.current_photo);

    if (avaliacoesError) {
      console.error("Error fetching avaliacoes:", avaliacoesError);
      return;
    }

    console.log("Avaliacoes fetched:", avaliacoes?.length, avaliacoes);

    const total_participants = participants?.length || 0;
    const responses = avaliacoes || [];

    const deferido = responses.filter(r => r.resposta === "DEFERIDO").length;
    const indeferido = responses.filter(r => r.resposta === "INDEFERIDO").length;
    const nao_respondido = responses.filter(r => r.resposta === "NÃO_RESPONDIDO").length;

    console.log("Counts:", { deferido, indeferido, nao_respondido });

    // Group by demographics - use data directly from avaliacoes
    const by_gender: Record<string, any> = {};
    const by_age: Record<string, any> = {};
    const by_region: Record<string, any> = {};

    responses.forEach((r: any) => {
      // Convert response to key format
      const responseKey = r.resposta === "DEFERIDO" ? "deferido" 
        : r.resposta === "INDEFERIDO" ? "indeferido" 
        : "nao_respondido";
      
      // Gender
      if (r.genero) {
        if (!by_gender[r.genero]) {
          by_gender[r.genero] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
        }
        by_gender[r.genero][responseKey] += 1;
      }

      // Age
      if (r.faixa_etaria) {
        if (!by_age[r.faixa_etaria]) {
          by_age[r.faixa_etaria] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
        }
        by_age[r.faixa_etaria][responseKey] += 1;
      }

      // Region
      if (r.regiao) {
        if (!by_region[r.regiao]) {
          by_region[r.regiao] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
        }
        by_region[r.regiao][responseKey] += 1;
      }
    });

    console.log("Demographics:", { by_gender, by_age, by_region });

    const avg_time = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.tempo_gasto, 0) / responses.length / 1000
      : 0;

    const newStats = {
      total_participants,
      responses_current_photo: responses.length,
      deferido,
      indeferido,
      nao_respondido,
      by_gender,
      by_age,
      by_region,
      avg_time,
    };

    setStats(newStats);
    console.log("Stats updated:", newStats);
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

  const handleCompleteSession = async () => {
    setShowCompleteSessionDialog(false);

    const { error } = await supabase
      .from("sessions")
      .update({ session_status: 'completed' })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a sessão",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sessão Finalizada",
      description: "Todas as 30 fotos foram avaliadas!",
    });
  };

  const handleNextPhoto = async () => {
    if (!session) return;

    setShowNextPhotoDialog(false);

    if (session.current_photo >= 30) {
      setShowCompleteSessionDialog(true);
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

  const handleBackToStart = async () => {
    if (!session) return;

    const { error } = await supabase
      .from("sessions")
      .update({ 
        current_photo: 1,
        photo_start_time: new Date().toISOString(),
        session_status: 'waiting'
      })
      .eq("id", sessionId);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível voltar ao início",
        variant: "destructive",
      });
      return;
    }

    // Delete all evaluations for this session
    await supabase
      .from("avaliacoes")
      .delete()
      .eq("session_id", sessionId);

    toast({
      title: "Voltou ao Início",
      description: "Sessão reiniciada na foto 1. Todas as avaliações foram apagadas.",
    });
  };

  const handleAdminVote = async (decision: string) => {
    if (!session || !user) return;

    try {
      setSavingAdminVote(true);

      // Get admin profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("genero, faixa_etaria, regiao")
        .eq("user_id", user.id)
        .maybeSingle();

      // Delete existing admin vote for this photo if any
      await supabase
        .from("avaliacoes")
        .delete()
        .eq("session_id", sessionId)
        .eq("foto_id", session.current_photo)
        .eq("user_id", user.id)
        .eq("is_admin_vote", true);

      // Insert new admin vote
      const { error } = await supabase
        .from("avaliacoes")
        .insert({
          session_id: sessionId,
          user_id: user.id,
          foto_id: session.current_photo,
          resposta: decision,
          tempo_gasto: 0,
          genero: profile?.genero,
          faixa_etaria: profile?.faixa_etaria,
          regiao: profile?.regiao,
          is_admin_vote: true,
        });

      if (error) throw error;

      setAdminVote(decision);
      toast({
        title: "Voto registrado",
        description: `Seu voto "${decision}" foi salvo`,
      });
    } catch (error) {
      console.error("Error saving admin vote:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar seu voto",
        variant: "destructive",
      });
    } finally {
      setSavingAdminVote(false);
    }
  };

  const handleExportCSV = async () => {
    if (!session || exportingCSV) return;

    setExportingCSV(true);
    
    try {
      toast({
        title: "Preparando exportação CSV...",
        description: "Coletando dados da sessão",
      });

      // Get all evaluations for this session
      const { data: avaliacoes, error } = await supabase
        .from("avaliacoes")
        .select(`
          foto_id,
          resposta,
          tempo_gasto,
          created_at,
          genero,
          faixa_etaria,
          regiao
        `)
        .eq("session_id", sessionId)
        .order("foto_id", { ascending: true });

      if (error || !avaliacoes) {
        toast({
          title: "Erro",
          description: "Não foi possível coletar os dados",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Gerando CSV...",
        description: `Processando ${avaliacoes.length} avaliações`,
      });

      // Format data for CSV
      const csvData = avaliacoes.map((a) => ({
        "Foto": a.foto_id,
        "Resposta": a.resposta,
        "Tempo (segundos)": (a.tempo_gasto / 1000).toFixed(2),
        "Gênero": a.genero || "Não informado",
        "Faixa Etária": a.faixa_etaria || "Não informado",
        "Região": a.regiao || "Não informado",
        "Data/Hora": format(new Date(a.created_at), "dd/MM/yyyy HH:mm:ss"),
      }));

      // Generate CSV
      const Papa = await import('papaparse');
      const csv = Papa.unparse(csvData as any);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${session.nome}_resultados_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Exportado!",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao gerar o CSV",
        variant: "destructive",
      });
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    if (!session || exportingPDF) return;

    setExportingPDF(true);

    try {
      toast({
        title: "Preparando PDF...",
        description: "Coletando dados e gerando gráficos",
      });

      // Helper function to generate pie chart
      const generatePieChart = (data: {label: string, value: number, color: string}[]): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;
      
      const centerX = 150;
      const centerY = 130;
      const radius = 100;
      let currentAngle = -Math.PI / 2;
      const total = data.reduce((sum, d) => sum + d.value, 0);
      
      // Draw pie slices
      data.forEach(item => {
        const sliceAngle = (item.value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
      });
      
      // Draw legend
      let legendY = 20;
      data.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(270, legendY, 20, 20);
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        const percent = ((item.value / total) * 100).toFixed(1);
        ctx.fillText(`${item.label}: ${item.value} (${percent}%)`, 295, legendY + 15);
        legendY += 30;
      });
      
      return canvas.toDataURL('image/png');
    };

    // Helper function to generate bar chart
    const generateBarChart = (data: {label: string, deferido: number, indeferido: number, naoRespondido: number}[]): string => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 300;
      const ctx = canvas.getContext('2d')!;
      
      const chartHeight = 200;
      const chartWidth = 550;
      const startX = 40;
      const startY = 230;
      const barWidth = Math.min(50, chartWidth / (data.length * 3 + 1));
      const gap = 10;
      
      // Find max value for scaling
      const maxValue = Math.max(...data.map(d => Math.max(d.deferido, d.indeferido, d.naoRespondido)));
      const scale = chartHeight / (maxValue + 5);
      
      // Draw bars
      data.forEach((item, index) => {
        const x = startX + index * (barWidth * 3 + gap * 4);
        
        // Deferido (green)
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
        const defH = item.deferido * scale;
        ctx.fillRect(x, startY - defH, barWidth, defH);
        
        // Indeferido (red)
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        const indH = item.indeferido * scale;
        ctx.fillRect(x + barWidth + gap, startY - indH, barWidth, indH);
        
        // Não Respondido (gray)
        ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
        const nrH = item.naoRespondido * scale;
        ctx.fillRect(x + (barWidth + gap) * 2, startY - nrH, barWidth, nrH);
        
        // Label
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.label.substring(0, 10), x + (barWidth * 3 + gap * 2) / 2, startY + 15);
      });
      
      // Draw legend
      ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      ctx.fillRect(startX, 260, 15, 15);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Deferido', startX + 20, 272);
      
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.fillRect(startX + 100, 260, 15, 15);
      ctx.fillStyle = '#000000';
      ctx.fillText('Indeferido', startX + 120, 272);
      
      ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
      ctx.fillRect(startX + 200, 260, 15, 15);
      ctx.fillStyle = '#000000';
      ctx.fillText('Não Respondido', startX + 220, 272);
      
      return canvas.toDataURL('image/png');
    };

    // Get all evaluations for this session
    const { data: avaliacoes } = await supabase
      .from("avaliacoes")
      .select("foto_id, resposta, tempo_gasto, genero, faixa_etaria, regiao")
      .eq("session_id", sessionId);

    if (!avaliacoes) {
      toast({
        title: "Erro",
        description: "Não foi possível coletar os dados",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Gerando gráficos...",
      description: `Processando ${avaliacoes.length} avaliações`,
    });

    // Dynamically import jsPDF to avoid heavy initial bundle
    const { default: JsPDF } = await import('jspdf');

    const pdf = new JsPDF();
    let yPos = 20;

    // Title
    pdf.setFontSize(20);
    pdf.text(session.nome, 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(12);
    pdf.text(`Data: ${format(new Date(session.data), "dd/MM/yyyy")}`, 20, yPos);
    yPos += 10;
    pdf.text(`Total de Avaliações: ${avaliacoes.length}`, 20, yPos);
    yPos += 15;

    // Overall Statistics
    const totalDeferido = avaliacoes.filter(a => a.resposta === "DEFERIDO").length;
    const totalIndeferido = avaliacoes.filter(a => a.resposta === "INDEFERIDO").length;
    const totalNaoRespondido = avaliacoes.filter(a => a.resposta === "NÃO_RESPONDIDO").length;
    const avgTime = avaliacoes.reduce((sum, a) => sum + a.tempo_gasto, 0) / avaliacoes.length / 1000;

    // Generate and add pie chart
    const pieChartImg = generatePieChart([
      { label: 'Deferido', value: totalDeferido, color: 'rgba(34, 197, 94, 0.8)' },
      { label: 'Indeferido', value: totalIndeferido, color: 'rgba(239, 68, 68, 0.8)' },
      { label: 'Não Respondido', value: totalNaoRespondido, color: 'rgba(156, 163, 175, 0.8)' }
    ]);
    
    pdf.setFontSize(16);
    pdf.text("Resultados Gerais", 20, yPos);
    yPos += 10;
    pdf.addImage(pieChartImg, 'PNG', 20, yPos, 100, 75);
    yPos += 85;

    pdf.setFontSize(12);
    pdf.text(`Tempo Médio: ${avgTime.toFixed(2)}s`, 20, yPos);
    yPos += 15;

    // Demographics - Gender
    const byGender: Record<string, any> = {};
    avaliacoes.forEach(a => {
      if (!byGender[a.genero || "Não informado"]) {
        byGender[a.genero || "Não informado"] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      byGender[a.genero || "Não informado"][a.resposta === "DEFERIDO" ? "deferido" : a.resposta === "INDEFERIDO" ? "indeferido" : "nao_respondido"]++;
    });

    if (yPos > 200) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(16);
    pdf.text("Análise por Gênero", 20, yPos);
    yPos += 10;
    
    const genderChartData = Object.entries(byGender).map(([label, data]: [string, any]) => ({
      label,
      deferido: data.deferido,
      indeferido: data.indeferido,
      naoRespondido: data.nao_respondido
    }));
    
    const genderChartImg = generateBarChart(genderChartData);
    pdf.addImage(genderChartImg, 'PNG', 15, yPos, 180, 90);
    yPos += 100;

    // Demographics - Age
    const byAge: Record<string, any> = {};
    avaliacoes.forEach(a => {
      if (!byAge[a.faixa_etaria || "Não informado"]) {
        byAge[a.faixa_etaria || "Não informado"] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      byAge[a.faixa_etaria || "Não informado"][a.resposta === "DEFERIDO" ? "deferido" : a.resposta === "INDEFERIDO" ? "indeferido" : "nao_respondido"]++;
    });

    if (yPos > 170) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.setFontSize(16);
    pdf.text("Análise por Faixa Etária", 20, yPos);
    yPos += 10;

    const ageChartData = Object.entries(byAge).map(([label, data]: [string, any]) => ({
      label,
      deferido: data.deferido,
      indeferido: data.indeferido,
      naoRespondido: data.nao_respondido
    }));
    
    const ageChartImg = generateBarChart(ageChartData);
    pdf.addImage(ageChartImg, 'PNG', 15, yPos, 180, 90);
    yPos += 100;

    // Demographics - Region
    const byRegion: Record<string, any> = {};
    avaliacoes.forEach(a => {
      if (!byRegion[a.regiao || "Não informado"]) {
        byRegion[a.regiao || "Não informado"] = { deferido: 0, indeferido: 0, nao_respondido: 0 };
      }
      byRegion[a.regiao || "Não informado"][a.resposta === "DEFERIDO" ? "deferido" : a.resposta === "INDEFERIDO" ? "indeferido" : "nao_respondido"]++;
    });

    if (yPos > 170) {
      pdf.addPage();
      yPos = 20;
    }
    
    pdf.setFontSize(16);
    pdf.text("Análise por Região", 20, yPos);
    yPos += 10;

    const regionChartData = Object.entries(byRegion).map(([label, data]: [string, any]) => ({
      label,
      deferido: data.deferido,
      indeferido: data.indeferido,
      naoRespondido: data.nao_respondido
    }));
    
    const regionChartImg = generateBarChart(regionChartData);
    pdf.addImage(regionChartImg, 'PNG', 15, yPos, 180, 90);

    // Save PDF
    pdf.save(`${session.nome}_relatorio_${format(new Date(), "yyyy-MM-dd")}.pdf`);

    toast({
      title: "PDF Gerado!",
      description: "Relatório com gráficos baixado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    toast({
      title: "Erro na exportação",
      description: "Ocorreu um erro ao gerar o PDF",
      variant: "destructive",
    });
  } finally {
    setExportingPDF(false);
  }
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
    <>
      <Header />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{session.nome}</h1>
              <p className="text-muted-foreground">Controle Ao Vivo - Foto {session.current_photo}/30</p>
            </div>
            <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportCSV} 
              disabled={exportingCSV || exportingPDF}
              className="gap-2"
            >
              <FileText className={`w-4 h-4 ${exportingCSV ? 'animate-pulse' : ''}`} />
              {exportingCSV ? "Gerando CSV..." : "Exportar CSV"}
            </Button>
              <Button 
                variant="outline" 
                onClick={handleExportPDF} 
                disabled={exportingCSV || exportingPDF}
                className="gap-2"
              >
                <Download className={`w-4 h-4 ${exportingPDF ? 'animate-pulse' : ''}`} />
                {exportingPDF ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/admin/divergence/${sessionId}`)}
                className="gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Análise de Divergências
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin")}>
                Voltar
              </Button>
          </div>
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
              {session.session_status === 'waiting' && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Participantes na Antessala</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Online agora:</span>
                      <span className="text-2xl font-bold text-primary">{onlineParticipants}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total de perfis:</span>
                      <span className="text-lg font-semibold">{stats.total_participants}</span>
                    </div>
                    <Progress 
                      value={stats.total_participants > 0 ? (onlineParticipants / stats.total_participants) * 100 : 0} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {stats.total_participants > 0 
                        ? `${((onlineParticipants / stats.total_participants) * 100).toFixed(1)}% dos participantes online`
                        : 'Nenhum participante cadastrado'
                      }
                    </p>
                  </div>
                </div>
              )}
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
                  <Button onClick={() => setShowNextPhotoDialog(true)} size="lg" className="gap-2">
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
                  {canEarlyAdvance && (
                    <div className="flex flex-col items-center gap-2">
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                        ✓ Todos votaram
                      </Badge>
                      <Button onClick={() => setShowNextPhotoDialog(true)} size="lg" className="gap-2">
                        <SkipForward className="w-5 h-5" />
                        Liberar próxima foto
                      </Button>
                    </div>
                  )}
                  <Button onClick={handleShowResults} variant="outline" className="gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Mostrar Resultados Agora
                  </Button>
                  <Button onClick={handleRestartPhoto} size="default" variant="destructive" className="gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Reiniciar Foto
                  </Button>
                  <Button onClick={handleBackToStart} size="default" variant="outline" className="gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Voltar ao Início
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
                <div className="space-y-4">
                  <img
                    src={currentImage.imageUrl}
                    alt={currentImage.nome}
                    className="w-full rounded-lg shadow-lg"
                  />
                  
                  {/* Admin Voting Controls */}
                  {session.session_status === 'active' && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground">Seu Voto (Administrador)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleAdminVote("DEFERIDO")}
                          disabled={savingAdminVote}
                          variant={adminVote === "DEFERIDO" ? "default" : "outline"}
                          className={`h-12 ${adminVote === "DEFERIDO" ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                        >
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Deferido
                        </Button>
                        <Button
                          onClick={() => handleAdminVote("INDEFERIDO")}
                          disabled={savingAdminVote}
                          variant={adminVote === "INDEFERIDO" ? "destructive" : "outline"}
                          className="h-12"
                        >
                          <XCircle className="mr-2 h-5 w-5" />
                          Indeferido
                        </Button>
                      </div>
                      {adminVote && (
                        <p className="text-xs text-center text-muted-foreground">
                          ✓ Você votou: {adminVote}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>

          {/* Real-time Stats */}
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participação em Tempo Real
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{onlineParticipants}</div>
                  <div className="text-sm text-muted-foreground">Online Agora</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.responses_current_photo}</div>
                  <div className="text-sm text-muted-foreground">Já Votaram</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-muted-foreground">{onlineParticipants - stats.responses_current_photo}</div>
                  <div className="text-sm text-muted-foreground">Aguardando</div>
                </div>
              </div>
              {onlineParticipants > 0 && (
                <div className="mt-4">
                  <Progress 
                    value={(stats.responses_current_photo / onlineParticipants) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    {Math.round((stats.responses_current_photo / onlineParticipants) * 100)}% dos participantes votaram
                  </p>
                </div>
              )}
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

        {/* Realtime Metrics Dashboard - Always visible during active session */}
        {session.session_status === 'active' && (
          <div className="mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Dashboard de Métricas em Tempo Real
              </h2>
              <p className="text-muted-foreground mt-1">
                Acompanhe o engajamento e as respostas dos participantes em tempo real
              </p>
            </div>
            <RealtimeMetricsDashboard 
              sessionId={sessionId!}
              currentPhoto={session.current_photo}
              sessionStatus={session.session_status}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showNextPhotoDialog} onOpenChange={setShowNextPhotoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avançar para próxima foto?</AlertDialogTitle>
            <AlertDialogDescription>
              {session && session.current_photo >= 30 
                ? "Esta é a última foto. Ao confirmar, a sessão será finalizada."
                : "Tem certeza que deseja liberar a próxima foto para os participantes?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleNextPhoto}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCompleteSessionDialog} onOpenChange={setShowCompleteSessionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as 30 fotos foram avaliadas. Tem certeza que deseja finalizar a sessão?
              Esta ação marcará a sessão como concluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSession}>Finalizar Sessão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
}
