import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface Session {
  id: string;
  nome: string;
  data: string;
  session_status: string;
}

interface SessionStats {
  sessionId: string;
  sessionName: string;
  totalVotes: number;
  deferidos: number;
  indeferidos: number;
  participants: number;
  avgDefRate: number;
  photoStats: Array<{
    foto_id: number;
    deferidos: number;
    indeferidos: number;
    total: number;
  }>;
}

export default function AdminSessionComparison() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

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

  const fetchSessionStats = async (sessionId: string, sessionName: string): Promise<SessionStats> => {
    const { data: votes, error } = await supabase
      .from("avaliacoes")
      .select("foto_id, resposta, user_id")
      .eq("session_id", sessionId);

    if (error) throw error;

    const totalVotes = votes?.length || 0;
    const deferidos = votes?.filter(v => v.resposta === "DEFERIDO").length || 0;
    const indeferidos = votes?.filter(v => v.resposta === "INDEFERIDO").length || 0;
    const participants = new Set(votes?.map(v => v.user_id)).size;

    // Group by photo
    const photoStats: Record<number, { deferidos: number; indeferidos: number; total: number }> = {};
    votes?.forEach(vote => {
      if (!photoStats[vote.foto_id]) {
        photoStats[vote.foto_id] = { deferidos: 0, indeferidos: 0, total: 0 };
      }
      photoStats[vote.foto_id].total++;
      if (vote.resposta === "DEFERIDO") photoStats[vote.foto_id].deferidos++;
      if (vote.resposta === "INDEFERIDO") photoStats[vote.foto_id].indeferidos++;
    });

    const photoStatsArray = Object.entries(photoStats).map(([id, stats]) => ({
      foto_id: parseInt(id),
      ...stats,
    })).sort((a, b) => a.foto_id - b.foto_id);

    return {
      sessionId,
      sessionName,
      totalVotes,
      deferidos,
      indeferidos,
      participants,
      avgDefRate: totalVotes > 0 ? (deferidos / totalVotes) * 100 : 0,
      photoStats: photoStatsArray,
    };
  };

  const handleCompare = async () => {
    if (selectedSessions.length < 2) {
      toast({
        title: "Selecione ao menos 2 sessões",
        description: "É necessário selecionar pelo menos duas sessões para comparar",
        variant: "destructive",
      });
      return;
    }

    setComparing(true);
    try {
      const stats = await Promise.all(
        selectedSessions.map(sessionId => {
          const session = sessions.find(s => s.id === sessionId);
          return fetchSessionStats(sessionId, session?.nome || "");
        })
      );
      setComparisonData(stats);
    } catch (error: any) {
      toast({
        title: "Erro ao comparar sessões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setComparing(false);
    }
  };

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => {
      if (prev.includes(sessionId)) {
        return prev.filter(id => id !== sessionId);
      } else if (prev.length < 5) {
        return [...prev, sessionId];
      } else {
        toast({
          title: "Limite atingido",
          description: "Máximo de 5 sessões para comparação",
          variant: "destructive",
        });
        return prev;
      }
    });
  };

  // Prepare chart data
  const overallComparisonData = comparisonData.map(stat => ({
    nome: stat.sessionName.substring(0, 15),
    "Taxa Deferimento (%)": stat.avgDefRate.toFixed(1),
    Participantes: stat.participants,
    "Total Votos": stat.totalVotes,
  }));

  // Prepare photo comparison data (average across sessions)
  const photoComparisonData: Array<{ foto: string; [key: string]: any }> = [];
  if (comparisonData.length > 0) {
    const maxPhotos = Math.max(...comparisonData.map(s => s.photoStats.length));
    for (let i = 0; i < maxPhotos; i++) {
      const dataPoint: any = { foto: `Foto ${i + 1}` };
      comparisonData.forEach(stat => {
        const photo = stat.photoStats[i];
        if (photo) {
          const defRate = photo.total > 0 ? (photo.deferidos / photo.total) * 100 : 0;
          dataPoint[stat.sessionName.substring(0, 15)] = defRate.toFixed(1);
        }
      });
      photoComparisonData.push(dataPoint);
    }
  }

  // Calculate trends
  const getTrend = (index: number) => {
    if (index === 0 || comparisonData.length < 2) return null;
    const current = comparisonData[index].avgDefRate;
    const previous = comparisonData[index - 1].avgDefRate;
    const diff = current - previous;
    
    if (Math.abs(diff) < 1) return { icon: Minus, color: "text-muted-foreground", text: "Estável" };
    if (diff > 0) return { icon: TrendingUp, color: "text-green-600", text: `+${diff.toFixed(1)}%` };
    return { icon: TrendingDown, color: "text-red-600", text: `${diff.toFixed(1)}%` };
  };

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a78bfa'];

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
            onClick={() => navigate("/admin/sessions")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Comparação de Sessões</h1>
          <p className="text-muted-foreground">
            Compare resultados entre diferentes sessões para identificar padrões e tendências
          </p>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Selecionar Sessões</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Selecione de 2 a 5 sessões para comparar (clique nos cards para selecionar)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className={`p-4 cursor-pointer transition-all ${
                  selectedSessions.includes(session.id)
                    ? "border-primary border-2 bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => toggleSession(session.id)}
              >
                <h3 className="font-semibold mb-1">{session.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(session.data).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            ))}
          </div>

          <Button
            onClick={handleCompare}
            disabled={selectedSessions.length < 2 || comparing}
            className="w-full"
          >
            {comparing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Comparando...
              </>
            ) : (
              `Comparar ${selectedSessions.length} Sessões`
            )}
          </Button>
        </Card>

        {comparisonData.length > 0 && (
          <>
            <Card className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-6">Comparação Geral</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {comparisonData.map((stat, index) => {
                  const trend = getTrend(index);
                  return (
                    <Card key={stat.sessionId} className="p-4 bg-muted/30">
                      <h3 className="font-semibold mb-3">{stat.sessionName}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxa Deferimento:</span>
                          <span className="font-semibold flex items-center gap-2">
                            {stat.avgDefRate.toFixed(1)}%
                            {trend && (
                              <span className={`flex items-center gap-1 ${trend.color}`}>
                                <trend.icon className="w-3 h-3" />
                                <span className="text-xs">{trend.text}</span>
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Participantes:</span>
                          <span className="font-semibold">{stat.participants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Votos:</span>
                          <span className="font-semibold">{stat.totalVotes}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-green-600">
                            <span>Deferidos:</span>
                            <span className="font-semibold">{stat.deferidos}</span>
                          </div>
                          <div className="flex justify-between text-red-600">
                            <span>Indeferidos:</span>
                            <span className="font-semibold">{stat.indeferidos}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={overallComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Taxa Deferimento (%)" fill="#8884d8" />
                  <Bar dataKey="Participantes" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Taxa de Deferimento por Foto</h2>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={photoComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="foto" />
                  <YAxis label={{ value: "Taxa Deferimento (%)", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  {comparisonData.map((stat, index) => (
                    <Line
                      key={stat.sessionId}
                      type="monotone"
                      dataKey={stat.sessionName.substring(0, 15)}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
