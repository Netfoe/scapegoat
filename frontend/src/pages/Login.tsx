import { zitadel } from "../auth";
import { useTitle } from "../hooks/useTitle";

export const Login = () => {
  useTitle('Login');
  const login = () => zitadel.authorize();

  return (
    <div className="app-container center-page">
      <div className="card text-center login-card">
        <h1 className="brand-title login-title">Scapegoat</h1>
                <p className="login-description">
                  Welcome to Scapegoat. Please sign in to access your SBOM and Vulnerability dashboard.
                </p>
        <button
          onClick={login}
          className="btn btn-primary login-btn"
        >
          Login with Zitadel
        </button>
      </div>
    </div>
  );
};

export default Login;
