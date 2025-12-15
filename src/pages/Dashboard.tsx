import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Users, Package, MessageSquare, DollarSign, TrendingUp, ShoppingBag } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    products: 0,
    messages: 0,
    revenue: 0,
  });

  useEffect(() => {
    const clientsRef = ref(database, 'clients');
    const productsRef = ref(database, 'products');

    const unsubClients = onValue(clientsRef, (snapshot) => {
      const data = snapshot.val();
      setStats(prev => ({ ...prev, clients: data ? Object.keys(data).length : 0 }));
    });

    const unsubProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      setStats(prev => ({ ...prev, products: data ? Object.keys(data).length : 0 }));
    });

    return () => {
      unsubClients();
      unsubProducts();
    };
  }, []);

  const recentActivities = [
    { id: 1, type: 'client', message: 'Novo cliente cadastrado: João Silva', time: 'há 5 min' },
    { id: 2, type: 'order', message: 'Pedido #1234 finalizado', time: 'há 15 min' },
    { id: 3, type: 'stock', message: 'Estoque de queijo atualizado', time: 'há 30 min' },
    { id: 4, type: 'chat', message: 'Nova mensagem no chatbot', time: 'há 1 hora' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do seu negócio</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Clientes"
            value={stats.clients}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Itens no Estoque"
            value={stats.products}
            icon={Package}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Mensagens Hoje"
            value={24}
            icon={MessageSquare}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Faturamento"
            value="R$ 4.580"
            icon={DollarSign}
            trend={{ value: 15, isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Atividades Recentes</h2>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Produtos Mais Vendidos</h2>
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-4">
              {[
                { name: 'Pizza Calabresa', sales: 145, percentage: 85 },
                { name: 'Pizza Margherita', sales: 120, percentage: 70 },
                { name: 'Pizza Portuguesa', sales: 98, percentage: 57 },
                { name: 'Pizza 4 Queijos', sales: 87, percentage: 51 },
              ].map((product, index) => (
                <div key={product.name} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{product.name}</span>
                    <span className="text-sm text-muted-foreground">{product.sales} vendas</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full gradient-primary rounded-full transition-all duration-1000"
                      style={{ width: `${product.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
