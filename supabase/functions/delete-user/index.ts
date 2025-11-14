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

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // Check if user is super admin or primary admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('is_super_admin, role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Unable to verify user profile' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const isSuperAdmin = profile.is_super_admin;
    const isPrimaryAdmin = profile.role === 'primary_admin';

    // Only Super Admin or Primary Admin can delete users
    if (!isSuperAdmin && !isPrimaryAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only Admins can delete users' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get request body
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('Missing required field: user_id');
    }

    // Prevent users from deleting themselves
    if (user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the user to be deleted
    const { data: userToDelete, error: getUserError } = await supabaseClient
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user_id)
      .single();

    if (getUserError || !userToDelete) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Non-Super Admins can only delete users from their own organization
    if (!isSuperAdmin && profile.organization_id !== userToDelete.organization_id) {
      return new Response(
        JSON.stringify({ error: 'You can only delete users from your own organization' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a Supabase Admin client to delete the user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete from audit_trail first (if exists)
    const { error: auditError } = await supabaseAdmin
      .from('audit_trail')
      .delete()
      .eq('user_id', user_id);

    if (auditError) {
      console.error('Error deleting from audit_trail:', auditError);
      // Don't throw - continue with deletion even if audit_trail fails
    }

    // Delete from user_profiles
    const { error: profileDeleteError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user_id);

    if (profileDeleteError) {
      throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`);
    }

    // Delete from auth.users using admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      throw new Error(`Failed to delete auth user: ${authDeleteError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User deleted successfully',
        user_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
