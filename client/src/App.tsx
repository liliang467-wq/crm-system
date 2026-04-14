import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import CRMLayout from "./components/CRMLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import MyClients from "./pages/MyClients";
import MyPerformance from "./pages/MyPerformance";
import MyRanking from "./pages/MyRanking";
import TeamClients from "./pages/TeamClients";
import TeamPerformance from "./pages/TeamPerformance";
import TeamRanking from "./pages/TeamRanking";
import SysUsers from "./pages/SysUsers";
import SysOrgs from "./pages/SysOrgs";
import SysChannels from "./pages/SysChannels";
import ChannelAnalytics from "./pages/ChannelAnalytics";
import { useLocation } from "wouter";
import { useEffect } from "react";

function RedirectToDefault() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/my-clients");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <CRMLayout>
      <Switch>
        <Route path="/" component={RedirectToDefault} />
        <Route path="/my-clients" component={MyClients} />
        <Route path="/my-performance" component={MyPerformance} />
        <Route path="/my-ranking" component={MyRanking} />
        <Route path="/team-clients" component={TeamClients} />
        <Route path="/team-performance" component={TeamPerformance} />
        <Route path="/team-ranking" component={TeamRanking} />
        <Route path="/sys-users" component={SysUsers} />
        <Route path="/sys-orgs" component={SysOrgs} />
        <Route path="/sys-channels" component={SysChannels} />
        <Route path="/team-channels" component={ChannelAnalytics} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </CRMLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
