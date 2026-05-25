import { supabase } from './supabaseClient';

export type ActivityAction =
  // Patients
  | 'patient.created'
  | 'patient.updated'
  | 'patient.therapist_assigned'
  | 'patient.status_changed'
  // Sketches
  | 'sketch.submitted'
  | 'sketch.reviewed'
  | 'therapist.notes_added'
  | 'sketch.verified'
  | 'sketch.deleted'
  // Drawing sessions
  | 'session.created'
  | 'session.accepted'
  | 'session.rejected'
  // Users
  | 'user.created';

interface LogParams {
  action: ActivityAction;
  entity_type: string;
  entity_id?: string;
  entity_label?: string;
  meta?: Record<string, unknown>;
}

let _cachedActorName: string | null = null;
let _cachedActorId:   string | null = null;

export async function logActivity(params: LogParams): Promise<void> {
  try {
    if (!_cachedActorId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      _cachedActorId = user.id;
      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single();
      _cachedActorName = prof?.full_name ?? 'Unknown';
    }

    await supabase.from('activity_logs').insert({
      actor_id:     _cachedActorId,
      actor_name:   _cachedActorName ?? 'Unknown',
      action:       params.action,
      entity_type:  params.entity_type,
      entity_id:    params.entity_id   ?? null,
      entity_label: params.entity_label ?? null,
      meta:         params.meta ?? {},
    });
  } catch {
    // Logging must never break the main flow
  }
}

// Call on logout to clear the cache
export function clearActivityLogCache() {
  _cachedActorId   = null;
  _cachedActorName = null;
}
