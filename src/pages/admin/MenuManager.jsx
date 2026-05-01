import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';

/* ── Upload image to Cloudinary (free tier) ─────────────────────────────── */
async function uploadToCloudinary(file) {
  const CLOUD_NAME  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env');
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'menucloud/menu-items');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) throw new Error('Upload failed. Check Cloudinary settings.');
  const data = await res.json();
  // Return optimised URL — auto format, quality, and resize to 600px wide
  return data.secure_url.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
}

/* ── Image picker component ─────────────────────────────────────────────── */
function ImagePicker({ value, onChange }) {
  const fileRef  = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('upload'); // 'upload' | 'url'

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size is 5MB'); return; }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="col-span-2">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-2">
        {[['upload','📷 Upload photo'],['url','🔗 Paste URL']].map(([t,label]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              tab === t ? 'bg-[#e94560] text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all ${
            uploading ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-white/10 hover:border-[#e94560]/40 hover:bg-white/3'
          }`}
          style={{ height: 120 }}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

          {value ? (
            <>
              <img src={value} alt="Food" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-bold">Change photo</span>
              </div>
              <button type="button"
                onClick={e => { e.stopPropagation(); onChange(''); }}
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500 transition-colors">
                ✕
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              {uploading ? (
                <>
                  <div className="w-6 h-6 border-2 border-yellow-400/40 border-t-yellow-400 rounded-full animate-spin" />
                  <span className="text-yellow-400 text-xs font-semibold">Uploading...</span>
                </>
              ) : (
                <>
                  <div className="text-3xl">📷</div>
                  <span className="text-white/40 text-xs text-center leading-relaxed">
                    Tap to upload food photo<br/>
                    <span className="text-white/20">JPG, PNG · Max 5MB</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all"
          />
          {value && (
            <img src={value} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" onError={e => e.target.style.display='none'} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Combo Builder ───────────────────────────────────────────────────────── */
function ComboBuilder({ items, savings, onItemsChange, onSavingsChange }) {
  const [newName, setNewName] = useState('');
  const [newQty,  setNewQty]  = useState(1);
  const inp2 = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/25 focus:outline-none focus:border-purple-500/60 transition-all";

  function addRow() {
    const name = newName.trim();
    if (!name) return;
    onItemsChange([...items, { name, qty: newQty }]);
    setNewName(''); setNewQty(1);
  }

  function removeRow(idx) { onItemsChange(items.filter((_, i) => i !== idx)); }

  function updateQty(idx, qty) {
    onItemsChange(items.map((r, i) => i === idx ? { ...r, qty: Math.max(1, qty) } : r));
  }

  return (
    <div className="mt-3 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3">
      <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">📦 What's included in this combo?</p>

      {items.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
          <span className="text-white/70 text-xs flex-1 font-medium">{row.name}</span>
          <button type="button" onClick={() => updateQty(idx, row.qty - 1)}
            className="w-6 h-6 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 text-xs font-bold flex items-center justify-center">−</button>
          <span className="text-white text-xs font-bold w-5 text-center">{row.qty}</span>
          <button type="button" onClick={() => updateQty(idx, row.qty + 1)}
            className="w-6 h-6 rounded-lg bg-white/10 text-white/50 hover:bg-white/20 text-xs font-bold flex items-center justify-center">+</button>
          <button type="button" onClick={() => removeRow(idx)}
            className="w-6 h-6 rounded-lg bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 text-xs flex items-center justify-center transition-all">✕</button>
        </div>
      ))}

      <div className="flex gap-2">
        <input placeholder="Item name (e.g. Rice, Dal, Sambar...)" value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRow())}
          className={`flex-1 ${inp2}`} />
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2">
          <button type="button" onClick={() => setNewQty(q => Math.max(1, q - 1))} className="w-5 h-5 text-white/40 hover:text-white text-xs font-bold">−</button>
          <span className="text-white text-xs font-bold w-4 text-center">{newQty}</span>
          <button type="button" onClick={() => setNewQty(q => q + 1)} className="w-5 h-5 text-white/40 hover:text-white text-xs font-bold">+</button>
        </div>
        <button type="button" onClick={addRow} disabled={!newName.trim()}
          className="px-3 py-2 bg-purple-500/80 hover:bg-purple-500 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-all">
          + Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="text-white/50 text-xs bg-white/3 rounded-lg px-3 py-2">
          🎁 {items.map(r => `${r.qty}× ${r.name}`).join(' · ')}
        </div>
      )}

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
        <input type="number" placeholder="Customer savings vs buying separately (optional)"
          value={savings} onChange={e => onSavingsChange(e.target.value)}
          className={`w-full ${inp2} pl-7`} />
      </div>
    </div>
  );
}

/* ── Main MenuManager ────────────────────────────────────────────────────── */
export default function MenuManager() {
  const qc = useQueryClient();
  const [showCatForm,  setShowCatForm]  = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem,  setEditingItem]  = useState(null); // item being edited

  const blankItem = { category_id: '', name_en: '', name_te: '', price: '', discounted_price: '', description_en: '', is_veg: true, preparation_time_mins: 15, image_url: '', is_combo: false, combo_items: [], combo_savings: '' };
  const [catForm,  setCatForm]  = useState({ name_en: '', name_te: '', name_hi: '' });
  const [itemForm, setItemForm] = useState(blankItem);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => api.get('/categories').then(r => r.data.data),
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn:  () => api.get('/menu-items').then(r => r.data.data),
  });

  const createCat = useMutation({
    mutationFn: d => api.post('/categories', d),
    onSuccess: () => { qc.invalidateQueries(['categories']); setShowCatForm(false); setCatForm({ name_en:'',name_te:'',name_hi:'' }); toast.success('Category added'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createItem = useMutation({
    mutationFn: d => api.post('/menu-items', d),
    onSuccess: () => { qc.invalidateQueries(['menu-items']); setShowItemForm(false); setItemForm(blankItem); toast.success('Item added!'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/menu-items/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(['menu-items']); setEditingItem(null); toast.success('Item updated!'); },
    onError: e => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleAvail = useMutation({
    mutationFn: id => api.patch(`/menu-items/${id}/availability`),
    onSuccess: () => qc.invalidateQueries(['menu-items']),
  });

  const deleteItem = useMutation({
    mutationFn: id => api.delete(`/menu-items/${id}`),
    onSuccess: () => { qc.invalidateQueries(['menu-items']); toast.success('Item deleted'); },
    onError: () => toast.error('Cannot delete — item has orders'),
  });

  const inp = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#e94560]/60 transition-all";

  function openEdit(item) {
    setEditingItem(item.id);
    setItemForm({
      category_id:          item.category_id,
      name_en:              item.name_en,
      name_te:              item.name_te || '',
      price:                item.price,
      discounted_price:     item.discounted_price || '',
      description_en:       item.description_en || '',
      is_veg:               item.is_veg,
      preparation_time_mins: item.preparation_time_mins || 15,
      image_url:            item.image_url || '',
      is_combo:             item.is_combo || false,
      combo_items:          Array.isArray(item.combo_items) ? item.combo_items : (item.combo_items ? (() => { try { return JSON.parse(item.combo_items); } catch { return []; } })() : []),
      combo_savings:        item.combo_savings || '',
    });
    setShowItemForm(true);
    setTimeout(() => document.getElementById('item-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  function submitItem() {
    const payload = {
      ...itemForm,
      price:            Number(itemForm.price),
      discounted_price: itemForm.discounted_price && Number(itemForm.discounted_price) > 0 ? Number(itemForm.discounted_price) : null,
      image_url:        itemForm.image_url || null,
      is_combo:         itemForm.is_combo ? 1 : 0,
      combo_items:      itemForm.is_combo && itemForm.combo_items?.length ? itemForm.combo_items : null,
      combo_savings:    itemForm.combo_savings ? Number(itemForm.combo_savings) : null,
      tags:             itemForm.is_combo ? ['combo'] : null,
    };
    if (editingItem) {
      updateItem.mutate({ id: editingItem, data: payload });
    } else {
      createItem.mutate(payload);
    }
  }

  function cancelItemForm() {
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm(blankItem);
  }

  const isSaving = createItem.isPending || updateItem.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Menu Manager</h1>
          <p className="text-white/30 text-xs mt-0.5">{items.length} items · {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowCatForm(v => !v); setShowItemForm(false); }}
            className="text-xs font-bold px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
            + Category
          </button>
          <button onClick={() => { setShowItemForm(v => !v); setEditingItem(null); setItemForm(blankItem); setShowCatForm(false); }}
            className="text-xs font-bold px-3 py-2 bg-[#e94560] hover:bg-[#d63050] text-white rounded-xl transition-colors">
            + Add Item
          </button>
        </div>
      </div>

      {/* Category form */}
      <AnimatePresence>
        {showCatForm && (
          <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
            <h3 className="text-white font-bold mb-4 text-sm">New Category</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[['name_en','English *'],['name_te','Telugu'],['name_hi','Hindi']].map(([k,p]) => (
                <input key={k} placeholder={p} value={catForm[k]} onChange={e => setCatForm({...catForm,[k]:e.target.value})} className={inp} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => createCat.mutate(catForm)} disabled={!catForm.name_en || createCat.isPending}
                className="px-4 py-2 bg-[#e94560] text-white text-sm font-bold rounded-xl disabled:opacity-50">
                {createCat.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowCatForm(false)} className="px-4 py-2 bg-white/10 text-white/60 text-sm rounded-xl">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit item form */}
      <AnimatePresence>
        {showItemForm && (
          <motion.div id="item-form" initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-10 }}
            className="bg-white/5 border border-[#e94560]/20 rounded-2xl p-5 mb-5">

            <h3 className="text-white font-bold mb-4 text-sm flex items-center gap-2">
              {editingItem ? '✏️ Edit Item' : '+ New Menu Item'}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-3">

              {/* Category */}
              <div className="col-span-2">
                <select value={itemForm.category_id} onChange={e => setItemForm({...itemForm,category_id:e.target.value})} className={inp}>
                  <option value="">Select Category *</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
              </div>

              {/* Names */}
              <input placeholder="Item Name (English) *" value={itemForm.name_en}
                onChange={e => setItemForm({...itemForm,name_en:e.target.value})} className={inp} />
              <input placeholder="Item Name (Telugu)" value={itemForm.name_te}
                onChange={e => setItemForm({...itemForm,name_te:e.target.value})} className={inp} />

              {/* Prices */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                <input type="number" placeholder="Price *" value={itemForm.price}
                  onChange={e => setItemForm({...itemForm,price:e.target.value})}
                  className={`${inp} pl-7`} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                <input type="number" placeholder="Discounted Price (optional)" value={itemForm.discounted_price}
                  onChange={e => setItemForm({...itemForm,discounted_price:e.target.value})}
                  className={`${inp} pl-7`} />
              </div>

              {/* Description */}
              <div className="col-span-2">
                <textarea placeholder="Description — tell customers what makes this dish special..." value={itemForm.description_en}
                  onChange={e => setItemForm({...itemForm,description_en:e.target.value})}
                  rows={2} className={`${inp} resize-none`} />
              </div>

              {/* IMAGE UPLOAD — the key new section */}
              <div className="col-span-2">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Food Photo</p>
                <ImagePicker
                  value={itemForm.image_url}
                  onChange={url => setItemForm({...itemForm, image_url: url})}
                />
              </div>

              {/* Combo toggle */}
              <div className="col-span-2">
                <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/8 rounded-xl">
                  <button type="button" onClick={() => setItemForm(f => ({...f, is_combo: !f.is_combo}))}
                    className={`relative w-10 h-6 rounded-full transition-all flex-shrink-0 ${itemForm.is_combo ? 'bg-[#e94560]' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${itemForm.is_combo ? 'left-5' : 'left-1'}`} />
                  </button>
                  <div>
                    <p className="text-white text-xs font-bold">Combo Meal</p>
                    <p className="text-white/30 text-xs">Mark this as a combo deal with multiple items included</p>
                  </div>
                </div>
                {itemForm.is_combo && (
                  <ComboBuilder
                    items={itemForm.combo_items || []}
                    savings={itemForm.combo_savings}
                    onItemsChange={combo_items => setItemForm(f => ({...f, combo_items}))}
                    onSavingsChange={combo_savings => setItemForm(f => ({...f, combo_savings}))}
                  />
                )}
              </div>

              {/* Prep time + Veg toggle */}
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs font-semibold whitespace-nowrap">Prep (min)</span>
                <input type="number" value={itemForm.preparation_time_mins}
                  onChange={e => setItemForm({...itemForm,preparation_time_mins:parseInt(e.target.value)||0})}
                  className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e94560]/60" />
              </div>

              <div className="flex items-center gap-2">
                {[true,false].map(v => (
                  <button key={String(v)} type="button" onClick={() => setItemForm({...itemForm,is_veg:v})}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      itemForm.is_veg === v
                        ? v ? 'bg-green-500/20 border-green-500/40 text-green-400'
                            : 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'border-white/10 text-white/25 hover:border-white/20'
                    }`}>
                    {v ? '🟢 Veg' : '🔴 Non-Veg'}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview if image set */}
            {itemForm.image_url && (
              <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-xl mb-3">
                <img src={itemForm.image_url} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                <div>
                  <p className="text-white/70 text-xs font-semibold mb-0.5">Photo preview</p>
                  <p className="text-white/30 text-xs">Will show on menu page for customers</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button onClick={submitItem}
                disabled={!itemForm.category_id || !itemForm.name_en || !itemForm.price || isSaving}
                className="px-5 py-2.5 bg-[#e94560] hover:bg-[#d63050] disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
                {isSaving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : editingItem ? 'Update Item' : 'Add Item'
                }
              </button>
              <button onClick={cancelItemForm} className="px-4 py-2.5 bg-white/10 text-white/50 text-sm rounded-xl hover:bg-white/15 transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu items list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <div className="text-5xl mb-4">🍽️</div>
          <p className="font-bold">No items yet</p>
          <p className="text-sm mt-1">Add your first dish above</p>
        </div>
      ) : (
        categories.map(cat => {
          const catItems = items.filter(i => i.category_id === cat.id);
          if (!catItems.length) return null;
          return (
            <div key={cat.id} className="mb-6">
              <h3 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>{cat.name_en}</span>
                <span className="text-white/20">({catItems.length})</span>
              </h3>
              <div className="space-y-2">
                {catItems.map(item => (
                  <motion.div key={item.id} layout
                    className={`flex items-center gap-3 bg-white/5 border rounded-2xl p-3 transition-all hover:bg-white/7 ${
                      item.is_available ? 'border-white/5' : 'border-red-500/15 opacity-55'
                    } ${editingItem === item.id ? 'border-[#e94560]/30' : ''}`}>

                    {/* Food image or placeholder */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-white/5 border border-white/8">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name_en} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-white/10">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white text-sm font-semibold">{item.name_en}</p>
                        <div className={`w-2.5 h-2.5 rounded-sm border flex-shrink-0 ${item.is_veg ? 'border-green-500' : 'border-red-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full m-px ${item.is_veg ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.discounted_price ? (
                          <>
                            <span className="text-[#e94560] text-xs font-bold">₹{item.discounted_price}</span>
                            <span className="text-white/25 text-xs line-through">₹{item.price}</span>
                          </>
                        ) : (
                          <span className="text-[#e94560] text-xs font-bold">₹{item.price}</span>
                        )}
                        {item.is_combo && (
                          <span className="text-purple-400/80 text-xs bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-md" title={Array.isArray(item.combo_items) ? item.combo_items.map(r=>`${r.qty}× ${r.name}`).join(', ') : ''}>
                            🎁 Combo{Array.isArray(item.combo_items) && item.combo_items.length > 0 ? ` (${item.combo_items.length} items)` : ''}
                          </span>
                        )}
                    {!item.image_url && (
                          <span className="text-yellow-500/60 text-xs">· No photo</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Edit button */}
                      <button onClick={() => openEdit(item)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-semibold border bg-white/5 border-white/10 text-white/40 hover:bg-white/15 hover:text-white transition-all">
                        Edit
                      </button>

                      {/* Available toggle */}
                      <button onClick={() => toggleAvail.mutate(item.id)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border transition-all ${
                          item.is_available
                            ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-green-500/10 hover:border-green-500/20 hover:text-green-400'
                        }`}>
                        {item.is_available ? 'Live' : 'Off'}
                      </button>

                      {/* Delete */}
                      <button onClick={() => window.confirm('Delete this item?') && deleteItem.mutate(item.id)}
                        className="text-white/15 hover:text-red-400 transition-colors text-sm px-1">✕</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Cloudinary setup hint if not configured */}
      {!import.meta.env.VITE_CLOUDINARY_CLOUD_NAME && (
        <div className="mt-6 bg-yellow-500/8 border border-yellow-500/20 rounded-2xl p-4">
          <p className="text-yellow-400 text-xs font-bold mb-1">📷 Photo upload setup needed</p>
          <p className="text-white/40 text-xs leading-relaxed">
            Add these to <code className="bg-white/10 px-1 rounded">frontend/.env</code> to enable photo uploads:<br/>
            <code className="text-yellow-300/70">VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name</code><br/>
            <code className="text-yellow-300/70">VITE_CLOUDINARY_UPLOAD_PRESET=menucloud_preset</code><br/>
            Get these free at cloudinary.com (free = 25GB storage)
          </p>
        </div>
      )}
    </div>
  );
}