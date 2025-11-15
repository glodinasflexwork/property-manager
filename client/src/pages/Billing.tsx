import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CreditCard, Users, DollarSign, Calendar, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Billing() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [seats, setSeats] = useState(1);

  // Get or create organization
  const { data: organization } = trpc.organizations.getOrCreate.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Get subscription
  const { data: subscription, isLoading } = trpc.billing.getSubscription.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Get team members count
  const { data: teamMembers } = trpc.team.list.useQuery(
    { organizationId: organization?.id ?? 0 },
    { enabled: !!organization?.id }
  );

  // Create checkout session mutation
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to Stripe Checkout...");
        window.open(data.url, "_blank");
        setIsCheckoutDialogOpen(false);
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Create portal session mutation
  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to Billing Portal...");
        window.open(data.url, "_blank");
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Handle success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Subscription activated successfully!");
      // Clean up URL
      window.history.replaceState({}, "", "/billing");
    } else if (params.get("canceled") === "true") {
      toast.info("Checkout canceled");
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  const handleStartSubscription = () => {
    if (!organization) return;
    const seatCount = teamMembers?.length || 1;
    setSeats(seatCount);
    setIsCheckoutDialogOpen(true);
  };

  const handleCheckout = () => {
    if (!organization) return;
    createCheckout.mutate({
      organizationId: organization.id,
      seats,
    });
  };

  const handleManageBilling = () => {
    if (!organization) return;
    createPortal.mutate({
      organizationId: organization.id,
    });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "trialing":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Trial
          </Badge>
        );
      case "past_due":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Past Due
          </Badge>
        );
      case "canceled":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Canceled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Please log in to manage billing.</p>
      </div>
    );
  }

  const pricePerSeat = 1999; // $19.99 in cents
  const currentSeats = teamMembers?.length || 1;
  const monthlyTotal = (pricePerSeat * currentSeats) / 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Subscription Status */}
      {isLoading ? (
        <Card className="animate-pulse">
          <CardContent className="h-48 bg-muted" />
        </Card>
      ) : subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Per-seat monthly billing</CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Seats</p>
                  <p className="text-2xl font-bold">{subscription.seats || currentSeats}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold">{formatPrice(subscription.pricePerSeat * (subscription.seats || currentSeats))}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(subscription.pricePerSeat || pricePerSeat)} per seat</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing Date</p>
                  <p className="text-lg font-semibold">{formatDate(subscription.currentPeriodEnd)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleManageBilling} disabled={createPortal.isPending}>
                <CreditCard className="h-4 w-4 mr-2" />
                {createPortal.isPending ? "Loading..." : "Manage Billing"}
              </Button>
              <Button variant="outline" onClick={() => window.open("https://stripe.com/docs/testing#cards", "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Test Cards
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>Start your subscription to unlock all features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Property Manager Pro</h3>
                  <p className="text-sm text-muted-foreground">Per-seat monthly subscription</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatPrice(pricePerSeat)}</p>
                  <p className="text-sm text-muted-foreground">per seat/month</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">What's included:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Unlimited properties</li>
                  <li>• Invoice tracking with file uploads</li>
                  <li>• Budget and cash flow management</li>
                  <li>• Performance analytics and insights</li>
                  <li>• Team collaboration with role-based access</li>
                  <li>• Priority support</li>
                </ul>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm">Current team size:</span>
                  <span className="font-semibold">{currentSeats} {currentSeats === 1 ? "seat" : "seats"}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm">Monthly total:</span>
                  <span className="text-2xl font-bold">{formatPrice(pricePerSeat * currentSeats)}</span>
                </div>
              </div>
            </div>

            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full" onClick={handleStartSubscription}>
                  Start Subscription
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Subscription</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seats">Number of Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Based on your current team size: {currentSeats} {currentSeats === 1 ? "member" : "members"}
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Price per seat:</span>
                      <span className="font-semibold">{formatPrice(pricePerSeat)}/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Number of seats:</span>
                      <span className="font-semibold">{seats}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Monthly total:</span>
                      <span className="text-lg font-bold">{formatPrice(pricePerSeat * seats)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to Stripe Checkout to complete your subscription.
                    Use test card <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code> for testing.
                  </p>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsCheckoutDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCheckout} disabled={createCheckout.isPending}>
                      {createCheckout.isPending ? "Processing..." : "Continue to Checkout"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <p className="text-xs text-center text-muted-foreground">
              Test with card number: <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Details</CardTitle>
          <CardDescription>Flexible per-seat pricing that scales with your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold">How it works</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Pay only for active team members</li>
                  <li>• Add or remove seats anytime</li>
                  <li>• Prorated billing for changes</li>
                  <li>• Cancel anytime, no long-term commitment</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Payment & Security</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Secure payments powered by Stripe</li>
                  <li>• All major credit cards accepted</li>
                  <li>• Automatic monthly billing</li>
                  <li>• Invoices sent via email</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
