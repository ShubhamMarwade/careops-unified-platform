'use client';
import { useEffect, useState } from 'react';
import { workspaceAPI, integrationsAPI } from '@/lib/api';
import { Settings, Mail, Phone, Globe, Webhook, Save, TestTube, CheckCircle, XCircle, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // General settings form
  const [generalForm, setGeneralForm] = useState({
    name: '', address: '', timezone: '', contact_email: '', phone: '',
    welcome_message: '', booking_confirmation_message: '', reminder_message: ''
  });

  // Webhook form
  const [webhookForm, setWebhookForm] = useState({ url: '', events: ['booking_created', 'contact_created'] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [wsRes, intRes] = await Promise.all([
        workspaceAPI.get(),
        integrationsAPI.list()
      ]);
      setWorkspace(wsRes.data);
      setIntegrations(intRes.data);
      setGeneralForm({
        name: wsRes.data.name || '',
        address: wsRes.data.address || '',
        timezone: wsRes.data.timezone || 'UTC',
        contact_email: wsRes.data.contact_email || '',
        phone: wsRes.data.phone || '',
        welcome_message: wsRes.data.welcome_message || '',
        booking_confirmation_message: wsRes.data.booking_confirmation_message || '',
        reminder_message: wsRes.data.reminder_message || ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      await workspaceAPI.update(generalForm);
      toast.success('Settings saved!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      const result = await integrationsAPI.testEmail({ to_email: workspace.contact_email });
      if (result.data.status === 'success') {
        toast.success('Test email sent!');
      } else {
        toast.error('Email test failed');
      }
    } catch {
      toast.error('Email test failed');
    }
  };

  const handleTestSMS = async () => {
    try {
      const result = await integrationsAPI.testSMS({ to_phone: workspace.phone });
      if (result.data.status === 'success') {
        toast.success('Test SMS sent!');
      } else {
        toast.error('SMS test failed');
      }
    } catch {
      toast.error('SMS test failed');
    }
  };

  const handleAddWebhook = async () => {
    if (!webhookForm.url) {
      toast.error('Webhook URL is required');
      return;
    }
    try {
      await integrationsAPI.addWebhook(webhookForm);
      toast.success('Webhook added!');
      setWebhookForm({ url: '', events: ['booking_created', 'contact_created'] });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add webhook');
    }
  };

  const handleRemoveWebhook = async (webhookId: string) => {
    try {
      await integrationsAPI.removeWebhook(webhookId);
      toast.success('Webhook removed');
      fetchData();
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'messages', label: 'Message Templates', icon: Mail },
    { id: 'integrations', label: 'Integrations', icon: Link2 },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'public', label: 'Public Links', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-500" /> Settings
        </h1>
        <p className="text-gray-500 text-sm">Configure your workspace</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <h2 className="font-semibold text-lg">Business Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Business Name</label>
              <input className="input-field text-black" value={generalForm.name}
                onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Contact Email</label>
              <input className="input-field text-black" type="email" value={generalForm.contact_email}
                onChange={(e) => setGeneralForm({ ...generalForm, contact_email: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Address</label>
            <input className="input-field text-black" value={generalForm.address}
              onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Timezone</label>
              <select className="input-field text-black" value={generalForm.timezone}
                onChange={(e) => setGeneralForm({ ...generalForm, timezone: e.target.value })}>
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="Asia/Kolkata">IST</option>
                <option value="Europe/London">GMT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-1">Phone</label>
              <input className="input-field text-black" value={generalForm.phone}
                onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <span className={`w-3 h-3 rounded-full ${workspace?.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600">
              Workspace is {workspace?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button onClick={handleSaveGeneral} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Message Templates */}
      {activeTab === 'messages' && (
        <div className="card p-6 max-w-2xl space-y-5">
          <h2 className="font-semibold text-lg">Automated Message Templates</h2>
          <p className="text-sm text-gray-500">Customize the messages sent automatically by the system.</p>

          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Welcome Message</label>
            <p className="text-xs text-gray-400 mb-1">Sent when a new contact submits the inquiry form</p>
            <textarea className="input-field text-black" rows={3} value={generalForm.welcome_message}
              onChange={(e) => setGeneralForm({ ...generalForm, welcome_message: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Booking Confirmation</label>
            <p className="text-xs text-gray-400 mb-1">Sent when a booking is created</p>
            <textarea className="input-field text-black" rows={3} value={generalForm.booking_confirmation_message}
              onChange={(e) => setGeneralForm({ ...generalForm, booking_confirmation_message: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1">Booking Reminder</label>
            <p className="text-xs text-gray-400 mb-1">Sent before a booking as a reminder</p>
            <textarea className="input-field text-black" rows={3} value={generalForm.reminder_message}
              onChange={(e) => setGeneralForm({ ...generalForm, reminder_message: e.target.value })} />
          </div>
          <button onClick={handleSaveGeneral} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Templates
          </button>
        </div>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && integrations && (
        <div className="max-w-2xl space-y-4">
          {/* Email */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Integration</h3>
                  <p className="text-sm text-gray-500">Provider: {integrations.email.provider || 'Not configured'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integrations.email.connected ? (
                  <span className="badge-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="badge-danger flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </div>
            </div>
            {integrations.email.connected && (
              <button onClick={handleTestEmail} className="btn-secondary text-sm flex items-center gap-2">
                <TestTube className="w-4 h-4" /> Send Test Email
              </button>
            )}
          </div>

          {/* SMS */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">SMS Integration</h3>
                  <p className="text-sm text-gray-500">Provider: {integrations.sms.provider || 'Not configured'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integrations.sms.connected ? (
                  <span className="badge-success flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="badge-danger flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </div>
            </div>
            {integrations.sms.connected && (
              <button onClick={handleTestSMS} className="btn-secondary text-sm flex items-center gap-2">
                <TestTube className="w-4 h-4" /> Send Test SMS
              </button>
            )}
          </div>
        </div>
      )}

      {/* Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="max-w-2xl space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Webhook className="w-5 h-5 text-primary-500" /> Add Webhook
            </h2>
            <p className="text-sm text-gray-500">Receive real-time notifications when events happen in your workspace.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL *</label>
              <input className="input-field" placeholder="https://your-server.com/webhook"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {['contact_created', 'booking_created', 'booking_completed', 'form_submitted', 'inventory_low'].map((evt) => (
                  <label key={evt} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={webhookForm.events.includes(evt)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWebhookForm({ ...webhookForm, events: [...webhookForm.events, evt] });
                        } else {
                          setWebhookForm({ ...webhookForm, events: webhookForm.events.filter(e => e !== evt) });
                        }
                      }}
                    />
                    {evt.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </div>
            <button onClick={handleAddWebhook} className="btn-primary flex items-center gap-2">
              <Webhook className="w-4 h-4" /> Add Webhook
            </button>
          </div>

          {/* Existing Webhooks */}
          {integrations?.webhooks?.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-gray-500 uppercase">Active Webhooks</h3>
              {integrations.webhooks.map((wh: any) => (
                <div key={wh.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{wh.url}</p>
                    <div className="flex gap-1 mt-1">
                      {wh.events?.map((e: string) => (
                        <span key={e} className="badge-gray text-[10px]">{e}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleRemoveWebhook(wh.id)} className="text-red-400 hover:text-red-600 text-sm">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Public Links */}
      {activeTab === 'public' && workspace && (
        <div className="max-w-2xl space-y-4">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary-500" /> Public Pages
            </h2>
            <p className="text-sm text-gray-500">Share these links with your customers. They work without login.</p>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Contact Form</p>
                <p className="text-sm text-gray-500 mb-2">Customers can submit inquiries through this form</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-primary-600">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/public/contact/{workspace.slug}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/public/contact/${workspace.slug}`);
                      toast.success('Copied!');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Booking Page</p>
                <p className="text-sm text-gray-500 mb-2">Customers can browse services and book appointments</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm text-primary-600">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/public/book/{workspace.slug}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/public/book/${workspace.slug}`);
                      toast.success('Copied!');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Rules Info */}
          <div className="card p-6">
            <h2 className="font-semibold text-lg mb-4">Active Automation Rules</h2>
            <div className="space-y-3">
              {[
                { trigger: 'New Contact', action: 'Send welcome message', active: true },
                { trigger: 'Booking Created', action: 'Send confirmation + forms', active: true },
                { trigger: 'Before Booking', action: 'Send reminder', active: true },
                { trigger: 'Pending Form', action: 'Send form reminder', active: true },
                { trigger: 'Inventory Low', action: 'Create alert', active: true },
                { trigger: 'Staff Reply', action: 'Pause automation', active: true },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between bg-blue rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${rule.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium">{rule.trigger}</p>
                      <p className="text-xs text-gray-500">→ {rule.action}</p>
                    </div>
                  </div>
                  <span className={rule.active ? 'badge-success' : 'badge-gray'}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}