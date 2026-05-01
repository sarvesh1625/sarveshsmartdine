import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function TrialBanner() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['billing-status'],
    queryFn:  () => api.get('/billing/status').then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;
  if (data.isPaid) return null;          // paid plan — no banner
  if (!data.isTrialActive) return null;  // expired — TrialWall handles it

  const days = data.trialDaysLeft;
  const isUrgent = days <= 3;

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold ${
      isUrgent
        ? 'bg-red-500/15 border-b border-red-500/25 text-red-400'
        : 'bg-[#e94560]/10 border-b border-[#e94560]/20 text-[#e94560]'
    }`}>
      <div className="flex items-center gap-2">
        <span className={isUrgent ? 'animate-pulse' : ''}>
          {isUrgent ? '⚠️' : '🎯'}
        </span>
        <span>
          {days === 1
            ? 'Last day of your free trial!'
            : `Free trial: ${days} days remaining`}
          {isUrgent && ' — Upgrade now to avoid losing access'}
        </span>
      </div>
      <button
        onClick={() => navigate('/admin/upgrade')}
        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
          isUrgent
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-[#e94560] text-white hover:bg-[#d63050]'
        }`}
      >
        Upgrade →
      </button>
    </div>
  );
}