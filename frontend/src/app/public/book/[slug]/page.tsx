'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { publicAPI, bookingsAPI } from '@/lib/api';
import {
  Calendar, Clock, MapPin, CheckCircle, ArrowRight,
  ArrowLeft, Video, Phone, User
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [workspace, setWorkspace] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking flow state
  const [step, setStep] = useState<'service' | 'date' | 'details' | 'confirm'>('service');
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => { fetchBookingPage(); }, [slug]);

  const fetchBookingPage = async () => {
    try {
      const { data } = await publicAPI.getBookingPage(slug);
      setWorkspace(data.workspace);
      setServices(data.services);
    } catch {
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlotsLoading(true);
    try {
      const { data } = await bookingsAPI.getSlots(selectedService.id, date);
      setAvailableSlots(data.slots);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!customerInfo.name) { toast.error('Name is required'); return; }
    if (!customerInfo.email && !customerInfo.phone) { toast.error('Email or phone required'); return; }

    setSubmitting(true);
    try {
      const bookingDate = new Date(selectedSlot.start);
      const { data } = await publicAPI.createBooking(slug, {
        service_id: selectedService.id,
        booking_date: bookingDate.toISOString(),
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        notes: customerInfo.notes
      });
      setBookingResult(data);
      setStep('confirm');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate next 14 days for date picker
  const getNextDays = () => {
    const days = [];
    for (let i = 1; i <= 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        value: date.toISOString().split('T')[0],
        display: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate()
      });
    }
    return days;
  };

  const serviceTypeIcon = (type: string) => {
    switch (type) {
      case 'in_person': return <MapPin className="w-4 h-4" />;
      case 'virtual': return <Video className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-500">This booking page is not available.</p>
        </div>
      </div>
    );
  }

  // Confirmation screen
  if (step === 'confirm' && bookingResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            You'll receive a confirmation message shortly.
          </p>
          <div className="card p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Service</span>
              <span className="font-medium">{bookingResult.booking?.service}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Date & Time</span>
              <span className="font-medium">
                {new Date(bookingResult.booking?.date).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-6">{workspace.name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">{workspace.name[0]}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book with {workspace.name}</h1>
          {workspace.address && (
            <p className="text-gray-500 flex items-center justify-center gap-1">
              <MapPin className="w-4 h-4" /> {workspace.address}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['service', 'date', 'details'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-primary-600 text-white' :
                ['service', 'date', 'details'].indexOf(step) > i ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {['service', 'date', 'details'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`w-12 h-0.5 ${
                ['service', 'date', 'details'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
              }`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-6">Choose a Service</h2>
            {services.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500">No services available at the moment.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedService(svc); setStep('date'); }}
                    className="card p-5 text-left hover:shadow-lg hover:border-primary-300 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: svc.color }} />
                        <div>
                          <h3 className="font-semibold text-lg group-hover:text-primary-600 transition-colors">{svc.name}</h3>
                          {svc.description && <p className="text-sm text-gray-500 mt-1">{svc.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {svc.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              {serviceTypeIcon(svc.service_type)}
                              {svc.service_type.replace('_', ' ')}
                            </span>
                            {svc.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {svc.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 'date' && selectedService && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('service')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-right">
                <p className="font-semibold">{selectedService.name}</p>
                <p className="text-sm text-gray-500">{selectedService.duration_minutes} min</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center">Select Date & Time</h2>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getNextDays().map((day) => (
                <button
                  key={day.value}
                  onClick={() => handleDateSelect(day.value)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedDate === day.value
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'bg-white border hover:border-primary-300 hover:shadow'
                  }`}
                >
                  <p className="text-xs font-medium opacity-75">{day.dayName}</p>
                  <p className="text-lg font-bold">{day.dayNum}</p>
                </button>
              ))}
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Available Times</h3>
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                    <p>No available slots on this date</p>
                    <p className="text-sm">Try another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {availableSlots.map((slot, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                          selectedSlot?.start === slot.start
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-white border hover:border-primary-300'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedSlot && (
              <button
                onClick={() => setStep('details')}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Step 3: Customer Details */}
        {step === 'details' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('date')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-right">
                <p className="font-semibold">{selectedService?.name}</p>
                <p className="text-sm text-gray-500">
                  {new Date(selectedSlot?.start).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })} at {selectedSlot?.display}
                </p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-center">Your Details</h2>

            <div className="card p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input className="input-field" placeholder="Your name"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="input-field" type="email" placeholder="email@example.com"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field" type="tel" placeholder="+1 555 0123"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea className="input-field" rows={2} placeholder="Anything we should know?"
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })} />
              </div>
            </div>

            {/* Summary */}
            <div className="card p-5 bg-primary-50 border-primary-200">
              <h3 className="font-semibold mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{selectedService?.duration_minutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">
                    {new Date(selectedSlot?.start).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">{selectedSlot?.display}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleBook}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><CheckCircle className="w-5 h-5" /> Confirm Booking</>
              )}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by CareOps
        </p>
      </div>
    </div>
  );
}