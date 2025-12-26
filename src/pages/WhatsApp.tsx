import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  ShoppingBag,
  Power,
  UserPlus,
  Phone,
  Bot,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Shield,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  Image as ImageIcon,
  Mic,
  Video,
  FileText,
  X,
  PowerOff,
  Download,
  Music,
  File
} from 'lucide-react';
import { ref, set, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '@/lib/firebase';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE_URL = 'http://localhost:3001';
// const API_BASE_URL = 'https://routineapp.com.br';

interface Rule {
  id: string;
  keyword: string;
  response: string;
  active: boolean;
}

interface MediaItem {
  type: 'base64' | 'url';
  mimetype: string;
  data?: string;
  url?: string;
  filename?: string;
  caption?: string;
  preview?: string;
}

interface Contact {
  number: string;
  name: string;
  firstContact: string;
  lastMessage: string;
  messageCount: number;
}

interface Message {
  id: string;
  from: string;
  fromName: string;
  body: string;
  timestamp: number;
  date: string;
  type: string;
  isGroup: boolean;
}



const WhatsApp = () => {
  const { user, logout } = useAuth();
  const userId = user?.uid || '';
  const navigate = useNavigate();

  // API Connection States
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [messagesCount, setMessagesCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);

  // Bot States
  const [botEnabled, setBotEnabled] = useState(true);
  const [botPrompt, setBotPrompt] = useState('Você é um assistente virtual. Seja sempre cordial e prestativo.');

  // First Contact States
  const [firstContactEnabled, setFirstContactEnabled] = useState(true);
  const [firstContactMessage, setFirstContactMessage] = useState('Olá! 👋 Bem-vindo! Como posso ajudar você hoje?');
  const [firstContactMedia, setFirstContactMedia] = useState<MediaItem[]>([]);

  // Rules States
  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState({ keyword: '', response: '' });

  // Contacts States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactMessages, setContactMessages] = useState<Message[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Adicione após os outros estados
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);

  // Adicione após a função loadContactMessages
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders?userId=${userId}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Função para atualizar status do pedido
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId, status: newStatus })
      });

      if (response.ok) {
        toast.success('Status atualizado!');
        loadOrders(); // Recarregar pedidos
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Função para aprovar pagamento PIX
  const approvePixPayment = async (orderId: string) => {
    setApprovingOrder(orderId);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/approve-pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pagamento PIX aprovado! Cliente notificado.');
        loadOrders(); // Recarregar pedidos
      } else {
        toast.error(data.error || 'Erro ao aprovar pagamento');
      }
    } catch (error) {
      console.error('Erro ao aprovar PIX:', error);
      toast.error('Erro ao aprovar pagamento');
    } finally {
      setApprovingOrder(null);
    }
  };

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Desconectado com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao desconectar da conta');
    }
  };

  // Função para deletar pedido permanentemente
  const deleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja deletar este pedido permanentemente?')) return;

    setDeletingOrder(orderId);
    try {
      // Deletar diretamente do Firebase
      const orderRef = ref(database, `users/${userId}/whatsapp/orders/${orderId}`);
      await set(orderRef, null);

      toast.success('Pedido deletado!');
      loadOrders(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      toast.error('Erro ao deletar pedido');
    } finally {
      setDeletingOrder(null);
    }
  };

  // Função para formatar valor
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para cor do status
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-green-500',
      delivered: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  // Função para traduzir status
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      delivered: 'Entregue'
    };
    return labels[status] || status;
  };

  const stats = {
    messagesReceived: messagesCount,
    messagesSent: Math.floor(messagesCount * 0.7),
    activeConversations: contactsCount,
    avgResponseTime: '2.3 min'
  };

  // Check WhatsApp Status
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status?userId=${userId}`);
      const data = await response.json();
      setIsConnected(data.connected);
      setMessagesCount(data.messagesCount || 0);
      setContactsCount(data.contactsCount || 0);
      setBotEnabled(data.botEnabled !== undefined ? data.botEnabled : true);
      if (data.connected) {
        setQrCode(null);
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setConnectionLoading(false);
    }
  }, [userId]);

  // Check QR Code
  const checkQRCode = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/qr?userId=${userId}`);
      const data = await response.json();

      if (data.connected) {
        setIsConnected(true);
        setQrCode(null);
        setIsConnecting(false);
        toast.success('WhatsApp conectado com sucesso!');
      } else if (data.qrCode) {
        setQrCode(data.qrCode);
        setTimeout(checkQRCode, 3000);
      } else {
        setTimeout(checkQRCode, 3000);
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error);
      setIsConnecting(false);
      toast.error('Erro ao buscar QR Code');
    }
  }, [userId]);

  // Connect to WhatsApp
  const connectWhatsApp = async () => {
    setIsConnecting(true);
    setQrCode(null);

    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        toast.info('Gerando QR Code...');
        checkQRCode();
      } else {
        toast.error('Erro ao conectar');
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast.error('Erro ao conectar ao WhatsApp');
      setIsConnecting(false);
    }
  };

  // Disconnect WhatsApp
  const disconnectWhatsApp = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(false);
        setQrCode(null);
        toast.success('WhatsApp desconectado com sucesso!');
      } else {
        toast.error('Erro ao desconectar');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar WhatsApp');
    }
  };

  // Toggle Bot
  const toggleBot = async () => {
    if (!userId) {
      toast.error('Usuário não identificado');
      return;
    }
    const newState = !botEnabled;

    try {
      const response = await fetch(`${API_BASE_URL}/bot/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, enabled: newState })
      });

      const data = await response.json();

      if (data.success) {
        setBotEnabled(newState);
        await set(ref(database, `users/${userId}/whatsapp/config/botEnabled`), newState);
        toast.success(newState ? 'Bot ativado!' : 'Bot desativado!');
      }
    } catch (error) {
      toast.error('Erro ao alterar estado do bot');
    }
  };

  // Upload Media to Firebase
  const uploadMediaToFirebase = async (file: File): Promise<string> => {
    const mediaRef = storageRef(storage, `whatsapp/${userId}/${Date.now()}_${file.name}`);
    await uploadBytes(mediaRef, file);
    return await getDownloadURL(mediaRef);
  };

  // Handle File Upload
  const handleFileUpload = async (files: FileList | null, target: 'firstContact') => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const maxSize = 16 * 1024 * 1024; // 16MB

    if (file.size > maxSize) {
      toast.error('Arquivo muito grande! Máximo 16MB');
      return;
    }

    toast.info('Fazendo upload...');

    try {
      const url = await uploadMediaToFirebase(file);

      const mediaItem: MediaItem = {
        type: 'url',
        mimetype: file.type,
        url: url,
        filename: file.name,
        preview: url
      };

      if (target === 'firstContact') {
        setFirstContactMedia([...firstContactMedia, mediaItem]);
      }

      toast.success('Upload concluído!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload');
    }
  };

  // Remove Media
  const removeMedia = (index: number, target: 'firstContact') => {
    if (target === 'firstContact') {
      setFirstContactMedia(firstContactMedia.filter((_, i) => i !== index));
    }
  };

  // Load Contacts
  const loadContacts = async () => {
    if (!isConnected) {
      toast.error('WhatsApp não está conectado!');
      return;
    }

    setLoadingContacts(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contacts?userId=${userId}`);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Load Contact Messages
  const loadContactMessages = async (contact: Contact) => {
    setSelectedContact(contact);
    setLoadingMessages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages?userId=${userId}&from=${contact.number}`);
      const data = await response.json();
      setContactMessages(data.messages || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Save Config
  const saveConfig = async () => {
    if (!userId) {
      toast.error('Usuário não identificado');
      return;
    }
    try {
      await set(ref(database, `users/${userId}/whatsapp/config`), {
        botEnabled,
        botPrompt,
        firstContact: {
          enabled: firstContactEnabled,
          message: firstContactMessage,
          media: firstContactMedia
        }
      });
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    }
  };

  // Add Rule
  const addRule = async () => {
    if (!userId) {
      toast.error('Usuário não identificado');
      return;
    }
    if (!newRule.keyword || !newRule.response) {
      toast.error('Preencha todos os campos');
      return;
    }
    const id = Date.now().toString();
    const rule = { ...newRule, active: true, id };
    setRules([...rules, rule]);
    await set(ref(database, `users/${userId}/whatsapp/rules/${id}`), rule);
    setNewRule({ keyword: '', response: '' });
    toast.success('Regra adicionada!');
  };

  // Toggle Rule
  const toggleRule = async (id: string) => {
    if (!userId) return;
    const updatedRules = rules.map(r =>
      r.id === id ? { ...r, active: !r.active } : r
    );
    setRules(updatedRules);
    const rule = updatedRules.find(r => r.id === id);
    if (rule) {
      await set(ref(database, `users/${userId}/whatsapp/rules/${id}`), rule);
    }
  };

  // Delete Rule
  const deleteRule = async (id: string) => {
    if (!userId) return;
    setRules(rules.filter(r => r.id !== id));
    await set(ref(database, `users/${userId}/whatsapp/rules/${id}`), null);
    toast.success('Regra removida!');
  };

  // Media Preview Component
  const MediaPreview = ({ media, onRemove }: { media: MediaItem[], onRemove: (index: number) => void }) => (
    <div className="flex flex-wrap gap-2 mt-3">
      {media.map((item, idx) => (
        <div key={idx} className="relative group">
          <div className="w-20 h-20 rounded-lg border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {item.mimetype.startsWith('image/') ? (
              <img src={item.preview || item.url} alt="preview" className="w-full h-full object-cover" />
            ) : item.mimetype.startsWith('video/') ? (
              <Video className="w-8 h-8 text-muted-foreground" />
            ) : item.mimetype.startsWith('audio/') ? (
              <Mic className="w-8 h-8 text-muted-foreground" />
            ) : (
              <FileText className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(idx)}
          >
            <X className="w-3 h-3" />
          </Button>
          <p className="text-xs text-muted-foreground mt-1 text-center truncate w-20">
            {item.filename}
          </p>
        </div>
      ))}
    </div>
  );

  // Initial status check and polling
  useEffect(() => {
    if (userId) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [checkStatus, userId]);

  // Auto-refresh de pedidos a cada 10 segundos
  useEffect(() => {
    if (isConnected && userId) {
      loadOrders(); // Carrega imediatamente
      const interval = setInterval(() => {
        loadOrders(); // Atualiza a cada 10 segundos
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isConnected, userId]);

  // Firebase config sync
  useEffect(() => {
    if (!userId) return;

    const configRef = ref(database, `users/${userId}/whatsapp/config`);
    const unsubConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.botEnabled !== undefined) setBotEnabled(data.botEnabled);
        if (data.botPrompt) setBotPrompt(data.botPrompt);
        if (data.firstContact) {
          if (data.firstContact.enabled !== undefined) setFirstContactEnabled(data.firstContact.enabled);
          if (data.firstContact.message) setFirstContactMessage(data.firstContact.message);
          if (data.firstContact.media) setFirstContactMedia(data.firstContact.media);
        }
      }
    });

    const rulesRef = ref(database, `users/${userId}/whatsapp/rules`);
    const unsubRules = onValue(rulesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const rulesArray = Object.entries(data).map(([id, rule]: [string, any]) => ({
          id,
          ...rule
        }));
        setRules(rulesArray);
      }
    });

    return () => {
      unsubConfig();
      unsubRules();
    };
  }, [userId]);


  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Painel WhatsApp</h1>
            <p className="text-muted-foreground mt-1">Configure e controle seu chatbot</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2.5 shadow-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${botEnabled && isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">{botEnabled && isConnected ? 'Online' : 'Offline'}</span>
            </div>
            <Button
              onClick={toggleBot}
              variant={botEnabled ? "destructive" : "default"}
              className="gap-2"
              disabled={!isConnected}
            >
              <Power className="w-4 h-4" />
              {botEnabled ? 'Desligar Bot' : 'Ligar Bot'}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <PowerOff className="w-4 h-4" />
              Sair da Conta
            </Button>
          </div>
        </div>

        {/* Connection Card */}
        <Card className={`border-2 ${isConnected ? 'border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/5' : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5'}`}>
          <CardContent className="p-6">
            {connectionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <span className="ml-3 text-muted-foreground">Verificando conexão...</span>
              </div>
            ) : isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Wifi className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">WhatsApp Conectado</p>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {messagesCount} mensagens • {contactsCount} contatos
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={connectWhatsApp} variant="outline" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Reconectar
                  </Button>
                  <Button onClick={disconnectWhatsApp} variant="destructive" className="gap-2">
                    <PowerOff className="w-4 h-4" />
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <WifiOff className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-foreground">WhatsApp Desconectado</p>
                        <XCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">Conecte seu WhatsApp para usar o bot</p>
                    </div>
                  </div>
                  {!isConnecting && !qrCode && (
                    <Button onClick={connectWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
                      <Phone className="w-4 h-4" />
                      Conectar WhatsApp
                    </Button>
                  )}
                </div>

                {(isConnecting || qrCode) && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-4">
                    {qrCode ? (
                      <>
                        <div className="p-4 bg-white rounded-2xl shadow-lg">
                          <QRCodeSVG value={qrCode} size={220} level="M" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-medium text-foreground flex items-center gap-2 justify-center">
                            <QrCode className="w-5 h-5 text-primary" />
                            Escaneie o QR Code com seu WhatsApp
                          </p>
                          <p className="text-sm text-muted-foreground">
                            WhatsApp → Menu → Aparelhos conectados → Conectar um aparelho
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Gerando QR Code...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Contatos</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            <TabsTrigger value="first-contact" className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">1º Contato</span>
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Prompt</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Regras</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recebidas</p>
                      <p className="text-2xl font-bold">{stats.messagesReceived}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contatos
                </CardTitle>
                <CardDescription>
                  Visualize todos os contatos e mensagens recebidas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadContacts} disabled={!isConnected || loadingContacts} className="w-full mb-4">
                  {loadingContacts ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Carregar Contatos</>
                  )}
                </Button>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Contacts List */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Contatos ({contacts.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        {contacts.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhum contato ainda</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {contacts.map((contact) => (
                              <button
                                key={contact.number}
                                onClick={() => loadContactMessages(contact)}
                                className={`w-full p-3 rounded-lg border text-left transition-colors ${selectedContact?.number === contact.number
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-muted border-border'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium truncate">{contact.name}</p>
                                    <p className="text-xs text-muted-foreground">{contact.number}</p>
                                  </div>
                                  <Badge variant="secondary">{contact.messageCount}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(contact.lastMessage).toLocaleString('pt-BR')}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Messages */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        {selectedContact ? `Chat com ${selectedContact.name}` : 'Selecione um contato'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        {!selectedContact ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Selecione um contato para ver as mensagens</p>
                          </div>
                        ) : loadingMessages ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : contactMessages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma mensagem</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {contactMessages.map((msg) => (
                              <div key={msg.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="flex items-start justify-between mb-1">
                                  <span className="font-medium text-sm">{msg.fromName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                                  </span>
                                </div>
                                <p className="text-sm">{msg.body}</p>
                                {msg.type !== 'chat' && (
                                  <Badge variant="outline" className="mt-2">
                                    {msg.type}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab - ADICIONE ESTA ABA COMPLETA */}
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" />
                      Pedidos
                    </CardTitle>
                    <CardDescription>
                      Gerencie todos os pedidos realizados pelos clientes
                    </CardDescription>
                  </div>
                  <Button onClick={loadOrders} disabled={loadingOrders} variant="outline" className="gap-2">
                    {loadingOrders ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
                    ) : (
                      <><RefreshCw className="w-4 h-4" /> Atualizar</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Nenhum pedido ainda</p>
                    <p className="text-sm">Os pedidos realizados aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.map((order) => (
                      <Card key={order.id} className="overflow-hidden border-2">
                        <CardHeader className="pb-3 bg-muted/30">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">Pedido #{order.id.slice(-6)}</CardTitle>
                              <CardDescription className="text-xs mt-1 space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3 h-3" />
                                  <span className="font-medium">{order.contactName || 'Cliente'}</span>
                                  <span className="text-muted-foreground">• {order.contactNumber}</span>
                                </div>
                                <div>{new Date(order.date).toLocaleString('pt-BR')}</div>
                                {order.paymentMethod && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium">💳 {order.paymentMethod}</span>
                                    {order.paymentMethod === 'PIX' && !order.paymentApproved && (
                                      <Badge variant="destructive" className="text-xs">Aguardando Aprovação</Badge>
                                    )}
                                    {order.paymentMethod === 'PIX' && order.paymentApproved && (
                                      <Badge variant="default" className="text-xs bg-green-600">✓ Aprovado</Badge>
                                    )}
                                  </div>
                                )}
                              </CardDescription>
                            </div>
                            <Badge className={`${getStatusColor(order.status)} text-white`}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          {/* Cliente */}
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{order.contactNumber}</span>
                          </div>

                          {/* Items */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Itens:</p>
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm bg-muted/50 p-2 rounded">
                                <span>{item.quantidade}x {item.nome}</span>
                                <span className="font-medium">{formatPrice(item.preco)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Observações */}
                          {order.observacoes && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2 rounded">
                              <p className="text-xs font-medium text-amber-800 dark:text-amber-400 mb-1">Observações:</p>
                              <p className="text-xs text-amber-700 dark:text-amber-300">{order.observacoes}</p>
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-semibold text-lg">Total:</span>
                            <span className="font-bold text-xl text-primary">{formatPrice(order.total)}</span>
                          </div>

                          {/* Actions */}
                          {/* Actions */}
                          {/* Actions */}
                          <div className="flex flex-col gap-2 pt-2">
                            {/* Botão de aprovar PIX */}
                            {order.status === 'pending' &&
                              order.paymentMethod === 'PIX' &&
                              !order.paymentApproved && (
                                <Button
                                  size="sm"
                                  onClick={() => approvePixPayment(order.id)}
                                  disabled={approvingOrder === order.id}
                                  className="w-full gap-1 bg-orange-600 hover:bg-orange-700"
                                >
                                  {approvingOrder === order.id ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Aprovando...</>
                                  ) : (
                                    <>🏦 Aprovar Pagamento PIX</>
                                  )}
                                </Button>
                              )}

                            {/* Botão iniciar preparo */}
                            {order.status === 'pending' &&
                              (order.paymentMethod !== 'PIX' || order.paymentApproved) && (
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(order.id, 'preparing')}
                                  className="w-full gap-1"
                                >
                                  Iniciar Preparo
                                </Button>
                              )}

                            {order.status === 'preparing' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                                variant="default"
                                className="w-full gap-1 bg-green-600 hover:bg-green-700"
                              >
                                Marcar Pronto
                              </Button>
                            )}

                            {order.status === 'ready' && (
                              <Button
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                variant="secondary"
                                className="w-full gap-1"
                              >
                                Marcar Entregue
                              </Button>
                            )}

                            {order.status === 'delivered' && (
                              <Badge variant="secondary" className="w-full justify-center py-2">
                                ✅ Pedido Concluído
                              </Badge>
                            )}

                            {/* BOTÃO DELETAR - APARECE EM TODOS OS STATUS */}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteOrder(order.id)}
                              disabled={deletingOrder === order.id}
                              className="w-full gap-1 mt-1"
                            >
                              {deletingOrder === order.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Deletando...</>
                              ) : (
                                <><Trash2 className="w-4 h-4" /> Deletar Pedido</>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* First Contact Tab */}
          <TabsContent value="first-contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Mensagem de Primeiro Contato
                </CardTitle>
                <CardDescription>
                  Configure a mensagem automática enviada quando alguém fala com você pela primeira vez
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="first-enabled">Ativar Primeiro Contato</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem automática para novos contatos
                    </p>
                  </div>
                  <Switch
                    id="first-enabled"
                    checked={firstContactEnabled}
                    onCheckedChange={setFirstContactEnabled}
                  />
                </div>

                <div>
                  <Label htmlFor="first-message">Mensagem</Label>
                  <Textarea
                    id="first-message"
                    placeholder="Olá! 👋 Bem-vindo..."
                    value={firstContactMessage}
                    onChange={(e) => setFirstContactMessage(e.target.value)}
                    rows={4}
                    disabled={!firstContactEnabled}
                  />
                </div>

                <div>
                  <Label>Adicionar Mídia ao Primeiro Contato</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('first-file')?.click()}
                      disabled={!firstContactEnabled}
                      className="gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Imagem
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('first-video')?.click()}
                      disabled={!firstContactEnabled}
                      className="gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Vídeo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('first-audio')?.click()}
                      disabled={!firstContactEnabled}
                      className="gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      Áudio
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('first-doc')?.click()}
                      disabled={!firstContactEnabled}
                      className="gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Documento
                    </Button>
                  </div>
                  <input
                    id="first-file"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'firstContact')}
                  />
                  <input
                    id="first-video"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'firstContact')}
                  />
                  <input
                    id="first-audio"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'firstContact')}
                  />
                  <input
                    id="first-doc"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files, 'firstContact')}
                  />
                  {firstContactMedia.length > 0 && <MediaPreview media={firstContactMedia} onRemove={(idx) => removeMedia(idx, 'firstContact')} />}
                </div>

                <Button onClick={saveConfig} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Salvar Configuração
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompt Tab */}
          <TabsContent value="prompt" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Prompt do Bot
                </CardTitle>
                <CardDescription>
                  Configure a personalidade e instruções do seu chatbot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Instruções do Bot</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Você é um assistente..."
                    value={botPrompt}
                    onChange={(e) => setBotPrompt(e.target.value)}
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Defina como o bot deve se comportar, seu tom de voz e área de atuação
                  </p>
                </div>

                <Button onClick={saveConfig} className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Salvar Prompt
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Regras de Resposta
                </CardTitle>
                <CardDescription>
                  Crie respostas automáticas baseadas em palavras-chave
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="keyword">Palavra-chave</Label>
                    <Input
                      id="keyword"
                      placeholder="Ex: preço, cardápio, horário"
                      value={newRule.keyword}
                      onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="response">Resposta Automática</Label>
                    <Textarea
                      id="response"
                      placeholder="Digite a resposta que será enviada..."
                      value={newRule.response}
                      onChange={(e) => setNewRule({ ...newRule, response: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button onClick={addRule} className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    Adicionar Regra
                  </Button>
                </div>

                <div className="space-y-2 mt-6">
                  <Label>Regras Ativas</Label>
                  {rules.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma regra configurada</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rules.map((rule) => (
                        <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg">
                          <Switch
                            checked={rule.active}
                            onCheckedChange={() => toggleRule(rule.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{rule.keyword}</p>
                            <p className="text-xs text-muted-foreground truncate">{rule.response}</p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WhatsApp;