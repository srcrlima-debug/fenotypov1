import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'create_session'
  | 'update_session'
  | 'delete_session'
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
      console.error('Failed to log audit action:', error);
    }
  } catch (error) {
    console.error('Error in logAuditAction:', error);
  }
}

/**
 * Helper function to log session-related actions
 */
export async function logSessionAction(
  action: Extract<AuditAction, 'create_session' | 'update_session' | 'delete_session' | 'start_session' | 'next_photo' | 'restart_photo' | 'show_results'>,
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