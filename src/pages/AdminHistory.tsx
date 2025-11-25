import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  Sheet, 
  CalendarDays, 
  Users, 
  Image as ImageIcon,
  ArrowLeft,
  Loader
} from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface Session {
  id: string;
  nome: string;
  data: string;
  session_status: string;
  current_photo: number;
}

interface SessionStats {
  total_votes: number;
  deferidos: number;
  indeferidos: number;
  participants: number;
  photos_evaluated: number;
}

interface DemographicData {
  genero: string;
  faixa_etaria: string;
  regiao: string;
  pertencimento_racial: string;
  experiencia_bancas: string;
  resposta: string;
  count: number;
}

interface PhotoData {
  foto_id: number;
  deferidos: number;
  indeferidos: number;
  total: number;
}

export default function AdminHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<string | null>(null);
  const [exportingPhotoPdf, setExportingPhotoPdf] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionPhotos, setSessionPhotos] = useState<Record<string, PhotoData[]>>({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const loadSessionPhotos = async (sessionId: string) => {
    if (sessionPhotos[sessionId]) return; // Already loaded
    
    try {
      const { data: votes, error } = await supabase
        .from("avaliacoes")
        .select("foto_id, resposta")
        .eq("session_id", sessionId);

      if (error) throw error;

      const photoStats: Record<number, PhotoData> = {};
      votes?.forEach(vote => {
        if (!photoStats[vote.foto_id]) {
          photoStats[vote.foto_id] = { 
            foto_id: vote.foto_id, 
            deferidos: 0, 
            indeferidos: 0, 
            total: 0 
          };
        }
        photoStats[vote.foto_id].total++;
        if (vote.resposta === "DEFERIDO") photoStats[vote.foto_id].deferidos++;
        if (vote.resposta === "INDEFERIDO") photoStats[vote.foto_id].indeferidos++;
      });

      const photosArray = Object.values(photoStats).sort((a, b) => a.foto_id - b.foto_id);
      setSessionPhotos(prev => ({ ...prev, [sessionId]: photosArray }));
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fotos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleSession = (sessionId: string) => {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      loadSessionPhotos(sessionId);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_status", "showing_results")
        .order("data", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sessões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async (sessionId: string) => {
    // Fetch all votes for the session
    const { data: votes, error: votesError } = await supabase
      .from("avaliacoes")
      .select(`
        *,
        profiles (
          genero,
          faixa_etaria,
          regiao,
          pertencimento_racial,
          experiencia_bancas
        )
      `)
      .eq("session_id", sessionId);

    if (votesError) throw votesError;

    // Calculate stats
    const stats: SessionStats = {
      total_votes: votes?.length || 0,
      deferidos: votes?.filter(v => v.resposta === "DEFERIDO").length || 0,
      indeferidos: votes?.filter(v => v.resposta === "INDEFERIDO").length || 0,
      participants: new Set(votes?.map(v => v.user_id)).size,
      photos_evaluated: new Set(votes?.map(v => v.foto_id)).size,
    };

    // Group by photo
    const photoStats = votes?.reduce((acc: any, vote) => {
      if (!acc[vote.foto_id]) {
        acc[vote.foto_id] = { deferidos: 0, indeferidos: 0, total: 0 };
      }
      acc[vote.foto_id].total++;
      if (vote.resposta === "DEFERIDO") acc[vote.foto_id].deferidos++;
      if (vote.resposta === "INDEFERIDO") acc[vote.foto_id].indeferidos++;
      return acc;
    }, {});

    // Demographic analysis
    const demographicData: DemographicData[] = [];
    const demographics = ['genero', 'faixa_etaria', 'regiao', 'pertencimento_racial', 'experiencia_bancas'];
    
    demographics.forEach(demo => {
      const groups: any = {};
      votes?.forEach(vote => {
        const profile = (vote as any).profiles;
        if (profile && profile[demo]) {
          const key = `${profile[demo]}_${vote.resposta}`;
          groups[key] = (groups[key] || 0) + 1;
        }
      });

      Object.entries(groups).forEach(([key, count]) => {
        const [value, resposta] = key.split('_');
        demographicData.push({
          [demo]: value,
          resposta,
          count: count as number,
        } as any);
      });
    });

    return { stats, photoStats, demographicData, votes };
  };

  const exportToPDF = async (session: Session) => {
    try {
      setExportingPdf(session.id);
      const { stats, photoStats, demographicData } = await fetchSessionData(session.id);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text("Relatório de Sessão", pageWidth / 2, yPos, { align: "center" });
      
      yPos += 15;
      doc.setFontSize(12);
      doc.text(`Sessão: ${session.nome}`, 20, yPos);
      yPos += 7;
      doc.text(`Data: ${new Date(session.data).toLocaleDateString("pt-BR")}`, 20, yPos);
      
      // Overall Stats
      yPos += 15;
      doc.setFontSize(14);
      doc.text("Estatísticas Gerais", 20, yPos);
      yPos += 10;
      doc.setFontSize(11);
      doc.text(`Total de Votos: ${stats.total_votes}`, 20, yPos);
      yPos += 7;
      doc.text(`Deferidos: ${stats.deferidos} (${((stats.deferidos/stats.total_votes)*100).toFixed(1)}%)`, 20, yPos);
      yPos += 7;
      doc.text(`Indeferidos: ${stats.indeferidos} (${((stats.indeferidos/stats.total_votes)*100).toFixed(1)}%)`, 20, yPos);
      yPos += 7;
      doc.text(`Participantes: ${stats.participants}`, 20, yPos);
      yPos += 7;
      doc.text(`Fotos Avaliadas: ${stats.photos_evaluated}`, 20, yPos);

      // Photo Stats
      yPos += 15;
      doc.setFontSize(14);
      doc.text("Resultados por Foto", 20, yPos);
      yPos += 10;
      doc.setFontSize(11);

      Object.entries(photoStats).forEach(([photoId, data]: [string, any]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`Foto ${photoId}: ${data.deferidos}D / ${data.indeferidos}I (Total: ${data.total})`, 20, yPos);
        yPos += 7;
      });

      // Demographic Analysis
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      yPos += 10;
      doc.setFontSize(14);
      doc.text("Análise Demográfica", 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text("(Distribuição de votos por características demográficas)", 20, yPos);

      doc.save(`relatorio_${session.nome.replace(/\s+/g, '_')}_${session.data}.pdf`);
      
      toast({
        title: "Relatório exportado",
        description: "PDF gerado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportingPdf(null);
    }
  };

  const exportToExcel = async (session: Session) => {
    try {
      setExportingExcel(session.id);
      const { stats, photoStats, demographicData, votes } = await fetchSessionData(session.id);

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Overall Stats
      const statsData = [
        ["Sessão", session.nome],
        ["Data", new Date(session.data).toLocaleDateString("pt-BR")],
        [""],
        ["Total de Votos", stats.total_votes],
        ["Deferidos", stats.deferidos, `${((stats.deferidos/stats.total_votes)*100).toFixed(1)}%`],
        ["Indeferidos", stats.indeferidos, `${((stats.indeferidos/stats.total_votes)*100).toFixed(1)}%`],
        ["Participantes", stats.participants],
        ["Fotos Avaliadas", stats.photos_evaluated],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws1, "Estatísticas");

      // Sheet 2: Photo Stats
      const photoData = [["Foto ID", "Deferidos", "Indeferidos", "Total", "% Deferidos"]];
      Object.entries(photoStats).forEach(([photoId, data]: [string, any]) => {
        photoData.push([
          photoId,
          data.deferidos,
          data.indeferidos,
          data.total,
          `${((data.deferidos/data.total)*100).toFixed(1)}%`
        ]);
      });
      const ws2 = XLSX.utils.aoa_to_sheet(photoData);
      XLSX.utils.book_append_sheet(wb, ws2, "Por Foto");

      // Sheet 3: Demographic Analysis
      const demoHeaders = ["Categoria", "Valor", "Resposta", "Quantidade"];
      const demoData = [demoHeaders];
      demographicData.forEach(item => {
        const category = Object.keys(item).find(k => k !== 'resposta' && k !== 'count') || '';
        demoData.push([
          category,
          (item as any)[category],
          item.resposta,
          item.count
        ]);
      });
      const ws3 = XLSX.utils.aoa_to_sheet(demoData);
      XLSX.utils.book_append_sheet(wb, ws3, "Análise Demográfica");

      // Sheet 4: All Votes
      const votesHeaders = ["Foto ID", "Resposta", "Tempo (s)", "Gênero", "Faixa Etária", "Região"];
      const votesData = [votesHeaders];
      votes?.forEach(vote => {
        const profile = (vote as any).profiles;
        votesData.push([
          vote.foto_id,
          vote.resposta,
          vote.tempo_gasto,
          profile?.genero || "N/A",
          profile?.faixa_etaria || "N/A",
          profile?.regiao || "N/A"
        ]);
      });
      const ws4 = XLSX.utils.aoa_to_sheet(votesData);
      XLSX.utils.book_append_sheet(wb, ws4, "Todos os Votos");

      // Save file
      XLSX.writeFile(wb, `relatorio_${session.nome.replace(/\s+/g, '_')}_${session.data}.xlsx`);
      
      toast({
        title: "Relatório exportado",
        description: "Excel gerado com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar Excel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportingExcel(null);
    }
  };

  const exportPhotoToPDF = async (sessionName: string, photoData: PhotoData) => {
    try {
      setExportingPhotoPdf(`${photoData.foto_id}`);
      
      // Fetch demographic data for this photo
      const { data: votes, error } = await supabase
        .from("avaliacoes")
        .select(`
          resposta,
          profiles (
            genero,
            faixa_etaria,
            regiao
          )
        `)
        .eq("foto_id", photoData.foto_id);

      if (error) throw error;

      // Process demographic data
      const demoStats = {
        genero: {} as Record<string, { deferidos: number; indeferidos: number }>,
        faixa_etaria: {} as Record<string, { deferidos: number; indeferidos: number }>,
        regiao: {} as Record<string, { deferidos: number; indeferidos: number }>,
      };

      votes?.forEach((vote: any) => {
        const profile = vote.profiles;
        if (!profile) return;

        ['genero', 'faixa_etaria', 'regiao'].forEach((demo) => {
          const value = profile[demo];
          if (!value) return;
          
          if (!demoStats[demo as keyof typeof demoStats][value]) {
            demoStats[demo as keyof typeof demoStats][value] = { deferidos: 0, indeferidos: 0 };
          }
          
          if (vote.resposta === "DEFERIDO") {
            demoStats[demo as keyof typeof demoStats][value].deferidos++;
          } else {
            demoStats[demo as keyof typeof demoStats][value].indeferidos++;
          }
        });
      });
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Load image
      const imageUrl = `/images/foto-${photoData.foto_id}.jpg`;
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Title
      doc.setFontSize(18);
      doc.text(`Foto ${photoData.foto_id}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Add image - scaled to fit nicely
      const imgWidth = 80;
      const imgHeight = (img.height / img.width) * imgWidth;
      const imgX = 20;
      doc.addImage(img, "JPEG", imgX, yPos, imgWidth, imgHeight);

      // Results panel next to image
      const panelX = imgX + imgWidth + 15;
      const panelY = yPos;
      
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text("Resultados", panelX, panelY);
      
      doc.setFontSize(14);
      doc.setFont(undefined, "normal");
      
      const totalVotes = photoData.total;
      const defPercent = ((photoData.deferidos / totalVotes) * 100).toFixed(1);
      const indefPercent = ((photoData.indeferidos / totalVotes) * 100).toFixed(1);
      
      // Deferidos
      doc.setDrawColor(34, 197, 94);
      doc.setFillColor(34, 197, 94);
      doc.rect(panelX, panelY + 10, 60, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text("DEFERIDOS", panelX + 30, panelY + 18, { align: "center" });
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(`${photoData.deferidos}`, panelX + 30, panelY + 26, { align: "center" });
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`${defPercent}%`, panelX + 30, panelY + 31, { align: "center" });
      
      // Indeferidos
      doc.setDrawColor(239, 68, 68);
      doc.setFillColor(239, 68, 68);
      doc.rect(panelX, panelY + 35, 60, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text("INDEFERIDOS", panelX + 30, panelY + 43, { align: "center" });
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.text(`${photoData.indeferidos}`, panelX + 30, panelY + 51, { align: "center" });
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`${indefPercent}%`, panelX + 30, panelY + 56, { align: "center" });
      
      // Total votes
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Total de votos: ${totalVotes}`, panelX, panelY + 70);

      // New page for demographic charts
      doc.addPage();
      yPos = 20;

      // Helper function to draw pie chart
      const drawPieChart = (x: number, y: number, radius: number, data: Array<{ label: string; value: number; color: number[] }>) => {
        let startAngle = -90;
        const total = data.reduce((sum, d) => sum + d.value, 0);
        
        data.forEach(item => {
          const sliceAngle = (item.value / total) * 360;
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
          
          // Draw slice
          const endAngle = startAngle + sliceAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          
          doc.moveTo(x, y);
          doc.lineTo(x + radius * Math.cos(startRad), y + radius * Math.sin(startRad));
          
          for (let a = startAngle; a <= endAngle; a += 5) {
            const rad = (a * Math.PI) / 180;
            doc.lineTo(x + radius * Math.cos(rad), y + radius * Math.sin(rad));
          }
          
          doc.lineTo(x + radius * Math.cos(endRad), y + radius * Math.sin(endRad));
          doc.lineTo(x, y);
          doc.fill();
          
          startAngle = endAngle;
        });
      };

      // Helper function to draw bar chart
      const drawBarChart = (startX: number, startY: number, data: Array<{ label: string; deferidos: number; indeferidos: number }>, maxBarHeight: number) => {
        const barWidth = 30;
        const gap = 10;
        const maxValue = Math.max(...data.map(d => Math.max(d.deferidos, d.indeferidos)));
        
        data.forEach((item, index) => {
          const x = startX + index * (barWidth * 2 + gap);
          
          // Deferidos bar
          const defHeight = (item.deferidos / maxValue) * maxBarHeight;
          doc.setFillColor(34, 197, 94);
          doc.rect(x, startY - defHeight, barWidth, defHeight, "F");
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text(`${item.deferidos}`, x + barWidth/2, startY - defHeight - 2, { align: "center" });
          
          // Indeferidos bar
          const indefHeight = (item.indeferidos / maxValue) * maxBarHeight;
          doc.setFillColor(239, 68, 68);
          doc.rect(x + barWidth, startY - indefHeight, barWidth, indefHeight, "F");
          doc.text(`${item.indeferidos}`, x + barWidth + barWidth/2, startY - indefHeight - 2, { align: "center" });
          
          // Label
          doc.setFontSize(7);
          doc.text(item.label.substring(0, 8), x + barWidth, startY + 5, { align: "center" });
        });
        
        // Legend
        doc.setFillColor(34, 197, 94);
        doc.rect(startX, startY + 15, 8, 8, "F");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text("Deferidos", startX + 10, startY + 21);
        
        doc.setFillColor(239, 68, 68);
        doc.rect(startX + 50, startY + 15, 8, 8, "F");
        doc.text("Indeferidos", startX + 60, startY + 21);
      };

      // Demographic Charts Title
      doc.setFontSize(16);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Análise Demográfica", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // Gender Pie Chart
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Distribuição por Gênero", 20, yPos);
      yPos += 10;
      
      const generoData = Object.entries(demoStats.genero).map(([label, counts], index) => ({
        label,
        value: counts.deferidos + counts.indeferidos,
        color: [[66, 135, 245], [245, 158, 66], [153, 102, 255], [102, 187, 106]][index % 4]
      }));
      
      if (generoData.length > 0) {
        drawPieChart(50, yPos + 20, 25, generoData);
        
        // Legend
        let legendY = yPos + 5;
        generoData.forEach((item, index) => {
          doc.setFillColor(item.color[0], item.color[1], item.color[2]);
          doc.rect(90, legendY, 5, 5, "F");
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`${item.label}: ${item.value}`, 98, legendY + 4);
          legendY += 8;
        });
      }

      // Age Group Bar Chart
      yPos += 60;
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Votos por Faixa Etária", 20, yPos);
      yPos += 10;
      
      const faixaData = Object.entries(demoStats.faixa_etaria).map(([label, counts]) => ({
        label,
        deferidos: counts.deferidos,
        indeferidos: counts.indeferidos
      }));
      
      if (faixaData.length > 0) {
        drawBarChart(20, yPos + 50, faixaData, 40);
      }

      // Region Bar Chart
      yPos += 90;
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont(undefined, "bold");
      doc.text("Votos por Região", 20, yPos);
      yPos += 10;
      
      const regiaoData = Object.entries(demoStats.regiao).map(([label, counts]) => ({
        label,
        deferidos: counts.deferidos,
        indeferidos: counts.indeferidos
      }));
      
      if (regiaoData.length > 0) {
        drawBarChart(20, yPos + 50, regiaoData.slice(0, 5), 40);
      }

      // Session info at bottom of first page
      doc.setPage(1);
      yPos = Math.max(imgHeight + 35, 130);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Sessão: ${sessionName}`, 20, yPos);

      doc.save(`Foto-${photoData.foto_id}.pdf`);
      
      toast({
        title: "Relatório exportado",
        description: `PDF da Foto ${photoData.foto_id} com gráficos demográficos gerado com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExportingPhotoPdf(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/trainings")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Histórico de Sessões</h1>
          <p className="text-muted-foreground">
            Visualize e exporte relatórios de sessões concluídas
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDays className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma sessão concluída</h3>
            <p className="text-muted-foreground">
              Sessões concluídas aparecerão aqui
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{session.nome}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        {new Date(session.data).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" />
                        {session.current_photo} fotos
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">Concluída</Badge>
                </div>

                <div className="flex gap-3 mb-4">
                  <Button
                    variant="outline"
                    onClick={() => exportToPDF(session)}
                    disabled={exportingPdf === session.id}
                    className="flex-1"
                  >
                    {exportingPdf === session.id ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Exportar PDF Completo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(session)}
                    disabled={exportingExcel === session.id}
                    className="flex-1"
                  >
                    {exportingExcel === session.id ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sheet className="w-4 h-4 mr-2" />
                    )}
                    Exportar Excel
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => toggleSession(session.id)}
                  className="w-full"
                >
                  {expandedSession === session.id ? "Ocultar" : "Ver"} Fotos Individuais
                </Button>

                {expandedSession === session.id && sessionPhotos[session.id] && (
                  <div className="mt-4 pt-4 border-t grid gap-3">
                    {sessionPhotos[session.id].map((photo) => (
                      <div key={photo.foto_id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                        <img 
                          src={`/images/foto-${photo.foto_id}.jpg`}
                          alt={`Foto ${photo.foto_id}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">Foto {photo.foto_id}</h4>
                          <div className="text-sm text-muted-foreground">
                            <span className="text-success font-medium">{photo.deferidos} Deferidos</span>
                            {" · "}
                            <span className="text-destructive font-medium">{photo.indeferidos} Indeferidos</span>
                            {" · "}
                            <span>{photo.total} votos</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportPhotoToPDF(session.nome, photo)}
                          disabled={exportingPhotoPdf === `${photo.foto_id}`}
                        >
                          {exportingPhotoPdf === `${photo.foto_id}` ? (
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
