// Import the necessary modules
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is a Super Admin
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only Super Admins can delete organizations' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get request body
    const { organization_id } = await req.json();

    if (!organization_id) {
      throw new Error('Missing required field: organization_id');
    }

    // Create a Supabase Admin client for deletion
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    );

    // Get organization details before deletion
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Step 1: Get all users associated with this organization
    const { data: orgUsers, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('organization_id', organization_id);

    if (usersError) {
      console.error('Error fetching org users:', usersError);
    }

    // Step 2: Delete the organization (CASCADE will handle related data)
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organization_id);

    if (deleteError) {
      throw deleteError;
    }

    // Step 3: Delete auth users if they were only associated with this organization
    if (orgUsers && orgUsers.length > 0) {
      for (const orgUser of orgUsers) {
        // Check if this user has other organization associations
        const { data: otherOrgs } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('id', orgUser.id);

        // If no other org associations, delete the auth user
        if (!otherOrgs || otherOrgs.length === 0) {
          await supabaseAdmin.auth.admin.deleteUser(orgUser.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Organization "${org.name}" has been permanently deleted`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Delete organization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
