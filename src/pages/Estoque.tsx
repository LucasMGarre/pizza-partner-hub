import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Edit, Package, AlertTriangle } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  price: number;
}

const Estoque = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 0,
    minQuantity: 5,
    unit: 'un',
    price: 0,
  });

  useEffect(() => {
    const productsRef = ref(database, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsList = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<Product, 'id'>),
        }));
        setProducts(productsList);
      } else {
        setProducts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await update(ref(database, `products/${editingProduct.id}`), formData);
        toast.success('Produto atualizado!');
      } else {
        await push(ref(database, 'products'), formData);
        toast.success('Produto cadastrado!');
      }
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: '', quantity: 0, minQuantity: 5, unit: 'un', price: 0 });
    setEditingProduct(null);
    setIsOpen(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(ref(database, `products/${id}`));
      toast.success('Produto removido!');
    } catch (error) {
      toast.error('Erro ao remover produto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      unit: product.unit,
      price: product.price,
    });
    setIsOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.quantity <= p.minQuantity).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Estoque</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Controle de produtos e ingredientes</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-border mx-4 sm:mx-auto max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto"
                      className="bg-secondary border-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Categoria</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: Ingredientes"
                      className="bg-secondary border-border"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs sm:text-sm">Quantidade</Label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="bg-secondary border-border"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs sm:text-sm">Mín.</Label>
                    <Input
                      type="number"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-xs sm:text-sm">Unidade</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="un, kg, L"
                      className="bg-secondary border-border"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="bg-secondary border-border"
                    required
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                  {editingProduct ? 'Salvar' : 'Cadastrar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {lowStockCount > 0 && (
          <div className="glass rounded-xl sm:rounded-2xl p-3 sm:p-4 border-l-4 border-l-accent flex items-center gap-3 sm:gap-4">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-accent flex-shrink-0" />
            <div>
              <p className="text-foreground font-medium text-sm sm:text-base">Atenção ao estoque!</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {lowStockCount} {lowStockCount === 1 ? 'produto está' : 'produtos estão'} com estoque baixo
              </p>
            </div>
          </div>
        )}

        <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <div className="relative mb-4 sm:mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos..."
              className="pl-9 sm:pl-10 bg-secondary border-border"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredProducts.map((product, index) => {
              const isLowStock = product.quantity <= product.minQuantity;
              return (
                <div
                  key={product.id}
                  className={cn(
                    "glass rounded-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] animate-slide-up",
                    isLowStock && "border-l-4 border-l-accent"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl gradient-primary flex items-center justify-center">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="text-muted-foreground hover:text-primary h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        className="text-muted-foreground hover:text-destructive h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">{product.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={cn(
                        "text-xl sm:text-2xl font-bold",
                        isLowStock ? "text-accent" : "text-foreground"
                      )}>
                        {product.quantity}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground ml-1">{product.unit}</span>
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  {isLowStock && (
                    <p className="text-[10px] sm:text-xs text-accent mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Estoque baixo
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Estoque;
