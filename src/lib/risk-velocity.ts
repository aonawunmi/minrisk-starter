/**
 * Risk Velocity & Movement Analysis
 * Tracks risk score changes over time for trend analysis
 */

import { supabase } from './supabase';
import { ProcessedRisk } from '../App';
import { generateRiskMovementNarrative, RiskMovementData } from './narrative-generator';

export interface RiskMovement {
  id?: string;
  organization_id: string;
  risk_code: string;
  risk_title: string;
  category: string;
  period: string;
  inherent_score: number;
  residual_score: number;
  previous_residual_score?: number;
  change_from_previous?: number;
  velocity?: 'rising' | 'falling' | 'stable';
  narrative?: string;
  captured_at: string;
}

/**
 * Capture current risk scores for a period
 * This should be called at the end of each reporting period (Q1, Q2, etc.)
 */
export async function captureRiskSnapshot(
  organizationId: string,
  period: string,
  risks: ProcessedRisk[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get previous period data to calculate changes
    const { data: previousData } = await supabase
      .from('risk_movement_history')
      .select('*')
      .eq('organization_id', organizationId)
      .order('captured_at', { ascending: false })
      .limit(risks.length);

    const previousMap = new Map(
      (previousData || []).map(pm => [pm.risk_code, pm])
    );

    const movements: Omit<RiskMovement, 'id'>[] = risks.map(risk => {
      const prev = previousMap.get(risk.risk_code);
      const change = prev ? risk.residual_score - prev.residual_score : 0;

      let velocity: 'rising' | 'falling' | 'stable' = 'stable';
      if (Math.abs(change) >= 2) {
        velocity = change > 0 ? 'rising' : 'falling';
      }

      return {
        organization_id: organizationId,
        risk_code: risk.risk_code,
        risk_title: risk.risk_title,
        category: risk.category,
        period,
        inherent_score: risk.inherent_score,
        residual_score: risk.residual_score,
        previous_residual_score: prev?.residual_score,
        change_from_previous: change,
        velocity,
        captured_at: new Date().toISOString(),
      };
    });

    // Insert movements
    const { error } = await supabase
      .from('risk_movement_history')
      .upsert(movements, {
        onConflict: 'organization_id,risk_code,period',
      });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error capturing risk snapshot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk movements for a specific period
 */
export async function getRiskMovements(
  organizationId: string,
  period: string
): Promise<RiskMovement[]> {
  try {
    const { data, error } = await supabase
      .from('risk_movement_history')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period', period)
      .order('change_from_previous', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching risk movements:', error);
    return [];
  }
}

/**
 * Get top rising risks (most significant increases)
 */
export async function getTopRisingRisks(
  organizationId: string,
  period: string,
  limit: number = 10
): Promise<RiskMovement[]> {
  try {
    const { data, error } = await supabase
      .from('risk_movement_history')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period', period)
      .eq('velocity', 'rising')
      .order('change_from_previous', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching rising risks:', error);
    return [];
  }
}

/**
 * Get top falling risks (most improved)
 */
export async function getTopFallingRisks(
  organizationId: string,
  period: string,
  limit: number = 10
): Promise<RiskMovement[]> {
  try {
    const { data, error } = await supabase
      .from('risk_movement_history')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('period', period)
      .eq('velocity', 'falling')
      .order('change_from_previous', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching falling risks:', error);
    return [];
  }
}

/**
 * Generate narratives for risk movements
 */
export async function generateMovementNarratives(
  organizationId: string,
  period: string
): Promise<{ success: boolean; updated: number }> {
  try {
    const movements = await getRiskMovements(organizationId, period);

    // Only generate for risks with significant movement
    const significantMovements = movements.filter(
      m => m.velocity && m.velocity !== 'stable' && !m.narrative
    );

    let updated = 0;

    for (const movement of significantMovements) {
      const movementData: RiskMovementData = {
        risk_code: movement.risk_code,
        risk_title: movement.risk_title,
        category: movement.category,
        previous_score: movement.previous_residual_score || movement.residual_score,
        current_score: movement.residual_score,
        change: movement.change_from_previous || 0,
        velocity: movement.velocity!,
        period: movement.period,
      };

      const narrative = await generateRiskMovementNarrative(movementData);

      // Update the movement with narrative
      const { error } = await supabase
        .from('risk_movement_history')
        .update({ narrative })
        .eq('id', movement.id);

      if (!error) updated++;
    }

    return { success: true, updated };
  } catch (error) {
    console.error('Error generating movement narratives:', error);
    return { success: false, updated: 0 };
  }
}

/**
 * Get risk velocity summary for dashboard
 */
export async function getRiskVelocitySummary(
  organizationId: string,
  period: string
): Promise<{
  total_risks: number;
  rising: number;
  falling: number;
  stable: number;
  avg_change: number;
}> {
  try {
    const movements = await getRiskMovements(organizationId, period);

    const summary = {
      total_risks: movements.length,
      rising: movements.filter(m => m.velocity === 'rising').length,
      falling: movements.filter(m => m.velocity === 'falling').length,
      stable: movements.filter(m => m.velocity === 'stable').length,
      avg_change:
        movements.length > 0
          ? movements.reduce((sum, m) => sum + (m.change_from_previous || 0), 0) / movements.length
          : 0,
    };

    return summary;
  } catch (error) {
    console.error('Error getting velocity summary:', error);
    return {
      total_risks: 0,
      rising: 0,
      falling: 0,
      stable: 0,
      avg_change: 0,
    };
  }
}

/**
 * Get risk trend over multiple periods
 */
export async function getRiskTrend(
  organizationId: string,
  riskCode: string,
  limit: number = 4
): Promise<RiskMovement[]> {
  try {
    const { data, error } = await supabase
      .from('risk_movement_history')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('risk_code', riskCode)
      .order('captured_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).reverse(); // Return chronological order
  } catch (error) {
    console.error('Error fetching risk trend:', error);
    return [];
  }
}
