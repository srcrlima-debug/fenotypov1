import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Link2, BarChart3, GitCompare, Play, Edit, Trash2, Copy, Search, Filter, FileDown, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { logSessionAction } from "@/lib/auditLogger";
import { exportSessionsToPDF, exportSessionsToExcel } from "@/lib/reportExport";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  nome: string;
  data: string;
  descricao: string | null;
  session_status: string;
  training_id: string;
  participants?: { count: number }[];
}

export default function AdminSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({ nome: "", data: "", descricao: "" });
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortBy, setSortBy] = useState<'nome' | 'data' | 'status' | 'participants'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 12;

  useEffect(() => {
    loadSessions();
  }, [currentPage, statusFilter, dateFilter, searchQuery, sortBy, sortOrder]);

  const loadSessions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("sessions")
        .select('*', { count: 'exact' })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (statusFilter !== "all") {
        query = query.eq("session_status", statusFilter);
      }

      if (dateFilter) {
        query = query.eq("data", dateFilter);
      }

      if (searchQuery) {
        query = query.ilike("nome", `%${searchQuery}%`);
      }

      if (sortBy !== "participants") {
        query = query.order(sortBy, { ascending: sortOrder === "asc" });
      }

      const { data, error, count } = await query;
      
      if (error) throw error;

      const sessionsWithCounts = await Promise.all(
        (data || []).map(async (session) => {
          const { count: participantCount } = await supabase
            .from("training_participants")
            .select("*", { count: "exact", head: true })
            .eq("training_id", session.training_id || "");
          
          return { ...session, participant_count: participantCount || 0 };
        })
      );

      if (sortBy === "participants") {
        sessionsWithCounts.sort((a, b) => 
          sortOrder === "asc" 
            ? a.participant_count - b.participant_count
            : b.participant_count - a.participant_count
        );
      }

      setSessions(sessionsWithCounts);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Error loading sessions:", error);
      toast.error("Erro ao carregar sessões", {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCreating) return;

    if (!selectedDate) {
      toast.error("Por favor, selecione uma data");
      return;
    }

    setIsCreating(true);
    try {
      // Verificar permissão antes de criar
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para criar sessões");
        return;
      }

      // Verificar se é admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast.error("Você não tem permissão para criar sessões");
        return;
      }

      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      // First, create the training
      const { data: training, error: trainingError } = await supabase
        .from("trainings")
        .insert({
          nome: newSession.nome,
          data: formattedDate,
          descricao: newSession.descricao || null,
          created_by: user.id,
          status: "active",
        })
        .select()
        .single();

      if (trainingError) {
        console.error('Training creation failed:', trainingError);
        throw new Error(`Falha ao criar treinamento: ${trainingError.message}`);
      }

      // Then create the session linked to the training
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          nome: newSession.nome,
          data: formattedDate,
          descricao: newSession.descricao || null,
          training_id: training.id,
          created_by: user.id,
          session_status: "waiting",
        })
        .select()
        .single();

      // Log detalhado para debugging
      console.log('Session insert result:', { session, sessionError });

      if (sessionError) {
        console.error('Session creation failed:', sessionError);
        // Se session falhou, deletar o training criado
        await supabase.from("trainings").delete().eq("id", training.id);
        throw new Error(`Falha ao criar sessão: ${sessionError.message}`);
      }

      if (!session) {
        console.error('Session was not created (no data returned)');
        await supabase.from("trainings").delete().eq("id", training.id);
        throw new Error('Sessão não foi criada. Verifique suas permissões de administrador.');
      }

      // Log audit action
      await logSessionAction("create_session", session.id, {
        session_name: newSession.nome,
        training_id: training.id,
      });

      toast.success("Sessão criada com sucesso!");
      setCreateDialogOpen(false);
      setNewSession({ nome: "", data: "", descricao: "" });
      setSelectedDate(undefined);
      loadSessions();
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Erro ao criar sessão");
    } finally {
      setIsCreating(false);
    }
  };

  const copySessionLink = (sessionId: string, sessionName: string, trainingId?: string | null) => {
    const baseLink = `${window.location.origin}/session/${sessionId}/acesso`;
    const link = trainingId ? `${baseLink}?trainingId=${trainingId}` : baseLink;
    navigator.clipboard.writeText(link);
    toast.success(`Link da sessão "${sessionName}" copiado!`);
  };

  const toggleComparison = (sessionId: string) => {
    setSelectedForComparison((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const navigateToComparison = () => {
    if (selectedForComparison.length < 2) {
      toast.error("Selecione pelo menos 2 sessões para comparar");
      return;
    }
    navigate(`/admin/session-comparison`);
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession || isEditing) return;

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          nome: editingSession.nome,
          data: editingSession.data,
          descricao: editingSession.descricao,
        })
        .eq("id", editingSession.id);

      if (error) throw error;

      await logSessionAction("update_session", editingSession.id, {
        session_name: editingSession.nome,
      });

      toast.success("Sessão atualizada com sucesso!");
      setEditDialogOpen(false);
      setEditingSession(null);
      loadSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Erro ao atualizar sessão");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteSession = async () => {
    if (deletePassword !== "CONFIRMAR") {
      toast.error('Digite "CONFIRMAR" para excluir');
      return;
    }

    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", deletingSessionId);

      if (error) throw error;

      await logSessionAction("delete_session", deletingSessionId!, {});

      toast.success("Sessão deletada com sucesso!");
      setDeleteDialogOpen(false);
      setDeletingSessionId(null);
      setDeletePassword("");
      loadSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erro ao deletar sessão");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateSession = async (session: Session) => {
    if (isDuplicating === session.id) return;

    setIsDuplicating(session.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: duplicated, error } = await supabase
        .from("sessions")
        .insert({
          nome: `${session.nome} (Cópia)`,
          data: session.data,
          descricao: session.descricao,
          training_id: session.training_id,
          created_by: user?.id,
          session_status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      await logSessionAction("duplicate_session", duplicated.id, {
        original_session_id: session.id,
      });

      toast.success("Sessão duplicada com sucesso!");
      loadSessions();
    } catch (error) {
      console.error("Error duplicating session:", error);
      toast.error("Erro ao duplicar sessão");
    } finally {
      setIsDuplicating(null);
    }
  };

  const openEditDialog = (session: Session) => {
    setEditingSession({ ...session });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (sessionId: string) => {
    setDeletingSessionId(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Buscar todas as sessões (sem paginação) para exportar
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          participants:training_participants(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sessionsForExport = (data || []).map(session => ({
        ...session,
        participant_count: session.participants?.[0]?.count || 0
      }));

      await exportSessionsToPDF(sessionsForExport);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Buscar todas as sessões (sem paginação) para exportar
      const { data, error } = await supabase
        .from("sessions")
        .select(`
          *,
          participants:training_participants(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sessionsForExport = (data || []).map(session => ({
        ...session,
        participant_count: session.participants?.[0]?.count || 0
      }));

      await exportSessionsToExcel(sessionsForExport);
      toast.success("Relatório Excel gerado com sucesso!");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      toast.error("Erro ao gerar relatório Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500";
      case "active":
        return "bg-green-500";
      case "showing_results":
        return "bg-blue-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "waiting":
        return "Aguardando";
      case "active":
        return "Ativa";
      case "showing_results":
        return "Mostrando Resultados";
      case "completed":
        return "Concluída";
      default:
        return status;
    }
  };

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

  return (
    <div className="container mx-auto p-6 space-y-6 animate-fade-slide-up">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="animate-fade-slide-in">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Gestão de Sessões
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'sessão' : 'sessões'} cadastrada{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap animate-fade-slide-in" style={{ animationDelay: "0.1s" }}>
          <Button
            variant="outline"
            onClick={() => navigate('/admin/sessions/dashboard')}
            className="gap-2 hover:scale-105 transition-transform duration-300"
          >
            <TrendingUp className="w-4 h-4" />
            Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || sessions.length === 0}
            className="gap-2 hover:scale-105 transition-transform duration-300"
          >
            <FileDown className="w-4 h-4" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || sessions.length === 0}
            className="gap-2 hover:scale-105 transition-transform duration-300"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="hover:scale-105 transition-transform duration-300 animate-fade-slide-in" style={{ animationDelay: "0.2s" }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Sessão
              </Button>
            </DialogTrigger>
          <DialogContent className="animate-scale-in">
            <DialogHeader>
              <DialogTitle>Criar Nova Sessão</DialogTitle>
              <DialogDescription>
                Preencha as informações da sessão de treinamento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4 animate-fade-slide-up">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Sessão</Label>
                <Input
                  id="nome"
                  value={newSession.nome}
                  onChange={(e) =>
                    setNewSession({ ...newSession, nome: e.target.value })
                  }
                  className="transition-all duration-300 focus:scale-[1.01]"
                  placeholder="Ex: Treinamento de Avaliação Fotográfica"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data da Sessão</Label>
                <DatePicker
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                  placeholder="Escolha a data da sessão"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  value={newSession.descricao}
                  onChange={(e) =>
                    setNewSession({ ...newSession, descricao: e.target.value })
                  }
                  className="transition-all duration-300 focus:scale-[1.01]"
                  placeholder="Descreva os objetivos e detalhes da sessão..."
                  rows={3}
                />
              </div>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full hover:scale-[1.02] transition-transform duration-300"
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Sessão
                      </>
                    )}
                  </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Ordenação */}
      <Card className="mb-4 animate-fade-slide-up hover:shadow-lg transition-shadow duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Ordenar por:</span>
            <Button
              variant={sortBy === 'nome' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('nome')}
              className="gap-2 hover:scale-105 transition-transform duration-300"
            >
              Nome
              {getSortIcon('nome')}
            </Button>
            <Button
              variant={sortBy === 'data' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('data')}
              className="gap-2 hover:scale-105 transition-transform duration-300"
            >
              Data
              {getSortIcon('data')}
            </Button>
            <Button
              variant={sortBy === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('status')}
              className="gap-2 hover:scale-105 transition-transform duration-300"
            >
              Status
              {getSortIcon('status')}
            </Button>
            <Button
              variant={sortBy === 'participants' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('participants')}
              className="gap-2 hover:scale-105 transition-transform duration-300"
            >
              Participantes
              {getSortIcon('participants')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="mb-6 animate-fade-slide-up hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: "0.1s" }}>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 transition-all duration-300 focus:scale-[1.01]"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm transition-all duration-300 focus:scale-[1.01] focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="all">Todos os Status</option>
                <option value="waiting">Aguardando</option>
                <option value="active">Ativa</option>
                <option value="showing_results">Mostrando Resultados</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filtrar por data"
                className="transition-all duration-300 focus:scale-[1.01]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.length === 0 && !loading ? (
          <Card className="col-span-full animate-fade-slide-up border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-2 text-lg">Nenhuma sessão criada ainda</p>
              <p className="text-sm text-muted-foreground">
                Use o botão "Nova Sessão" acima para criar sua primeira sessão de treinamento.
              </p>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session, index) => (
            <Card 
              key={session.id}
              className="card-3d hover:shadow-xl transition-all duration-500 animate-fade-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {session.nome}
                      <Badge className={getStatusColor(session.session_status)}>
                        {getStatusLabel(session.session_status)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.data).toLocaleDateString("pt-BR")} •{" "}
                        {session.participants?.[0]?.count || 0} participantes
                      </p>
                      {session.descricao && (
                        <p className="text-sm text-muted-foreground mt-2">{session.descricao}</p>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copySessionLink(session.id, session.nome, session.training_id)}
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/live/${session.id}`)}
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Controlar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/dashboard/${session.id}`)}
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateSession(session)}
                        disabled={isDuplicating === session.id}
                        className="hover:scale-105 transition-transform duration-300"
                      >
                        {isDuplicating === session.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(session)}
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleComparison(session.id)}
                    className={cn(
                      "hover:scale-105 transition-all duration-300",
                      selectedForComparison.includes(session.id) && "border-primary ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    <GitCompare className="w-4 h-4 mr-2" />
                    {selectedForComparison.includes(session.id)
                      ? "Selecionado"
                      : "Comparar"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openDeleteDialog(session.id)}
                    className="hover:scale-105 transition-transform duration-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card className="mt-6 animate-fade-slide-up hover:shadow-lg transition-shadow duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({totalCount} {totalCount === 1 ? 'resultado' : 'resultados'})
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="hover:scale-105 transition-transform duration-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                
                {/* Páginas numeradas */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-10 hover:scale-105 transition-transform duration-300"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="hover:scale-105 transition-transform duration-300"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
            <DialogDescription>Modifique as informações da sessão</DialogDescription>
          </DialogHeader>
          {editingSession && (
            <form onSubmit={handleEditSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome da Sessão</Label>
                <Input
                  id="edit-nome"
                  value={editingSession.nome}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-data">Data</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editingSession.data}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, data: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-descricao">Descrição (opcional)</Label>
                <Textarea
                  id="edit-descricao"
                  value={editingSession.descricao || ""}
                  onChange={(e) =>
                    setEditingSession({ ...editingSession, descricao: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <Button 
                type="submit" 
                disabled={isEditing}
                className="w-full hover:scale-[1.02] transition-transform duration-300"
              >
                {isEditing ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Digite <strong>CONFIRMAR</strong> para excluir:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Input
              placeholder="Digite CONFIRMAR"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeletePassword("");
                setDeletingSessionId(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSession}
              disabled={isDeleting}
              className="hover:scale-[1.02] transition-transform duration-300"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Confirmar Exclusão"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
