import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Calendar, TrendingUp, Activity } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

interface SessionStats {
  totalSessions: number;
  totalParticipants: number;
  avgParticipantsPerSession: number;
  sessionsByStatus: Record<string, number>;
  sessionsByMonth: Array<{ month: string; count: number; participants: number }>;
  recentSessions: Array<{
    nome: string;
    data: string;
    participants: number;
    status: string;
  }>;
}

const COLORS = {
  waiting: '#eab308',
  active: '#10b981',
  showing_results: '#3b82f6',
  completed: '#6b7280',
};

export default function AdminSessionsDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Buscar todas as sessões com participantes
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select(`
          *,
          participants:training_participants(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sessionsData = sessions || [];
      
      // Calcular estatísticas
      const totalSessions = sessionsData.length;
      const totalParticipants = sessionsData.reduce(
        (sum, s) => sum + (s.participants?.[0]?.count || 0),
        0
      );
      const avgParticipantsPerSession = totalSessions > 0 
        ? totalParticipants / totalSessions 
        : 0;

      // Sessões por status
      const sessionsByStatus: Record<string, number> = {};
      sessionsData.forEach((session) => {
        const status = session.session_status || 'waiting';
        sessionsByStatus[status] = (sessionsByStatus[status] || 0) + 1;
      });

      // Sessões por mês (últimos 6 meses)
      const monthsMap = new Map<string, { count: number; participants: number }>();
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        monthsMap.set(monthKey, { count: 0, participants: 0 });
      }

      sessionsData.forEach((session) => {
        const sessionDate = new Date(session.data);
        const monthKey = sessionDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        
        if (monthsMap.has(monthKey)) {
          const current = monthsMap.get(monthKey)!;
          current.count += 1;
          current.participants += session.participants?.[0]?.count || 0;
        }
      });

      const sessionsByMonth = Array.from(monthsMap.entries()).map(([month, data]) => ({
        month,
        count: data.count,
        participants: data.participants,
      }));

      // Sessões recentes (últimas 5)
      const recentSessions = sessionsData.slice(0, 5).map((session) => ({
        nome: session.nome,
        data: new Date(session.data).toLocaleDateString('pt-BR'),
        participants: session.participants?.[0]?.count || 0,
        status: session.session_status || 'waiting',
      }));

      setStats({
        totalSessions,
        totalParticipants,
        avgParticipantsPerSession,
        sessionsByStatus,
        sessionsByMonth,
        recentSessions,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      toast.error("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: "Aguardando",
      active: "Ativa",
      showing_results: "Mostrando Resultados",
      completed: "Concluída",
    };
    return labels[status] || status;
  };

  const pieData = stats
    ? Object.entries(stats.sessionsByStatus).map(([status, count]) => ({
        name: getStatusLabel(status),
        value: count,
        color: COLORS[status as keyof typeof COLORS] || '#6b7280',
      }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/sessions")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Dashboard de Sessões</h1>
            <p className="text-muted-foreground">
              Visão geral e estatísticas das sessões de treinamento
            </p>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Sessões</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                Sessões cadastradas no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Participantes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                Participantes em todas as sessões
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média por Sessão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgParticipantsPerSession.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Participantes por sessão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.sessionsByStatus.active || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Sessões em andamento
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sessões ao longo do tempo */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Sessões e Participantes ao Longo do Tempo</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.sessionsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    name="Sessões"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="participants"
                    stroke="#10b981"
                    name="Participantes"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sessões por Status (Pizza) */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
              <CardDescription>Sessões por status atual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sessões por Status (Barras) */}
          <Card>
            <CardHeader>
              <CardTitle>Sessões por Status</CardTitle>
              <CardDescription>Comparativo de quantidade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(stats.sessionsByStatus).map(
                    ([status, count]) => ({
                      status: getStatusLabel(status),
                      count,
                    })
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Sessões Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Sessões Recentes</CardTitle>
            <CardDescription>Últimas 5 sessões cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentSessions.map((session, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{session.nome}</p>
                    <p className="text-sm text-muted-foreground">{session.data}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {session.participants} participantes
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStatusLabel(session.status)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
