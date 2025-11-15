import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, TrendingUp, TrendingDown, Edit, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Properties() {
  const { user, isAuthenticated } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  // Get or create organization
  const { data: organization } = trpc.organizations.getOrCreate.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get properties list
  const { data: properties, isLoading } = trpc.properties.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Create property mutation
  const createProperty = trpc.properties.create.useMutation({
    onSuccess: () => {
      toast.success("Property added successfully!");
      setIsAddDialogOpen(false);
      utils.properties.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createProperty.mutate({
      organizationId: organization!.id,
      streetName: formData.get("streetName") as string,
      houseNumber: formData.get("houseNumber") as string,
      addition: formData.get("addition") as string || undefined,
      city: formData.get("city") as string,
      province: formData.get("province") as string || undefined,
      postalCode: formData.get("postalCode") as string,
      purchasePrice: Math.round(parseFloat(formData.get("purchasePrice") as string) * 100),
      purchaseDate: new Date(formData.get("purchaseDate") as string),
      status: (formData.get("status") as "owned" | "sold" | "rented" | "reserved") || "owned",
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "owned":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "sold":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rented":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "reserved":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to view properties.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground mt-1">Manage your real estate portfolio</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streetName">Street Name *</Label>
                  <Input id="streetName" name="streetName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">House Number *</Label>
                  <Input id="houseNumber" name="houseNumber" required />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addition">Addition</Label>
                  <Input id="addition" name="addition" placeholder="A, B, bis..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input id="postalCode" name="postalCode" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" name="city" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input id="province" name="province" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (€) *</Label>
                  <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date *</Label>
                  <Input id="purchaseDate" name="purchaseDate" type="date" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select name="status" defaultValue="owned">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProperty.isPending}>
                  {createProperty.isPending ? "Adding..." : "Add Property"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-32 bg-muted" />
              <CardContent className="space-y-2 pt-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties && properties.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Building2 className="h-10 w-10 text-primary" />
                    <Badge className={getStatusColor(property.status)}>
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">
                    {property.streetName} {property.houseNumber}
                    {property.addition && ` ${property.addition}`}
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 mr-1" />
                    {property.city}, {property.postalCode}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Purchase Price</p>
                      <p className="font-semibold">{formatCurrency(property.purchasePrice)}</p>
                    </div>
                    {property.salePrice && (
                      <div>
                        <p className="text-muted-foreground">Sale Price</p>
                        <p className="font-semibold">{formatCurrency(property.salePrice)}</p>
                      </div>
                    )}
                  </div>
                  
                  {property.salePrice && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {property.profit >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium">
                            {property.profit >= 0 ? "Profit" : "Loss"}
                          </span>
                        </div>
                        <span className={`font-semibold ${property.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(Math.abs(property.profit))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">ROI</span>
                        <span className={`font-semibold ${property.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {property.roi.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Building2 className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No properties yet</h3>
            <p className="text-muted-foreground">Get started by adding your first property</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
