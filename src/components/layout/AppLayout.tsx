import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  Workflow, 
  Calendar as CalendarIcon, 
  Settings,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Conversations", href: "/conversations", icon: MessageSquare },
  { name: "Marketing", href: "/marketing", icon: Megaphone },
  { name: "Automation", href: "/automation", icon: Workflow },
  { name: "Calendar", href: "/calendar", icon: CalendarIcon },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/30 flex w-full">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">LeadFlow</h1>
              <p className="text-xs text-muted-foreground">CRM Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">EA Pro Painters</p>
            <p>Bellevue, WA</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
