import {
  CalendarDays,
  type LucideIcon,
  MessagesSquare,
  Plug,
  Settings,
  Sun,
  Users,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MAIN_NAV: readonly NavItem[] = [
  { href: "/today", label: "Hoje", icon: Sun },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/conversations", label: "Conversas", icon: MessagesSquare },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/integrations", label: "Integrações", icon: Plug },
];

export const SECONDARY_NAV: readonly NavItem[] = [
  { href: "/settings", label: "Configurações", icon: Settings },
];
