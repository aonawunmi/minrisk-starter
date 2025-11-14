// src/components/PasswordSetup.tsx
// Password setup page for invited users via email

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

export default function PasswordSetup() {
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    // Get token and type from URL
    const token = searchParams.get('token');
    const typeParam = searchParams.get('type');

    if (!token || typeParam !== 'invite') {
      setError('Invalid or expired invitation link');
    } else {
      setTokenHash(token);
      setType(typeParam);
    }
  }, [searchParams]);

  // Password validation
  const validatePassword = (pwd: string): { valid: boolean; message?: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
      setError(validation.message || 'Invalid password');
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!tokenHash || !type) {
      setError('Invalid invitation link');
      return;
    }

    setLoading(true);

    try {
      // Verify the OTP token and set password
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'invite',
      });

      if (verifyError) {
        console.error('Verify OTP error:', verifyError);
        throw new Error('Failed to verify invitation: ' + verifyError.message);
      }

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        console.error('Update password error:', updateError);
        throw new Error('Failed to set password: ' + updateError.message);
      }

      setSuccess(true);

      // Redirect to main app after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to set up password');
      console.error('Password setup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-center">Password Set Successfully!</CardTitle>
            <CardDescription className="text-center">
              Your password has been set. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            Welcome to MinRisk! Please create a secure password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading || !tokenHash}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  disabled={loading || !tokenHash}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-xs text-gray-600 font-medium mb-2">Password Requirements:</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li className="flex items-center gap-2">
                  {password.length >= 8 ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  {/[A-Z]/.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  One uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  {/[a-z]/.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  One lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  {/[0-9]/.test(password) ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  One number
                </li>
                <li className="flex items-center gap-2">
                  {password === confirmPassword && password.length > 0 ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <div className="h-3 w-3 rounded-full border border-gray-300" />
                  )}
                  Passwords match
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !tokenHash || !password || !confirmPassword}
            >
              {loading ? 'Setting up...' : 'Set Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
