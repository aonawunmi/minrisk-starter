import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
export default function SupaPing() {
    const [rows, setRows] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from('ping')
                .select('*')
                .order('id', { ascending: false })
                .limit(3);
            if (error)
                setError(error.message);
            else
                setRows(data ?? []);
        })();
    }, []);
    return (_jsxs("div", { style: { padding: 12, margin: 12, border: '1px dashed #ccc', borderRadius: 8 }, children: [_jsx("strong", { children: "Supabase check" }), error && _jsxs("div", { style: { color: 'crimson' }, children: ["Error: ", error] }), !error && !rows && _jsx("div", { children: "Loading\u2026" }), !error && rows && rows.length === 0 && (_jsxs("div", { children: ["No rows found in ", _jsx("code", { children: "public.ping" }), "."] })), !error && rows && rows.length > 0 && (_jsx("ul", { style: { margin: '6px 0 0 16px' }, children: rows.map(r => _jsx("li", { children: r.msg }, r.id)) }))] }));
}
