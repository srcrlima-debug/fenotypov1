import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AssessmentProvider } from "./contexts/AssessmentContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TrainingProvider } from "./contexts/TrainingContext";
import { BadgeProvider } from "./contexts/BadgeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import ErrorBoundary from "./pages/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import CompleteProfile from "./pages/CompleteProfile";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ComoFunciona from "./pages/ComoFunciona";
import Antessala from "./pages/Antessala";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLiveControl from "./pages/AdminLiveControl";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminDivergenceAnalysis from "./pages/AdminDivergenceAnalysis";
import AdminHistory from "./pages/AdminHistory";
import AdminSessionComparison from "./pages/AdminSessionComparison";
import AdminDemographicDashboard from "./pages/AdminDemographicDashboard";
import AdminSessionComparator from "./pages/AdminSessionComparator";
import AdminTrainings from "./pages/AdminTrainings";
import AdminTrainingParticipants from "./pages/AdminTrainingParticipants";
import AdminTrainingSessions from "./pages/AdminTrainingSessions";
import AdminTrainingComparator from "./pages/AdminTrainingComparator";
import AdminSessions from "./pages/AdminSessions";
import AdminSessionsDashboard from "./pages/AdminSessionsDashboard";
import SessionAccess from "./pages/SessionAccess";
import TrainingRegister from "./pages/TrainingRegister";
import TrainingLogin from "./pages/TrainingLogin";
import TrainingWelcome from "./pages/TrainingWelcome";
import TrainingAccess from "./pages/TrainingAccess";
import Training from "./pages/Training";
import SessionTraining from "./pages/SessionTraining";
import SessionFeedback from "./pages/SessionFeedback";
import AdminFeedback from "./pages/AdminFeedback";
import Results from "./pages/Results";
import Achievements from "./pages/Achievements";
import Error404 from "./pages/Error404";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BadgeProvider>
            <TrainingProvider>
              <AssessmentProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/registro" element={<Registro />} />
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                  <Route path="/esqueci-senha" element={<ForgotPassword />} />
                  <Route path="/redefinir-senha" element={<ResetPassword />} />
                  <Route path="/como-funciona" element={<ComoFunciona />} />
                  <Route path="/conquistas" element={<Achievements />} />
                  
                  {/* Training-specific routes */}
                  <Route path="/training/:trainingId/register" element={<TrainingRegister />} />
                  <Route path="/training/:trainingId/welcome" element={<TrainingWelcome />} />
                  <Route path="/training/:trainingId/login" element={<TrainingLogin />} />
                  <Route path="/training/:trainingId/acesso" element={<TrainingAccess />} />
                  
                  {/* Simplified session access route */}
                  <Route path="/session/:sessionId/acesso" element={<SessionAccess />} />
                  <Route path="/training/register" element={<TrainingRegister />} />
                  
                  {/* New unified antessala route (without sessionId) */}
                  <Route 
                    path="/training/:trainingId/antessala" 
                    element={
                      <ProtectedRoute>
                        <Antessala />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Antessala with query params support */}
                  <Route 
                    path="/antessala" 
                    element={
                      <ProtectedRoute>
                        <Antessala />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Legacy antessala routes for backwards compatibility */}
                  <Route 
                    path="/training/:trainingId/session/:sessionId/antessala" 
                    element={
                      <ProtectedRoute>
                        <Antessala />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/antessala/:sessionId" 
                    element={
                      <ProtectedRoute>
                        <Antessala />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Admin routes - Redirect to new /admin/sessions */}
                  <Route 
                    path="/admin" 
                    element={<Navigate to="/admin/sessions" replace />} 
                  />
                  <Route 
                    path="/admin/trainings" 
                    element={<Navigate to="/admin/sessions" replace />} 
                  />
                  <Route
                    path="/admin/sessions"
                    element={
                      <AdminRoute>
                        <AdminSessions />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/sessions/dashboard"
                    element={
                      <AdminRoute>
                        <AdminSessionsDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/training/:trainingId/participants"
                    element={
                      <AdminRoute>
                        <AdminTrainingParticipants />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/training/:trainingId/sessions"
                    element={
                      <AdminRoute>
                        <AdminTrainingSessions />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/training/:trainingId/dashboard"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/training/compare"
                    element={
                      <AdminRoute>
                        <AdminTrainingComparator />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/dashboard/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/live/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminLiveControl />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminAnalytics />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/divergence/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminDivergenceAnalysis />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/history"
                    element={
                      <AdminRoute>
                        <AdminHistory />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/session-comparison"
                    element={
                      <AdminRoute>
                        <AdminSessionComparison />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/demographic/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminDemographicDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/comparator"
                    element={
                      <AdminRoute>
                        <AdminSessionComparator />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/feedback/:sessionId"
                    element={
                      <AdminRoute>
                        <AdminFeedback />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/treino/:sessionId"
                    element={
                      <ProtectedRoute>
                        <SessionTraining />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/feedback/:sessionId" 
                    element={
                      <ProtectedRoute>
                        <SessionFeedback />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/training/:page" 
                    element={
                      <ProtectedRoute>
                        <Training />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/results" 
                    element={
                      <ProtectedRoute>
                        <Results />
                      </ProtectedRoute>
                    } 
                  />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<Error404 />} />
                </Routes>
              </BrowserRouter>
            </AssessmentProvider>
          </TrainingProvider>
        </BadgeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
</ErrorBoundary>
);

export default App;
