'use client';
import { useEffect, useState } from 'react';
import { bookingsAPI, servicesAPI, contactsAPI } from '@/lib/api';
import { Calendar, Plus, Clock, MapPin, Filter, ChevronLeft, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';
import { formatDate, formatTime, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Create booking form
  const [newBooking, setNewBooking] = useState({
    contact_id: '',
    service_id: '',
    booking_date: '',
    booking_time: '',
    notes: ''
  });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchServices();
    fetchContacts();
  }, [statusFilter]);

  const fetchBookings = async () => {
    try {
      const params: any = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await bookingsAPI.list(params);
      setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const { data } = await servicesAPI.list();
      setServices(data.services);
    } catch {}
  };

  const fetchContacts = async () => {
    try {
      const { data } = await contactsAPI.list({ limit: 100 });
      setContacts(data.contacts);
    } catch {}
  };

  const fetchSlots = async (serviceId: string, date: string) => {
    if (!serviceId || !date) return;
    try {
      const { data } = await bookingsAPI.getSlots(serviceId, date);
      setAvailableSlots(data.slots);
    } catch {
      setAvailableSlots([]);
    }
  };

  const handleCreateBooking = async () => {
    if (!newBooking.contact_id || !newBooking.service_id || !newBooking.booking_date || !newBooking.booking_time) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreating(true);
    try {
      const bookingDate = new Date(`${newBooking.booking_date}T${newBooking.booking_time}`);
      await bookingsAPI.create({
        contact_id: newBooking.contact_id,
        service_id: newBooking.service_id,
        booking_date: bookingDate.toISOString(),
        notes: newBooking.notes
      });
      toast.success('Booking created!');
      setShowCreate(false);
      setNewBooking({ contact_id: '', service_id: '', booking_date: '', booking_time: '', notes: '' });
      fetchBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create booking');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await bookingsAPI.updateStatus(bookingId, newStatus);
      toast.success(`Booking marked as ${newStatus}`);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-500" /> Bookings
          </h1>
          <p className="text-gray-500 text-sm">Manage all appointments and schedules</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {['', 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s ? s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Create Booking Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-700">Create Booking</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                <select
                  className="input-field text-gray-600"
                  value={newBooking.contact_id}
                  onChange={(e) => setNewBooking({ ...newBooking, contact_id: e.target.value })}
                >
                  <option className="text-gray-600" value="">Select contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service *</label>
                <select
                  className="input-field text-gray-600"
                  value={newBooking.service_id}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, service_id: e.target.value });
                    if (newBooking.booking_date) {
                      fetchSlots(e.target.value, newBooking.booking_date);
                    }
                  }}
                >
                  <option value="">Select service...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  className="input-field text-gray-600"
                  min={new Date().toISOString().split('T')[0]}
                  value={newBooking.booking_date}
                  onChange={(e) => {
                    setNewBooking({ ...newBooking, booking_date: e.target.value, booking_time: '' });
                    if (newBooking.service_id) {
                      fetchSlots(newBooking.service_id, e.target.value);
                    }
                  }}
                />
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots *</label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => setNewBooking({ ...newBooking, booking_time: slot.start.split('T')[1]?.substring(0, 5) || slot.display })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          newBooking.booking_time === (slot.start.split('T')[1]?.substring(0, 5) || slot.display)
                            ? 'bg-primary-100 border-primary-500 text-primary-700'
                            : 'bg-white border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {newBooking.booking_date && newBooking.service_id && availableSlots.length === 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
                  No available slots on this date. Try another date.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field text-gray-700" rows={2} placeholder="Optional notes"
                  value={newBooking.notes} onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })} />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreateBooking} disabled={creating} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {creating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Create</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">Create your first booking or share your booking page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Color bar */}
                <div className="w-1.5 h-16 rounded-full flex-shrink-0" style={{ backgroundColor: booking.service?.color || '#3B82F6' }} />

                {/* Time */}
                <div className="w-24 flex-shrink-0 text-center">
                  <p className="text-sm font-bold text-primary-600">
                    {formatTime(booking.booking_date)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatTime(booking.end_time)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(booking.booking_date)}
                  </p>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{booking.contact?.name || 'Unknown'}</p>
                    <span className={getStatusColor(booking.status)}>
                      {booking.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: booking.service?.color }} />
                    {booking.service?.name || 'Unknown Service'}
                    <span className="text-gray-300">•</span>
                    <Clock className="w-3 h-3" />
                    {booking.service?.duration_minutes} min
                  </p>
                  {booking.contact?.email && (
                    <p className="text-xs text-gray-400 mt-0.5">{booking.contact.email}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'completed')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark Completed"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'no_show')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Mark No-Show"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(booking.id, 'confirmed')}
                      className="btn-primary text-xs py-1 px-3"
                    >
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}