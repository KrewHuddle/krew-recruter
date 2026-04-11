import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

interface OrgMembership {
  orgId: string;
  role: string;
  orgName: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  orgId: string | null;
  organizations: OrgMembership[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName?: string; lastName?: string; orgName?: string }) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "krew_token";
const ORG_KEY = "krew_org_id";

// Helper to read tenantId from cookie (set by main app's TenantProvider)
function getTenantIdFromCookie(): string | null {
  const match = document.cookie.split("; ").find(row => row.startsWith("tenantId="));
  return match?.split("=")[1] || null;
}

export function CampaignAuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem(TOKEN_KEY),
    user: null,
    orgId: localStorage.getItem(ORG_KEY),
    organizations: [],
    isLoading: true,
    isAuthenticated: false,
  });

  // apiFetch: uses JWT if available, otherwise falls back to session cookies.
  // The server's requireAuth/requireOrg accept both auth methods.
  const apiFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem(TOKEN_KEY);
    const orgId = localStorage.getItem(ORG_KEY) || getTenantIdFromCookie();

    // Do NOT set Content-Type when the body is FormData — the browser needs
    // to set it itself so it can include the multipart boundary. Forcing
    // application/json here would silently break every file upload (the
    // server's multer parser gets a multipart body with no boundary, sees
    // req.file as undefined, and returns 400 "No file uploaded").
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (orgId) {
      headers["x-org-id"] = orgId;
    }

    // Always include credentials so session cookies are sent as fallback
    return fetch(url, { ...options, headers, credentials: "include" });
  }, []);

  // Load user on mount — try JWT first, then fall back to session auth
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      // JWT path: validate token with /api/v2/auth/me
      apiFetch("/api/v2/auth/me")
        .then(res => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then(data => {
          const orgId = localStorage.getItem(ORG_KEY) || data.organizations?.[0]?.orgId || null;
          if (orgId) localStorage.setItem(ORG_KEY, orgId);

          setState({
            token,
            user: data.user,
            orgId,
            organizations: data.organizations || [],
            isLoading: false,
            isAuthenticated: true,
          });
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(ORG_KEY);
          // JWT invalid — try session fallback
          trySessionAuth();
        });
    } else {
      // No JWT — try session auth
      trySessionAuth();
    }

    function trySessionAuth() {
      fetch("/api/auth/user", { credentials: "include" })
        .then(res => {
          if (!res.ok) throw new Error("Not authenticated");
          return res.json();
        })
        .then(sessionUser => {
          if (!sessionUser || !sessionUser.id) throw new Error("No session");

          // User is session-authenticated — bridge into campaign auth
          const tenantId = getTenantIdFromCookie();

          // Try to load org memberships from the tenant API
          return fetch("/api/tenants/memberships", { credentials: "include" })
            .then(res => res.ok ? res.json() : [])
            .then((memberships: any[]) => {
              const orgs: OrgMembership[] = memberships.map((m: any) => ({
                orgId: m.tenantId,
                role: m.role,
                orgName: m.tenant?.name || "Organization",
              }));

              const orgId = tenantId || orgs[0]?.orgId || null;

              setState({
                token: null,
                user: {
                  id: sessionUser.id,
                  email: sessionUser.email || "",
                  firstName: sessionUser.firstName,
                  lastName: sessionUser.lastName,
                  profileImageUrl: sessionUser.profileImageUrl,
                },
                orgId,
                organizations: orgs,
                isLoading: false,
                isAuthenticated: true,
              });
            });
        })
        .catch(() => {
          setState({
            token: null,
            user: null,
            orgId: null,
            organizations: [],
            isLoading: false,
            isAuthenticated: false,
          });
        });
    }
  }, [apiFetch]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/v2/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.orgId) localStorage.setItem(ORG_KEY, data.orgId);

    setState({
      token: data.token,
      user: data.user,
      orgId: data.orgId || null,
      organizations: [],
      isLoading: false,
      isAuthenticated: true,
    });

    // Fetch full user data
    const meRes = await fetch("/api/v2/auth/me", {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      setState(s => ({
        ...s,
        organizations: meData.organizations || [],
        orgId: s.orgId || meData.organizations?.[0]?.orgId || null,
      }));
    }
  };

  const register = async (registerData: { email: string; password: string; firstName?: string; lastName?: string; orgName?: string }) => {
    const res = await fetch("/api/v2/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerData),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.orgId) localStorage.setItem(ORG_KEY, data.orgId);

    setState({
      token: data.token,
      user: data.user,
      orgId: data.orgId || null,
      organizations: data.orgId ? [{ orgId: data.orgId, role: "owner", orgName: registerData.orgName || "" }] : [],
      isLoading: false,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ORG_KEY);
    setState({
      token: null,
      user: null,
      orgId: null,
      organizations: [],
      isLoading: false,
      isAuthenticated: false,
    });
    setLocation("/login");
  };

  const switchOrg = (orgId: string) => {
    localStorage.setItem(ORG_KEY, orgId);
    setState(s => ({ ...s, orgId }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, switchOrg, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCampaignAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useCampaignAuth must be used within CampaignAuthProvider");
  }
  return context;
}
