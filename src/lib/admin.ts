// src/lib/admin.ts
// Admin utility functions

import { supabase } from './supabase';

type ClearAllResult = {
  success: boolean;
  deleted: {
    alerts: number;
    events: number;
    // incidents: number;  // TODO: Add when table is identified
    // history: number;    // TODO: Add when table is identified
  };
  error?: any;
};

type ClearRiskRegisterResult = {
  success: boolean;
  deleted: {
    risks: number;
    controls: number;
    incidents: number;
    history: number;
  };
  error?: any;
};

/**
 * Clear all risk register data including risks, controls, incidents, and history
 * CRITICAL: This only deletes data for the user's organization (multi-tenant safe)
 */
export async function clearRiskRegisterData(): Promise<ClearRiskRegisterResult> {
  try {
    // Get current user's organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        deleted: { risks: 0, controls: 0, incidents: 0, history: 0 },
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        deleted: { risks: 0, controls: 0, incidents: 0, history: 0 },
        error: 'User profile not found'
      };
    }

    console.log(`🗑️  Starting risk register deletion for organization: ${profile.organization_id}`);

    const deleted = { risks: 0, controls: 0, incidents: 0, history: 0 };

    // 1. Delete risk history first (foreign key dependency)
    console.log('Deleting risk history...');
    const { count: historyCount, error: historyError } = await supabase
      .from('risk_history')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (historyError) {
      console.error('Error deleting risk history:', historyError);
      throw new Error(`Failed to delete risk history: ${historyError.message}`);
    }

    deleted.history = historyCount || 0;
    console.log(`✅ Deleted ${deleted.history} risk history records`);

    // 2. Delete incidents (linked to risks)
    console.log('Deleting incidents...');
    const { count: incidentsCount, error: incidentsError } = await supabase
      .from('incidents')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (incidentsError) {
      console.error('Error deleting incidents:', incidentsError);
      throw new Error(`Failed to delete incidents: ${incidentsError.message}`);
    }

    deleted.incidents = incidentsCount || 0;
    console.log(`✅ Deleted ${deleted.incidents} incidents`);

    // 3. Delete controls (via join with risks since controls don't have organization_id)
    console.log('Deleting controls...');
    // Get all risk IDs for this organization
    const { data: orgRisks } = await supabase
      .from('risks')
      .select('id')
      .eq('organization_id', profile.organization_id);

    const riskIds = orgRisks?.map(r => r.id) || [];

    if (riskIds.length > 0) {
      const { count: controlsCount, error: controlsError } = await supabase
        .from('controls')
        .delete({ count: 'exact' })
        .in('risk_id', riskIds);

      if (controlsError) {
        console.error('Error deleting controls:', controlsError);
        throw new Error(`Failed to delete controls: ${controlsError.message}`);
      }

      deleted.controls = controlsCount || 0;
      console.log(`✅ Deleted ${deleted.controls} controls`);
    } else {
      deleted.controls = 0;
      console.log(`✅ No controls to delete (no risks found)`);
    }

    // 4. Delete risks (must be last due to foreign keys)
    console.log('Deleting risks...');
    const { count: risksCount, error: risksError } = await supabase
      .from('risks')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (risksError) {
      console.error('Error deleting risks:', risksError);
      throw new Error(`Failed to delete risks: ${risksError.message}`);
    }

    deleted.risks = risksCount || 0;
    console.log(`✅ Deleted ${deleted.risks} risks`);

    console.log('✅ Risk register deletion completed successfully');

    return { success: true, deleted, error: null };
  } catch (error) {
    console.error('❌ Error clearing risk register:', error);
    return {
      success: false,
      deleted: { risks: 0, controls: 0, incidents: 0, history: 0 },
      error
    };
  }
}

/**
 * Clear all intelligence data, events, and history for the current organization
 * CRITICAL: This only deletes data for the user's organization (multi-tenant safe)
 */
export async function clearAllOrganizationData(): Promise<ClearAllResult> {
  try {
    // Get current user's organization_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        deleted: { alerts: 0, events: 0 },
        error: 'User not authenticated'
      };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        success: false,
        deleted: { alerts: 0, events: 0 },
        error: 'User profile not found'
      };
    }

    console.log(`🗑️  Starting data deletion for organization: ${profile.organization_id}`);

    const deleted = { alerts: 0, events: 0 };

    // 1. Delete intelligence alerts (all statuses: pending, accepted, rejected)
    console.log('Deleting intelligence alerts...');
    const { count: alertsCount, error: alertsError } = await supabase
      .from('risk_intelligence_alerts')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (alertsError) {
      console.error('Error deleting alerts:', alertsError);
      throw new Error(`Failed to delete alerts: ${alertsError.message}`);
    }

    deleted.alerts = alertsCount || 0;
    console.log(`✅ Deleted ${deleted.alerts} intelligence alerts`);

    // 2. Delete external events
    console.log('Deleting external events...');
    const { count: eventsCount, error: eventsError } = await supabase
      .from('external_events')
      .delete({ count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (eventsError) {
      console.error('Error deleting events:', eventsError);
      throw new Error(`Failed to delete events: ${eventsError.message}`);
    }

    deleted.events = eventsCount || 0;
    console.log(`✅ Deleted ${deleted.events} external events`);

    // TODO: Delete incidence log (table name needs to be identified)
    // const { count: incidentsCount } = await supabase
    //   .from('incidents')  // or 'incident_log' or similar
    //   .delete({ count: 'exact' })
    //   .eq('organization_id', profile.organization_id);
    // deleted.incidents = incidentsCount || 0;

    // TODO: Delete history/audit trail (table name needs to be identified)
    // const { count: historyCount } = await supabase
    //   .from('audit_log')  // or 'risk_history', 'change_log' or similar
    //   .delete({ count: 'exact' })
    //   .eq('organization_id', profile.organization_id);
    // deleted.history = historyCount || 0;

    console.log('✅ Data deletion completed successfully');

    return { success: true, deleted, error: null };
  } catch (error) {
    console.error('❌ Error clearing organization data:', error);
    return {
      success: false,
      deleted: { alerts: 0, events: 0 },
      error
    };
  }
}
