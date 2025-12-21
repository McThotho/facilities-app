import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Send, RefreshCw, Trash2 } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';

export default function FacilityChat({ facilityId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    loadMessages();
  }, [facilityId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await chatAPI.getMessages(facilityId);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await chatAPI.sendMessage(facilityId, newMessage);
      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('Delete this message?')) return;

    try {
      await chatAPI.deleteMessage(messageId);
      setMessages(messages.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      alert('Failed to delete message');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">💬</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">Team Chat</span>
        </div>
        <button
          onClick={loadMessages}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          title="Refresh messages"
        >
          <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.user_id === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className="group relative">
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.user_id === user.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-baseline space-x-2">
                    <span className="font-medium text-sm">
                      {msg.user_id === user.id ? 'You' : msg.username}
                    </span>
                    <span
                      className={`text-xs ${
                        msg.user_id === user.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatInTimeZone(new Date(msg.created_at), 'Indian/Maldives', 'hh:mm a')}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap">{msg.message}</p>
                </div>
                {msg.user_id === user.id && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    title="Delete message"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="mt-4 flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition flex items-center space-x-2"
        >
          <Send size={18} />
          <span>{sending ? 'Sending...' : 'Send'}</span>
        </button>
      </form>
    </div>
  );
}
