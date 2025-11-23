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
  FileDown, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  Image as ImageIcon,
  ArrowLeft,
  Loader2
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

export default function AdminHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
            onClick={() => navigate("/admin")}
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
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
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
                        <Calendar className="w-4 h-4" />
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

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => exportToPDF(session)}
                    disabled={exportingPdf === session.id}
                    className="flex-1"
                  >
                    {exportingPdf === session.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4 mr-2" />
                    )}
                    Exportar PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportToExcel(session)}
                    disabled={exportingExcel === session.id}
                    className="flex-1"
                  >
                    {exportingExcel === session.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                    )}
                    Exportar Excel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
