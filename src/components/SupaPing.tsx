import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Row = { id: number; msg: string };

export default function SupaPing() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from<Row>('ping')
        .select('*')
        .order('id', { ascending: false })
        .limit(3);

      if (error) setError(error.message);
      else setRows(data ?? []);
    })();
  }, []);

  return (
    <div style={{ padding: 12, margin: 12, border: '1px dashed #ccc', borderRadius: 8 }}>
      <strong>Supabase check</strong>
      {error && <div style={{ color: 'crimson' }}>Error: {error}</div>}
      {!error && !rows && <div>Loading…</div>}
      {!error && rows && rows.length === 0 && (
        <div>No rows found in <code>public.ping</code>.</div>
      )}
      {!error && rows && rows.length > 0 && (
        <ul style={{ margin: '6px 0 0 16px' }}>
          {rows.map(r => <li key={r.id}>{r.msg}</li>)}
        </ul>
      )}
    </div>
  );
}
