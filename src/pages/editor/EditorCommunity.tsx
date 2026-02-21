import { useState, useRef, useEffect } from 'react';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { useAuth } from '@/hooks/useAuth';
import { useCommunityChat } from '@/hooks/useCommunityChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Users,
  Hash,
  Megaphone,
  MessagesSquare,
  Lightbulb,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface Channel {
  id: string;
  name: string;
  icon: any;
  description: string;
}

const channels: Channel[] = [
  { id: 'general', name: 'Général', icon: Hash, description: 'Discussions générales' },
  { id: 'announcements', name: 'Annonces', icon: Megaphone, description: 'Annonces officielles' },
  { id: 'resources', name: 'Ressources', icon: Lightbulb, description: 'Partagez des outils, sites et effets utiles' },
];

export default function EditorCommunity() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [newChatMessage, setNewChatMessage] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, isConnected, onlineUsers, sendMessage, isSending } = useCommunityChat(selectedChannel);

  // Get current user's profile and stats
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('editor_stats')
        .select('rank')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || !user) return;

    const authorName = userProfile?.full_name || user.email?.split('@')[0] || 'Anonyme';
    const authorRank = userStats?.rank || 'bronze';

    try {
      await sendMessage(newChatMessage, authorName, authorRank);
      setNewChatMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getRankBadgeColor = (rank: string) => {
    const colors: Record<string, string> = {
      bronze: 'bg-amber-600 text-white',
      silver: 'bg-gray-400 text-white',
      gold: 'bg-yellow-500 text-white',
      platinum: 'bg-cyan-400 text-white',
      diamond: 'bg-purple-500 text-white',
    };
    return colors[rank] || 'bg-primary';
  };

  return (
    <EditorLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Communauté
            </h1>
            <p className="text-muted-foreground">Échangez avec les autres éditeurs 4Media</p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <Wifi className="h-3 w-3" />
                Connecté
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="h-3 w-3" />
                Hors ligne
              </Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Channels Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Canaux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left ${
                      selectedChannel === channel.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <channel.icon className="h-4 w-4" />
                    <span className="font-medium">{channel.name}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Online Editors */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  En ligne ({onlineUsers.length || 1})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {onlineUsers.length > 0 ? (
                    <>
                      {onlineUsers.slice(0, 5).map((u) => (
                        <Avatar key={u.user_id} className="h-8 w-8" title={u.name}>
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {onlineUsers.length > 5 && (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{onlineUsers.length - 5}
                        </div>
                      )}
                    </>
                  ) : (
                    <Avatar className="h-8 w-8" title="Vous">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user?.email?.slice(0, 2).toUpperCase() || 'ME'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col h-[600px]">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  {(() => {
                    const ChannelIcon = channels.find(c => c.id === selectedChannel)?.icon || Hash;
                    return <ChannelIcon className="h-5 w-5 text-primary" />;
                  })()}
                  {channels.find(c => c.id === selectedChannel)?.name || 'Général'}
                </CardTitle>
                <CardDescription>
                  {channels.find(c => c.id === selectedChannel)?.description || 'Discussions générales'}
                </CardDescription>
              </CardHeader>
              
              {/* Messages Area */}
              <div 
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessagesSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>Aucun message dans ce canal</p>
                    <p className="text-sm">Soyez le premier à écrire !</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.user_id === user?.id;
                    return (
                      <div 
                        key={message.id} 
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={`text-xs ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                            {message.author_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isOwn ? 'order-2' : ''}`}>
                              {message.author_name}
                            </span>
                            <Badge className={`${getRankBadgeColor(message.author_rank)} text-[10px] px-1.5 py-0 h-4`}>
                              {message.author_rank}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-2 ${
                            isOwn 
                              ? 'bg-primary text-primary-foreground rounded-br-md' 
                              : 'bg-muted rounded-bl-md'
                          }`}>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-3">
                  <Input
                    placeholder={`Écrire dans #${channels.find(c => c.id === selectedChannel)?.name || 'général'}...`}
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage();
                      }
                    }}
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button 
                    onClick={handleSendChatMessage} 
                    disabled={!newChatMessage.trim() || isSending}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </EditorLayout>
  );
}
