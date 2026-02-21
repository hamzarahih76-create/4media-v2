import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, RoleBasedRedirect } from "@/components/layout/ProtectedRoute";
import { ClientMonthWrapper } from "@/components/layout/ClientMonthWrapper";
import { PersistentNotificationToast } from "@/components/notifications/PersistentNotificationToast";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientManagement from "./pages/ClientManagement";
import Team from "./pages/Team";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Finance from "./pages/Finance";
import EditorDashboard from "./pages/EditorDashboard";
import EditorProfile from "./pages/editor/EditorProfile";
import EditorSupport from "./pages/editor/EditorSupport";
import EditorLeaderboard from "./pages/editor/EditorLeaderboard";
import EditorCommunity from "./pages/editor/EditorCommunity";
import PMDashboard from "./pages/PMDashboard";
import AdminEditorValidation from "./pages/AdminEditorValidation";
import ClientReview from "./pages/ClientReview";
import ClientDelivery from "./pages/ClientDelivery";
 import DesignDelivery from "./pages/DesignDelivery";
 import DesignProjectOverviewPage from "./pages/DesignProjectOverview";
import VideoProjectOverviewPage from "./pages/VideoProjectOverview";
import PendingValidation from "./pages/PendingValidation";
import ClientPending from "./pages/ClientPending";
import NotFound from "./pages/NotFound";

// Designer pages
import DesignerDashboard from "./pages/DesignerDashboard";
import DesignerProfile from "./pages/designer/DesignerProfile";
import DesignerHistory from "./pages/designer/DesignerHistory";
import DesignerLeaderboard from "./pages/designer/DesignerLeaderboard";
import DesignerSupport from "./pages/designer/DesignerSupport";

// Client pages
import ClientDashboard from "./pages/ClientDashboard";
import ClientVideos from "./pages/client/ClientVideos";
import ClientDesigns from "./pages/client/ClientDesigns";
import ClientDesignProject from "./pages/client/ClientDesignProject";
import ClientIdeas from "./pages/client/ClientIdeas";
import ClientScripts from "./pages/client/ClientScripts";
import ClientAnalytics from "./pages/client/ClientAnalytics";
import ClientPlanning from "./pages/client/ClientPlanning";

// Copywriter pages
import CopywriterDashboard from "./pages/CopywriterDashboard";
import CopywriterClients from "./pages/copywriter/CopywriterClients";
import CopywriterClientDetail from "./pages/copywriter/CopywriterClientDetail";
import CopywriterProfile from "./pages/copywriter/CopywriterProfile";
import CopywriterSupport from "./pages/copywriter/CopywriterSupport";

// Lazy load join pages to avoid auth blocking
const EditorJoin = lazy(() => import("./pages/join/EditorJoin"));
const TeamJoin = lazy(() => import("./pages/join/TeamJoin"));
const DesignerJoin = lazy(() => import("./pages/join/DesignerJoin"));
const CopywriterJoin = lazy(() => import("./pages/join/CopywriterJoin"));
const ClientJoin = lazy(() => import("./pages/join/ClientJoin"));

