import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Building2, 
  Edit, 
  MapPin, 
  Calendar, 
  Euro, 
  TrendingUp, 
  TrendingDown,
  Upload,
  Trash2,
  Plus,
  Image as ImageIcon,
  ArrowLeft
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useParams, Link } from "wouter";

export default function PropertyDetail() {
  const { id } = useParams();
  const propertyId = parseInt(id || "0");
  const { isAuthenticated } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [isCashFlowDialogOpen, setIsCashFlowDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const utils = trpc.useUtils();

  // Get property details
  const { data: property, isLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: isAuthenticated && propertyId > 0 }
  );

  // Get property photos
  const { data: photos } = trpc.properties.getPhotos.useQuery(
    { propertyId },
    { enabled: isAuthenticated && propertyId > 0 }
  );

  // Get budgets
  const { data: budgets } = trpc.budgets.list.useQuery(
    { propertyId },
    { enabled: isAuthenticated && propertyId > 0 }
  );

  // Get cash flow
  const { data: cashFlows } = trpc.cashFlow.list.useQuery(
    { propertyId },
    { enabled: isAuthenticated && propertyId > 0 }
  );

  // Update property mutation
  const updateProperty = trpc.properties.update.useMutation({
    onSuccess: () => {
      toast.success("Property updated successfully!");
      setIsEditDialogOpen(false);
      utils.properties.getById.invalidate({ id: propertyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Upload photo mutation
  const uploadPhoto = trpc.properties.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded successfully!");
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      utils.properties.getPhotos.invalidate({ propertyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete photo mutation
  const deletePhoto = trpc.properties.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo deleted successfully!");
      utils.properties.getPhotos.invalidate({ propertyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Create budget mutation
  const createBudget = trpc.budgets.create.useMutation({
    onSuccess: () => {
      toast.success("Budget created successfully!");
      setIsBudgetDialogOpen(false);
      utils.budgets.list.invalidate({ propertyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Upsert cash flow mutation
  const upsertCashFlow = trpc.cashFlow.upsert.useMutation({
    onSuccess: () => {
      toast.success("Cash flow saved successfully!");
      setIsCashFlowDialogOpen(false);
      utils.cashFlow.list.invalidate({ propertyId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateProperty.mutate({
      id: propertyId,
      streetName: formData.get("streetName") as string || undefined,
      houseNumber: formData.get("houseNumber") as string || undefined,
      addition: formData.get("addition") as string || undefined,
      city: formData.get("city") as string || undefined,
      province: formData.get("province") as string || undefined,
      postalCode: formData.get("postalCode") as string || undefined,
      purchasePrice: formData.get("purchasePrice") ? Math.round(parseFloat(formData.get("purchasePrice") as string) * 100) : undefined,
      purchaseDate: formData.get("purchaseDate") ? new Date(formData.get("purchaseDate") as string) : undefined,
      salePrice: formData.get("salePrice") ? Math.round(parseFloat(formData.get("salePrice") as string) * 100) : undefined,
      saleDate: formData.get("saleDate") ? new Date(formData.get("saleDate") as string) : undefined,
      status: (formData.get("status") as "owned" | "sold" | "rented" | "reserved") || undefined,
    });
  };

  const handlePhotoUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result?.toString().split(",")[1];
      if (base64) {
        uploadPhoto.mutate({
          propertyId,
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          data: base64,
        });
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleBudgetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createBudget.mutate({
      propertyId,
      category: formData.get("category") as "repair" | "renovation" | "inspection" | "legal" | "other",
      budgetedAmount: Math.round(parseFloat(formData.get("budgetedAmount") as string) * 100),
      year: parseInt(formData.get("year") as string),
    });
  };

  const handleCashFlowSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    upsertCashFlow.mutate({
      propertyId,
      year: parseInt(formData.get("year") as string),
      month: parseInt(formData.get("month") as string),
      monthlyRent: Math.round(parseFloat(formData.get("monthlyRent") as string) * 100),
      mortgage: Math.round(parseFloat(formData.get("mortgage") as string || "0") * 100),
      propertyTax: Math.round(parseFloat(formData.get("propertyTax") as string || "0") * 100),
      insurance: Math.round(parseFloat(formData.get("insurance") as string || "0") * 100),
      maintenance: Math.round(parseFloat(formData.get("maintenance") as string || "0") * 100),
      hoaFees: Math.round(parseFloat(formData.get("hoaFees") as string || "0") * 100),
      utilities: Math.round(parseFloat(formData.get("utilities") as string || "0") * 100),
      other: Math.round(parseFloat(formData.get("other") as string || "0") * 100),
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleDateString("en-US", { month: "long" });
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to view property details.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">Property not found</p>
        <Link href="/properties">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href="/properties">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">
                {property.streetName} {property.houseNumber}
                {property.addition && ` ${property.addition}`}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {property.city}, {property.postalCode}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Property
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streetName">Street Name</Label>
                  <Input id="streetName" name="streetName" defaultValue={property.streetName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="houseNumber">House Number</Label>
                  <Input id="houseNumber" name="houseNumber" defaultValue={property.houseNumber} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addition">Addition</Label>
                  <Input id="addition" name="addition" defaultValue={property.addition || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input id="postalCode" name="postalCode" defaultValue={property.postalCode} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={property.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Input id="province" name="province" defaultValue={property.province || ""} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price (€)</Label>
                  <Input 
                    id="purchasePrice" 
                    name="purchasePrice" 
                    type="number" 
                    step="0.01" 
                    defaultValue={(property.purchasePrice / 100).toFixed(2)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input 
                    id="purchaseDate" 
                    name="purchaseDate" 
                    type="date" 
                    defaultValue={new Date(property.purchaseDate).toISOString().split('T')[0]} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price (€)</Label>
                  <Input 
                    id="salePrice" 
                    name="salePrice" 
                    type="number" 
                    step="0.01" 
                    defaultValue={property.salePrice ? (property.salePrice / 100).toFixed(2) : ""} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input 
                    id="saleDate" 
                    name="saleDate" 
                    type="date" 
                    defaultValue={property.saleDate ? new Date(property.saleDate).toISOString().split('T')[0] : ""} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={property.status}>
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
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProperty.isPending}>
                  {updateProperty.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(property.status)}>
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchase Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(property.purchasePrice)}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(property.purchaseDate)}</p>
          </CardContent>
        </Card>

        {property.salePrice && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {property.profit >= 0 ? "Profit" : "Loss"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-2 ${property.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {property.profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  {formatCurrency(Math.abs(property.profit))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">ROI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${property.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {property.roi.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Address</p>
                  <p className="font-medium">
                    {property.streetName} {property.houseNumber}
                    {property.addition && ` ${property.addition}`}, {property.postalCode} {property.city}
                    {property.province && `, ${property.province}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">{formatDate(property.purchaseDate)}</p>
                </div>
              </div>
              
              {property.saleDate && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sale Price</p>
                    <p className="font-medium">{formatCurrency(property.salePrice!)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sale Date</p>
                    <p className="font-medium">{formatDate(property.saleDate)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Property Photos</h3>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Photo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePhotoUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="photo">Select Photo</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadPhoto.isPending || !selectedFile}>
                      {uploadPhoto.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {photos && photos.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={photo.url}
                      alt={photo.filename || "Property photo"}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm truncate">{photo.filename}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this photo?")) {
                            deletePhoto.mutate({ id: photo.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No photos yet</h3>
                <p className="text-muted-foreground">Upload photos to showcase this property</p>
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Budget Tracking</h3>
            <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Budget Item</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBudgetSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="renovation">Renovation</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetedAmount">Budgeted Amount (€)</Label>
                    <Input
                      id="budgetedAmount"
                      name="budgetedAmount"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      defaultValue={new Date().getFullYear()}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBudget.isPending}>
                      {createBudget.isPending ? "Adding..." : "Add Budget"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {budgets && budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{getCategoryLabel(budget.category)}</h4>
                          <p className="text-sm text-muted-foreground">Year {budget.year}</p>
                        </div>
                        <Badge className={budget.status === "on_budget" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {budget.status === "on_budget" ? "On Budget" : "Over Budget"}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Budgeted</p>
                          <p className="font-semibold">{formatCurrency(budget.budgetedAmount)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Actual</p>
                          <p className="font-semibold">{formatCurrency(budget.actual)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Remaining</p>
                          <p className={`font-semibold ${budget.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(budget.remaining)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${budget.status === "on_budget" ? "bg-green-600" : "bg-red-600"}`}
                          style={{ width: `${Math.min((budget.actual / budget.budgetedAmount) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <Euro className="h-16 w-16 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No budgets yet</h3>
                <p className="text-muted-foreground">Create budgets to track your expenses</p>
                <Button onClick={() => setIsBudgetDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Budget
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Monthly Cash Flow</h3>
            <Dialog open={isCashFlowDialogOpen} onOpenChange={setIsCashFlowDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cash Flow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Monthly Cash Flow</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCashFlowSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        name="year"
                        type="number"
                        defaultValue={new Date().getFullYear()}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Select name="month" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <SelectItem key={m} value={m.toString()}>
                              {getMonthName(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyRent">Monthly Rent (€)</Label>
                    <Input
                      id="monthlyRent"
                      name="monthlyRent"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Expenses</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mortgage">Mortgage (€)</Label>
                        <Input id="mortgage" name="mortgage" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="propertyTax">Property Tax (€)</Label>
                        <Input id="propertyTax" name="propertyTax" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="insurance">Insurance (€)</Label>
                        <Input id="insurance" name="insurance" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maintenance">Maintenance (€)</Label>
                        <Input id="maintenance" name="maintenance" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hoaFees">HOA Fees (€)</Label>
                        <Input id="hoaFees" name="hoaFees" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="utilities">Utilities (€)</Label>
                        <Input id="utilities" name="utilities" type="number" step="0.01" defaultValue="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="other">Other (€)</Label>
                        <Input id="other" name="other" type="number" step="0.01" defaultValue="0" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCashFlowDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={upsertCashFlow.isPending}>
                      {upsertCashFlow.isPending ? "Saving..." : "Save Cash Flow"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {cashFlows && cashFlows.length > 0 ? (
            <div className="space-y-4">
              {cashFlows.map((flow) => (
                <Card key={flow.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {getMonthName(flow.month)} {flow.year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Monthly Rent</p>
                        <p className="text-lg font-semibold text-green-600">{formatCurrency(flow.monthlyRent)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-lg font-semibold text-red-600">{formatCurrency(flow.totalExpenses)}</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Net Cash Flow</p>
                        <p className={`text-xl font-bold ${flow.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(flow.netCashFlow)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Expense Breakdown</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {flow.mortgage > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Mortgage:</span>
                            <span>{formatCurrency(flow.mortgage)}</span>
                          </div>
                        )}
                        {flow.propertyTax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Property Tax:</span>
                            <span>{formatCurrency(flow.propertyTax)}</span>
                          </div>
                        )}
                        {flow.insurance > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Insurance:</span>
                            <span>{formatCurrency(flow.insurance)}</span>
                          </div>
                        )}
                        {flow.maintenance > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Maintenance:</span>
                            <span>{formatCurrency(flow.maintenance)}</span>
                          </div>
                        )}
                        {flow.hoaFees > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">HOA Fees:</span>
                            <span>{formatCurrency(flow.hoaFees)}</span>
                          </div>
                        )}
                        {flow.utilities > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Utilities:</span>
                            <span>{formatCurrency(flow.utilities)}</span>
                          </div>
                        )}
                        {flow.other > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Other:</span>
                            <span>{formatCurrency(flow.other)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center space-y-3">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No cash flow data yet</h3>
                <p className="text-muted-foreground">Track monthly income and expenses</p>
                <Button onClick={() => setIsCashFlowDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cash Flow
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Purchase Price</p>
                  <p className="text-2xl font-bold">{formatCurrency(property.purchasePrice)}</p>
                </div>
                {property.salePrice && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Price</p>
                      <p className="text-2xl font-bold">{formatCurrency(property.salePrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Profit/Loss</p>
                      <p className={`text-2xl font-bold ${property.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(property.profit))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Return on Investment</p>
                      <p className={`text-2xl font-bold ${property.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {property.roi.toFixed(2)}%
                      </p>
                    </div>
                  </>
                )}
              </div>

              {cashFlows && cashFlows.length > 0 && (
                <div className="pt-6 border-t">
                  <h4 className="font-semibold mb-4">Cash Flow Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Rent Collected</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(cashFlows.reduce((sum, f) => sum + f.monthlyRent, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(cashFlows.reduce((sum, f) => sum + f.totalExpenses, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Net Cash Flow</p>
                      <p className={`text-lg font-semibold ${cashFlows.reduce((sum, f) => sum + f.netCashFlow, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(cashFlows.reduce((sum, f) => sum + f.netCashFlow, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
