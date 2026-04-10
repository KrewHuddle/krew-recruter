import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, DollarSign, CreditCard, Users, Building2,
  Megaphone, Globe, Flag, Ticket, Settings, Shield, FileText,
  Bell, Activity, BarChart3, LogOut,
} from "lucide-react";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { title: "Audit Log", href: "/admin/audit-log", icon: FileText },
    ],
  },
  {
    label: "Revenue",
    items: [
      { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
      { title: "Revenue", href: "/admin/revenue", icon: DollarSign },
      { title: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    label: "Customers",
    items: [
      { title: "Organizations", href: "/admin/organizations", icon: Building2 },
      { title: "Users", href: "/admin/users", icon: Users },
      { title: "Tenant Health", href: "/admin/health", icon: Activity },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Meta Ads", href: "/admin/meta-ads", icon: Megaphone },
      { title: "Job Aggregation", href: "/admin/aggregation", icon: Globe },
      { title: "Announcements", href: "/admin/announcements", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Feature Flags", href: "/admin/flags", icon: Flag },
      { title: "Platform Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ onSignOut }: { onSignOut: () => void }) {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href);
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-56 bg-background border-r flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <Shield className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Admin Portal</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors mb-0.5 ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-3 space-y-1">
        <a
          href="/campaign"
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          Campaign Engine
        </a>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-md w-full transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
