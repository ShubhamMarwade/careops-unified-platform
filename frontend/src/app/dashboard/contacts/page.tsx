'use client';
import { useEffect, useState } from 'react';
import { contactsAPI } from '@/lib/api';
import { Users, Plus, Search, Mail, Phone, Calendar, FileText, X } from 'lucide-react';
import { formatDate, getInitials, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [contactDetail, setContactDetail] = useState<any>(null);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', notes: '', source: 'manual' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [search]);

  const fetchContacts = async () => {
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      const { data } = await contactsAPI.list(params);
      setContacts(data.contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewContact = async (contact: any) => {
    setSelectedContact(contact);
    try {
      const { data } = await contactsAPI.get(contact.id);
      setContactDetail(data);
    } catch {}
  };

  const handleCreate = async () => {
    if (!newContact.name) {
      toast.error('Name is required');
      return;
    }
    if (!newContact.email && !newContact.phone) {
      toast.error('Email or phone is required');
      return;
    }
    setCreating(true);
    try {
      await contactsAPI.create(newContact);
      toast.success('Contact created!');
      setShowCreate(false);
      setNewContact({ name: '', email: '', phone: '', notes: '', source: 'manual' });
      fetchContacts();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create contact');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" /> Contacts
          </h1>
          <p className="text-gray-500 text-sm">{contacts.length} total contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input-field pl-10"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-500">Add Contact</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input className="input-field" placeholder="Full name" value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input className="input-field" type="email" placeholder="email@example.com" value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field" placeholder="+1 555 0123" value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="input-field" rows={2} placeholder="Optional notes" value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Add Contact'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Panel */}
      {selectedContact && contactDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-blue-500">Contact Details</h2>
              <button onClick={() => { setSelectedContact(null); setContactDetail(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-bold text-xl">{getInitials(contactDetail.contact.name)}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-black">{contactDetail.contact.name}</h3>
                <div className="text-sm text-gray-500 space-y-0.5">
                  {contactDetail.contact.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contactDetail.contact.email}</p>}
                  {contactDetail.contact.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contactDetail.contact.phone}</p>}
                </div>
                <span className="badge-info mt-1">{contactDetail.contact.source}</span>
              </div>
            </div>

            {/* Bookings */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Bookings ({contactDetail.bookings.length})
              </h4>
              {contactDetail.bookings.length === 0 ? (
                <p className="text-sm text-gray-400">No bookings</p>
              ) : (
                <div className="space-y-2">
                  {contactDetail.bookings.map((b: any) => (
                    <div key={b.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500">{formatDate(b.date)}</span>
                      <span className={getStatusColor(b.status)}>{b.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Forms */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-gray-500 uppercase mb-2 flex items-center gap-1">
                <FileText className="w-4 h-4" /> Forms ({contactDetail.forms.length})
              </h4>
              {contactDetail.forms.length === 0 ? (
                <p className="text-sm text-gray-400">No forms</p>
              ) : (
                <div className="space-y-2">
                  {contactDetail.forms.map((f: any) => (
                    <div key={f.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm">{f.template_id}</span>
                      <span className={getStatusColor(f.status)}>{f.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">Created: {formatDate(contactDetail.contact.created_at)}</p>
          </div>
        </div>
      )}

      {/* Contacts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => viewContact(contact)}
              className="card p-4 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-semibold text-sm">{getInitials(contact.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{contact.name}</p>
                  <p className="text-sm text-gray-500 truncate">{contact.email || contact.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="badge-gray">{contact.source}</span>
                <span className="text-xs text-gray-400">{formatDate(contact.created_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}