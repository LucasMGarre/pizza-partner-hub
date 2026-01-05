import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  MessageSquare,
  ShoppingBag,
  Power,
  Phone,
  CheckCircle,
  XCircle,
  Users,
  TrendingUp,
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  PowerOff,
  Clock,
  Package,
  DollarSign,
  Activity
} from 'lucide-react';
import { database } from '@/lib/firebase';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE_URL = 'http://localhost:3001';
// const API_BASE_URL = 'https://routineapp.com.br';

interface Contact {
  number: string;
  name: string;
  firstContact: string;
  lastMessage: string;
  messageCount: number;
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

  // Contacts States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Orders States
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [approvingOrder, setApprovingOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false); 

  // Human Help States
  const [humanHelpRequests, setHumanHelpRequests] = useState<any[]>([]);
  const [loadingHelpRequests, setLoadingHelpRequests] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState<string | null>(null);

  // Stats calculados
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;

  // ADICIONE ESTAS LINHAS:
  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const displayOrders = showCompleted ? deliveredOrders : activeOrders;

  // Load Contacts
  const loadContacts = async () => {
    if (!isConnected) return;
    // Remove o setLoadingContacts para não mostrar loading durante auto-refresh
    try {
      const response = await fetch(`${API_BASE_URL}/contacts?userId=${userId}`);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
    }
  };

