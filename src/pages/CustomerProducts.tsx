import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Helmet } from "react-helmet";
import { ArrowLeft, Loader2, Package, Check, Flame, ShoppingBag, Filter, X, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock_quantity: number | null;
  total_sold?: number;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

type SortOption = "best-seller" | "name-asc" | "name-desc" | "price-asc" | "price-desc";
type PriceRange = "all" | "0-50" | "50-100" | "100-200" | "200+";

const priceRanges: { value: PriceRange; label: string }[] = [
  { value: "all", label: "Todos os preços" },
  { value: "0-50", label: "Até R$ 50" },
  { value: "50-100", label: "R$ 50 - R$ 100" },
  { value: "100-200", label: "R$ 100 - R$ 200" },
  { value: "200+", label: "Acima de R$ 200" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "best-seller", label: "Mais vendidos" },
  { value: "name-asc", label: "Nome (A-Z)" },
  { value: "name-desc", label: "Nome (Z-A)" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];

export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role, loading } = useAuth();
  const isMobile = useIsMobile();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [sortBy, setSortBy] = useState<SortOption>("best-seller");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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
        .select("id, name, description, price, image_url, category, stock_quantity")
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

  // Get all categories with product count
  const categoriesWithCount = useMemo(() => {
    const countMap: Record<string, number> = {};
    products.forEach((product) => {
      const category = product.category || "Geral";
      countMap[category] = (countMap[category] || 0) + 1;
    });
    return Object.entries(countMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Find the best seller globally
  const bestSellerId = useMemo(() => {
    const sorted = [...products].sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0));
    return sorted.length > 0 && (sorted[0].total_sold || 0) > 0 ? sorted[0].id : null;
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by categories
    if (selectedCategories.length > 0) {
      result = result.filter((p) => {
        const category = p.category || "Geral";
        return selectedCategories.includes(category);
      });
    }

    // Filter by price range
    if (priceRange !== "all") {
      result = result.filter((p) => {
        const price = Number(p.price);
        switch (priceRange) {
          case "0-50":
            return price <= 50;
          case "50-100":
            return price > 50 && price <= 100;
          case "100-200":
            return price > 100 && price <= 200;
          case "200+":
            return price > 200;
          default:
            return true;
        }
      });
    }

    // Sort products
    switch (sortBy) {
      case "best-seller":
        result.sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0));
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "price-asc":
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
    }

    return result;
  }, [products, selectedCategories, priceRange, sortBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange("all");
    setSortBy("best-seller");
  };

  const hasActiveFilters = selectedCategories.length > 0 || priceRange !== "all" || sortBy !== "best-seller";

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
    const selectedParam = encodeURIComponent(JSON.stringify(selectedProducts));
    navigate(`/cliente?selected=${selectedParam}`);
  };

  const totalPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);

  // Filter sidebar content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Categorias</h3>
        <div className="space-y-2">
          {categoriesWithCount.map((cat) => (
            <div key={cat.name} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.name}`}
                checked={selectedCategories.includes(cat.name)}
                onCheckedChange={() => toggleCategory(cat.name)}
              />
              <Label
                htmlFor={`cat-${cat.name}`}
                className="flex-1 cursor-pointer text-sm text-foreground"
              >
                {cat.name}
              </Label>
              <span className="text-xs text-muted-foreground">({cat.count})</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Sort By */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Ordenar por</h3>
        <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Faixa de preço</h3>
        <Select value={priceRange} onValueChange={(val) => setPriceRange(val as PriceRange)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priceRanges.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="outline" className="w-full" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        </>
      )}
    </div>
  );

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

            <div className="flex items-center gap-2">
              {/* Mobile filter button */}
              {isMobile && (
                <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                      {hasActiveFilters && (
                        <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {selectedCategories.length + (priceRange !== "all" ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {selectedProducts.length > 0 && (
                <Badge variant="default" className="gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  {selectedProducts.length}
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main className="container py-6 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
            {/* Sidebar - Desktop only */}
            {!isMobile && (
              <aside className="hidden md:block">
                <div className="sticky top-24 glass border border-border/50 rounded-xl p-4">
                  <FilterContent />
                </div>
              </aside>
            )}

            {/* Products Grid */}
            <div>
              {/* Results count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {filteredProducts.length} produto(s) encontrado(s)
                </p>
                {hasActiveFilters && !isMobile && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>

              {/* Active filters badges */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategories.map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                  {priceRange !== "all" && (
                    <Badge
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setPriceRange("all")}
                    >
                      {priceRanges.find((p) => p.value === priceRange)?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  )}
                </div>
              )}

              {filteredProducts.length === 0 ? (
                <Card className="glass border-border/50">
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum produto encontrado</p>
                    {hasActiveFilters && (
                      <Button variant="link" onClick={clearFilters} className="mt-2">
                        Limpar filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                    const selected = isProductSelected(product.id);
                    const isBestSeller = product.id === bestSellerId;
                    const isOutOfStock = product.stock_quantity === 0;
                    return (
                      <Card
                        key={product.id}
                        className={`glass overflow-hidden rounded-2xl transition-colors ${
                          isOutOfStock 
                            ? "opacity-70 border-border/30" 
                            : selected 
                              ? "border-primary bg-primary/5" 
                              : "border-border/50 hover:border-primary/50"
                        }`}
                      >
                        <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden relative">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className={`w-full h-full object-cover ${isOutOfStock ? "grayscale" : ""}`}
                            />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground" />
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                              <Badge variant="destructive" className="text-xs px-2 py-1 gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Indisponível
                              </Badge>
                            </div>
                          )}
                          {!isOutOfStock && isBestSeller && (
                            <div className="absolute top-2 left-2">
                              <Badge variant="destructive" className="text-xs px-2 py-0.5 gap-1">
                                <Flame className="h-3 w-3" />
                                Mais vendido
                              </Badge>
                            </div>
                          )}
                          {selected && !isOutOfStock && (
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
                          <div className="flex items-center justify-between">
                            <p className="text-primary font-bold text-sm">R$ {Number(product.price).toFixed(2)}</p>
                            {product.stock_quantity !== null && product.stock_quantity > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {product.stock_quantity} em estoque
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={selected ? "secondary" : "default"}
                            className="w-full"
                            onClick={() => toggleProduct(product)}
                            disabled={isOutOfStock}
                          >
                            {isOutOfStock ? "Indisponível" : selected ? "Remover" : "Adicionar"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
