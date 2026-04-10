import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Info, AlertTriangle, CheckCircle, Wrench } from "lucide-react";

const DISMISSED_KEY = "krew_dismissed_announcements";

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

const typeStyles: Record<string, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200", icon: Info },
  warning: { bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200", icon: AlertTriangle },
  success: { bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-200", icon: CheckCircle },
  maintenance: { bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200", icon: Wrench },
};

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());

  const { data: announcements } = useQuery<Array<{
    id: string; title: string; message: string; type: string;
  }>>({
    queryKey: ["/api/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const visible = (announcements || []).filter(a => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
  };

  return (
    <>
      {visible.map(ann => {
        const style = typeStyles[ann.type] || typeStyles.info;
        const Icon = style.icon;
        return (
          <div key={ann.id} className={`border-b px-4 py-2.5 flex items-center justify-between ${style.bg}`}>
            <div className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{ann.title}</span>
              {ann.message && <span className="hidden sm:inline text-xs opacity-75">— {ann.message}</span>}
            </div>
            <button onClick={() => dismiss(ann.id)} className="p-1 rounded hover:bg-black/10 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </>
  );
}
