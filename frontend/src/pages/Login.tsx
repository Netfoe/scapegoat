import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { zitadel } from "../auth";
import { useTitle } from "../hooks/useTitle";

export const Login = () => {
  useTitle('Login');
  const location = useLocation();
  const [error, setError] = useState<string | null>(location.state?.error || null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkZitadel = async () => {
      const authority = (zitadel as any).userManager?.settings?.authority;
      if (!authority) return;

      setIsChecking(true);
      try {
        // Discovery document should be accessible. 
        // We use a short timeout to not hang the login page forever.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const resp = await fetch(`${authority}/.well-known/openid-configuration`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!resp.ok) {
          setError(`Authentication service is reporting an issue (Status: ${resp.status}).`);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setError("Authentication service is taking too long to respond. It might be overloaded or down.");
        } else {
          console.error("Zitadel health check failed", err);
          setError("Authentication service (Zitadel) appears to be offline or unreachable. Please ensure it is running.");
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Only check if we don't already have an error from a redirect
    if (!error) {
      checkZitadel();
    }
  }, []);

  const login = () => {
    setError(null);
    zitadel.authorize().catch((err: any) => {
      setError(err.message || "Failed to initiate login.");
    });
  };

  return (
    <div className="app-container center-page">
      <div className="card text-center login-card">
        <h1 className="brand-title login-title">Scapegoat</h1>
        <p className="login-description">
          Welcome to Scapegoat. Please sign in to access your SBOM and Vulnerability dashboard.
        </p>

        {error && (
          <div className="alert alert-danger fade-in">
            <AlertCircle className="alert-icon" size={20} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={login}
          disabled={isChecking}
          className="btn btn-primary login-btn"
        >
          {isChecking ? "Checking Status..." : "Login with Zitadel"}
        </button>
      </div>
    </div>
  );
};

export default Login;

