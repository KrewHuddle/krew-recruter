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
  MoreHorizontal,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrgInfo {
  name: string;
  primaryColor?: string;
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
  orgs?: { id: string; name: string }[];
  onOrgSwitch?: (orgId: string) => void;
  onLogout?: () => void;
}

const navItems = [
  { title: "Dashboard", href: "/campaign", icon: LayoutDashboard },
  { title: "Jobs", href: "/campaign/jobs", icon: Briefcase },
  { title: "Candidates", href: "/campaign/candidates", icon: Users },
  { title: "Talent Pool", href: "/campaign/talent", icon: Search },
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
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
      className="fixed top-0 left-0 h-screen flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
      style={{ width: 220, zIndex: 50 }}
    >
      {/* Logo + Wordmark */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex items-center justify-center rounded-md font-bold text-sm w-8 h-8 bg-primary text-primary-foreground">
          K
        </div>
        <span className="font-semibold text-sm tracking-wide text-sidebar-foreground">
          KREW RECRUITER
        </span>
      </div>

      <div className="mx-3 border-t border-sidebar-border" />

      {/* Org Selector */}
      <div className="relative px-3 py-3" ref={orgDropdownRef}>
        <button
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
          className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors ${
            orgDropdownOpen ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
          }`}
        >
          {org.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={org.name}
              className="rounded-full object-cover w-7 h-7"
            />
          ) : (
            <div className="flex items-center justify-center rounded-full text-xs font-semibold w-7 h-7 bg-primary text-primary-foreground">
              {orgInitial}
            </div>
          )}
          <span className="flex-1 text-left truncate font-medium text-sidebar-foreground">
            {org.name}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {orgDropdownOpen && orgs.length > 0 && (
          <div className="absolute left-3 right-3 mt-1 rounded-md py-1 shadow-lg bg-popover border border-popover-border z-[60]">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onOrgSwitch?.(o.id);
                  setOrgDropdownOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-center rounded-full text-xs font-semibold w-5.5 h-5.5 bg-primary/20 text-primary">
                  {o.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{o.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mx-3 border-t border-sidebar-border" />

      {/* New Job CTA */}
      <div className="px-3 py-3">
        <Link href="/campaign/jobs/new" className="block">
          <Button variant="outline" className="w-full gap-2 justify-center font-semibold">
            <Plus className="h-4 w-4" />
            New Job
          </Button>
        </Link>
      </div>

      <div className="mx-3 border-t border-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors mb-0.5 ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-[3px] border-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground border-l-[3px] border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 border-t border-sidebar-border" />

      {/* User Footer */}
      <div className="px-3 py-3 relative" ref={userMenuRef}>
        <div className="flex items-center gap-2.5">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="rounded-full object-cover w-8 h-8"
            />
          ) : (
            <div className="flex items-center justify-center rounded-full text-xs font-semibold w-8 h-8 bg-secondary text-secondary-foreground">
              {userInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate text-sidebar-foreground">
              {user.name}
            </div>
            <div className="text-xs truncate text-muted-foreground">
              {user.email}
            </div>
          </div>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="p-1 rounded text-muted-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="User settings"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {userMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 rounded-md py-1 shadow-lg bg-popover border border-popover-border z-[60]">
            <Link
              href="/campaign/settings"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={() => {
                setUserMenuOpen(false);
                onLogout?.();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
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
