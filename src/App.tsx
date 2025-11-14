import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AssessmentProvider } from "./contexts/AssessmentContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import ErrorBoundary from "./pages/ErrorBoundary";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import CompleteProfile from "./pages/CompleteProfile";
import ComoFunciona from "./pages/ComoFunciona";
import Admin from "./pages/Admin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLiveControl from "./pages/AdminLiveControl";
import AdminAnalytics from "./pages/AdminAnalytics";
import Training from "./pages/Training";
import SessionTraining from "./pages/SessionTraining";
import Results from "./pages/Results";
import Error404 from "./pages/Error404";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AssessmentProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/como-funciona" element={<ComoFunciona />} />
                <Route 
                  path="/admin" 
                  element={
                    <AdminRoute>
                      <Admin />
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
                  path="/treino/:sessionId"
                  element={
                    <ProtectedRoute>
                      <SessionTraining />
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
