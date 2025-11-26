import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Badge {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  criterio: string;
  earned_at?: string;
  is_earned: boolean;
}

export function useBadges() {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnedCount, setEarnedCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadBadges();

    // Realtime para novos badges
    const channel = supabase
      .channel('user-badges-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadBadges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBadges = async () => {
    if (!user) return;

    try {
      // Buscar todas as definições de badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badge_definitions')
        .select('*')
        .order('created_at', { ascending: true });

      if (badgesError) throw badgesError;

      // Buscar badges conquistados pelo usuário
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', user.id);

      if (userBadgesError) throw userBadgesError;

      // Criar um map dos badges conquistados
      const earnedBadgesMap = new Map(
        (userBadges || []).map(ub => [ub.badge_id, ub.earned_at])
      );

      // Combinar dados
      const combinedBadges: Badge[] = (allBadges || []).map(badge => ({
        ...badge,
        earned_at: earnedBadgesMap.get(badge.id),
        is_earned: earnedBadgesMap.has(badge.id),
      }));

      setBadges(combinedBadges);
      setEarnedCount(earnedBadgesMap.size);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardBadge = async (badgeId: string, sessionId?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badgeId,
          session_id: sessionId,
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }

      await loadBadges();
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };

  return {
    badges,
    loading,
    earnedCount,
    totalCount: badges.length,
    progressPercentage: badges.length > 0 ? (earnedCount / badges.length) * 100 : 0,
    checkAndAwardBadge,
    refreshBadges: loadBadges,
  };
}
