import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger, } from '@/components/ui/popover';
import { User, LogOut, Mail } from 'lucide-react';
export default function UserMenu() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });
        return () => subscription.unsubscribe();
    }, []);
    const handleLogout = async () => {
        setLoading(true);
        console.log('🔓 Logging out...');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
            alert('Failed to logout: ' + error.message);
        }
        else {
            console.log('✅ Logged out successfully');
        }
        setLoading(false);
    };
    if (!user)
        return null;
    const isAnonymous = user.is_anonymous;
    const userEmail = user.email || 'Guest User';
    const userName = user.user_metadata?.full_name || userEmail.split('@')[0];
    return (_jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", size: "sm", className: "gap-2", children: [_jsx(User, { className: "h-4 w-4" }), _jsx("span", { className: "hidden md:inline", children: userName })] }) }), _jsx(PopoverContent, { className: "w-72", align: "end", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h4", { className: "font-semibold text-sm", children: "User Profile" }), _jsxs("div", { className: "space-y-1", children: [!isAnonymous && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(User, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: userName })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx(Mail, { className: "h-4 w-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: userEmail })] })] })), isAnonymous && (_jsxs("div", { className: "text-sm text-gray-500", children: [_jsx("p", { className: "font-medium", children: "Anonymous User" }), _jsx("p", { className: "text-xs mt-1", children: "Your data is stored temporarily" })] }))] })] }), _jsx("div", { className: "pt-2 border-t", children: _jsxs("div", { className: "text-xs text-gray-500 space-y-1", children: [_jsxs("p", { children: ["User ID: ", _jsxs("span", { className: "font-mono text-xs", children: [user.id.slice(0, 8), "..."] })] }), _jsxs("p", { children: ["Session: ", isAnonymous ? 'Guest' : 'Authenticated'] })] }) }), _jsxs(Button, { variant: "outline", size: "sm", className: "w-full gap-2", onClick: handleLogout, disabled: loading, children: [_jsx(LogOut, { className: "h-4 w-4" }), loading ? 'Logging out...' : 'Logout'] })] }) })] }));
}
