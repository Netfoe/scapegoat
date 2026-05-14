import { createZitadelAuth, type ZitadelConfig } from "@zitadel/react";

const getEnv = (key: string, defaultValue: string): string => {
  return (window as any)._env_?.[key] || (import.meta as any).env[key] || defaultValue;
};

const config: ZitadelConfig = {
  authority: getEnv("VITE_ZITADEL_AUTHORITY", "http://localhost:8080"),
  client_id: getEnv("VITE_ZITADEL_CLIENT_ID", "your-client-id"),
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: "code",
  scope: "openid profile email offline_access",
};

export const zitadel = createZitadelAuth(config);
