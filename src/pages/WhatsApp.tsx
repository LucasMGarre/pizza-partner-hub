import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageCircle, 
  Settings, 
  Power, 
  Users, 
  Clock, 
  CheckCheck, 
  Send,
  Smartphone,
  Zap,
  BarChart3,
  Bot,
  Phone,
  Save
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, push, update } from 'firebase/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  status: 'online' | 'offline' | 'typing';
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface WhatsAppConfig {
  isActive: boolean;
  welcomeMessage: string;
  awayMessage: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  autoReply: boolean;
  botName: string;
}

const WhatsApp = () => {
  const [conversations, setConversations] = useState<Conversation[]>([
    { id: '1', name: 'João Silva', phone: '+55 11 99999-0001', lastMessage: 'Quero fazer um pedido', timestamp: '14:32', unread: 2, status: 'online' },
    { id: '2', name: 'Maria Santos', phone: '+55 11 99999-0002', lastMessage: 'Qual o tempo de entrega?', timestamp: '13:45', unread: 0, status: 'offline' },
    { id: '3', name: 'Pedro Oliveira', phone: '+55 11 99999-0003', lastMessage: 'Obrigado!', timestamp: '12:20', unread: 0, status: 'offline' },
    { id: '4', name: 'Ana Costa', phone: '+55 11 99999-0004', lastMessage: 'Vocês têm pizza vegana?', timestamp: '11:15', unread: 1, status: 'typing' },
  ]);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [config, setConfig] = useState<WhatsAppConfig>({
    isActive: true,
    welcomeMessage: 'Olá! Bem-vindo à Eco Pizzaria 🍕\nComo posso ajudar você hoje?',
    awayMessage: 'Estamos fora do horário de atendimento. Retornaremos em breve!',
    businessHoursStart: '18:00',
    businessHoursEnd: '23:00',
    autoReply: true,
    botName: 'EcoBot',
  });
  const [activeTab, setActiveTab] = useState('conversations');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const configRef = ref(database, 'whatsapp/config');
    const unsubConfig = onValue(configRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setConfig(data);
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Simulated messages
    setMessages([
      { id: '1', role: 'user', content: 'Oi, boa noite!', timestamp: '14:30', status: 'read' },
      { id: '2', role: 'bot', content: config.welcomeMessage, timestamp: '14:30', status: 'read' },
      { id: '3', role: 'user', content: conversation.lastMessage, timestamp: '14:32', status: 'read' },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConversation) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'bot',
      content: input,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    toast.success('Mensagem enviada!');
  };

  const handleSaveConfig = async () => {
    try {
      await update(ref(database, 'whatsapp/config'), config);
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const stats = {
    totalConversations: 156,
    activeToday: 24,
    avgResponseTime: '2min',
    satisfaction: '98%',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              WhatsApp Business
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie seu atendimento via WhatsApp</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 glass rounded-xl px-4 py-2",
              config.isActive ? "border-green-500/50" : "border-destructive/50"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                config.isActive ? "bg-green-500" : "bg-destructive"
              )} />
              <span className="text-sm text-foreground">{config.isActive ? 'Conectado' : 'Desconectado'}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Conversas Totais', value: stats.totalConversations, color: 'text-blue-500' },
            { icon: Zap, label: 'Ativas Hoje', value: stats.activeToday, color: 'text-green-500' },
            { icon: Clock, label: 'Tempo Médio', value: stats.avgResponseTime, color: 'text-amber-500' },
            { icon: BarChart3, label: 'Satisfação', value: stats.satisfaction, color: 'text-purple-500' },
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="glass rounded-2xl p-4 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl bg-secondary", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass w-full lg:w-auto grid grid-cols-3 lg:flex">
            <TabsTrigger value="conversations" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Conversas</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Automação</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Conversations List */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <Input 
                    placeholder="Buscar conversas..." 
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                  {conversations.map((conv, index) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors border-b border-border/50 animate-slide-up",
                        selectedConversation?.id === conv.id && "bg-secondary"
                      )}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                          {conv.name.charAt(0)}
                        </div>
                        {conv.status === 'online' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                        {conv.status === 'typing' && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 rounded-full border-2 border-card animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground truncate">{conv.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{conv.timestamp}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                        {conv.status === 'typing' && (
                          <span className="text-xs text-blue-500">digitando...</span>
                        )}
                      </div>
                      {conv.unread > 0 && (
                        <Badge className="gradient-primary text-primary-foreground">{conv.unread}</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="lg:col-span-2 glass rounded-2xl flex flex-col h-[500px]">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                        {selectedConversation.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{selectedConversation.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {selectedConversation.phone}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Smartphone className="w-5 h-5 text-muted-foreground" />
                      </Button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]">
                      {messages.map((message, index) => (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-2 animate-slide-up",
                            message.role === 'bot' && "flex-row-reverse"
                          )}
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className={cn(
                            "max-w-[75%] rounded-2xl p-3 shadow-sm",
                            message.role === 'bot' 
                              ? "bg-green-500 text-white rounded-tr-sm" 
                              : "bg-card text-foreground rounded-tl-sm"
                          )}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className={cn(
                              "flex items-center justify-end gap-1 mt-1",
                              message.role === 'bot' ? "text-green-100" : "text-muted-foreground"
                            )}>
                              <span className="text-[10px]">{message.timestamp}</span>
                              {message.role === 'bot' && (
                                <CheckCheck className={cn(
                                  "w-3 h-3",
                                  message.status === 'read' && "text-blue-300"
                                )} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
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
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                      <MessageCircle className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-medium">Selecione uma conversa</p>
                    <p className="text-sm">Escolha um contato para iniciar o atendimento</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Respostas Automáticas</h2>
                    <p className="text-sm text-muted-foreground">Configure mensagens automáticas</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                  <div>
                    <Label className="text-foreground">Auto-resposta ativa</Label>
                    <p className="text-xs text-muted-foreground">Responder automaticamente</p>
                  </div>
                  <Switch
                    checked={config.autoReply}
                    onCheckedChange={(checked) => setConfig({ ...config, autoReply: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Mensagem de Boas-vindas</Label>
                  <Textarea
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    className="bg-secondary border-border min-h-[120px]"
                    placeholder="Digite a mensagem de boas-vindas..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Mensagem Fora do Horário</Label>
                  <Textarea
                    value={config.awayMessage}
                    onChange={(e) => setConfig({ ...config, awayMessage: e.target.value })}
                    className="bg-secondary border-border min-h-[100px]"
                    placeholder="Digite a mensagem para fora do horário..."
                  />
                </div>
              </div>

              <div className="glass rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Horário de Atendimento</h2>
                    <p className="text-sm text-muted-foreground">Defina seu horário de funcionamento</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Início</Label>
                    <Input
                      type="time"
                      value={config.businessHoursStart}
                      onChange={(e) => setConfig({ ...config, businessHoursStart: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Fim</Label>
                    <Input
                      type="time"
                      value={config.businessHoursEnd}
                      onChange={(e) => setConfig({ ...config, businessHoursEnd: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Dica</p>
                      <p className="text-xs text-muted-foreground">
                        As mensagens fora do horário serão enviadas automaticamente quando o bot estiver ativo.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} className="w-full gradient-primary text-primary-foreground gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="glass rounded-2xl p-6 max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Configurações Gerais</h2>
                  <p className="text-sm text-muted-foreground">Gerencie as configurações do WhatsApp</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
                  <div>
                    <Label className="text-foreground">Conexão WhatsApp</Label>
                    <p className="text-xs text-muted-foreground">Status da conexão com a API</p>
                  </div>
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
                    placeholder="Nome do assistente virtual"
                  />
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Integração WhatsApp Business API</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Para conectar ao WhatsApp Business API, você precisará configurar suas credenciais. 
                        Entre em contato para obter suporte na configuração.
                      </p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveConfig} className="w-full gradient-primary text-primary-foreground gap-2">
                  <Save className="w-4 h-4" />
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsApp;
