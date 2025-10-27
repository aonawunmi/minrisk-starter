// src/lib/controlEnhancements.ts
// Control Enhancement Plans - Persist AI Control Assessments

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export type RecommendationType = 'assessment' | 'improvement' | 'new_control';
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'implemented';
export type PlanStatus = 'pending' | 'partially_accepted' | 'fully_accepted' | 'rejected';

export type ControlRecommendation = {
  type: RecommendationType;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: RecommendationStatus;
  risk_code?: string;
  implementation_notes?: string;
  accepted_by?: string;
  accepted_at?: string;
};

export type LinkedRiskSnapshot = {
  risk_code: string;
  risk_title: string;
  category: string;
  likelihood_inherent: number;
  impact_inherent: number;
};

export type ControlEnhancementPlan = {
  id: string;
  organization_id: string;
  incident_id: string;
  assessment_date: string;
  overall_adequacy_score: number;
  findings: string[];
  recommendations: ControlRecommendation[];
  linked_risks_snapshot: LinkedRiskSnapshot[];
  status: PlanStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
};

// Input type for creating a new plan
export type CreateEnhancementPlanInput = {
  incident_id: string;
  overall_adequacy_score: number;
  findings: string[];
  recommendations: Omit<ControlRecommendation, 'status' | 'accepted_by' | 'accepted_at'>[];
  linked_risks_snapshot: LinkedRiskSnapshot[];
};

// =====================================================
// DATABASE OPERATIONS
// =====================================================

/**
 * Save a new enhancement plan from AI assessment
 */
export async function saveEnhancementPlan(
  planData: CreateEnhancementPlanInput
): Promise<{ data: ControlEnhancementPlan | null; error: any }> {
  try {
    // Get current user's organization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!profile) {
      return { data: null, error: 'User profile not found' };
    }

    // Add default status to recommendations
    const recommendationsWithStatus = planData.recommendations.map(rec => ({
      ...rec,
      status: 'pending' as RecommendationStatus,
    }));

    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .insert({
        organization_id: profile.organization_id,
        incident_id: planData.incident_id,
        overall_adequacy_score: planData.overall_adequacy_score,
        findings: planData.findings,
        recommendations: recommendationsWithStatus,
        linked_risks_snapshot: planData.linked_risks_snapshot,
        status: 'pending',
      })
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error saving enhancement plan:', error);
    return { data: null, error };
  }
}

/**
 * Load all enhancement plans for an incident
 */
export async function loadEnhancementPlans(
  incident_id: string
): Promise<{ data: ControlEnhancementPlan[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .select('*')
      .eq('incident_id', incident_id)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error loading enhancement plans:', error);
    return { data: null, error };
  }
}

/**
 * Load single enhancement plan by ID
 */
export async function loadEnhancementPlan(
  plan_id: string
): Promise<{ data: ControlEnhancementPlan | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error loading enhancement plan:', error);
    return { data: null, error };
  }
}

/**
 * Load all pending enhancement plans for organization (admin view)
 */
export async function loadPendingEnhancementPlans(): Promise<{
  data: ControlEnhancementPlan[] | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('control_enhancement_plans')
      .select('*')
      .in('status', ['pending', 'partially_accepted'])
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error loading pending enhancement plans:', error);
    return { data: null, error };
  }
}

/**
 * Update recommendation status (accept/reject)
 */
