import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Tenant, TenantMembership } from "@shared/schema";

interface TenantContextType {
  currentTenant: Tenant | null;
  memberships: (TenantMembership & { tenant: Tenant })[];
  setCurrentTenant: (tenant: Tenant | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenantState] = useState<Tenant | null>(null);
  const [memberships, setMemberships] = useState<(TenantMembership & { tenant: Tenant })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemberships = async () => {
    try {
      const res = await fetch("/api/tenants/memberships", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMemberships(data);
        
        // Set current tenant from cookie or first membership
        const storedTenantId = document.cookie
          .split("; ")
          .find((row) => row.startsWith("tenantId="))
          ?.split("=")[1];
        
        if (storedTenantId) {
          const found = data.find((m: any) => m.tenantId === storedTenantId);
          if (found) {
            setCurrentTenantState(found.tenant);
          } else if (data.length > 0) {
            const firstTenant = data[0].tenant;
            setCurrentTenantState(firstTenant);
            document.cookie = `tenantId=${firstTenant.id}; path=/; max-age=31536000`;
          }
        } else if (data.length > 0) {
          const firstTenant = data[0].tenant;
          setCurrentTenantState(firstTenant);
          document.cookie = `tenantId=${firstTenant.id}; path=/; max-age=31536000`;
        }
      }
    } catch (error) {
      console.error("Failed to fetch memberships:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const setCurrentTenant = (tenant: Tenant | null) => {
    setCurrentTenantState(tenant);
    if (tenant) {
      document.cookie = `tenantId=${tenant.id}; path=/; max-age=31536000`;
    } else {
      document.cookie = "tenantId=; path=/; max-age=0";
    }
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        memberships,
        setCurrentTenant,
        isLoading,
        refetch: fetchMemberships,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
