'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { publicAPI } from '@/lib/api';
import { FileText, CheckCircle, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicFormPage() {
  const params = useParams();
  const submissionId = params.id as string;
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => { fetchForm(); }, [submissionId]);

  const fetchForm = async () => {
    try {
      const { data } = await publicAPI.getForm(submissionId);
      setFormData(data);
      if (data.status === 'completed') {
        setSubmitted(true);
      }
      // Initialize field values
      const initial: Record<string, any> = {};
      (data.template?.fields || []).forEach((field: any) => {
        initial[field.label] = '';
      });
      setFieldValues(initial);
    } catch {
      setFormData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const fields = formData.template?.fields || [];
    for (const field of fields) {
      if (field.is_required && !fieldValues[field.label]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await publicAPI.submitForm(submissionId, { fields: fieldValues });
      setSubmitted(true);
      toast.success('Form submitted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = fieldValues[field.label] || '';

    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            className="input-field"
            rows={3}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
          />
        );
      case 'email':
        return (
          <input
            type="email"
            className="input-field"
            placeholder="email@example.com"
            value={value}
            onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
          />
        );
      case 'phone':
        return (
          <input
            type="tel"
            className="input-field"
            placeholder="+1 555 0123"
            value={value}
            onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
          />
        );
      case 'select':
        return (
          <select
            className="input-field"
            value={value}
            onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
          >
            <option value="">Select...</option>
            {(field.options || []).map((opt: string, i: number) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded text-primary-600"
              checked={!!value}
              onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.checked })}
            />
            <span className="text-sm text-gray-600">{field.label}</span>
          </label>
        );
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-500">File upload (demo mode)</p>
            <input
              type="file"
              className="mt-2"
              onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.files?.[0]?.name || '' })}
            />
          </div>
        );
      default:
        return (
          <input
            type="text"
            className="input-field"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChange={(e) => setFieldValues({ ...fieldValues, [field.label]: e.target.value })}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500">This form link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Form Submitted!</h1>
          <p className="text-gray-600">Thank you for completing the form. Your information has been received.</p>
          <p className="text-sm text-gray-400 mt-6">{formData.workspace_name}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{formData.template?.name}</h1>
          {formData.template?.description && (
            <p className="text-gray-500">{formData.template.description}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">{formData.workspace_name}</p>
          {formData.contact_name && (
            <p className="text-sm text-gray-500 mt-1">For: {formData.contact_name}</p>
          )}
          {formData.due_date && (
            <p className="text-sm text-orange-500 mt-1">
              Due: {new Date(formData.due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {(formData.template?.fields || []).map((field: any, idx: number) => (
              <div key={idx}>
                {field.field_type !== 'checkbox' && (
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {renderField(field)}
              </div>
            ))}

            {(formData.template?.fields || []).length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <p>This form has no fields configured.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Submit Form</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by CareOps
        </p>
      </div>
    </div>
  );
}