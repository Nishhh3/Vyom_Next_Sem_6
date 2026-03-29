'use client';

import { useEffect, useMemo, useState } from 'react';

type ComplaintStatus = 'open' | 'in_progress' | 'resolved';
type ComplaintCategory = 'loan' | 'kyc' | 'transfer' | 'account' | 'general';
type ComplaintSentiment = 'positive' | 'neutral' | 'negative';

type Complaint = {
  id: number;
  channel: string;
  user_identifier: string;
  subject: string | null;
  raw_message: string;
  groq_summary: string | null;
  groq_category: ComplaintCategory | string | null;
  groq_sentiment: ComplaintSentiment | string | null;
  status: ComplaintStatus;
  twilio_msg_sid: string | null;
  created_at: string;
};

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const statusOptions: Array<'all' | ComplaintStatus> = ['all', 'open', 'in_progress', 'resolved'];
const categoryOptions: Array<'all' | ComplaintCategory> = ['all', 'loan', 'kyc', 'transfer', 'account', 'general'];
const sentimentOptions: Array<'all' | ComplaintSentiment> = ['all', 'negative', 'neutral', 'positive'];

function toRelativeTime(timestamp: string) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return 'unknown';

  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function truncate(text: string | null | undefined, max = 60) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 3)}...`;
}

function statusBadgeClass(status: ComplaintStatus) {
  if (status === 'open') return 'bg-[#ef4444] text-white';
  if (status === 'in_progress') return 'bg-[#f59e0b] text-white';
  return 'bg-[#22c55e] text-white';
}

function categoryBadgeClass(category: string) {
  if (category === 'loan') return 'bg-[#3b82f6] text-white';
  if (category === 'kyc') return 'bg-[#8b5cf6] text-white';
  if (category === 'transfer') return 'bg-[#14b8a6] text-white';
  if (category === 'account') return 'bg-[#f97316] text-white';
  return 'bg-[#6b7280] text-white';
}

function categoryBorderColor(category: string | null) {
  if (category === 'loan') return '#3b82f6';
  if (category === 'kyc') return '#8b5cf6';
  if (category === 'transfer') return '#14b8a6';
  if (category === 'account') return '#f97316';
  return '#6b7280';
}

function sentimentMeta(sentiment: string | null) {
  if (sentiment === 'negative') return { icon: '🔴', text: 'negative', cls: 'text-red-400' };
  if (sentiment === 'positive') return { icon: '🟢', text: 'positive', cls: 'text-green-400' };
  return { icon: '🟡', text: 'neutral', cls: 'text-yellow-400' };
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ComplaintCategory>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | ComplaintSentiment>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessageById, setStatusMessageById] = useState<Record<number, { kind: 'ok' | 'error'; text: string }>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${BACKEND_BASE}/helpcenter/complaints`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setComplaints(Array.isArray(data) ? data : []);
    } catch {
      setError('⚠️ Could not load complaints. Is the backend running?');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const stats = useMemo(() => {
    const open = complaints.filter((c) => c.status === 'open').length;
    const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    return {
      open,
      inProgress,
      resolved,
      total: complaints.length,
    };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const cat = (c.groq_category || 'general') as ComplaintCategory;
      const sentiment = (c.groq_sentiment || 'neutral') as ComplaintSentiment;

      const statusPass = statusFilter === 'all' || c.status === statusFilter;
      const categoryPass = categoryFilter === 'all' || cat === categoryFilter;
      const sentimentPass = sentimentFilter === 'all' || sentiment === sentimentFilter;

      return statusPass && categoryPass && sentimentPass;
    });
  }, [complaints, statusFilter, categoryFilter, sentimentFilter]);

  const handleToggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };
  
  const handleStatusUpdate = async (complaintId: number, status: ComplaintStatus) => {
    try {
      setUpdatingId(complaintId);
      setStatusMessageById((prev) => ({ ...prev, [complaintId]: { kind: 'ok', text: 'Updating...' } }));

      const res = await fetch(`${BACKEND_BASE}/helpcenter/complaints/${complaintId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setStatusMessageById((prev) => ({ ...prev, [complaintId]: { kind: 'ok', text: '✅ Updated' } }));
      await fetchComplaints();
    } catch {
      setStatusMessageById((prev) => ({ ...prev, [complaintId]: { kind: 'error', text: '❌ Failed' } }));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Complaint Manager</h1>
        <p className="text-gray-400">Track inbound WhatsApp complaints in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Open</p>
          <p className="text-3xl font-bold text-[#ef4444]">{stats.open}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">In Progress</p>
          <p className="text-3xl font-bold text-[#f59e0b]">{stats.inProgress}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Resolved</p>
          <p className="text-3xl font-bold text-[#22c55e]">{stats.resolved}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total</p>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All status' : status}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'All category' : category}
              </option>
            ))}
          </select>

          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as typeof sentimentFilter)}
            className="bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            {sentimentOptions.map((sentiment) => (
              <option key={sentiment} value={sentiment}>
                {sentiment === 'all' ? 'All sentiment' : sentiment}
              </option>
            ))}
          </select>

          <button
            onClick={fetchComplaints}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {['ID', 'From', 'Summary', 'Category', 'Sentiment', 'Status', 'Time', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    Loading complaints...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-red-300">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && filteredComplaints.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    No complaints found.
                  </td>
                </tr>
              )}

              {!loading && !error && filteredComplaints.map((complaint) => {
                const category = (complaint.groq_category || 'general').toLowerCase();
                const sentiment = sentimentMeta((complaint.groq_sentiment || 'neutral').toLowerCase());
                const summary = complaint.groq_summary || complaint.raw_message;
                const message = statusMessageById[complaint.id];

                return (
                  <>
                    <tr
                      key={`row-${complaint.id}`}
                      onClick={() => handleToggleExpand(complaint.id)}
                      className="cursor-pointer hover:bg-blue-500/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-300">{complaint.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{truncate(complaint.user_identifier, 20)}</td>
                      <td className="px-4 py-3 text-sm text-gray-200" title={complaint.raw_message}>
                        {truncate(summary, 60)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${categoryBadgeClass(category)}`}>
                          {category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${sentiment.cls}`}>
                          <span>{sentiment.icon}</span>
                          <span>{sentiment.text}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(complaint.status)}`}>
                          {complaint.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{toRelativeTime(complaint.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">Change Status ▼</td>
                    </tr>

                    {expandedId === complaint.id && (
                      <tr key={`detail-${complaint.id}`} className="bg-gray-100/10">
                        <td colSpan={8} className="px-0 py-0">
                          <div
                            className="px-4 py-4 border-l-4"
                            style={{ borderLeftColor: categoryBorderColor(complaint.groq_category) }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                              <p className="text-gray-300">
                                <span className="text-gray-500">Groq summary:</span> {complaint.groq_summary || '-'}
                              </p>
                              <p className="text-gray-300">
                                <span className="text-gray-500">Category:</span> {category}
                              </p>
                              <p className="text-gray-300">
                                <span className="text-gray-500">Sentiment:</span> {sentiment.text}
                              </p>
                              <p className="text-gray-300">
                                <span className="text-gray-500">Status:</span> {complaint.status}
                              </p>
                              <p className="text-gray-300">
                                <span className="text-gray-500">User identifier:</span> {complaint.user_identifier}
                              </p>
                              <p className="text-gray-300">
                                <span className="text-gray-500">Twilio MessageSid:</span> {complaint.twilio_msg_sid || '-'}
                              </p>
                              <p className="text-gray-300 md:col-span-2">
                                <span className="text-gray-500">Created at:</span> {complaint.created_at}
                              </p>
                            </div>

                            <div className="mb-4">
                              <p className="text-sm text-gray-500 mb-1">Full message</p>
                              <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-200 whitespace-pre-wrap">
                                {complaint.raw_message}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <select
                                defaultValue={complaint.status}
                                id={`status-${complaint.id}`}
                                className="bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value="open">open</option>
                                <option value="in_progress">in_progress</option>
                                <option value="resolved">resolved</option>
                              </select>

                              <button
                                type="button"
                                disabled={updatingId === complaint.id}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const select = document.getElementById(`status-${complaint.id}`) as HTMLSelectElement | null;
                                  const next = (select?.value || complaint.status) as ComplaintStatus;
                                  handleStatusUpdate(complaint.id, next);
                                }}
                              >
                                {updatingId === complaint.id ? 'Updating...' : 'Update'}
                              </button>

                              {message && (
                                <span className={`text-sm font-semibold ${message.kind === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                                  {message.text}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
