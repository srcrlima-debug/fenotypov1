import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('[AuthContext] Iniciando autenticação...');
        
        // 1. Buscar sessão existente PRIMEIRO
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] Erro ao buscar sessão:', error);
        }

        if (isMounted) {
          console.log('[AuthContext] Sessão inicial:', session ? 'Autenticado' : 'Não autenticado');
          setSession(session);
          setUser(session?.user ?? null);
          setInitialized(true);
          setLoading(false);
        }

        // 2. Registrar listener DEPOIS (para mudanças futuras)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!isMounted) return;

            console.log('[AuthContext] Auth state changed:', event);
            setSession(session);
            setUser(session?.user ?? null);
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('[AuthContext] Exceção na inicialização:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const cleanup = initAuth();

    return () => {
      isMounted = false;
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, []);

  const logout = async () => {
    console.log('[AuthContext] Fazendo logout...');
    
    // Limpar estado ANTES de signOut para UI atualizar imediatamente
    setSession(null);
    setUser(null);
    
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