export async function updateRecommendationStatus(
  plan_id: string,
  recommendation_index: number,
  status: RecommendationStatus,
  notes?: string
): Promise<{ success: boolean; error: any }> {
  try {
    // Get current user
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Load the plan
    const { data: plan, error: loadError } = await loadEnhancementPlan(plan_id);
    if (loadError || !plan) {
      return { success: false, error: loadError || 'Plan not found' };
    }

    // Update the specific recommendation
    const updatedRecommendations = [...plan.recommendations];
    updatedRecommendations[recommendation_index] = {
      ...updatedRecommendations[recommendation_index],
      status,
      ...(status === 'accepted' && {
        accepted_by: user.id,
        accepted_at: new Date().toISOString(),
      }),
      ...(notes && { implementation_notes: notes }),
    };

    // Calculate overall plan status
    const acceptedCount = updatedRecommendations.filter(r => r.status === 'accepted').length;
    const rejectedCount = updatedRecommendations.filter(r => r.status === 'rejected').length;
    const totalCount = updatedRecommendations.length;

    let planStatus: PlanStatus = 'pending';
    if (acceptedCount === totalCount) {
      planStatus = 'fully_accepted';
    } else if (rejectedCount === totalCount) {
      planStatus = 'rejected';
    } else if (acceptedCount > 0 || rejectedCount > 0) {
      planStatus = 'partially_accepted';
    }

    // Update the plan
    const { error: updateError } = await supabase
      .from('control_enhancement_plans')
      .update({
        recommendations: updatedRecommendations,
        status: planStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', plan_id);

    if (updateError) {
      return { success: false, error: updateError };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    return { success: false, error };
  }
}

/**
 * Accept all recommendations in a plan
 */
export async function acceptAllRecommendations(
  plan_id: string,
  notes?: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { data: plan, error: loadError } = await loadEnhancementPlan(plan_id);
    if (loadError || !plan) {
      return { success: false, error: loadError || 'Plan not found' };
    }

    // Accept each recommendation
    for (let i = 0; i < plan.recommendations.length; i++) {
      const result = await updateRecommendationStatus(plan_id, i, 'accepted', notes);
      if (!result.success) {
        return result;
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error accepting all recommendations:', error);
    return { success: false, error };
  }
}

/**
 * Reject all recommendations in a plan
 */
export async function rejectAllRecommendations(
  plan_id: string,
  reason: string
): Promise<{ success: boolean; error: any }> {
  try {
    const { data: plan, error: loadError } = await loadEnhancementPlan(plan_id);
    if (loadError || !plan) {
      return { success: false, error: loadError || 'Plan not found' };
    }

    // Reject each recommendation
    for (let i = 0; i < plan.recommendations.length; i++) {
      const result = await updateRecommendationStatus(plan_id, i, 'rejected', reason);
      if (!result.success) {
        return result;
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error rejecting all recommendations:', error);
    return { success: false, error };
  }
}

/**
 * Mark recommendation as implemented
 */
export async function markRecommendationImplemented(
  plan_id: string,
  recommendation_index: number,
  implementation_notes: string
): Promise<{ success: boolean; error: any }> {
  return updateRecommendationStatus(plan_id, recommendation_index, 'implemented', implementation_notes);
}

/**
 * Delete an enhancement plan (admin only)
 */
export async function deleteEnhancementPlan(plan_id: string): Promise<{ success: boolean; error: any }> {
  try {
    const { error } = await supabase.from('control_enhancement_plans').delete().eq('id', plan_id);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting enhancement plan:', error);
    return { success: false, error };
  }
}

/**
 * Get enhancement plans statistics
 */
export async function getEnhancementPlansStatistics(): Promise<{
  data: {
    total: number;
    pending: number;
    partially_accepted: number;
    fully_accepted: number;
    rejected: number;
    total_recommendations: number;
    accepted_recommendations: number;
  } | null;
  error: any;
}> {
  try {
    const { data: plans, error } = await supabase
      .from('control_enhancement_plans')
      .select('status, recommendations');

    if (error) {
      return { data: null, error };
    }

    const stats = {
      total: plans?.length || 0,
      pending: 0,
      partially_accepted: 0,
      fully_accepted: 0,
      rejected: 0,
      total_recommendations: 0,
      accepted_recommendations: 0,
    };

    plans?.forEach(plan => {
      // Count by status
      if (plan.status === 'pending') stats.pending++;
      else if (plan.status === 'partially_accepted') stats.partially_accepted++;
      else if (plan.status === 'fully_accepted') stats.fully_accepted++;
      else if (plan.status === 'rejected') stats.rejected++;

      // Count recommendations
      const recommendations = plan.recommendations as ControlRecommendation[];
      stats.total_recommendations += recommendations.length;
      stats.accepted_recommendations += recommendations.filter(r => r.status === 'accepted').length;
    });

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error getting enhancement plans statistics:', error);
    return { data: null, error };
  }
}
