import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Download, Trash2, Filter, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Invoices() {
  const { user, isAuthenticated } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterProperty, setFilterProperty] = useState<number | "all">("all");
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");
  const [isUploading, setIsUploading] = useState(false);
  const utils = trpc.useUtils();

  // Get or create organization
  const { data: organization } = trpc.organizations.getOrCreate.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get properties for dropdown
  const { data: properties } = trpc.properties.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Get invoices list
  const { data: invoices, isLoading } = trpc.invoices.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Create invoice mutation
  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      toast.success("Invoice added successfully!");
      setIsAddDialogOpen(false);
      setSelectedFile(null);
      utils.invoices.list.invalidate();
      utils.budgets.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete invoice mutation
  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Invoice deleted successfully!");
      utils.invoices.list.invalidate();
      utils.budgets.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    let fileUrl: string | undefined;
    let fileKey: string | undefined;

    let fileData: string | undefined;
    let mimeType: string | undefined;

    // Convert file to base64 if selected
    if (selectedFile) {
      try {
        setIsUploading(true);
        fileData = await fileToBase64(selectedFile);
        mimeType = selectedFile.type;
      } catch (error) {
        toast.error("Failed to process file");
        console.error(error);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const description = formData.get("description") as string;
    const category = formData.get("category") as "repair" | "renovation" | "inspection" | "legal" | "other";
    
    createInvoice.mutate({
      organizationId: organization!.id,
      propertyId: parseInt(formData.get("propertyId") as string),
      category,
      title: getCategoryLabel(category), // Use category as title
      amount: Math.round(parseFloat(formData.get("amount") as string) * 100),
      invoiceDate: new Date(formData.get("invoiceDate") as string),
      description: description || undefined,
      fileData,
      mimeType,
      filename: selectedFile?.name,
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      repair: "Repair",
      renovation: "Renovation",
      inspection: "Inspection",
      legal: "Legal",
      other: "Other",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      repair: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      renovation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      inspection: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      legal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category] || colors.other;
  };

  // Filter invoices
  const filteredInvoices = invoices?.filter((invoice) => {
    if (filterProperty !== "all" && invoice.propertyId !== filterProperty) return false;
    if (filterCategory !== "all" && invoice.category !== filterCategory) return false;
    return true;
  });

  // Calculate totals by property
  const propertyTotals = invoices?.reduce((acc, invoice) => {
    acc[invoice.propertyId] = (acc[invoice.propertyId] || 0) + invoice.amount;
    return acc;
  }, {} as Record<number, number>);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to view invoices.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices & Expenses</h1>
          <p className="text-muted-foreground mt-1">Track and manage property expenses</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyId">Property *</Label>
                <Select name="propertyId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id.toString()}>
                        {property.streetName} {property.houseNumber}, {property.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
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
                  <Label htmlFor="amount">Amount (€) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  name="invoiceDate"
                  type="date"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Optional description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Attach File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  />
                  {selectedFile && (
                    <Badge variant="secondary">{selectedFile.name}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, JPG, PNG, DOC (max 10MB)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createInvoice.isPending || isUploading}>
                  {isUploading ? "Uploading..." : createInvoice.isPending ? "Adding..." : "Add Invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices?.length || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                invoices?.filter((inv) => {
                  const date = new Date(inv.invoiceDate);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).reduce((sum, inv) => sum + inv.amount, 0) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {invoices?.filter((inv) => {
                const date = new Date(inv.invoiceDate);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties with Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(propertyTotals || {}).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              out of {properties?.length || 0} properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={filterProperty.toString()} onValueChange={(v) => setFilterProperty(v === "all" ? "all" : parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties?.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.streetName} {property.houseNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="renovation">Renovation</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {(filterProperty !== "all" || filterCategory !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterProperty("all");
                  setFilterCategory("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : filteredInvoices && filteredInvoices.length > 0 ? (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => {
            const property = properties?.find((p) => p.id === invoice.propertyId);
            return (
              <Card key={invoice.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{getCategoryLabel(invoice.category)}</h3>
                          <Badge className={getCategoryColor(invoice.category)}>
                            {getCategoryLabel(invoice.category)}
                          </Badge>
                        </div>
                        {invoice.description && (
                          <p className="text-sm text-muted-foreground mb-2">{invoice.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>
                              {property?.streetName} {property?.houseNumber}, {property?.city}
                            </span>
                          </div>
                          <span>•</span>
                          <span>{formatDate(invoice.invoiceDate)}</span>
                          {invoice.filename && (
                            <>
                              <span>•</span>
                              <a
                                href={invoice.fileUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary"
                              >
                                <Download className="h-3 w-3" />
                                {invoice.filename}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(invoice.amount)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this invoice?")) {
                            deleteInvoice.mutate({ id: invoice.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No invoices yet</h3>
            <p className="text-muted-foreground">
              {filterProperty !== "all" || filterCategory !== "all"
                ? "No invoices match your filters"
                : "Start tracking expenses by adding your first invoice"}
            </p>
            {filterProperty === "all" && filterCategory === "all" && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
