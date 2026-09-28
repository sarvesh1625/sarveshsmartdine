import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import api from '../../services/api';

/*  Usage:
      <MenuBulkImport mode="superadmin" />   → shows a restaurant picker (super admin)
      <MenuBulkImport mode="admin" />        → imports into the logged-in restaurant
*/

const TEMPLATE = `category,name_en,name_te,price,discounted_price,description_en,is_veg,preparation_time_mins,image_url
Starters,Paneer Tikka,,220,,Char-grilled paneer with mint chutney,yes,15,
Starters,Chicken 65,,240,199,Crispy spicy fried chicken,no,15,
Main Course,Veg Biryani,,180,,Aromatic basmati rice with vegetables,yes,20,
Main Course,Chicken Biryani,,260,,Hyderabadi dum biryani,no,25,
Drinks,Filter Coffee,,40,,,yes,5,
`;

// Accept common alternative column names
const ALIASES = {
  name: 'name_en', item: 'name_en', item_name: 'name_en', dish: 'name_en',
  category_name: 'category',
  description: 'description_en', desc: 'description_en',
  veg: 'is_veg', type: 'is_veg',
  prep_time: 'preparation_time_mins', prep: 'preparation_time_mins', time: 'preparation_time_mins',
  image: 'image_url', photo: 'image_url', img: 'image_url',
  telugu: 'name_te', discount_price: 'discounted_price', offer_price: 'discounted_price',
};
const REQUIRED = ['category', 'name_en', 'price'];
const OPTION_STYLE = { background: '#1a1a1a', color: '#ffffff' };

function normalizeHeader(h) {
  const key = String(h || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ALIASES[key] || key;
}

export default function MenuBulkImport({ mode = 'admin' }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [restaurantId, setRestaurantId] = useState('');
  const [fileName,     setFileName]     = useState('');
  const [rows,         setRows]         = useState([]);
  const [problem,      setProblem]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);

  const { data: restaurants = [] } = useQuery({
    queryKey: ['superadmin-restaurants-list'],
    queryFn:  () => api.get('/superadmin/restaurants').then(r => r.data.data),
    enabled:  mode === 'superadmin',
  });

  useEffect(() => { setResult(null); }, [restaurantId]);

  function downloadTemplate() {
    const blob = new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'menuvia-menu-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null); setProblem(''); setRows([]); setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: normalizeHeader,
      complete: ({ data, meta }) => {
        const missing = REQUIRED.filter(c => !meta.fields?.includes(c));
        if (missing.length) {
          setProblem(`Missing column(s): ${missing.join(', ')}. Download the template to see the right format.`);
          return;
        }
        if (!data.length) { setProblem('The file has no menu rows.'); return; }
        if (data.length > 500) { setProblem('Maximum 500 items per upload. Split the file into parts.'); return; }
        setRows(data);
      },
      error: () => setProblem('Could not read this file. Save it as CSV (UTF-8) and try again.'),
    });
  }

  async function handleImport() {
    if (mode === 'superadmin' && !restaurantId) { toast.error('Select a restaurant first'); return; }
    setLoading(true);
    try {
      const url = mode === 'superadmin' ? `/menu-import/superadmin/${restaurantId}` : '/menu-import/me';
      const { data } = await api.post(url, { rows });
      setResult(data.data);
      setRows([]); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      qc.invalidateQueries(['categories']);
      qc.invalidateQueries(['menu-items']);
      toast.success(`${data.data.created} items imported`);
    } catch (err) {
      setProblem(err.response?.data?.message || 'Import failed. Nothing was saved.');
    } finally { setLoading(false); }
  }

  const categories = [...new Set(rows.map(r => String(r.category || '').trim()).filter(Boolean))];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-3xl">
      <h3 className="text-white font-black text-lg mb-1">Bulk menu upload</h3>
      <p className="text-white/40 text-sm mb-5">
        Upload one CSV file to add all categories and dishes at once. Existing dishes are never overwritten.
      </p>

      {mode === 'superadmin' && (
        <div className="mb-4">
          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Restaurant</label>
          <select
            value={restaurantId}
            onChange={e => setRestaurantId(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#e94560]/60"
          >
            <option value="" style={OPTION_STYLE}>Select restaurant…</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id} style={OPTION_STYLE}>{r.name}{r.branch_name ? ` — ${r.branch_name}` : ''} ({r.slug})</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={downloadTemplate}
          className="text-xs font-bold px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-colors">
          ⬇ Download template
        </button>
        <label className="text-xs font-bold px-4 py-2.5 bg-[#e94560]/15 border border-[#e94560]/30 text-[#e94560] hover:bg-[#e94560]/25 rounded-xl cursor-pointer transition-colors">
          📄 Choose CSV file
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>
        {fileName && <span className="text-white/40 text-xs self-center">{fileName}</span>}
      </div>

      <p className="text-white/25 text-xs mb-4">
        Using Excel? Fill the sheet, then File → Save As → <span className="text-white/40">CSV UTF-8</span>. Columns:
        category, name_en, price are required; the rest are optional. is_veg accepts yes/no.
      </p>

      {problem && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{problem}</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-3">
            <p className="text-blue-300 text-sm font-semibold">
              Ready: {rows.length} items in {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{categories.join(' · ')}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 text-white/40 text-left">
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Dish</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Veg</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 6).map((r, i) => (
                  <tr key={i} className="border-t border-white/5 text-white/70">
                    <td className="px-3 py-2">{r.category}</td>
                    <td className="px-3 py-2">{r.name_en}</td>
                    <td className="px-3 py-2">₹{r.price}</td>
                    <td className="px-3 py-2">{String(r.is_veg ?? 'yes')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 6 && <p className="text-white/25 text-xs mt-1.5">…and {rows.length - 6} more rows</p>}

          <button onClick={handleImport} disabled={loading}
            className="mt-4 px-6 py-3 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
              : `Import ${rows.length} items`}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm font-bold">✅ Import complete</p>
          <p className="text-white/50 text-xs mt-1">
            {result.created} items added · {result.categoriesCreated} new categories
            {result.skipped > 0 && ` · ${result.skipped} skipped (already existed)`}
          </p>
        </div>
      )}
    </div>
  );
}