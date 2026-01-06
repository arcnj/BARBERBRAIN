import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  History,
  Loader2,
  Search,
  RefreshCw,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  price: number;
  cost_price: number | null;
  stock_quantity: number | null;
  min_stock_quantity: number | null;
  expiration_date: string | null;
  category: string | null;
  active: boolean;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  products?: { name: string };
}

export function StockTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [movementType, setMovementType] = useState<"entry" | "exit" | "adjustment">("entry");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementCost, setMovementCost] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, movementsRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .order("name"),
        supabase
          .from("stock_movements")
          .select("*, products(name)")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (movementsRes.data) setMovements(movementsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.stock_quantity !== null &&
        p.min_stock_quantity !== null &&
        p.stock_quantity <= p.min_stock_quantity
    );
  }, [products]);

  const expiringProducts = useMemo(() => {
    const today = new Date();
    return products.filter((p) => {
      if (!p.expiration_date) return false;
      const daysUntilExpiry = differenceInDays(parseISO(p.expiration_date), today);
      return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    });
  }, [products]);

  const expiredProducts = useMemo(() => {
    const today = new Date();
    return products.filter((p) => {
      if (!p.expiration_date) return false;
      return differenceInDays(parseISO(p.expiration_date), today) < 0;
    });
  }, [products]);

  const inventoryValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = p.stock_quantity || 0;
      const cost = p.cost_price || 0;
      return sum + qty * cost;
    }, 0);
  }, [products]);

  const inventorySaleValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = p.stock_quantity || 0;
      return sum + qty * p.price;
    }, 0);
  }, [products]);

  const potentialProfit = useMemo(() => {
    return inventorySaleValue - inventoryValue;
  }, [inventorySaleValue, inventoryValue]);

  const handleOpenMovement = (product: Product, type: "entry" | "exit" | "adjustment") => {
    setSelectedProduct(product);
    setMovementType(type);
    setMovementQuantity("");
    setMovementCost(type === "entry" ? (product.cost_price?.toString() || "") : "");
    setMovementNotes("");
    setMovementDialogOpen(true);
  };

  const handleSubmitMovement = async () => {
    if (!selectedProduct || !movementQuantity) return;

    setSubmitting(true);
    try {
      const qty = parseInt(movementQuantity);
      const currentStock = selectedProduct.stock_quantity || 0;
      let newStock = currentStock;

      if (movementType === "entry") {
        newStock = currentStock + qty;
      } else if (movementType === "exit") {
        newStock = currentStock - qty;
        if (newStock < 0) {
          toast({
            title: "Erro",
            description: "Quantidade insuficiente em estoque",
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      } else {
        newStock = qty;
      }

      // Create movement record
      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: selectedProduct.id,
          movement_type: movementType,
          quantity: movementType === "adjustment" ? qty - currentStock : qty,
          unit_cost: movementCost ? parseFloat(movementCost) : null,
          notes: movementNotes || null,
        });

      if (movementError) throw movementError;

      // Update product stock and cost if entry
      const updateData: Record<string, unknown> = { stock_quantity: newStock };
      if (movementType === "entry" && movementCost) {
        updateData.cost_price = parseFloat(movementCost);
      }

      const { error: productError } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", selectedProduct.id);

      if (productError) throw productError;

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso",
      });

      setMovementDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao registrar movimentação",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    field: "cost_price" | "min_stock_quantity" | "expiration_date",
    value: string
  ) => {
    try {
      let updateValue: number | string | null = null;
      if (field === "expiration_date") {
        updateValue = value || null;
      } else {
        updateValue = value ? parseFloat(value) : null;
      }

      const { error } = await supabase
        .from("products")
        .update({ [field]: updateValue })
        .eq("id", productId);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, [field]: updateValue } : p
        )
      );

      toast({ title: "Salvo", description: "Produto atualizado" });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar produto",
        variant: "destructive",
      });
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "exit":
      case "sale":
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case "entry":
        return "Entrada";
      case "exit":
        return "Saída";
      case "sale":
        return "Venda";
      case "adjustment":
        return "Ajuste";
      default:
        return type;
    }
  };

  const getExpirationBadge = (expirationDate: string | null) => {
    if (!expirationDate) return null;
    const days = differenceInDays(parseISO(expirationDate), new Date());
    if (days < 0) {
      return <Badge variant="destructive">Vencido</Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive">Vence em {days}d</Badge>;
    } else if (days <= 30) {
      return <Badge variant="secondary">Vence em {days}d</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {(lowStockProducts.length > 0 || expiredProducts.length > 0 || expiringProducts.length > 0) && (
        <div className="space-y-3">
          {expiredProducts.length > 0 && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="font-medium text-destructive">
                    {expiredProducts.length} produto(s) vencido(s): {expiredProducts.map((p) => p.name).join(", ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringProducts.length > 0 && (
            <Card className="border-orange-500 bg-orange-500/10">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <span className="font-medium text-orange-600">
                    {expiringProducts.length} produto(s) próximo(s) do vencimento: {expiringProducts.map((p) => p.name).join(", ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          {lowStockProducts.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-500/10">
              <CardContent className="py-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-600">
                    {lowStockProducts.length} produto(s) com estoque baixo: {lowStockProducts.map((p) => p.name).join(", ")}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque (Custo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Estoque (Venda)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventorySaleValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Potencial</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {potentialProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Histórico de Movimentações</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Custo Unit.</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {format(new Date(m.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{m.products?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(m.movement_type)}
                        {getMovementLabel(m.movement_type)}
                      </div>
                    </TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </TableCell>
                    <TableCell>
                      {m.unit_cost?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{m.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos em Estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Estoque Mín.</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Lucro Unit.</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const profit = product.price - (product.cost_price || 0);
                  const profitMargin = product.cost_price
                    ? ((profit / product.cost_price) * 100).toFixed(1)
                    : "-";
                  const isLowStock =
                    product.stock_quantity !== null &&
                    product.min_stock_quantity !== null &&
                    product.stock_quantity <= product.min_stock_quantity;

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                        {!product.active && (
                          <Badge variant="secondary" className="ml-2">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={isLowStock ? "destructive" : "default"}>
                          {product.stock_quantity ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          defaultValue={product.min_stock_quantity ?? ""}
                          onBlur={(e) =>
                            handleUpdateProduct(product.id, "min_stock_quantity", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 h-8"
                          defaultValue={product.cost_price ?? ""}
                          onBlur={(e) =>
                            handleUpdateProduct(product.id, "cost_price", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-green-600 font-medium">
                            {profit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          {profitMargin !== "-" && (
                            <span className="text-xs text-muted-foreground">({profitMargin}%)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="date"
                            className="w-36 h-8"
                            defaultValue={product.expiration_date || ""}
                            onBlur={(e) =>
                              handleUpdateProduct(product.id, "expiration_date", e.target.value)
                            }
                          />
                          {getExpirationBadge(product.expiration_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenMovement(product, "entry")}
                            title="Entrada"
                          >
                            <Plus className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenMovement(product, "exit")}
                            title="Saída"
                          >
                            <Minus className="h-4 w-4 text-red-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() => handleOpenMovement(product, "adjustment")}
                            title="Ajuste"
                          >
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Movement Dialog */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === "entry" && "Entrada de Estoque"}
              {movementType === "exit" && "Saída de Estoque"}
              {movementType === "adjustment" && "Ajuste de Estoque"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produto</Label>
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-sm text-muted-foreground">
                Estoque atual: {selectedProduct?.stock_quantity ?? 0}
              </p>
            </div>
            <div>
              <Label htmlFor="quantity">
                {movementType === "adjustment" ? "Novo Saldo" : "Quantidade"}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(e.target.value)}
              />
            </div>
            {movementType === "entry" && (
              <div>
                <Label htmlFor="cost">Custo Unitário</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={movementCost}
                  onChange={(e) => setMovementCost(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label htmlFor="notes">Observação</Label>
              <Textarea
                id="notes"
                value={movementNotes}
                onChange={(e) => setMovementNotes(e.target.value)}
                placeholder="Motivo da movimentação..."
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmitMovement}
              disabled={submitting || !movementQuantity}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