// Minimal loading fallback for join pages
const JoinPageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="h-16 w-16 bg-muted rounded-lg" />
      <div className="h-8 w-48 bg-muted rounded" />
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public join routes - OUTSIDE AuthProvider for instant loading */}
          <Route path="/join/editor" element={
            <Suspense fallback={<JoinPageLoader />}>
              <EditorJoin />
            </Suspense>
          } />
          <Route path="/join/team" element={
            <Suspense fallback={<JoinPageLoader />}>
              <TeamJoin />
            </Suspense>
          } />
          <Route path="/join/designer" element={
            <Suspense fallback={<JoinPageLoader />}>
              <DesignerJoin />
            </Suspense>
          } />
          <Route path="/join/copywriter" element={
            <Suspense fallback={<JoinPageLoader />}>
              <CopywriterJoin />
            </Suspense>
          } />
          <Route path="/join/client" element={
            <Suspense fallback={<JoinPageLoader />}>
              <ClientJoin />
            </Suspense>
          } />
          
          {/* Auth page outside AuthProvider for instant loading */}
          <Route path="/auth" element={<Auth />} />
          
          {/* All other routes wrapped in AuthProvider */}
          <Route path="/*" element={
            <AuthProvider>
              {/* Global persistent notification toasts - like Instagram */}
              <PersistentNotificationToast />
              <Routes>
                <Route path="/" element={<Index />} />
                
                {/* Admin routes with permission checks */}
                <Route path="/dashboard" element={
                  <ProtectedRoute requiredPermission="access_dashboard">
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute requiredPermission="view_clients">
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="/client-management" element={
                  <ProtectedRoute requiredPermission="manage_clients">
                    <ClientManagement />
                  </ProtectedRoute>
                } />
                <Route path="/team" element={
                  <ProtectedRoute requiredPermission="manage_team">
                    <Team />
                  </ProtectedRoute>
                } />
                <Route path="/projects" element={
                  <ProtectedRoute requiredPermission="manage_projects">
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="/tasks" element={
                  <ProtectedRoute requiredPermission="manage_projects">
                    <Tasks />
                  </ProtectedRoute>
                } />
                <Route path="/payments" element={
                  <ProtectedRoute requiredPermission="manage_payments">
                    <Finance />
                  </ProtectedRoute>
                } />
                <Route path="/pm" element={
                  <ProtectedRoute requiredPermission="validate_videos">
                    <PMDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/editors" element={
                  <ProtectedRoute requiredPermission="manage_team">
                    <AdminEditorValidation />
                  </ProtectedRoute>
                } />
                
                {/* Editor routes */}
                <Route path="/editor" element={
                  <ProtectedRoute requiredPermission="access_editor">
                    <EditorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/editor/profile" element={
                  <ProtectedRoute requiredPermission="access_editor">
                    <EditorProfile />
                  </ProtectedRoute>
                } />
                <Route path="/editor/support" element={
                  <ProtectedRoute requiredPermission="access_editor">
                    <EditorSupport />
                  </ProtectedRoute>
                } />
                <Route path="/editor/leaderboard" element={
                  <ProtectedRoute requiredPermission="access_editor">
                    <EditorLeaderboard />
                  </ProtectedRoute>
                } />
                <Route path="/editor/community" element={
                  <ProtectedRoute requiredPermission="access_editor">
                    <EditorCommunity />
                  </ProtectedRoute>
                } />
                
                {/* Designer routes */}
                <Route path="/designer" element={
                  <ProtectedRoute allowedRoles={['designer', 'admin']}>
                    <DesignerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/designer/profile" element={
                  <ProtectedRoute allowedRoles={['designer', 'admin']}>
                    <DesignerProfile />
                  </ProtectedRoute>
                } />
                <Route path="/designer/history" element={
                  <ProtectedRoute allowedRoles={['designer', 'admin']}>
                    <DesignerHistory />
                  </ProtectedRoute>
                } />
                <Route path="/designer/leaderboard" element={
                  <ProtectedRoute allowedRoles={['designer', 'admin']}>
                    <DesignerLeaderboard />
                  </ProtectedRoute>
                } />
                <Route path="/designer/support" element={
                  <ProtectedRoute allowedRoles={['designer', 'admin']}>
                    <DesignerSupport />
                  </ProtectedRoute>
                } />
                
                {/* Client routes - wrapped in shared ClientMonthProvider */}
                <Route element={<ClientMonthWrapper />}>
                  <Route path="/client" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/videos" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientVideos />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/designs" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientDesigns />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/designs/:taskId" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientDesignProject />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/ideas" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientIdeas />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/scripts" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientScripts />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/planning" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientPlanning />
                    </ProtectedRoute>
                  } />
                  <Route path="/client/analytics" element={
                    <ProtectedRoute allowedRoles={['client', 'admin']}>
                      <ClientAnalytics />
                    </ProtectedRoute>
                  } />
                </Route>
                
                {/* Copywriter routes */}
                <Route path="/copywriter" element={
                  <ProtectedRoute allowedRoles={['copywriter', 'admin']}>
                    <CopywriterDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/copywriter/clients" element={
                  <ProtectedRoute allowedRoles={['copywriter', 'admin']}>
                    <CopywriterClients />
                  </ProtectedRoute>
                } />
                <Route path="/copywriter/clients/:clientUserId" element={
                  <ProtectedRoute allowedRoles={['copywriter', 'admin']}>
                    <CopywriterClientDetail />
                  </ProtectedRoute>
                } />
                <Route path="/copywriter/profile" element={
                  <ProtectedRoute allowedRoles={['copywriter', 'admin']}>
                    <CopywriterProfile />
                  </ProtectedRoute>
                } />
                <Route path="/copywriter/support" element={
                  <ProtectedRoute allowedRoles={['copywriter', 'admin']}>
                    <CopywriterSupport />
                  </ProtectedRoute>
                } />
                
                {/* Pending validation pages */}
                <Route path="/pending-validation" element={
                  <ProtectedRoute>
                    <PendingValidation />
                  </ProtectedRoute>
                } />
                <Route path="/client-pending" element={
                  <ProtectedRoute allowedRoles={['client', 'admin']}>
                    <ClientPending />
                  </ProtectedRoute>
                } />
                
                {/* Public routes */}
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/review/:token" element={<ClientReview />} />
                <Route path="/delivery/:videoId" element={<ClientDelivery />} />
                <Route path="/design-delivery/:token" element={<DesignDelivery />} />
                <Route path="/project-overview/:token" element={<DesignProjectOverviewPage />} />
                <Route path="/p/:token" element={<DesignProjectOverviewPage />} />
                <Route path="/video-overview/:token" element={<VideoProjectOverviewPage />} />
                <Route path="/v/:token" element={<VideoProjectOverviewPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
