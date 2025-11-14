import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

type SetPasswordPageProps = {
  onPasswordSet: () => void;
  userEmail: string | null;
  organizationName: string | null;
};

export function SetPasswordPage({ onPasswordSet, userEmail, organizationName }: SetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'text-red-600' };
    if (score === 3) return { score, label: 'Fair', color: 'text-yellow-600' };
    if (score === 4) return { score, label: 'Good', color: 'text-blue-600' };
    return { score, label: 'Strong', color: 'text-green-600' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const validatePassword = (): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
    if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // Update user password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      console.log('✅ Password set successfully');
      onPasswordSet();
    } catch (err: any) {
      console.error('❌ Failed to set password:', err);
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Set Your Password</h1>
          <p className="text-gray-600">
            Welcome to MinRisk{organizationName ? ` at ${organizationName}` : ''}!
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-2">{userEmail}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSetPassword} className="space-y-6">
          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Enter a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">Password Strength:</span>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      passwordStrength.score <= 2
                        ? 'bg-red-500'
                        : passwordStrength.score === 3
                        ? 'bg-yellow-500'
                        : passwordStrength.score === 4
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && (
              <div className="mt-2 flex items-center text-sm">
                {password === confirmPassword ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600 mr-1" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <span className={password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>
                  {password.length >= 8 ? '✓' : '○'}
                </span>
                <span className="ml-2">At least 8 characters</span>
              </li>
              <li className="flex items-center">
                <span className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[a-z]/.test(password) ? '✓' : '○'}
                </span>
                <span className="ml-2">One lowercase letter</span>
              </li>
              <li className="flex items-center">
                <span className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[A-Z]/.test(password) ? '✓' : '○'}
                </span>
                <span className="ml-2">One uppercase letter</span>
              </li>
              <li className="flex items-center">
                <span className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[0-9]/.test(password) ? '✓' : '○'}
                </span>
                <span className="ml-2">One number</span>
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Setting Password...' : 'Set Password & Continue'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-center text-gray-500 mt-6">
          After setting your password, you'll be able to log in to MinRisk anytime.
        </p>
      </div>
    </div>
  );
}
