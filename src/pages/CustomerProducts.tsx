import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet";
import { ArrowLeft, Loader2, Package, Plus, Check, Flame, ShoppingBag } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  total_sold?: number;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Load selected products from URL params on mount
  useEffect(() => {
    const selectedParam = searchParams.get("selected");
    if (selectedParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(selectedParam));
        if (Array.isArray(parsed)) {
          setSelectedProducts(parsed);
        }
      } catch (e) {
        console.error("Error parsing selected products:", e);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
    if (!loading && user && (role === "barber" || role === "admin")) {
      navigate("/dashboard");
    }
  }, [user, role, loading, navigate]);

  const fetchProducts = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category")
        .eq("active", true)
        .order("name");

      if (productsError) throw productsError;

      // Fetch sales count
      const { data: salesData, error: salesError } = await supabase
        .from("order_products")
        .select("product_id, quantity");

      if (salesError) {
        console.error("Error fetching sales:", salesError);
        setProducts(productsData || []);
        setLoadingProducts(false);
        return;
      }

      // Calculate total sold per product
      const salesMap: Record<string, number> = {};
      salesData?.forEach((sale) => {
        salesMap[sale.product_id] = (salesMap[sale.product_id] || 0) + sale.quantity;
      });

      const productsWithSales = (productsData || []).map((p) => ({
        ...p,
        total_sold: salesMap[p.id] || 0,
      }));

      setProducts(productsWithSales);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    products.forEach((product) => {
      const category = product.category || "Geral";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });

    // Sort products within each category by total_sold (best sellers first)
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0));
    });

    return grouped;
  }, [products]);

  const categories = useMemo(() => Object.keys(productsByCategory).sort(), [productsByCategory]);

  // Find the best seller globally
  const bestSellerId = useMemo(() => {
    const sorted = [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0));
    return sorted.length > 0 && (sorted[0].total_sold || 0) > 0 ? sorted[0].id : null;
  }, [products]);

  const toggleProduct = (product: Product) => {
    const exists = selectedProducts.find((p) => p.id === product.id);
    if (exists) {
      setSelectedProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      setSelectedProducts((prev) => [...prev, { id: product.id, name: product.name, price: product.price }]);
    }
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId);
  };

  const handleGoBack = () => {
    // Pass selected products back via URL params
    const selectedParam = encodeURIComponent(JSON.stringify(selectedProducts));
    navigate(`/cliente?selected=${selectedParam}`);
  };

  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  if (loading || loadingProducts) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Produtos - BarberBrain</title>
        <meta name="description" content="Veja todos os produtos disponíveis na BarberBrain." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-border/50">
          <div className="container flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleGoBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="font-heading text-lg font-bold text-foreground">Produtos</h1>
            </div>

            {selectedProducts.length > 0 && (
              <Badge variant="default" className="gap-1">
                <ShoppingBag className="h-3 w-3" />
                {selectedProducts.length}
              </Badge>
            )}
          </div>
        </header>

        <main className="container py-6 pb-32">
          {products.length === 0 ? (
            <Card className="glass border-border/50">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum produto disponível</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
                <div key={category}>
                  <h2 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {category}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {productsByCategory[category].map((product) => {
                      const selected = isProductSelected(product.id);
                      const isBestSeller = product.id === bestSellerId;
                      return (
                        <Card
                          key={product.id}
                          className={`glass overflow-hidden rounded-2xl transition-colors ${
                            selected ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
                          }`}
                        >
                          <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden relative">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground" />
                            )}
                            {isBestSeller && (
                              <div className="absolute top-2 left-2">
                                <Badge variant="destructive" className="text-xs px-2 py-0.5 gap-1">
                                  <Flame className="h-3 w-3" />
                                  Mais vendido
                                </Badge>
                              </div>
                            )}
                            {selected && (
                              <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3 space-y-2">
                            <h3 className="font-medium text-foreground text-sm truncate">{product.name}</h3>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                            )}
                            <p className="text-primary font-bold text-sm">R$ {Number(product.price).toFixed(2)}</p>
                            <Button
                              size="sm"
                              variant={selected ? "secondary" : "default"}
                              className="w-full"
                              onClick={() => toggleProduct(product)}
                            >
                              {selected ? "Remover" : "Adicionar"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Fixed Bottom Bar */}
        {selectedProducts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 p-4">
            <div className="container flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{selectedProducts.length} produto(s) selecionado(s)</p>
                <p className="font-bold text-foreground">Total: R$ {totalPrice.toFixed(2)}</p>
              </div>
              <Button onClick={handleGoBack} className="gap-2">
                Continuar agendamento
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
