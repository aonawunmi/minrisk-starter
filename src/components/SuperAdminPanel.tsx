import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Building2, Users, FileText, RefreshCw, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Organization = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  risk_count?: number;
  primary_admin_email?: string;
  primary_admin_name?: string;
  secondary_admin_count?: number;
};

export function SuperAdminPanel() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // Load organizations with admin details
  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('list_organizations_with_admins');

      if (error) throw error;

      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      alert('Error: Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Create organization with automatic user invitation
  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      alert('Validation Error: Please enter an organization name.');
      return;
    }

    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      alert('Validation Error: Please enter a valid admin email address.');
      return;
    }

    setCreating(true);
    try {
      // Step 1: Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: newOrgName.trim(), active: true }])
        .select()
        .single();

      if (orgError) throw orgError;

      // Step 2: Invite user via Supabase Auth Admin API
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        adminEmail.trim(),
        {
          data: {
            organization_id: org.id,
            organization_name: newOrgName.trim()
          },
          redirectTo: `${window.location.origin}/auth/callback`
        }
      );

      if (inviteError) {
        // If user already exists, try to update their profile instead
        if (inviteError.message.includes('already registered')) {
          const { data: existingUsers } = await supabase
            .from('user_profiles')
            .select('id, email')
            .eq('email', adminEmail.trim())
            .single();

          if (existingUsers) {
            // Update existing user's organization
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                organization_id: org.id,
                role: 'primary_admin'
              })
              .eq('id', existingUsers.id);

            if (updateError) throw updateError;

            alert(`✅ Organization Created!\n\nUser "${adminEmail}" already exists and has been assigned as Primary Admin of "${newOrgName}".`);
          } else {
            throw new Error('User exists but profile not found. Please contact support.');
          }
        } else {
          throw inviteError;
        }
      } else {
        // Success - invitation sent
        alert(`✅ Organization Created Successfully!\n\nOrganization: "${newOrgName}"\nAdmin Email: ${adminEmail}\n\nAn invitation email has been sent to ${adminEmail}.\n\nThey will be automatically assigned as Primary Admin when they accept the invitation.`);
      }

      // Reset form and close dialog
      setNewOrgName('');
      setAdminEmail('');
      setIsCreateDialogOpen(false);

      // Reload organizations
      loadOrganizations();
    } catch (error: any) {
      console.error('Error creating organization:', error);
      alert(`Error: ${error.message || 'Failed to create organization. Please try again.'}`);
    } finally {
      setCreating(false);
    }
  };

  // Toggle organization active status
  const toggleOrganizationStatus = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ active: !org.active })
        .eq('id', org.id);

      if (error) throw error;

      alert(`✅ Status Updated!\n\n"${org.name}" is now ${!org.active ? 'active' : 'inactive'}.`);

      // Reload organizations
      loadOrganizations();
    } catch (error: any) {
      console.error('Error toggling organization status:', error);
      alert(`Error: ${error.message || 'Failed to update organization status.'}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-purple-600" />
            Super Admin Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage multiple organizations and their access
          </p>
        </div>
        <Button onClick={loadOrganizations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{organizations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {organizations.filter(o => o.active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {organizations.reduce((sum, o) => sum + (o.risk_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage all client organizations</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Add a new client organization to the system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      placeholder="e.g., ABC Bank"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Primary Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@abcbank.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This user will be the Primary Admin who can create up to 3 Secondary Admins.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrganization} disabled={creating}>
                    {creating ? 'Creating...' : 'Create Organization'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading organizations...
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No organizations found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Primary Admin</TableHead>
                  <TableHead>Secondary Admins</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.primary_admin_email ? (
                        <div className="text-sm">
                          <div className="font-medium">{org.primary_admin_name || 'N/A'}</div>
                          <div className="text-muted-foreground">{org.primary_admin_email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{org.secondary_admin_count || 0}/3</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.active ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span>{org.risk_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleOrganizationStatus(org)}
                      >
                        {org.active ? (
                          <>
                            <ToggleRight className="h-4 w-4 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-1" />
                            Enable
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Quick Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>To add a new organization:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Click "Add Organization" button above</li>
            <li>Enter the organization name and Primary Admin email</li>
            <li>Click "Create Organization" - the system automatically sends an invitation email</li>
            <li>The admin receives an email to verify and set their password</li>
            <li>Once verified, they're automatically assigned as Primary Admin</li>
          </ol>
          <p className="mt-3"><strong>To disable an organization:</strong> Click the "Disable" button. Users from that organization won't be able to access the system.</p>
        </CardContent>
      </Card>
    </div>
  );
}
