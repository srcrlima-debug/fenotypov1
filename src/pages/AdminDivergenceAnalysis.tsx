import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";
import { getImageByPage } from "@/data/images";
import { Header } from '@/components/Header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SessionData {
  id: string;
  nome: string;
  data: string;
}

interface DivergenceData {
  foto_id: number;
  admin_vote: string;
  majority_vote: string;
  admin_count: number;
  majority_count: number;
  total_votes: number;
  deferido_count: number;
  indeferido_count: number;
}

export default function AdminDivergenceAnalysis() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [divergences, setDivergences] = useState<DivergenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        navigate("/");
        return;
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    if (sessionId && user && isAdmin) {
      fetchSessionAndAnalysis();
    }
  }, [sessionId, user, isAdmin]);

  const fetchSessionAndAnalysis = async () => {
    try {
      setLoading(true);

      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("id, nome, data")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch all evaluations for this session
      const { data: avaliacoes, error: avaliacoesError } = await supabase
        .from("avaliacoes")
        .select("foto_id, resposta, is_admin_vote, user_id")
        .eq("session_id", sessionId);

      if (avaliacoesError) throw avaliacoesError;

      // Analyze divergences
      const photoAnalysis = new Map<number, DivergenceData>();

      // Group by photo
      const photoGroups = new Map<number, typeof avaliacoes>();
      avaliacoes?.forEach(av => {
        if (!photoGroups.has(av.foto_id)) {
          photoGroups.set(av.foto_id, []);
        }
        photoGroups.get(av.foto_id)!.push(av);
      });

      // Analyze each photo
      photoGroups.forEach((votes, fotoId) => {
        const adminVotes = votes.filter(v => v.is_admin_vote);
        const participantVotes = votes.filter(v => !v.is_admin_vote);

        if (adminVotes.length === 0 || participantVotes.length === 0) {
          return; // Skip if admin didn't vote or no participants voted
        }

        const adminVote = adminVotes[0].resposta;
        
        // Count votes
        const deferido = participantVotes.filter(v => v.resposta === "DEFERIDO").length;
        const indeferido = participantVotes.filter(v => v.resposta === "INDEFERIDO").length;
        
        // Determine majority (excluding "NÃO_RESPONDIDO")
        const totalVoted = deferido + indeferido;
        const majorityVote = deferido > indeferido ? "DEFERIDO" : "INDEFERIDO";
        const majorityCount = Math.max(deferido, indeferido);

        // Check for divergence
        if (adminVote !== majorityVote && totalVoted > 0) {
          photoAnalysis.set(fotoId, {
            foto_id: fotoId,
            admin_vote: adminVote,
            majority_vote: majorityVote,
            admin_count: 1,
            majority_count: majorityCount,
            total_votes: participantVotes.length,
            deferido_count: deferido,
            indeferido_count: indeferido,
          });
        }
      });

      // Convert to array and sort by photo id
      const divergenceArray = Array.from(photoAnalysis.values()).sort((a, b) => a.foto_id - b.foto_id);
      setDivergences(divergenceArray);

    } catch (error) {
      console.error("Error fetching analysis:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a análise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const convergenceRate = divergences.length === 0 && session 
    ? 100 
    : Math.round(((30 - divergences.length) / 30) * 100);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/admin")}
                className="mb-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold text-foreground">{session.nome}</h1>
              <p className="text-muted-foreground">Análise de Divergências - Voto do Admin vs. Maioria</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Convergência</p>
                  <p className="text-2xl font-bold">{convergenceRate}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Divergências</p>
                  <p className="text-2xl font-bold">{divergences.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <ImageIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Fotos</p>
                  <p className="text-2xl font-bold">30</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Divergences List */}
          {divergences.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-semibold mb-2">Perfeita Convergência!</h3>
              <p className="text-muted-foreground">
                Seus votos estão 100% alinhados com a maioria dos participantes.
              </p>
            </Card>
          ) : (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Fotos com Divergência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {divergences.map((div) => {
                  const image = getImageByPage(div.foto_id);
                  return (
                    <Card 
                      key={div.foto_id} 
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedPhoto(div.foto_id)}
                    >
                      <div className="space-y-3">
                        <div className="relative">
                          <img
                            src={image?.imageUrl}
                            alt={`Foto ${div.foto_id}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                            Foto {div.foto_id}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Seu voto:</span>
                            <span className={`font-semibold ${
                              div.admin_vote === "DEFERIDO" ? "text-green-600" : "text-red-600"
                            }`}>
                              {div.admin_vote === "DEFERIDO" ? (
                                <><CheckCircle className="inline w-4 h-4 mr-1" /> Deferido</>
                              ) : (
                                <><XCircle className="inline w-4 h-4 mr-1" /> Indeferido</>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Maioria:</span>
                            <span className={`font-semibold ${
                              div.majority_vote === "DEFERIDO" ? "text-green-600" : "text-red-600"
                            }`}>
                              {div.majority_vote === "DEFERIDO" ? (
                                <><CheckCircle className="inline w-4 h-4 mr-1" /> Deferido</>
                              ) : (
                                <><XCircle className="inline w-4 h-4 mr-1" /> Indeferido</>
                              )}
                            </span>
                          </div>

                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Deferido: {div.deferido_count}</span>
                              <span>Indeferido: {div.indeferido_count}</span>
                            </div>
                            <div className="text-xs text-center mt-1 text-muted-foreground">
                              Total: {div.total_votes} votos
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Photo Detail Dialog */}
      <Dialog open={selectedPhoto !== null} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Foto {selectedPhoto} - Análise Detalhada</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={getImageByPage(selectedPhoto)?.imageUrl}
                alt={`Foto ${selectedPhoto}`}
                className="w-full rounded-lg"
              />
              {divergences.find(d => d.foto_id === selectedPhoto) && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Seu Voto (Admin)</h4>
                    <p className={`text-lg font-bold ${
                      divergences.find(d => d.foto_id === selectedPhoto)?.admin_vote === "DEFERIDO" 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {divergences.find(d => d.foto_id === selectedPhoto)?.admin_vote}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-2">Voto da Maioria</h4>
                    <p className={`text-lg font-bold ${
                      divergences.find(d => d.foto_id === selectedPhoto)?.majority_vote === "DEFERIDO" 
                        ? "text-green-600" 
                        : "text-red-600"
                    }`}>
                      {divergences.find(d => d.foto_id === selectedPhoto)?.majority_vote}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {divergences.find(d => d.foto_id === selectedPhoto)?.majority_count} de {divergences.find(d => d.foto_id === selectedPhoto)?.total_votes} votos
                    </p>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
