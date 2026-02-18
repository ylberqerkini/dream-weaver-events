import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Flower } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen floral-bg flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-gold mx-auto mb-4 animate-pulse-soft">
            <Flower className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
