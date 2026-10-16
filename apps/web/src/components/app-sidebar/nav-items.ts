import {
  CalendarDays,
  type LucideIcon,
  MessagesSquare,
  Plug,
  Settings,
  SquareKanban,
  Sun,
  UserCog,
  Users,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MAIN_NAV: readonly NavItem[] = [
  { href: "/today", label: "Hoje", icon: Sun },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/funnels", label: "Funis", icon: SquareKanban },
  { href: "/conversations", label: "Conversas", icon: MessagesSquare },
  { href: "/calendar", label: "Agenda", icon: CalendarDays },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/settings", label: "Configurações", icon: Settings },
];

/** Only rendered for admins; the screens themselves check the role again on the server. */
export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin/users", label: "Usuários", icon: UserCog },
];
