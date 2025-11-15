import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  Euro, 
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function Insights() {
  const { user, isAuthenticated } = useAuth();

  // Get or create organization
  const { data: organization } = trpc.organizations.getOrCreate.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get properties
  const { data: properties, isLoading: propertiesLoading } = trpc.properties.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Get invoices
  const { data: invoices, isLoading: invoicesLoading } = trpc.invoices.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Get insights data
  const { data: insights, isLoading: insightsLoading } = trpc.insights.overview.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const isLoading = propertiesLoading || invoicesLoading || insightsLoading;

  // Calculate portfolio metrics
  const totalProperties = properties?.length || 0;
  const totalInvestment = properties?.reduce((sum, p) => sum + p.purchasePrice, 0) || 0;
  const totalValue = properties?.reduce((sum, p) => p.salePrice || p.purchasePrice, 0) || 0;
  const totalProfit = properties?.reduce((sum, p) => p.profit, 0) || 0;
  const averageROI = totalProperties > 0 
    ? properties!.reduce((sum, p) => sum + p.roi, 0) / totalProperties 
    : 0;

  // Calculate expense breakdown by category
  const expensesByCategory = invoices?.reduce((acc, invoice) => {
    acc[invoice.category] = (acc[invoice.category] || 0) + invoice.amount;
    return acc;
  }, {} as Record<string, number>) || {};

  // Calculate expenses by property
  const expensesByProperty = invoices?.reduce((acc, invoice) => {
    const property = properties?.find(p => p.id === invoice.propertyId);
    if (property) {
      const key = `${property.streetName} ${property.houseNumber}`;
      acc[key] = (acc[key] || 0) + invoice.amount;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  // Get best and worst performing properties
  const sortedByROI = [...(properties || [])].sort((a, b) => b.roi - a.roi);
  const bestPerformers = sortedByROI.slice(0, 3);
  const worstPerformers = sortedByROI.slice(-3).reverse();

  // Property status breakdown
  const statusCounts = properties?.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

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
      repair: "bg-orange-500",
      renovation: "bg-purple-500",
      inspection: "bg-blue-500",
      legal: "bg-red-500",
      other: "bg-gray-500",
    };
    return colors[category] || colors.other;
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
        <p className="text-muted-foreground">Please log in to view insights.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Portfolio Insights</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 bg-muted" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Portfolio Insights</h1>
        <Card className="p-12">
          <div className="text-center space-y-3">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No data yet</h3>
            <p className="text-muted-foreground">
              Add properties to see portfolio insights and analytics
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portfolio Insights</h1>
        <p className="text-muted-foreground mt-1">Analytics and performance metrics</p>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {statusCounts.owned || 0} owned, {statusCounts.sold || 0} sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Total Investment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalInvestment)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Purchase price sum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {totalProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Total Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(totalProfit))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalProfit >= 0 ? "Profit" : "Loss"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Average ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${averageROI >= 0 ? "text-green-600" : "text-red-600"}`}>
              {averageROI.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all properties
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Best & Worst Performers */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Best Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Best Performing Properties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bestPerformers.length > 0 ? (
              bestPerformers.map((property, index) => (
                <div key={property.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {property.streetName} {property.houseNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">{property.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600 flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      {property.roi.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(property.profit)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sold properties yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Worst Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Properties Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {worstPerformers.length > 0 ? (
              worstPerformers.map((property, index) => (
                <div key={property.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {property.streetName} {property.houseNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">{property.city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600 flex items-center gap-1">
                      <ArrowDownRight className="h-4 w-4" />
                      {property.roi.toFixed(1)}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(Math.abs(property.profit))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sold properties yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByCategory).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount]) => {
                    const total = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
                    const percentage = (amount / total) * 100;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{getCategoryLabel(category)}</span>
                          <span className="text-muted-foreground">
                            {formatCurrency(amount)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getCategoryColor(category)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total Expenses</span>
                    <span>
                      {formatCurrency(
                        Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No expenses recorded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* By Property */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Property</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expensesByProperty).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(expensesByProperty)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([property, amount]) => {
                    const total = Object.values(expensesByProperty).reduce((sum, val) => sum + val, 0);
                    const percentage = (amount / total) * 100;
                    return (
                      <div key={property} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate">{property}</span>
                          <span className="text-muted-foreground whitespace-nowrap ml-2">
                            {formatCurrency(amount)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(expensesByProperty).length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing top 5 of {Object.keys(expensesByProperty).length} properties
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No expenses recorded yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Property Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-3xl font-bold mb-2">{count}</div>
                <Badge className={getStatusColor(status)}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
