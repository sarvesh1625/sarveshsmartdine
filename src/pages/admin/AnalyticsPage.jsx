import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const TABS = [
  { key: 'overview',  label: '📊 Overview'  },
  { key: 'feedback',  label: '⭐ Feedback'   },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState('overview');

  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get('/analytics/summary').then(r => r.data.data),
  });
  const { data: revenue = [] } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: () => api.get(`/analytics/revenue?from=${dayjs().subtract(7,'day').format('YYYY-MM-DD')}&to=${dayjs().format('YYYY-MM-DD')}`).then(r => r.data.data),
  });
  const { data: topItems = [] } = useQuery({
    queryKey: ['analytics-top-items'],
    queryFn: () => api.get('/analytics/top-items').then(r => r.data.data),
  });
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['admin-feedback'],
    queryFn:  () => api.get('/feedback').then(r => r.data.data),
    enabled:  tab === 'feedback',
  });

  const stats = [
    { label: "Today's Revenue", value: `₹${Number(summary?.today_revenue||0).toFixed(0)}`, icon: '💰', color: 'text-green-400' },
    { label: "Today's Orders",  value: summary?.today_orders || 0,                          icon: '📦', color: 'text-white'     },
    { label: 'Total Revenue',   value: `₹${Number(summary?.total_revenue||0).toFixed(0)}`,  icon: '📈', color: 'text-green-400' },
    { label: 'Total Orders',    value: summary?.total_orders || 0,                          icon: '✅', color: 'text-white'     },
  ];

  const reviews   = feedbackData?.reviews   ?? [];
  const averages  = feedbackData?.averages  ?? {};

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-white mb-6">Analytics</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 border-b border-white/5 pb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(({ label, value, icon, color }) => (
              <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <div className="text-2xl mb-2">{icon}</div>
                <div className={`text-2xl font-black mb-0.5 ${color}`}>{value}</div>
                <div className="text-white/40 text-xs">{label}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          {revenue.length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
              <h2 className="text-white font-bold mb-4">Revenue — last 7 days</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickFormatter={d => dayjs(d).format('DD MMM')} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                    formatter={v => [`₹${v}`, 'Revenue']}
                    labelFormatter={d => dayjs(d).format('DD MMM YYYY')}
                  />
                  <Bar dataKey="revenue" fill="#e94560" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top items */}
          {topItems.length > 0 && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <h2 className="text-white font-bold mb-4">Top selling items</h2>
              <div className="space-y-3">
                {topItems.slice(0, 8).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-white/30 text-sm w-5">#{i+1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white font-semibold">{item.name}</span>
                        <span className="text-white/50">{item.total_sold} sold · ₹{Number(item.revenue).toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#e94560] rounded-full"
                          style={{ width: `${topItems[0]?.total_sold ? (item.total_sold / topItems[0].total_sold) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── FEEDBACK ── */}
      {tab === 'feedback' && (
        <>
          {/* Averages */}
          {averages.total_reviews > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Avg Food Rating',    value: averages.avg_food,    icon: '🍽', color: 'text-yellow-400' },
                { label: 'Avg Service Rating', value: averages.avg_service, icon: '🙋', color: 'text-yellow-400' },
                { label: 'Total Reviews',      value: averages.total_reviews, icon: '💬', color: 'text-white'    },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="bg-white/5 border border-white/5 rounded-2xl p-5 text-center">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className={`text-2xl font-black mb-0.5 ${color}`}>
                    {label === 'Total Reviews' ? value : `${value} ★`}
                  </div>
                  <div className="text-white/40 text-xs">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Overall rating bar */}
          {averages.avg_food && (
            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 mb-6">
              <h2 className="text-white font-bold mb-4">Rating breakdown</h2>
              {[
                { label: 'Food quality',  value: averages.avg_food    },
                { label: 'Service',       value: averages.avg_service  },
              ].map(({ label, value }) => (
                <div key={label} className="mb-4 last:mb-0">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/60">{label}</span>
                    <span className="text-yellow-400 font-bold">{value} / 5 ★</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                      style={{ width: `${(value / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reviews list */}
          {feedbackLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <div className="text-5xl mb-4">⭐</div>
              <h2 className="text-lg font-bold mb-2">No feedback yet</h2>
              <p className="text-sm">Customer reviews will appear here after they submit feedback on the order tracking page.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">{reviews.length} reviews</p>
              {reviews.map(r => (
                <div key={r.id} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#e94560]/20 flex items-center justify-center font-black text-[#e94560] text-sm">
                        {r.customer_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{r.customer_name || 'Guest'}</p>
                        <p className="text-white/30 text-xs">Order #{r.order_id?.slice(0,8).toUpperCase()}</p>
                      </div>
                    </div>
                    <span className="text-white/25 text-xs">{dayjs(r.created_at).fromNow()}</span>
                  </div>

                  {/* Ratings */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40 text-xs">Food</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={`text-sm ${s <= r.food_rating ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-yellow-400 text-xs font-bold">{r.food_rating}/5</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40 text-xs">Service</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={`text-sm ${s <= r.service_rating ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                        ))}
                      </div>
                      <span className="text-yellow-400 text-xs font-bold">{r.service_rating}/5</span>
                    </div>
                  </div>

                  {/* Comment */}
                  {r.comment && (
                    <div className="bg-white/5 rounded-xl px-4 py-3">
                      <p className="text-white/65 text-sm leading-relaxed italic">"{r.comment}"</p>
                    </div>
                  )}

                  {/* Average badge */}
                  <div className="mt-3 flex justify-end">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      ((r.food_rating + r.service_rating) / 2) >= 4
                        ? 'bg-green-500/15 border-green-500/25 text-green-400'
                        : ((r.food_rating + r.service_rating) / 2) >= 3
                        ? 'bg-yellow-500/15 border-yellow-500/25 text-yellow-400'
                        : 'bg-red-500/15 border-red-500/25 text-red-400'
                    }`}>
                      Avg {((r.food_rating + r.service_rating) / 2).toFixed(1)} ★
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}