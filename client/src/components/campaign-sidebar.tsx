import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserPlus,
  CreditCard,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  Video,
  HelpCircle,
} from "lucide-react";

interface OrgInfo {
  name: string;
  primaryColor: string;
  logoUrl?: string;
}

interface UserInfo {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface CampaignSidebarProps {
  user: UserInfo;
  org: OrgInfo;
  orgs?: OrgInfo[];
  onOrgSwitch?: (org: OrgInfo) => void;
  onLogout?: () => void;
}

const navItems = [
  { title: "Dashboard", href: "/campaign", icon: LayoutDashboard },
  { title: "Jobs", href: "/campaign/jobs", icon: Briefcase },
  { title: "Candidates", href: "/campaign/candidates", icon: Users },
  { title: "Video Interviews", href: "/campaign/interviews", icon: Video },
  { title: "Team", href: "/campaign/team", icon: UserPlus },
  { title: "Billing", href: "/campaign/billing", icon: CreditCard },
  { title: "Help", href: "/campaign/help", icon: HelpCircle },
];

export function CampaignSidebar({
  user,
  org,
  orgs = [],
  onOrgSwitch,
  onLogout,
}: CampaignSidebarProps) {
  const [location] = useLocation();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
    if (path === "/campaign") return location === "/campaign";
    return location.startsWith(path);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        orgDropdownRef.current &&
        !orgDropdownRef.current.contains(e.target as Node)
      ) {
        setOrgDropdownOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const orgInitial = org.name.charAt(0).toUpperCase();
  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <div
      className="fixed top-0 left-0 h-screen flex flex-col"
      style={{
        width: 220,
        backgroundColor: "#0f0f0f",
        color: "#f5f5f5",
        zIndex: 50,
      }}
    >
      {/* Logo + Wordmark */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div
          className="flex items-center justify-center rounded-md font-bold text-sm"
          style={{
            width: 32,
            height: 32,
            backgroundColor: org.primaryColor,
            color: "#fff",
          }}
        >
          K
        </div>
        <span className="font-semibold text-sm tracking-wide" style={{ color: "#f5f5f5" }}>
          KREW RECRUITER
        </span>
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

      {/* Org Selector */}
      <div className="relative px-3 py-3" ref={orgDropdownRef}>
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors"
          style={{ backgroundColor: orgDropdownOpen ? "rgba(255,255,255,0.06)" : "transparent" }}
          onMouseEnter={(e) => {
            if (!orgDropdownOpen)
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
          }}
          onMouseLeave={(e) => {
            if (!orgDropdownOpen)
              e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="rounded-full object-cover"
              style={{ width: 28, height: 28 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full text-xs font-semibold"
              style={{
                width: 28,
                height: 28,
                backgroundColor: org.primaryColor,
                color: "#fff",
              }}
            >
              {orgInitial}
            </div>
          )}
          <span className="flex-1 text-left truncate font-medium" style={{ color: "#f5f5f5" }}>
            {org.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </button>

        {/* Org Dropdown */}
        {orgDropdownOpen && orgs.length > 0 && (
          <div
            className="absolute left-3 right-3 mt-1 rounded-md py-1 shadow-lg"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              zIndex: 60,
            }}
          >
            {orgs.map((o) => (
              <button
                key={o.name}
                onClick={() => {
                  onOrgSwitch?.(o);
                  setOrgDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                style={{ color: "#f5f5f5" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: o.primaryColor,
                    color: "#fff",
                  }}
                >
                  {o.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

      {/* New Job CTA */}
      <div className="px-3 py-3">
        <Link
          href="/campaign/jobs/new"
          className="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: org.primaryColor,
            color: "#fff",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Plus className="h-4 w-4" />
          New Job
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.title}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors mb-0.5"
              style={{
                backgroundColor: active ? "rgba(255,255,255,0.06)" : "transparent",
                borderLeft: active ? `3px solid ${org.primaryColor}` : "3px solid transparent",
                color: active ? "#f5f5f5" : "rgba(245,245,245,0.7)",
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!active)
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }} />

      {/* User Footer */}
      <div className="px-3 py-3 relative" ref={userMenuRef}>
        <div className="flex items-center gap-2.5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="rounded-full object-cover"
              style={{ width: 32, height: 32 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-full text-xs font-semibold"
              style={{
                width: 32,
                height: 32,
                backgroundColor: org.primaryColor,
                color: "#fff",
              }}
            >
              {userInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "#f5f5f5" }}>
              {user.name}
            </div>
            <div className="text-xs truncate" style={{ color: "rgba(245,245,245,0.5)" }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="p-1 rounded transition-colors"
            style={{ color: "rgba(245,245,245,0.5)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            aria-label="User settings"
          >
            <span className="text-base leading-none tracking-widest">···</span>
          </button>
        </div>

        {/* User Dropdown */}
        {userMenuOpen && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1 rounded-md py-1 shadow-lg"
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid rgba(255,255,255,0.1)",
              zIndex: 60,
            }}
          >
            <Link
              href="/campaign/settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: "#f5f5f5" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                onLogout?.();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
              style={{ color: "#ef4444" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
