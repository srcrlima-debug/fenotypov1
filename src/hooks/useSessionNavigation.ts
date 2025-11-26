import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Regex para validação de UUID v4
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface NavigationOptions {
  preserveSession?: boolean;
  preserveTraining?: boolean;
  additionalParams?: Record<string, string>;
  validateSession?: boolean;
  replace?: boolean;
}

interface UseSessionNavigationConfig {
  autoRedirectIfAuthenticated?: boolean;
  antessalaPath?: string;
  enableLogging?: boolean;
}

/**
 * Hook customizado para gerenciar navegação com sessões
 * 
 * Funcionalidades:
 * - Centraliza propagação de sessionId e trainingId entre rotas
 * - Valida formato UUID de sessionId
 * - Implementa guard de autenticação automático
 * - Redireciona usuários autenticados automaticamente para antessala
 * - Gerencia parâmetros de query string de forma consistente
 */
export const useSessionNavigation = (config?: UseSessionNavigationConfig) => {
  const {
    autoRedirectIfAuthenticated = false,
    antessalaPath = '/antessala',
    enableLogging = true
  } = config || {};

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const sessionId = useMemo(() => searchParams.get('sessionId'), [searchParams]);
  const trainingId = useMemo(() => searchParams.get('trainingId'), [searchParams]);

  /**
   * Valida se uma string é um UUID v4 válido
   */
  const validateSessionId = useCallback((id: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    return UUID_V4_REGEX.test(id);
  }, []);

  const isValidSessionId = useMemo(() => {
    if (!sessionId) return false;
    return validateSessionId(sessionId);
  }, [sessionId, validateSessionId]);

  const hasActiveSession = useMemo(() => {
    return !!(sessionId && trainingId && isValidSessionId);
  }, [sessionId, trainingId, isValidSessionId]);

  /**
   * Registra eventos de navegação (console + banco)
   */
  const logAccess = useCallback(async (
    status: string, 
    details: { error?: string; errorCode?: string; trainingId?: string } = {}
  ) => {
    const logData = {
      timestamp: new Date().toISOString(),
      status,
      sessionId,
      trainingId: details.trainingId || trainingId,
      userId: user?.id || null,
      error: details.error,
      errorCode: details.errorCode,
      currentPath: window.location.pathname,
      authLoading
    };

    // Console log
    if (enableLogging) {
      console.log(`[SESSION_NAV] ${status}:`, logData);
    }

    // Database log
    try {
      await supabase.from('session_access_logs').insert({
        session_id: sessionId || null,
        training_id: details.trainingId || trainingId || null,
        user_id: user?.id || null,
        access_type: 'link_click',
        status,
        error_message: details.error || null,
        error_code: details.errorCode || null,
        url_params: {
          sessionId,
          trainingId: details.trainingId || trainingId,
          fullUrl: window.location.href,
          search: window.location.search
        },
        user_agent: navigator.userAgent
      });
    } catch (e) {
      console.error('[SESSION_NAV] Failed to log access to database:', e);
    }
  }, [sessionId, trainingId, user, enableLogging, authLoading]);

  /**
   * Verifica se usuário é participante do treinamento
   */
  const checkParticipation = useCallback(async (
    userId: string,
    trainingId: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('training_participants')
        .select('id')
        .eq('user_id', userId)
        .eq('training_id', trainingId)
        .maybeSingle();

      if (error) {
        console.error('[SESSION_NAV] Erro ao verificar participação:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[SESSION_NAV] Exceção ao verificar participação:', error);
      return false;
    }
  }, []);

  /**
   * Verifica se usuário é admin
   */
  const checkIsAdmin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('[SESSION_NAV] Erro ao verificar admin:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[SESSION_NAV] Exceção ao verificar admin:', error);
      return false;
    }
  }, []);

  /**
   * Guard de autenticação automático - REMOVIDO (causava race condition)
   */

  /**
   * Navega para um caminho preservando automaticamente sessionId e trainingId
   */
  const navigateWithSession = useCallback(async (
    path: string,
    options: NavigationOptions = {}
  ): Promise<void> => {
    const {
      preserveSession = true,
      preserveTraining = true,
      additionalParams = {},
      validateSession = true,
      replace = false
    } = options;

    await logAccess('iniciando_navegacao', { trainingId });

    // Validação de sessionId
    if (preserveSession && sessionId && validateSession) {
      if (!isValidSessionId) {
        const errorMsg = `sessionId inválido: ${sessionId}`;
        console.error(`[SESSION_NAV] ${errorMsg}`);
        
        toast.error('O link de acesso está corrompido. Solicite um novo link ao administrador.');
        
        await logAccess('navegacao_abortada_sessionid_invalido', { 
          error: errorMsg,
          errorCode: 'INVALID_UUID' 
        });
        throw new Error(errorMsg);
      }
    }

    // Construir parâmetros
    const params = new URLSearchParams(additionalParams);

    if (preserveSession && sessionId && isValidSessionId) {
      params.set('sessionId', sessionId);
    }

    if (preserveTraining && trainingId) {
      params.set('trainingId', trainingId);
    }

    const queryString = params.toString();
    const finalPath = queryString ? `${path}?${queryString}` : path;

    await logAccess('navegando', {
      trainingId,
      error: `from: ${window.location.pathname}, to: ${finalPath}`
    });

    navigate(finalPath, { replace });
  }, [
    navigate, 
    sessionId, 
    trainingId, 
    isValidSessionId, 
    logAccess
  ]);

  /**
   * Remove todos os parâmetros de sessão da URL atual
   */
  const clearSessionParams = useCallback(() => {
    logAccess('limpando_parametros_sessao');

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('sessionId');
    newSearchParams.delete('trainingId');

    const newPath = `${window.location.pathname}${
      newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''
    }`;

    navigate(newPath, { replace: true });
  }, [navigate, searchParams, logAccess]);

  return {
    navigateWithSession,
    sessionId,
    trainingId,
    isValidSessionId,
    hasActiveSession,
    validateSessionId,
    clearSessionParams,
    logAccess,
    authLoading,
    checkParticipation,
    checkIsAdmin
  };
};
