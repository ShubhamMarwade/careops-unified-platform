'use client';
import { useEffect, useState } from 'react';
import { inventoryAPI } from '@/lib/api';
import { Package, Plus, Minus, AlertTriangle, X, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAdjust, setShowAdjust] = useState<any>(null);
  const [newItem, setNewItem] = useState({ name: '', description: '', quantity: 0, low_stock_threshold: 5, unit: 'units' });
  const [adjustment, setAdjustment] = useState({ change: 0, reason: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const { data } = await inventoryAPI.list();
      setItems(data.items);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!newItem.name) { toast.error('Item name required'); return; }
    setCreating(true);
    try {
      await inventoryAPI.create(newItem);
      toast.success('Item added!');
      setShowCreate(false);
      setNewItem({ name: '', description: '', quantity: 0, low_stock_threshold: 5, unit: 'units' });
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleAdjust = async () => {
    if (adjustment.change === 0) { toast.error('Change cannot be zero'); return; }
    try {
      const result = await inventoryAPI.adjust(showAdjust.id, adjustment);
      toast.success(`Stock updated: ${result.data.previous_quantity} → ${result.data.new_quantity}`);
      setShowAdjust(null);
      setAdjustment({ change: 0, reason: '' });
      fetchItems();
    } catch (err: any) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const lowStockCount = items.filter(i => i.is_low_stock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-500" /> Inventory
          </h1>
          <p className="text-gray-500 text-sm">
            {items.length} items · {lowStockCount > 0 && <span className="text-red-500">{lowStockCount} low stock</span>}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} below threshold</p>
            <p className="text-sm text-red-600">
              {items.filter(i => i.is_low_stock).map(i => i.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Inventory Item</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input className="input-field" placeholder="e.g. Face Masks" value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input className="input-field" placeholder="Optional" value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input className="input-field" type="number" min={0} value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input className="input-field" type="number" min={0} value={newItem.low_stock_threshold}
                    onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input className="input-field" placeholder="units" value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Adjust: {showAdjust.name}</h2>
              <button onClick={() => setShowAdjust(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Current: {showAdjust.quantity} {showAdjust.unit}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change (+ to add, - to remove)</label>
                <input className="input-field" type="number" value={adjustment.change}
                  onChange={(e) => setAdjustment({ ...adjustment, change: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input className="input-field" placeholder="e.g. Restock, Used for service" value={adjustment.reason}
                  onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} />
              </div>
              <p className="text-sm text-center font-medium">
                New quantity: <span className="text-primary-600">{showAdjust.quantity + adjustment.change}</span> {showAdjust.unit}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowAdjust(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleAdjust} className="btn-primary flex-1">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No inventory items</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`card p-5 ${item.is_low_stock ? 'ring-2 ring-red-200' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                </div>
                {item.is_low_stock && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-3xl font-bold ${item.is_low_stock ? 'text-red-600' : 'text-green-300'}`}>
                    {item.quantity}
                  </p>
                  <p className="text-sm text-gray-500">{item.unit} · alert at {item.low_stock_threshold}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAdjust(item); setAdjustment({ change: 1, reason: '' }); }}
                    className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center hover:bg-green-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setShowAdjust(item); setAdjustment({ change: -1, reason: '' }); }}
                    className="w-8 h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center hover:bg-red-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stock bar */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    item.quantity <= 0 ? 'bg-red-500' :
                    item.is_low_stock ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((item.quantity / (item.low_stock_threshold * 4)) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}