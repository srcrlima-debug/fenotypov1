import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { BadgeNotificationPopup } from "@/components/BadgeNotificationPopup";

interface Badge {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
}

interface BadgeContextType {
  checkBadges: (action: string, sessionId?: string) => Promise<void>;
  notifyBadge: (badge: Badge) => void;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);

  useEffect(() => {
    if (badgeQueue.length > 0 && !currentBadge) {
      setCurrentBadge(badgeQueue[0]);
      setBadgeQueue(prev => prev.slice(1));
    }
  }, [badgeQueue, currentBadge]);

  const checkBadges = async (action: string, sessionId?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-badges', {
        body: {
          userId: user.id,
          sessionId,
          action,
        },
      });

      if (error) throw error;

      if (data?.newBadges && data.newBadges.length > 0) {
        setBadgeQueue(prev => [...prev, ...data.newBadges]);
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  const notifyBadge = (badge: Badge) => {
    setBadgeQueue(prev => [...prev, badge]);
  };

  const handleCloseBadge = () => {
    setCurrentBadge(null);
  };

  return (
    <BadgeContext.Provider value={{ checkBadges, notifyBadge }}>
      {children}
      <BadgeNotificationPopup badge={currentBadge} onClose={handleCloseBadge} />
    </BadgeContext.Provider>
  );
}

export function useBadgeContext() {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error("useBadgeContext must be used within BadgeProvider");
  }
  return context;
}
