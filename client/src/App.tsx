import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Invoices from "./pages/Invoices";
import Insights from "./pages/Insights";
import Team from "./pages/Team";
import Billing from "./pages/Billing";
import AdminDashboard from "./pages/AdminDashboard";

function Router() {
  return (
    <Switch>
      {/* Dashboard routes */}
      <Route path="/" component={Properties} />
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/insights" component={Insights} />
      <Route path="/team" component={Team} />
      <Route path="/billing" component={Billing} />
      <Route path="/admin" component={AdminDashboard} />
      
      {/* Fallback routes */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <DashboardLayout>
            <Router />
          </DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
