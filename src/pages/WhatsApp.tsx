import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Power, 
  Send, 
  UserPlus, 
  Phone,
  Bot,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Plus,
  Trash2,
  Edit2
} from 'lucide-react';
import { ref, set, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { toast } from 'sonner';

interface Rule {
  id: string;
  keyword: string;
  response: string;
  active: boolean;
}

interface BroadcastMessage {
  id: string;
  message: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'failed';
}

const WhatsApp = () => {
  const [botEnabled, setBotEnabled] = useState(true);
  const [botPrompt, setBotPrompt] = useState('Você é um assistente virtual da Eco Pizzaria. Seja sempre cordial e ajude os clientes com informações sobre cardápio, preços e pedidos.');
  const [firstContactMessage, setFirstContactMessage] = useState('Olá! 👋 Bem-vindo à Eco Pizzaria! Como posso ajudar você hoje?');
  const [connectedNumber, setConnectedNumber] = useState('+55 11 99999-9999');
  const [newNumber, setNewNumber] = useState('');
  const [showChangeNumber, setShowChangeNumber] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', keyword: 'cardápio', response: 'Nosso cardápio completo está disponível em...', active: true },
    { id: '2', keyword: 'horário', response: 'Funcionamos de terça a domingo, das 18h às 23h.', active: true },
    { id: '3', keyword: 'promoção', response: 'Confira nossas promoções da semana!', active: false },
  ]);
  const [newRule, setNewRule] = useState({ keyword: '', response: '' });
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastMessage[]>([
    { id: '1', message: 'Promoção de terça: Pizza grande por R$49,90!', scheduledAt: '2024-01-15 18:00', status: 'sent' },
    { id: '2', message: 'Novidade: Pizza de Nutella chegou!', scheduledAt: '2024-01-16 19:00', status: 'pending' },
  ]);

  const stats = {
    messagesReceived: 1247,
    messagesSent: 892,
    activeConversations: 23,
    avgResponseTime: '2.3 min'
  };

  useEffect(() => {
    const configRef = ref(database, 'whatsapp/config');
    onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.botEnabled !== undefined) setBotEnabled(data.botEnabled);
        if (data.botPrompt) setBotPrompt(data.botPrompt);
        if (data.firstContactMessage) setFirstContactMessage(data.firstContactMessage);
        if (data.connectedNumber) setConnectedNumber(data.connectedNumber);
      }
    });

    const rulesRef = ref(database, 'whatsapp/rules');
    onValue(rulesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const rulesArray = Object.entries(data).map(([id, rule]: [string, any]) => ({
          id,
          ...rule
        }));
        setRules(rulesArray);
      }
    });
  }, []);

  const saveConfig = async () => {
    try {
      await set(ref(database, 'whatsapp/config'), {
        botEnabled,
        botPrompt,
        firstContactMessage,
        connectedNumber
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const toggleBot = async () => {
    const newState = !botEnabled;
    setBotEnabled(newState);
    await set(ref(database, 'whatsapp/config/botEnabled'), newState);
    toast.success(newState ? 'Bot ativado!' : 'Bot desativado!');
  };

  const addRule = async () => {
    if (!newRule.keyword || !newRule.response) {
      toast.error('Preencha todos os campos');
      return;
    }
    const id = Date.now().toString();
    const rule = { ...newRule, active: true, id };
    setRules([...rules, rule]);
    await set(ref(database, `whatsapp/rules/${id}`), rule);
    setNewRule({ keyword: '', response: '' });
    toast.success('Regra adicionada!');
  };

  const toggleRule = async (id: string) => {
    const updatedRules = rules.map(r => 
      r.id === id ? { ...r, active: !r.active } : r
    );
    setRules(updatedRules);
    const rule = updatedRules.find(r => r.id === id);
    if (rule) {
      await set(ref(database, `whatsapp/rules/${id}`), rule);
    }
  };

  const deleteRule = async (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    await set(ref(database, `whatsapp/rules/${id}`), null);
    toast.success('Regra removida!');
  };

  const changeNumber = async () => {
    if (!newNumber) {
      toast.error('Digite o novo número');
      return;
    }
    setConnectedNumber(newNumber);
    await set(ref(database, 'whatsapp/config/connectedNumber'), newNumber);
    setNewNumber('');
    setShowChangeNumber(false);
    toast.success('Número alterado!');
  };

  const sendBroadcast = () => {
    if (!broadcastMessage) {
      toast.error('Digite uma mensagem');
      return;
    }
    const newBroadcast: BroadcastMessage = {
      id: Date.now().toString(),
      message: broadcastMessage,
      scheduledAt: new Date().toLocaleString('pt-BR'),
      status: 'pending'
    };
    setBroadcastHistory([newBroadcast, ...broadcastHistory]);
    setBroadcastMessage('');
    toast.success('Disparo agendado!');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Painel WhatsApp</h1>
            <p className="text-muted-foreground mt-1">Configure e controle seu chatbot</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
              <div className={`w-2 h-2 rounded-full ${botEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">{botEnabled ? 'Online' : 'Offline'}</span>
            </div>
            <Button 
              onClick={toggleBot}
              variant={botEnabled ? "destructive" : "default"}
              className="gap-2"
            >
              <Power className="w-4 h-4" />
              {botEnabled ? 'Desligar' : 'Ligar'}
            </Button>
          </div>
        </div>

        {/* WhatsApp Conectado */}
        <Card className="bg-gradient-to-r from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp Conectado</p>
                  <p className="text-lg font-semibold text-foreground">{connectedNumber}</p>
                </div>
              </div>
              
              {showChangeNumber ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="+55 11 99999-9999"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    className="bg-background/50"
                  />
                  <div className="flex gap-2">
                    <Button onClick={changeNumber} size="sm">Salvar</Button>
                    <Button onClick={() => setShowChangeNumber(false)} variant="outline" size="sm">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowChangeNumber(true)} variant="outline" className="gap-2">
                  <Edit2 className="w-4 h-4" />
                  Alterar Número
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Regras</span>
            </TabsTrigger>
            <TabsTrigger value="first-contact" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">1º Contato</span>
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Disparo</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Recebidas</p>
                      <p className="text-xl font-bold">{stats.messagesReceived}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Send className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Enviadas</p>
                      <p className="text-xl font-bold">{stats.messagesSent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversas Ativas</p>
                      <p className="text-xl font-bold">{stats.activeConversations}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur border-border/50">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo Resposta</p>
                      <p className="text-xl font-bold">{stats.avgResponseTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Conexão WhatsApp</span>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Conectado</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {botEnabled ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                    <span>Bot de Atendimento</span>
                  </div>
                  <Badge variant="outline" className={botEnabled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}>
                    {botEnabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Regras Automáticas</span>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {rules.filter(r => r.active).length} ativas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  Prompt do Bot
                </CardTitle>
                <CardDescription>
                  Configure a personalidade e comportamento do seu chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Instruções do Bot</Label>
                  <Textarea
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    placeholder="Digite as instruções para o bot..."
                    className="min-h-[200px] bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Descreva como o bot deve se comportar, qual tom usar e quais informações priorizar.
                  </p>
                </div>
                <Button onClick={saveConfig} className="w-full sm:w-auto">
                  Salvar Prompt
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Regras do Chatbot
                </CardTitle>
                <CardDescription>
                  Configure respostas automáticas baseadas em palavras-chave
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nova Regra */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Nova Regra
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Palavra-chave</Label>
                      <Input
                        placeholder="Ex: cardápio, preço, horário..."
                        value={newRule.keyword}
                        onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resposta Automática</Label>
                      <Input
                        placeholder="Resposta quando detectar a palavra..."
                        value={newRule.response}
                        onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
                        className="bg-background/50"
                      />
                    </div>
                  </div>
                  <Button onClick={addRule} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Regra
                  </Button>
                </div>

                {/* Lista de Regras */}
                <div className="space-y-3">
                  <h4 className="font-medium">Regras Configuradas</h4>
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            {rule.keyword}
                          </Badge>
                          <Badge variant={rule.active ? "default" : "secondary"} className="text-xs">
                            {rule.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{rule.response}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.active}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* First Contact Tab */}
          <TabsContent value="first-contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Mensagem de Primeiro Contato
                </CardTitle>
                <CardDescription>
                  Configure a mensagem enviada automaticamente para novos contatos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Mensagem de Boas-vindas</Label>
                  <Textarea
                    value={firstContactMessage}
                    onChange={(e) => setFirstContactMessage(e.target.value)}
                    placeholder="Digite a mensagem de primeiro contato..."
                    className="min-h-[150px] bg-muted/50"
                  />
                </div>
                
                {/* Preview */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 max-w-[280px]">
                    <p className="text-sm">{firstContactMessage}</p>
                  </div>
                </div>

                <Button onClick={saveConfig} className="w-full sm:w-auto">
                  Salvar Mensagem
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Disparo de Mensagens
                </CardTitle>
                <CardDescription>
                  Envie mensagens em massa para seus contatos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensagem do Disparo</Label>
                    <Textarea
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Digite a mensagem que será enviada para todos os contatos..."
                      className="min-h-[120px] bg-muted/50"
                    />
                  </div>
                  <Button onClick={sendBroadcast} className="gap-2">
                    <Send className="w-4 h-4" />
                    Enviar Disparo
                  </Button>
                </div>

                {/* Histórico */}
                <div className="space-y-3">
                  <h4 className="font-medium">Histórico de Disparos</h4>
                  {broadcastHistory.map((broadcast) => (
                    <div key={broadcast.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 bg-card border border-border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm line-clamp-1">{broadcast.message}</p>
                        <p className="text-xs text-muted-foreground">{broadcast.scheduledAt}</p>
                      </div>
                      <Badge 
                        variant="outline"
                        className={
                          broadcast.status === 'sent' 
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : broadcast.status === 'pending'
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                      >
                        {broadcast.status === 'sent' ? 'Enviado' : broadcast.status === 'pending' ? 'Pendente' : 'Falhou'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsApp;
