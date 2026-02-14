'use client';
import { useEffect, useState } from 'react';
import { conversationsAPI } from '@/lib/api';
import { MessageSquare, Send, Search, Filter, Clock, User, Mail, Phone } from 'lucide-react';
import { timeAgo, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyChannel, setReplyChannel] = useState('email');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchConversations();
  }, [filter]);

  const fetchConversations = async () => {
    try {
      const params: any = { limit: 50 };
      if (filter !== 'all') params.status = filter;
      const { data } = await conversationsAPI.list(params);
      setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: any) => {
    setSelectedConv(conv);
    try {
      const { data } = await conversationsAPI.get(conv.id);
      setMessages(data.messages);
      setSelectedConv({ ...conv, contact: data.contact, conversation: data.conversation });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedConv) return;
    setSending(true);
    try {
      await conversationsAPI.reply(selectedConv.id, {
        content: replyText,
        channel: replyChannel
      });
      toast.success('Reply sent!');
      setReplyText('');
      // Refresh messages
      const { data } = await conversationsAPI.get(selectedConv.id);
      setMessages(data.messages);
      fetchConversations();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (convId: string, status: string) => {
    try {
      await conversationsAPI.updateStatus(convId, status);
      fetchConversations();
      toast.success(`Conversation marked as ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
  <div className="flex h-[calc(100vh-8rem)] -m-6 bg-gradient-to-br from-[#0f1117] via-[#0d1015] to-black text-gray-200">

    {/* ================= LEFT PANEL ================= */}
    <div className="w-96 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col">

      {/* Header */}
      <div className="p-5 border-b border-white/10 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Inbox
        </h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'replied', 'closed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No conversations yet</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left px-5 py-4 border-b border-white/5 transition ${
                selectedConv?.id === conv.id
                  ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 font-semibold text-sm">
                  {conv.contact ? getInitials(conv.contact.name) : '??'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className="font-medium text-sm truncate text-white">
                      {conv.contact?.name || 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 truncate mt-1">
                    {conv.last_message?.content || 'No messages yet'}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      conv.status === 'open'
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : conv.status === 'replied'
                        ? 'bg-green-500/15 text-green-300 border-green-500/30'
                        : 'bg-gray-500/10 text-gray-400 border-white/10'
                    }`}>
                      {conv.status}
                    </span>

                    {conv.unread_count > 0 && (
                      <span className="w-5 h-5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow shadow-indigo-500/40">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>

    {/* ================= RIGHT PANEL ================= */}
    <div className="flex-1 flex flex-col bg-[#0f1117]">

      {!selectedConv ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-white">Select a conversation</p>
            <p className="text-sm text-gray-500">Choose from the left panel</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4 bg-white/5 backdrop-blur flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-300 font-semibold text-sm">
                {selectedConv.contact ? getInitials(selectedConv.contact.name) : '??'}
              </div>
              <div>
                <p className="font-semibold text-white">
                  {selectedConv.contact?.name}
                </p>
                <div className="text-xs text-gray-400 flex gap-3 mt-1">
                  {selectedConv.contact?.email && <span>{selectedConv.contact.email}</span>}
                  {selectedConv.contact?.phone && <span>{selectedConv.contact.phone}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md rounded-2xl px-4 py-3 text-sm ${
                    msg.direction === 'outbound'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-white/5 border border-white/10 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  <div className="text-[11px] mt-2 opacity-70 flex gap-2">
                    <span>
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {msg.is_automated && <span>(automated)</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          <div className="border-t border-white/10 p-5 bg-white/5 backdrop-blur">
            <div className="flex items-end gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={2}
                className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />

              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);
}