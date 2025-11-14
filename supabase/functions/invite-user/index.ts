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

    // Check if user is super admin, primary admin, or secondary admin
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
    const isSecondaryAdmin = profile.role === 'secondary_admin';

    // Only Super Admin, Primary Admin, or Secondary Admin can invite users
    if (!isSuperAdmin && !isPrimaryAdmin && !isSecondaryAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only Admins can invite users' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get request body
    const { email, organization_id, organization_name, redirect_to, role } = await req.json();

    if (!email || !organization_id || !organization_name) {
      throw new Error('Missing required fields: email, organization_id, organization_name');
    }

    // Validate role parameter
    const inviteRole = role || 'user'; // Default to 'user' if not specified
    const validRoles = ['user', 'secondary_admin', 'primary_admin'];

    if (!validRoles.includes(inviteRole)) {
      return new Response(
        JSON.stringify({ error: `Invalid role: ${inviteRole}. Must be one of: ${validRoles.join(', ')}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Secondary Admins can only create regular users
    if (isSecondaryAdmin && inviteRole !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Secondary Admins can only invite regular users' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Primary Admins can create secondary admins and users (not other primary admins)
    if (isPrimaryAdmin && inviteRole === 'primary_admin') {
      return new Response(
        JSON.stringify({ error: 'Primary Admins cannot create other Primary Admins' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Non-Super Admins must invite users to their own organization
    if (!isSuperAdmin && profile.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ error: 'You can only invite users to your own organization' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a Supabase Admin client to invite the user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Invite the user
    // Redirect to password setup page in the app
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const defaultRedirect = `${appUrl}/password-setup`;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          organization_id,
          organization_name,
          role: inviteRole,
        },
        redirectTo: redirect_to || defaultRedirect,
      }
    );

    if (inviteError) {
      // Check if user already exists
      if (inviteError.message.includes('already registered')) {
        // Try to get the existing user
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const user = existingUser?.users.find((u) => u.email === email);

        if (user) {
          // Update the user's profile with organization info
          const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
              organization_id,
              role: inviteRole,
            })
            .eq('id', user.id);

          if (updateError) {
            throw updateError;
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: 'User already exists and has been assigned to the organization',
              user_id: user.id,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      throw inviteError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation sent successfully',
        user: inviteData.user,
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
