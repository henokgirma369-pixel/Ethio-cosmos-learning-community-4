import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface ChatMessageRow {
  id: string;
  message_text: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    username?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
}

function rowToMessage(row: ChatMessageRow): ChatMessage {
  const profile = row.profiles ?? null;
  const sender_name =
    profile?.username ||
    (profile?.email ? profile.email.split('@')[0] : undefined) ||
    'Unknown User';
  return {
    id: row.id,
    user_id: row.user_id,
    message_text: row.message_text,
    image_url: row.image_url,
    created_at: row.created_at,
    sender_name,
    sender_email: profile?.email ?? undefined,
  };
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial load + realtime subscription. Runs once per mounted user session.
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select(
            `id, message_text, image_url, created_at, user_id, profiles ( username, email, avatar_url )`
          )
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('Error loading messages:', fetchError);
          if (isMounted) setError('Failed to load messages. Please refresh.');
          return;
        }

        if (data && isMounted) {
          setMessages((data as unknown as ChatMessageRow[]).map(rowToMessage));
        }
      } catch (err) {
        console.error('Unexpected error loading messages:', err);
        if (isMounted) setError('An unexpected error occurred.');
      }
    };

    fetchMessages();

    // Real-time subscription: postgres_changes INSERT on chat_messages.
    // Fetches the single new row joined with profiles (username, avatar_url, email)
    // and appends it to local state. Deduplicates by id so the sender never
    // sees their own message twice.
    const channel = supabase
      .channel(`chat-messages-realtime-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newRow = payload.new as { id: string };
          if (!newRow?.id) return;

          const { data: fullRow, error: rowError } = await supabase
            .from('chat_messages')
            .select(
              `id, message_text, image_url, created_at, user_id, profiles ( username, email, avatar_url )`
            )
            .eq('id', newRow.id)
            .maybeSingle();

          if (rowError || !fullRow || !isMounted) return;

          const message = rowToMessage(fullRow as unknown as ChatMessageRow);

          setMessages((prev) => {
            // Dedupe: don't append if this id is already in state.
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    const text = newMessage.trim();
    if (text.length > 1000) {
      setError('Message is too long. Maximum 1000 characters.');
      return;
    }
    setNewMessage('');
    setError(null);
    try {
      // Insert only — DO NOT reload messages. The realtime subscription
      // above will receive the INSERT event and append the new message.
      const { error: insertError } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        message_text: text,
      });
      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      setError('An unexpected error occurred.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      const filePath = `chat-images/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('uploads').getPublicUrl(filePath);

      // Insert only — realtime subscription will append the message.
      const { error: insertError } = await supabase.from('chat_messages').insert({
        user_id: user.id,
        image_url: publicUrl,
      });
      if (insertError) throw insertError;
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col">
      <div className="bg-slate-900 border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Community Chat</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Community
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No messages yet. Be the first to say hello! 🌌</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.user_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      isOwn ? 'bg-orange-500 text-white' : 'bg-slate-800 text-gray-200'
                    }`}
                  >
                    {!isOwn && (
                      <p className="text-xs font-medium text-gray-400 mb-1">{msg.sender_name}</p>
                    )}
                    {msg.image_url ? (
                      <img src={msg.image_url} alt="Shared" className="max-w-full rounded-lg" />
                    ) : (
                      <p>{msg.message_text}</p>
                    )}
                    <p className={`text-xs mt-1 ${isOwn ? 'text-orange-200' : 'text-gray-500'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-slate-900 border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            size="icon"
            className="border-white/20 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip size={20} />
          </Button>
          <Input
            type="text"
            placeholder={uploading ? 'Uploading image...' : 'Type a message...'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 bg-slate-800 border-white/20 text-white placeholder:text-gray-500"
            disabled={uploading}
          />
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white"
            onClick={sendMessage}
            disabled={!newMessage.trim() || uploading}
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
