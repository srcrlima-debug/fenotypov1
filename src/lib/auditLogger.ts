import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'create_session'
  | 'update_session'
  | 'delete_session'
  | 'duplicate_session'
  | 'start_session'
  | 'next_photo'
  | 'restart_photo'
  | 'show_results'
  | 'create_training'
  | 'update_training'
  | 'delete_training'
  | 'add_training_participant'
  | 'remove_training_participant';

export type ResourceType = 'session' | 'training' | 'training_participant';

interface AuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

/**
 * Private function to insert audit log directly into the database (fallback)
 */
async function insertAuditLogDirectly({
  action,
  resourceType,
  resourceId,
  details,
}: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('[Audit Fallback] No user available');
      return;
    }

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    const { error } = await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      user_agent: userAgent,
    });

    if (error) {
      console.error('[Audit Fallback] Failed to insert audit log:', error);
    }
  } catch (error) {
    console.error('[Audit Fallback] Error inserting audit log:', error);
  }
}

/**
 * Log an administrative action to the audit log
 */
export async function logAuditAction({
  action,
  resourceType,
  resourceId,
  details,
}: AuditLogParams): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('No session available for audit logging');
      return;
    }

    const { error } = await supabase.functions.invoke('audit-log', {
      body: {
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      },
    });

    if (error) {
      console.warn('[Audit] Edge Function failed, using direct insert fallback');
      await insertAuditLogDirectly({ action, resourceType, resourceId, details });
    }
  } catch (error) {
    console.warn('[Audit] Exception calling Edge Function, using direct insert fallback');
    await insertAuditLogDirectly({ action, resourceType, resourceId, details });
  }
}

/**
 * Helper function to log session-related actions
 */
export async function logSessionAction(
  action: Extract<AuditAction, 'create_session' | 'update_session' | 'delete_session' | 'duplicate_session' | 'start_session' | 'next_photo' | 'restart_photo' | 'show_results'>,
  sessionId: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditAction({
    action,
    resourceType: 'session',
    resourceId: sessionId,
    details,
  });
}

/**
 * Helper function to log training-related actions
 */
export async function logTrainingAction(
  action: Extract<AuditAction, 'create_training' | 'update_training' | 'delete_training'>,
  trainingId: string,
  details?: Record<string, any>
): Promise<void> {
  await logAuditAction({
    action,
    resourceType: 'training',
    resourceId: trainingId,
    details,
  });
}