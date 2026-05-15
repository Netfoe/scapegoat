import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { zitadel } from "../auth";
import { useTitle } from "../hooks/useTitle";

export const Callback = () => {
  useTitle('Logging in...');
  const navigate = useNavigate();

  useEffect(() => {
    zitadel.userManager.signinRedirectCallback()
      .then(() => {
        navigate("/");
      })
      .catch((err) => {
        console.error("Login failed", err);
        navigate("/login", { state: { error: err.message || "Authentication failed. Please try again." } });
      });
  }, [navigate]);

  return (
    <div className="app-container center-page">
      <div className="text-center stack-y-4">
        <h2 className="page-title">Processing login...</h2>
        <p className="text-muted">Please wait while we redirect you.</p>
        <div className="loader-container p-0"><div className="spinner"></div></div>
      </div>
    </div>
  );
};

export default Callback;
