import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Settings, MessageCircle, Power } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, push, update } from 'firebase/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
}

interface ChatConfig {
  isActive: boolean;
  welcomeMessage: string;
  botName: string;
}

const Chatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<ChatConfig>({
    isActive: true,
    welcomeMessage: 'Olá! Bem-vindo à Eco Pizzaria. Como posso ajudar você hoje?',
    botName: 'EcoBot',
  });
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const configRef = ref(database, 'chatbot/config');
    const messagesRef = ref(database, 'chatbot/messages');

    const unsubConfig = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setConfig(data);
    });

    const unsubMessages = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Message, 'id'>),
        }));
        setMessages(messagesList.slice(-50));
      }
    });

    return () => {
      unsubConfig();
      unsubMessages();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    };

    try {
      await push(ref(database, 'chatbot/messages'), userMessage);

      // Simulated bot response
      setTimeout(async () => {
        const botResponses = [
          'Certo! Posso ajudar com informações sobre nosso cardápio, horários ou fazer seu pedido.',
          'Temos diversas pizzas deliciosas! Gostaria de ver nosso cardápio?',
          'Nosso horário de funcionamento é das 18h às 23h.',
          'Entrega grátis para pedidos acima de R$ 50!',
          'Você pode acompanhar seu pedido pelo nosso sistema.',
        ];
        const botMessage = {
          role: 'bot' as const,
          content: botResponses[Math.floor(Math.random() * botResponses.length)],
          timestamp: new Date().toISOString(),
        };
        await push(ref(database, 'chatbot/messages'), botMessage);
      }, 1000);

      setInput('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await update(ref(database, 'chatbot/config'), config);
      toast.success('Configurações salvas!');
      setShowSettings(false);
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Chatbot</h1>
            <p className="text-muted-foreground mt-1">Gerencie o atendimento automatizado</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 glass rounded-xl px-4 py-2">
              <Power className={cn("w-4 h-4", config.isActive ? "text-green-500" : "text-muted-foreground")} />
              <span className="text-sm text-foreground">{config.isActive ? 'Ativo' : 'Inativo'}</span>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="gap-2 border-border"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          {showSettings && (
            <div className="glass rounded-2xl p-6 lg:col-span-1 animate-slide-up">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configurações
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Chatbot Ativo</Label>
                  <Switch
                    checked={config.isActive}
                    onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Nome do Bot</Label>
                  <Input
                    value={config.botName}
                    onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Mensagem de Boas-vindas</Label>
                  <Textarea
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    className="bg-secondary border-border min-h-[100px]"
                  />
                </div>
                <Button onClick={handleSaveConfig} className="w-full gradient-primary text-primary-foreground">
                  Salvar Configurações
                </Button>
              </div>
            </div>
          )}

          {/* Chat Preview */}
          <div className={cn(
            "glass rounded-2xl overflow-hidden flex flex-col",
            showSettings ? "lg:col-span-2" : "lg:col-span-3"
          )}>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Preview do Chat</h3>
                <p className="text-xs text-muted-foreground">Simule uma conversa</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[500px]">
              {messages.length === 0 && (
                <div className="glass rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                  <p className="text-sm text-foreground">{config.welcomeMessage}</p>
                  <span className="text-xs text-muted-foreground mt-2 block">{config.botName}</span>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-slide-up",
                    message.role === 'user' && "flex-row-reverse"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === 'bot' ? "gradient-primary" : "bg-secondary"
                  )}>
                    {message.role === 'bot' ? (
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "rounded-2xl p-4 max-w-[70%]",
                    message.role === 'bot'
                      ? "glass rounded-tl-sm"
                      : "gradient-primary text-primary-foreground rounded-tr-sm"
                  )}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Digite uma mensagem..."
                  className="bg-secondary border-border"
                />
                <Button onClick={handleSend} className="gradient-primary text-primary-foreground px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chatbot;
