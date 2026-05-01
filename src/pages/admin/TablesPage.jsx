import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function TablesPage() {
  const qc = useQueryClient();
  const [newTable, setNewTable] = useState('');

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get('/restaurant/tables').then(r => r.data.data),
  });

  const addTable = useMutation({
    mutationFn: n => api.post('/restaurant/tables', { table_number: n }),
    onSuccess: () => { qc.invalidateQueries(['tables']); setNewTable(''); toast.success('Table added'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteTable = useMutation({
    mutationFn: id => api.delete(`/restaurant/tables/${id}`),
    onSuccess: () => { qc.invalidateQueries(['tables']); toast.success('Table removed'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleUpiOnly = useMutation({
    mutationFn: ({ id, upi_only }) => api.patch(`/restaurant/tables/${id}`, { upi_only }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['tables']);
      toast.success(vars.upi_only ? '📱 UPI-only enabled for this table' : 'All payment methods restored');
    },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  async function downloadQR(table) {
    const QRCode = (await import('qrcode')).default;
    const url = await QRCode.toDataURL(table.qr_code_url, { width: 400, margin: 2 });
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-${table.table_number}-qr.png`;
    a.click();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Tables & QR Codes</h1>

      <div className="flex gap-2 mb-8">
        <input
          value={newTable}
          onChange={e => setNewTable(e.target.value)}
          placeholder="Table number (e.g. 1, 2, VIP)"
          onKeyDown={e => e.key === 'Enter' && newTable && addTable.mutate(newTable)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60"
        />
        <button
          onClick={() => newTable && addTable.mutate(newTable)}
          disabled={!newTable || addTable.isPending}
          className="px-5 py-3 bg-[#e94560] hover:bg-[#d63050] text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
        >
          {addTable.isPending ? '...' : '+ Add'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <div className="text-4xl mb-3">🪑</div>
          <p>No tables yet. Add your first table!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tables.map(table => (
            <div key={table.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-2xl font-black text-white">T{table.table_number}</div>
                {table.upi_only ? (
                  <span className="text-xs bg-[#e94560]/20 border border-[#e94560]/30 text-[#e94560] px-2 py-0.5 rounded-lg font-bold">UPI Only</span>
                ) : null}
              </div>
              <p className="text-white/20 text-xs mb-4 truncate">{table.qr_code_url}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQR(table)}
                  className="flex-1 text-xs font-bold px-2 py-2 bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/30 rounded-xl hover:bg-[#e94560]/30 transition-colors"
                >
                  📥 QR
                </button>
                <button
                  onClick={() => { if (window.confirm('Remove table?')) deleteTable.mutate(table.id); }}
                  className="text-white/20 hover:text-red-400 text-sm px-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}