'use client';
import { useEffect, useState } from 'react';
import { formsAPI } from '@/lib/api';
import { FileText, Plus, Clock, Check, AlertTriangle, X, Filter } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function FormsPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'submissions' | 'templates'>('submissions');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [templatesRes, submissionsRes, statsRes] = await Promise.all([
        formsAPI.listTemplates(),
        formsAPI.listSubmissions(statusFilter ? { status: statusFilter } : {}),
        formsAPI.submissionStats()
      ]);
      setTemplates(templatesRes.data.templates);
      setSubmissions(submissionsRes.data.submissions);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" /> Forms
          </h1>
          <p className="text-gray-500 text-sm">Manage templates and track submissions</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-white-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            <p className="text-sm text-gray-500">Overdue</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-sm text-gray-500">Completed</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'submissions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Submissions
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'templates' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Templates ({templates.length})
        </button>
      </div>

      {activeTab === 'submissions' && (
        <>
          <div className="flex gap-2">
            {['', 'pending', 'overdue', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="card text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">No form submissions</p>
              <p className="text-sm text-gray-400 mt-1">Forms are automatically sent when bookings are created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="card p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    sub.status === 'completed' ? 'bg-green-100' :
                    sub.status === 'overdue' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    {sub.status === 'completed' ? <Check className="w-5 h-5 text-green-600" /> :
                     sub.status === 'overdue' ? <AlertTriangle className="w-5 h-5 text-red-600" /> :
                     <Clock className="w-5 h-5 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{sub.template?.name || 'Unknown Form'}</p>
                    <p className="text-sm text-gray-500">{sub.contact?.name || 'Unknown Contact'} · {sub.contact?.email || ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={getStatusColor(sub.status)}>{sub.status}</span>
                    {sub.due_date && (
                      <p className="text-xs text-gray-400 mt-1">Due: {formatDate(sub.due_date)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'templates' && (
        <>
          {templates.length === 0 ? (
            <div className="card text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">No form templates</p>
              <p className="text-sm text-gray-400 mt-1">Create templates in Settings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-sm text-gray-500">{t.description || 'No description'}</p>
                    </div>
                    <span className="badge-info">{t.form_type}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>{(t.fields || []).length} fields</p>
                    <p className="text-xs text-gray-400 mt-1">Created: {formatDate(t.created_at)}</p>
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