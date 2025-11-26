import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BadgeCard } from "@/components/BadgeCard";
import { useBadges } from "@/hooks/useBadges";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Trophy, Star, Lock, TrendingUp, Award, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { badges, loading, earnedCount, totalCount, progressPercentage } = useBadges();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container max-w-4xl py-12 px-4 text-center">
          <Card className="p-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Faça Login para Ver Suas Conquistas</h2>
            <p className="text-muted-foreground mb-6">
              Entre ou cadastre-se para começar a desbloquear badges e acompanhar seu progresso!
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate("/login")}>Entrar</Button>
              <Button variant="outline" onClick={() => navigate("/registro")}>
                Cadastrar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.is_earned);
  const lockedBadges = badges.filter(b => !b.is_earned);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container max-w-6xl py-8 px-4 space-y-8 animate-fade-slide-up">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 animate-fade-slide-in">
            <Trophy className="w-12 h-12 text-primary animate-float-gentle" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Conquistas
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Complete desafios, desbloqueie badges e mostre seu progresso no sistema FENOTYPO
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="card-3d hover:shadow-xl transition-all duration-300 animate-fade-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Progresso Geral
            </CardTitle>
            <CardDescription>
              Você desbloqueou {earnedCount} de {totalCount} conquistas disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progresso de Conquistas</span>
                <span className="text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="text-center p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                <Award className="w-8 h-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{earnedCount}</div>
                <div className="text-xs text-muted-foreground">Conquistadas</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{lockedBadges.length}</div>
                <div className="text-xs text-muted-foreground">Bloqueadas</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg">
                <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Grid */}
        <Tabs defaultValue="all" className="animate-fade-slide-up" style={{ animationDelay: "0.2s" }}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <Trophy className="w-4 h-4" />
              Todas ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="earned" className="gap-2">
              <Star className="w-4 h-4" />
              Conquistadas ({earnedCount})
            </TabsTrigger>
            <TabsTrigger value="locked" className="gap-2">
              <Lock className="w-4 h-4" />
              Bloqueadas ({lockedBadges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-8">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="w-16 h-16 rounded-full mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-6 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {badges.map((badge, index) => (
                  <BadgeCard key={badge.id} {...badge} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="earned" className="mt-8">
            {earnedBadges.length === 0 ? (
              <Card className="p-12 text-center">
                <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma conquista ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece a participar das avaliações para desbloquear suas primeiras conquistas!
                </p>
                <Button onClick={() => navigate("/")}>Ver Treinamentos</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {earnedBadges.map((badge, index) => (
                  <BadgeCard key={badge.id} {...badge} index={index} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locked" className="mt-8">
            {lockedBadges.length === 0 ? (
              <Card className="p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-primary animate-float-gentle" />
                <h3 className="text-xl font-semibold mb-2">Parabéns! 🎉</h3>
                <p className="text-muted-foreground mb-4">
                  Você desbloqueou todas as conquistas disponíveis!
                </p>
                <Badge className="text-lg px-4 py-2">Colecionador Mestre</Badge>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lockedBadges.map((badge, index) => (
                  <BadgeCard key={badge.id} {...badge} index={index} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent animate-fade-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Dicas para Desbloquear Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">▸</span>
                <span>Complete o tutorial interativo para ganhar sua primeira conquista</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">▸</span>
                <span>Participe de várias sessões de treinamento para desbloquear badges de participação</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">▸</span>
                <span>Complete todas as 30 avaliações de uma sessão para conquistar o badge de Mestre Avaliador</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">▸</span>
                <span>Envie feedback detalhado após as sessões para ganhar o badge Comunicativo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">▸</span>
                <span>Complete uma sessão rapidamente (menos de 20 minutos) para o badge Relâmpago</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
