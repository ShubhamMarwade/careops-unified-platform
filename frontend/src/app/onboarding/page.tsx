'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { workspaceAPI, servicesAPI, formsAPI, inventoryAPI, staffAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Building2, Mail, FileText, Calendar, ClipboardList,
  Package, Users, Rocket, Check, ArrowRight, ArrowLeft, Plus, Trash2
} from 'lucide-react';
import { DAYS_OF_WEEK } from '@/lib/utils';

const STEPS = [
  { id: 'workspace', label: 'Workspace', icon: Building2, desc: 'Set up your business' },
  { id: 'communications', label: 'Communications', icon: Mail, desc: 'Connect email & SMS' },
  { id: 'contact_form', label: 'Contact Form', icon: FileText, desc: 'Customer inquiry form' },
  { id: 'bookings', label: 'Bookings', icon: Calendar, desc: 'Services & availability' },
  { id: 'forms', label: 'Forms', icon: ClipboardList, desc: 'Post-booking forms' },
  { id: 'inventory', label: 'Inventory', icon: Package, desc: 'Track resources' },
  { id: 'staff', label: 'Staff', icon: Users, desc: 'Add team members' },
  { id: 'activate', label: 'Activate', icon: Rocket, desc: 'Go live!' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loadFromStorage, setAuth } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [workspaceData, setWorkspaceData] = useState<any>(null);

  // Form states
  const [wsForm, setWsForm] = useState({
    name: '', address: '', timezone: 'UTC', contact_email: '', phone: ''
  });
  const [commForm, setCommForm] = useState({
    email_provider: 'demo', sms_provider: 'demo',
    email_config: {}, sms_config: {}
  });
  const [serviceForm, setServiceForm] = useState({
    name: '', description: '', duration_minutes: 30,
    service_type: 'in_person', location: '', price: 0, color: '#3B82F6'
  });
  const [services, setServices] = useState<any[]>([]);
  const [availabilities, setAvailabilities] = useState<any[]>([]);
  const [formTemplates, setFormTemplates] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '', description: '', form_type: 'intake',
    fields: [{ label: '', field_type: 'text', is_required: false, sort_order: 0 }]
  });
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({
    name: '', description: '', quantity: 10, low_stock_threshold: 5, unit: 'units'
  });
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({
    full_name: '', email: '', password: '',
    can_access_inbox: true, can_access_bookings: true,
    can_access_forms: true, can_access_inventory: false
  });

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (user?.workspace_id) {
      loadWorkspace();
    }
  }, [user]);

  const loadWorkspace = async () => {
    try {
      const { data } = await workspaceAPI.get();
      setWorkspaceData(data);
      const stepIdx = STEPS.findIndex(s => s.id === data.onboarding_step);
      if (stepIdx >= 0) setCurrentStep(stepIdx);
      if (data.onboarding_completed) router.push('/dashboard');
    } catch {
      // No workspace yet
    }
  };

  const handleCreateWorkspace = async () => {
    if (!wsForm.name || !wsForm.contact_email) {
      toast.error('Business name and email are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await workspaceAPI.create(wsForm);
      setWorkspaceData(data);
      // Update user in auth store
      const updatedUser = { ...user!, workspace_id: data.id };
      const token = localStorage.getItem('careops_token') || '';
      setAuth(updatedUser, token);
      toast.success('Workspace created!');
      setCurrentStep(1);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace');
    }
    setLoading(false);
  };

  const handleSetupComms = async () => {
    setLoading(true);
    try {
      await workspaceAPI.setupComms(commForm);
      toast.success('Communication channels connected!');
      setCurrentStep(2);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to setup communications');
    }
    setLoading(false);
  };

  const handleContactFormStep = async () => {
    await workspaceAPI.updateStep('bookings');
    toast.success('Contact form configured!');
    setCurrentStep(3);
  };

  const handleAddService = async () => {
    if (!serviceForm.name) {
      toast.error('Service name is required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await servicesAPI.create(serviceForm);
      setServices([...services, data]);

      // Set availability for all weekdays
      if (availabilities.length === 0) {
        const defaultAvails = [0, 1, 2, 3, 4].map(day => ({
          day_of_week: day, start_time: '09:00', end_time: '17:00'
        }));
        await servicesAPI.setAvailability(data.id, defaultAvails);
        setAvailabilities(defaultAvails);
      } else {
        await servicesAPI.setAvailability(data.id, availabilities);
      }

      toast.success('Service added!');
      setServiceForm({
        name: '', description: '', duration_minutes: 30,
        service_type: 'in_person', location: '', price: 0, color: '#3B82F6'
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add service');
    }
    setLoading(false);
  };

  const handleBookingStep = async () => {
    if (services.length === 0) {
      toast.error('Add at least one service');
      return;
    }
    await workspaceAPI.updateStep('forms');
    setCurrentStep(4);
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name) {
      toast.error('Form name is required');
      return;
    }
    setLoading(true);
    try {
      const validFields = newTemplate.fields.filter(f => f.label.trim());
      const { data } = await formsAPI.createTemplate({
        ...newTemplate,
        fields: validFields
      });
      setFormTemplates([...formTemplates, data]);
      toast.success('Form template created!');
      setNewTemplate({
        name: '', description: '', form_type: 'intake',
        fields: [{ label: '', field_type: 'text', is_required: false, sort_order: 0 }]
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create template');
    }
    setLoading(false);
  };

  const handleFormsStep = async () => {
    await workspaceAPI.updateStep('inventory');
    setCurrentStep(5);
  };

  const handleAddInventory = async () => {
    if (!newItem.name) {
      toast.error('Item name is required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await inventoryAPI.create(newItem);
      setInventoryItems([...inventoryItems, data]);
      toast.success('Inventory item added!');
      setNewItem({ name: '', description: '', quantity: 10, low_stock_threshold: 5, unit: 'units' });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    }
    setLoading(false);
  };

  const handleInventoryStep = async () => {
    await workspaceAPI.updateStep('staff');
    setCurrentStep(6);
  };

  const handleInviteStaff = async () => {
    if (!newStaff.full_name || !newStaff.email || !newStaff.password) {
      toast.error('All staff fields are required');
      return;
    }
    setLoading(true);
    try {
      const { data } = await staffAPI.invite(newStaff);
      setStaffMembers([...staffMembers, data]);
      toast.success('Staff member invited!');
      setNewStaff({
        full_name: '', email: '', password: '',
        can_access_inbox: true, can_access_bookings: true,
        can_access_forms: true, can_access_inventory: false
      });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to invite staff');
    }
    setLoading(false);
  };

  const handleStaffStep = async () => {
    await workspaceAPI.updateStep('activate');
    setCurrentStep(7);
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      await workspaceAPI.activate();
      toast.success('🚀 Your workspace is now live!');
      router.push('/dashboard');
    } catch (error: any) {
      const errors = error.response?.data?.detail?.errors || [error.response?.data?.detail || 'Activation failed'];
      errors.forEach((e: string) => toast.error(e));
    }
    setLoading(false);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: return renderWorkspaceStep();
      case 1: return renderCommsStep();
      case 2: return renderContactFormStep();
      case 3: return renderBookingsStep();
      case 4: return renderFormsStep();
      case 5: return renderInventoryStep();
      case 6: return renderStaffStep();
      case 7: return renderActivateStep();
      default: return null;
    }
  };

  const renderWorkspaceStep = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
        <input className="input-field" placeholder="My Awesome Business"
          value={wsForm.name} onChange={(e) => setWsForm({ ...wsForm, name: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email *</label>
        <input className="input-field" type="email" placeholder="hello@business.com"
          value={wsForm.contact_email} onChange={(e) => setWsForm({ ...wsForm, contact_email: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
        <input className="input-field" placeholder="123 Main St, City, State"
          value={wsForm.address} onChange={(e) => setWsForm({ ...wsForm, address: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
          <select className="input-field" value={wsForm.timezone}
            onChange={(e) => setWsForm({ ...wsForm, timezone: e.target.value })}>
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
          <input className="input-field" placeholder="+1 555 0123"
            value={wsForm.phone} onChange={(e) => setWsForm({ ...wsForm, phone: e.target.value })} />
        </div>
      </div>
      <button onClick={handleCreateWorkspace} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Workspace <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );

  const renderCommsStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">At least one channel (Email or SMS) is required. For this demo, we use simulated providers.</p>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Mail className="w-5 h-5 text-primary-500" /> Email Integration</h3>
        <select className="input-field" value={commForm.email_provider}
          onChange={(e) => setCommForm({ ...commForm, email_provider: e.target.value })}>
          <option value="demo">Demo (Simulated)</option>
          <option value="sendgrid">SendGrid</option>
        </select>
        {commForm.email_provider === 'sendgrid' && (
          <input className="input-field" placeholder="SendGrid API Key"
            onChange={(e) => setCommForm({ ...commForm, email_config: { api_key: e.target.value } })} />
        )}
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Mail className="w-5 h-5 text-green-500" /> SMS Integration</h3>
        <select className="input-field" value={commForm.sms_provider}
          onChange={(e) => setCommForm({ ...commForm, sms_provider: e.target.value })}>
          <option value="demo">Demo (Simulated)</option>
          <option value="twilio">Twilio</option>
        </select>
        {commForm.sms_provider === 'twilio' && (
          <div className="space-y-3">
            <input className="input-field" placeholder="Twilio Account SID"
              onChange={(e) => setCommForm({ ...commForm, sms_config: { ...commForm.sms_config, account_sid: e.target.value } })} />
            <input className="input-field" placeholder="Twilio Auth Token" type="password"
                            onChange={(e) => setCommForm({ ...commForm, sms_config: { ...commForm.sms_config, auth_token: e.target.value } })} />
            <input className="input-field" placeholder="Twilio Phone Number"
              onChange={(e) => setCommForm({ ...commForm, sms_config: { ...commForm.sms_config, phone: e.target.value } })} />
          </div>
        )}
      </div>
      <button onClick={handleSetupComms} disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Connect Channels <ArrowRight className="w-4 h-4" /></>}
      </button>
    </div>
  );

  const renderContactFormStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-700">
          A public contact form will be created automatically. Customers can submit inquiries which creates contacts and starts conversations with automated welcome messages.
        </p>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-4">Contact Form Preview</h3>
        <div className="space-y-3 opacity-75 pointer-events-none">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
            <input className="input-field" placeholder="Customer name" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email or Phone *</label>
            <input className="input-field" placeholder="email@example.com" disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Message (Optional)</label>
            <textarea className="input-field" rows={3} placeholder="How can we help?" disabled />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Public URL: <code className="bg-gray-100 px-2 py-0.5 rounded">/public/contact/{workspaceData?.slug || 'your-business'}</code>
        </p>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold mb-3">Automation on Submit</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Contact record created</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Conversation started in Inbox</li>
          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Welcome message sent automatically</li>
        </ul>
      </div>
      <button onClick={handleContactFormStep} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderBookingsStep = () => (
    <div className="space-y-6">
      {services.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-500 uppercase">Added Services</h3>
          {services.map((svc, i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: svc.color }} />
                <div>
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-sm text-gray-500">{svc.duration_minutes} min · {svc.service_type}</p>
                </div>
              </div>
              <span className="badge-success">Active</span>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Add a Service / Meeting Type</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
            <input className="input-field" placeholder="e.g. Initial Consultation"
              value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
            <input className="input-field" type="number" min={15} step={15}
              value={serviceForm.duration_minutes} onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: parseInt(e.target.value) || 30 })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input-field" rows={2} placeholder="Brief description"
            value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="input-field" value={serviceForm.service_type}
              onChange={(e) => setServiceForm({ ...serviceForm, service_type: e.target.value })}>
              <option value="in_person">In-Person</option>
              <option value="virtual">Virtual</option>
              <option value="phone">Phone</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input className="input-field" placeholder="Room/Address"
              value={serviceForm.location} onChange={(e) => setServiceForm({ ...serviceForm, location: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input type="color" className="h-10 w-full rounded-lg cursor-pointer"
              value={serviceForm.color} onChange={(e) => setServiceForm({ ...serviceForm, color: e.target.value })} />
          </div>
        </div>
        <button onClick={handleAddService} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Add Service</>}
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Default Availability</h3>
        <p className="text-sm text-gray-500">Services are available Monday-Friday, 9:00 AM - 5:00 PM by default. You can customize later.</p>
        <div className="grid grid-cols-2 gap-3">
          {DAYS_OF_WEEK.slice(0, 5).map((day, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-medium">{day}</span>
              <span className="text-sm text-gray-500">9:00 AM - 5:00 PM</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={handleBookingStep} disabled={services.length === 0}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
        Continue <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderFormsStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-700">Create form templates that are automatically sent to customers after they book. Forms are tracked and reminders are sent for incomplete ones.</p>
      </div>

      {formTemplates.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-500 uppercase">Created Templates</h3>
          {formTemplates.map((t, i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-gray-500">{t.form_type} · {(t.fields || []).length} fields</p>
              </div>
              <span className="badge-info">{t.form_type}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Create Form Template</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Form Name *</label>
            <input className="input-field" placeholder="e.g. Patient Intake Form"
              value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="input-field" value={newTemplate.form_type}
              onChange={(e) => setNewTemplate({ ...newTemplate, form_type: e.target.value })}>
              <option value="intake">Intake Form</option>
              <option value="agreement">Agreement</option>
              <option value="document">Document Upload</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input className="input-field" placeholder="Brief description"
            value={newTemplate.description} onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Fields</label>
            <button onClick={() => setNewTemplate({
              ...newTemplate,
              fields: [...newTemplate.fields, { label: '', field_type: 'text', is_required: false, sort_order: newTemplate.fields.length }]
            })} className="text-primary-600 text-sm flex items-center gap-1 hover:text-primary-700">
              <Plus className="w-3 h-3" /> Add Field
            </button>
          </div>
          <div className="space-y-2">
            {newTemplate.fields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input className="input-field flex-1" placeholder="Field label"
                  value={field.label}
                  onChange={(e) => {
                    const updated = [...newTemplate.fields];
                    updated[idx] = { ...updated[idx], label: e.target.value };
                    setNewTemplate({ ...newTemplate, fields: updated });
                  }} />
                <select className="input-field w-32"
                  value={field.field_type}
                  onChange={(e) => {
                    const updated = [...newTemplate.fields];
                    updated[idx] = { ...updated[idx], field_type: e.target.value };
                    setNewTemplate({ ...newTemplate, fields: updated });
                  }}>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="textarea">Text Area</option>
                  <option value="select">Dropdown</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="file">File Upload</option>
                </select>
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input type="checkbox" className="rounded" checked={field.is_required}
                    onChange={(e) => {
                      const updated = [...newTemplate.fields];
                      updated[idx] = { ...updated[idx], is_required: e.target.checked };
                      setNewTemplate({ ...newTemplate, fields: updated });
                    }} /> Req
                </label>
                {newTemplate.fields.length > 1 && (
                  <button onClick={() => {
                    setNewTemplate({ ...newTemplate, fields: newTemplate.fields.filter((_, i) => i !== idx) });
                  }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleAddTemplate} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Create Template</>}
        </button>
      </div>

      <button onClick={handleFormsStep} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {formTemplates.length === 0 ? 'Skip for Now' : 'Continue'} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderInventoryStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <p className="text-sm text-orange-700">Track resources and supplies. Get alerts when stock runs low. Items can be linked to services for automatic deduction on bookings.</p>
      </div>

      {inventoryItems.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-500 uppercase">Inventory Items</h3>
          {inventoryItems.map((item, i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">{item.quantity} {item.unit} · Alert at {item.low_stock_threshold}</p>
              </div>
              {item.quantity <= item.low_stock_threshold ?
                <span className="badge-danger">Low Stock</span> :
                <span className="badge-success">In Stock</span>}
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Add Inventory Item</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
            <input className="input-field" placeholder="e.g. Face Masks"
              value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input className="input-field" placeholder="e.g. boxes, units"
              value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input className="input-field" type="number" min={0}
              value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Threshold</label>
            <input className="input-field" type="number" min={0}
              value={newItem.low_stock_threshold} onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <button onClick={handleAddInventory} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Add Item</>}
        </button>
      </div>

      <button onClick={handleInventoryStep} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {inventoryItems.length === 0 ? 'Skip for Now' : 'Continue'} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderStaffStep = () => (
    <div className="space-y-6">
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
        <p className="text-sm text-indigo-700">Add staff members who will handle daily operations. They can manage the inbox, bookings, and forms but cannot change system settings.</p>
      </div>

      {staffMembers.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm text-gray-500 uppercase">Team Members</h3>
          {staffMembers.map((s, i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-semibold text-sm">
                    {s.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{s.full_name}</p>
                  <p className="text-sm text-gray-500">{s.email}</p>
                </div>
              </div>
              <span className="badge-info">Staff</span>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h3 className="font-semibold">Invite Staff Member</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input-field" placeholder="Jane Smith"
              value={newStaff.full_name} onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input className="input-field" type="email" placeholder="jane@business.com"
              value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input className="input-field" type="password" placeholder="Temporary password"
            value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'can_access_inbox', label: 'Inbox Access' },
              { key: 'can_access_bookings', label: 'Bookings Access' },
              { key: 'can_access_forms', label: 'Forms Access' },
              { key: 'can_access_inventory', label: 'Inventory Access' },
            ].map((perm) => (
              <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="rounded text-primary-600"
                  checked={(newStaff as any)[perm.key]}
                  onChange={(e) => setNewStaff({ ...newStaff, [perm.key]: e.target.checked })} />
                {perm.label}
              </label>
            ))}
          </div>
        </div>
        <button onClick={handleInviteStaff} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Plus className="w-4 h-4" /> Invite Staff</>}
        </button>
      </div>

      <button onClick={handleStaffStep} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
        {staffMembers.length === 0 ? 'Skip for Now' : 'Continue'} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const renderActivateStep = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Ready to Go Live!</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Your workspace is configured. Activating will make your contact forms and booking pages public.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold mb-3">Pre-Activation Checklist</h3>
        <div className="space-y-2">
          {[
            { label: 'Communication channel connected', done: true },
            { label: 'At least one service/booking type', done: services.length > 0 },
            { label: 'Availability defined', done: services.length > 0 },
            { label: 'Form templates (optional)', done: formTemplates.length > 0, optional: true },
            { label: 'Inventory items (optional)', done: inventoryItems.length > 0, optional: true },
            { label: 'Staff members (optional)', done: staffMembers.length > 0, optional: true },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                item.done ? 'bg-green-100' : item.optional ? 'bg-gray-100' : 'bg-red-100'
              }`}>
                <Check className={`w-3 h-3 ${
                  item.done ? 'text-green-600' : item.optional ? 'text-gray-400' : 'text-red-600'
                }`} />
              </div>
              <span className={`text-sm ${item.done ? 'text-gray-900' : 'text-gray-500'}`}>
                {item.label}
                {item.optional && !item.done && <span className="text-gray-400 ml-1">(skipped)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {workspaceData && (
        <div className="card p-5 space-y-2">
          <h3 className="font-semibold">Public Links (Active After Activation)</h3>
          <div className="text-sm space-y-1">
            <p className="text-gray-500">Contact Form: <code className="bg-gray-100 px-2 py-0.5 rounded text-primary-600">/public/contact/{workspaceData.slug}</code></p>
            <p className="text-gray-500">Booking Page: <code className="bg-gray-100 px-2 py-0.5 rounded text-primary-600">/public/book/{workspaceData.slug}</code></p>
          </div>
        </div>
      )}

      <button onClick={handleActivate} disabled={loading || services.length === 0}
        className="bg-green-600 hover:bg-green-700 text-white w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Rocket className="w-5 h-5" /> Activate Workspace</>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">CareOps Setup</h1>
              <p className="text-xs text-gray-500">Step {currentStep + 1} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                i === currentStep ? 'bg-primary-100 text-primary-700' :
                i < currentStep ? 'bg-green-100 text-green-700' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === currentStep ? 'bg-primary-600 text-white' :
                  i < currentStep ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden md:inline">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-4 h-0.5 mx-1 ${i < currentStep ? 'bg-green-300' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              {(() => { const Icon = STEPS[currentStep].icon; return <Icon className="w-7 h-7 text-primary-600" />; })()}
              {STEPS[currentStep].label}
            </h2>
            <p className="text-gray-500 mt-1">{STEPS[currentStep].desc}</p>
          </div>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}