import { useState, useRef, useEffect } from 'react';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Headphones,
  Wrench,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'support';
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

const supportChannels = [
  {
    id: 'client',
    name: 'Service Client',
    description: 'Questions générales, paiements, compte',
    icon: Headphones,
    status: 'online',
    avgResponse: '< 2h',
  },
  {
    id: 'technique',
    name: 'Support Technique',
    description: 'Problèmes techniques, bugs, accès',
    icon: Wrench,
    status: 'online',
    avgResponse: '< 1h',
  },
];

const faqItems = [
  {
    question: 'Comment soumettre une vidéo ?',
    answer: 'Allez sur votre Dashboard, sélectionnez la tâche et cliquez sur "Livrer" pour uploader votre fichier.',
  },
  {
    question: 'Quand suis-je payé ?',
    answer: 'Les paiements sont effectués le 5 de chaque mois pour les vidéos validées du mois précédent.',
  },
  {
    question: 'Que faire si ma vidéo est refusée ?',
    answer: 'Consultez les notes de révision et soumettez une nouvelle version corrigée.',
  },
];

export default function EditorSupport() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages([...messages, message]);
    setNewMessage('');

    // Simulate support response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Merci pour votre message. Un membre de notre équipe va vous répondre dans les plus brefs délais.',
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'ED';

  return (
    <EditorLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground">Contactez notre équipe ou consultez la FAQ</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Support Channels */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Canaux de support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supportChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      selectedChannel === channel.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <channel.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{channel.name}</span>
                          <Badge 
                            variant="outline" 
                            className={channel.status === 'online' ? 'text-green-600 border-green-600' : 'text-yellow-600 border-yellow-600'}
                          >
                            {channel.status === 'online' ? 'En ligne' : 'Occupé'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Réponse moyenne : {channel.avgResponse}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  FAQ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqItems.map((item, index) => (
                  <div key={index} className="space-y-1">
                    <p className="font-medium text-sm">{item.question}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              {selectedChannel ? (
                <>
                  <CardHeader className="border-b pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {selectedChannel === 'client' ? (
                          <Headphones className="h-5 w-5 text-primary" />
                        ) : (
                          <Wrench className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {supportChannels.find(c => c.id === selectedChannel)?.name}
                        </CardTitle>
                        <CardDescription>
                          Conversation avec le support
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Commencez une conversation</p>
                          <p className="text-sm">Notre équipe est là pour vous aider</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                message.sender === 'user'
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className={`flex items-center gap-1 mt-1 text-xs ${
                                message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              }`}>
                                {message.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                {message.sender === 'user' && message.status === 'sent' && (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Écrivez votre message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Headphones className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Sélectionnez un canal</p>
                    <p className="text-sm">Choisissez Service Client ou Support Technique</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </EditorLayout>
  );
}
