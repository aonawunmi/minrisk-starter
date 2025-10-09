import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthScreen from './AuthScreen';
export default function AuthGate({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        console.log('🔐 AuthGate: Checking session...');
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('🔐 AuthGate: Session result:', session ? 'Logged in' : 'Not logged in');
            setSession(session);
            setLoading(false);
        });
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('🔐 AuthGate: Auth state changed:', _event, session ? 'Logged in' : 'Not logged in');
            setSession(session);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen w-full bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" }), _jsx("p", { className: "text-gray-600", children: "Loading..." })] }) }));
    }
    if (!session) {
        return _jsx(AuthScreen, {});
    }
    return _jsx(_Fragment, { children: children });
}