  // Load Orders
  const loadOrders = async () => {
    if (!isConnected) return;
    // Remove o setLoadingOrders para não mostrar loading durante auto-refresh
    try {
      const response = await fetch(`${API_BASE_URL}/orders?userId=${userId}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  // Load Human Help Requests
  const loadHumanHelpRequests = async () => {
    if (!isConnected) return;
    try {
      const response = await fetch(`${API_BASE_URL}/human-help?userId=${userId}`);
      const data = await response.json();
      setHumanHelpRequests(data.requests || []);
    } catch (error) {
      console.error('Erro ao carregar solicitações de ajuda:', error);
    }
  };

  // Resolve Human Help Request
  const resolveHelpRequest = async (requestId: string) => {
    setResolvingRequest(requestId);
    try {
      const response = await fetch(`${API_BASE_URL}/human-help/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, requestId })
      });

      if (response.ok) {
        toast.success('Solicitação marcada como resolvida!');
        loadHumanHelpRequests();
      }
    } catch (error) {
      console.error('Erro ao resolver solicitação:', error);
      toast.error('Erro ao resolver solicitação');
    } finally {
      setResolvingRequest(null);
    }
  };

  // Update Order Status - Simplified (apenas para marcar como entregue)
  const markAsDelivered = async (orderId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orderId, status: 'delivered' })
      });

      if (response.ok) {
        toast.success('Pedido marcado como entregue!');
        loadOrders();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  // Approve PIX Payment
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
        toast.success('Pagamento PIX aprovado!');
        loadOrders();
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

  // Delete Order
  const deleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja deletar este pedido permanentemente?')) return;

    setDeletingOrder(orderId);
    try {
      const { ref, set } = await import('firebase/database');
      const orderRef = ref(database, `users/${userId}/whatsapp/orders/${orderId}`);
      await set(orderRef, null);

      toast.success('Pedido deletado!');
      loadOrders();
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      toast.error('Erro ao deletar pedido');
    } finally {
      setDeletingOrder(null);
    }
  };

  // Format Price
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Status Color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-green-500',
      delivered: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  // Status Label
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivered: 'Entregue'
    };
    return labels[status] || status;
  };

  // Logout
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

  // Check Status
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

  // Connect WhatsApp
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
        toast.success('WhatsApp desconectado!');
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
        const { ref, set } = await import('firebase/database');
        await set(ref(database, `users/${userId}/whatsapp/config/botEnabled`), newState);
        toast.success(newState ? 'Bot ativado!' : 'Bot desativado!');
      }
    } catch (error) {
      toast.error('Erro ao alterar estado do bot');
    }
  };

  // Initial check and polling
  useEffect(() => {
    if (userId) {
      checkStatus();
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [checkStatus, userId]);

  // Auto-load data when connected
  useEffect(() => {
    if (isConnected && userId) {
      loadContacts();
      loadOrders();
      loadHumanHelpRequests();

      // ⏰ AUMENTADO: 30 segundos (ao invés de 10)
      const interval = setInterval(async () => {
        try {
          // 🔄 SEQUENCIAL: Uma por vez para não sobrecarregar
          const contactsRes = await fetch(`${API_BASE_URL}/contacts?userId=${userId}`);
          const contactsData = await contactsRes.json();

          // Pequeno delay entre requisições
          await new Promise(resolve => setTimeout(resolve, 500));

          const ordersRes = await fetch(`${API_BASE_URL}/orders?userId=${userId}`);
          const ordersData = await ordersRes.json();

          await new Promise(resolve => setTimeout(resolve, 500));

          const helpRes = await fetch(`${API_BASE_URL}/human-help?userId=${userId}`);
          const helpData = await helpRes.json();

          // Atualizar apenas se houver mudanças
          const newContacts = contactsData.contacts || [];
          const newOrders = ordersData.orders || [];
          const newHelp = helpData.requests || [];

          // Comparação simples por length (mais performático)
          if (newContacts.length !== contacts.length) {
            setContacts(newContacts);
          }

          if (newOrders.length !== orders.length) {
            setOrders(newOrders);
          }

          if (newHelp.length !== humanHelpRequests.length) {
            setHumanHelpRequests(newHelp);
          }

        } catch (error) {
          // Silenciar erros de refresh para não logar no console
        }
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    }
  }, [isConnected, userId, contacts.length, orders.length, humanHelpRequests.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Painel WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">Gerencie seu bot e pedidos</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-card border-2 border-border rounded-xl px-4 py-2.5 shadow-lg">
              <div className={`w-3 h-3 rounded-full ${botEnabled && isConnected ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500'}`} />
              <span className="text-sm font-semibold">{botEnabled && isConnected ? 'Online' : 'Offline'}</span>
            </div>
            <Button
              onClick={toggleBot}
              variant={botEnabled ? "destructive" : "default"}
              className="gap-2 shadow-lg"
              disabled={!isConnected}
            >
              <Power className="w-4 h-4" />
              {botEnabled ? 'Desligar' : 'Ligar'}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="gap-2 border-2 hover:bg-destructive hover:text-white hover:border-destructive shadow-lg"
            >
              <PowerOff className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Connection Card */}
        <Card className={`border-2 shadow-xl transition-all duration-300 ${isConnected
            ? 'border-green-500/50 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent'
            : 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent'
          }`}>
          <CardContent className="p-6">
            {connectionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground font-medium">Verificando conexão...</span>
              </div>
            ) : isConnected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <Wifi className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-bold text-foreground">WhatsApp Conectado</p>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {messagesCount} mensagens • {contactsCount} contatos
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={connectWhatsApp} variant="outline" className="gap-2 border-2">
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
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <WifiOff className="w-8 h-8 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-foreground">WhatsApp Desconectado</p>
                        <XCircle className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Conecte para usar o bot</p>
                    </div>
                  </div>
                  {!isConnecting && !qrCode && (
                    <Button onClick={connectWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg">
                      <Phone className="w-4 h-4" />
                      Conectar
                    </Button>
                  )}
                </div>

                {(isConnecting || qrCode) && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    {qrCode ? (
                      <>
                        <div className="p-6 bg-white rounded-3xl shadow-2xl">
                          <QRCodeSVG value={qrCode} size={240} level="M" />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="font-semibold text-foreground flex items-center gap-2 justify-center text-lg">
                            <QrCode className="w-6 h-6 text-primary" />
                            Escaneie o QR Code
                          </p>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar um aparelho
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-muted-foreground font-medium">Gerando QR Code...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dashboard Stats */}
        {isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Mensagens</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{messagesCount}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>



            <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{formatPrice(totalRevenue)}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pedidos Ativos</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{pendingOrders}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                    <Activity className="w-7 h-7 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Human Help Requests */}
        {isConnected && humanHelpRequests.filter(r => !r.resolved).length > 0 && (
          <Card className="border-2 border-red-500/50 bg-gradient-to-br from-red-500/10 to-transparent shadow-xl animate-pulse">
            <CardHeader className="border-b bg-red-500/10 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center animate-bounce">
                    <Phone className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-red-600 dark:text-red-400">🆘 Solicitações de Atendimento Humano</CardTitle>
                    <CardDescription className="text-xs text-red-600/80 dark:text-red-400/80">
                      {humanHelpRequests.filter(r => !r.resolved).length} pessoa{humanHelpRequests.filter(r => !r.resolved).length !== 1 ? 's' : ''} aguardando atendimento
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadHumanHelpRequests}
                  disabled={loadingHelpRequests}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingHelpRequests ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {humanHelpRequests
                  .filter(r => !r.resolved)
                  .map((request, idx) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-all duration-200"
                      style={{
                        animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                              <Phone className="w-4 h-4 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-foreground truncate">{request.contactName}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.contactNumber}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                            <Clock className="w-3 h-3" />
                            {new Date(request.requestedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(request.requestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              size="sm"
                              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                const phoneNumber = request.contactNumber.replace(/[^\d]/g, '');
                                window.open(`https://wa.me/${phoneNumber}`, '_blank');
                              }}
                            >
                              <MessageSquare className="w-4 h-4" />
                              Atender no WhatsApp
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveHelpRequest(request.id)}
                              disabled={resolvingRequest === request.id}
                              className="gap-2 border-green-500/50 hover:bg-green-500 hover:text-white"
                            >
                              {resolvingRequest === request.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Resolvendo...</>
                              ) : (
                                <><CheckCircle className="w-4 h-4" /> Marcar como Resolvido</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts Strip */}
        {isConnected && (
          <Card className="border-2 shadow-xl">
            <CardHeader className="border-b bg-muted/30 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Contatos</CardTitle>
                    <CardDescription className="text-xs">
                      {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadContacts}
                  disabled={loadingContacts}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingContacts ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground">Aguardando contatos...</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {contacts.map((contact, idx) => (
                    <div
                      key={contact.number}
                      className="min-w-[200px] p-3 rounded-xl border-2 border-border bg-card hover:bg-muted/50 transition-all duration-200"
                      style={{
                        animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{contact.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{contact.number}</p>
                        </div>
                        <div className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-bold ml-2">
                          {contact.messageCount}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(contact.lastMessage).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {new Date(contact.lastMessage).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders Grid */}
        {isConnected && (
          <Card className="border-2 shadow-xl">
            <CardHeader className="border-b bg-muted/30 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Pedidos {showCompleted ? 'Concluídos' : 'Ativos'}</CardTitle>
                    <CardDescription className="text-xs">
                      {showCompleted
                        ? `${deliveredOrders.length} concluído${deliveredOrders.length !== 1 ? 's' : ''}`
                        : `${activeOrders.length} ativo${activeOrders.length !== 1 ? 's' : ''}`
                      }
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={showCompleted ? "default" : "outline"}
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="gap-2"
                  >
                    {showCompleted ? (
                      <>
                        <Activity className="w-4 h-4" />
                        Ver Ativos
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Ver Concluídos
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={loadOrders}
                    disabled={loadingOrders}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : displayOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="font-medium text-muted-foreground">
                    {showCompleted ? 'Nenhum pedido concluído' : 'Nenhum pedido ativo'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {showCompleted ? 'Pedidos entregues aparecerão aqui' : 'Os novos pedidos aparecerão aqui'}
                  </p>
                </div>
              ) : (
                <div className="max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {displayOrders.map((order, idx) => (
                      <Card
                        key={order.id}
                        className="border-2 hover:shadow-lg transition-all duration-300"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${idx * 0.03}s both`
                        }}
                      >
                        <CardHeader className="pb-2 bg-muted/20 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="text-base font-bold">#{order.id.slice(-6)}</CardTitle>
                            <div className={`${getStatusColor(order.status)} text-white px-2.5 py-1 rounded-full text-xs font-bold`}>
                              {getStatusLabel(order.status)}
                            </div>
                          </div>
                          <CardDescription className="text-xs space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span className="font-semibold truncate">{order.contactName || 'Cliente'}</span>
                            </div>
                            <div className="text-muted-foreground">
                              {new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(order.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="p-3 space-y-2">
                          {/* Payment Method */}
                          {order.paymentMethod && (
                            <div className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                              <span className="font-medium">💳 {order.paymentMethod}</span>
                              {order.paymentMethod === 'PIX' && !order.paymentApproved && (
                                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Pendente</span>
                              )}
                              {order.paymentMethod === 'PIX' && order.paymentApproved && (
                                <span className="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">✓</span>
                              )}
                            </div>
                          )}

                          {/* Items */}
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase">Itens:</p>
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm bg-muted/30 p-2 rounded">
                                <span className="font-medium truncate">{item.quantidade}x {item.nome}</span>
                                <span className="font-bold text-primary ml-1 shrink-0">{formatPrice(item.preco)}</span>
                              </div>
                            ))}
                          </div>

                          {/* Observations */}
                          {order.observacoes && (
                            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-1.5 rounded">
                              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400">📝 Obs:</p>
                              <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-2">{order.observacoes}</p>
                            </div>
                          )}

                          {/* Total */}
                          <div className="flex justify-between items-center pt-1 border-t">
                            <span className="font-bold text-sm">Total:</span>
                            <span className="font-bold text-xl text-primary">{formatPrice(order.total)}</span>
                          </div>

                          {/* Actions - SIMPLIFICADO */}
                          <div className="flex flex-col gap-1.5 pt-1">
                            {/* Approve PIX - apenas para pendentes com PIX */}
                            {order.status === 'pending' && order.paymentMethod === 'PIX' && !order.paymentApproved && (
                              <Button
                                size="sm"
                                onClick={() => approvePixPayment(order.id)}
                                disabled={approvingOrder === order.id}
                                className="w-full gap-1.5 text-sm h-9 bg-orange-600 hover:bg-orange-700"
                              >
                                {approvingOrder === order.id ? (
                                  <><Loader2 className="w-4 h-4 animate-spin" /> Aprovando...</>
                                ) : (
                                  <>🏦 Aprovar PIX</>
                                )}
                              </Button>
                            )}

                            {/* Mark as Delivered - apenas para pedidos ativos */}
                            {order.status !== 'delivered' && (
                              <Button
                                size="sm"
                                onClick={() => markAsDelivered(order.id)}
                                className="w-full gap-1.5 text-sm h-9 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Marcar como Entregue
                              </Button>
                            )}

                            {/* Completed Badge - apenas para entregues */}
                            {order.status === 'delivered' && (
                              <div className="bg-green-100 dark:bg-green-950/30 border-2 border-green-500 text-green-700 dark:text-green-400 px-3 py-2.5 rounded text-center font-bold text-sm">
                                ✅ Pedido Entregue
                              </div>
                            )}

                            {/* Delete Button - sempre visível */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteOrder(order.id)}
                              disabled={deletingOrder === order.id}
                              className="w-full gap-1.5 text-sm h-8 border border-red-500/50 text-red-600 hover:bg-red-500 hover:text-white"
                            >
                              {deletingOrder === order.id ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Deletando...</>
                              ) : (
                                <>🗑️ Deletar</>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <style>{`
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `}</style>
    </div>
  );
};
export default WhatsApp;