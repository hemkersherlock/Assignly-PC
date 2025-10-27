"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  FilePlus,
  Users,
  BarChart2,
  Package,
  CreditCard,
  Settings,
  Menu,
  User,
  Link2,
  Trash2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/context/AuthContext";
import Logo from "../shared/Logo";

const studentNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Order", href: "/orders/new", icon: FilePlus },
  { name: "Order History", href: "/orders", icon: FileText },
];

const adminNav = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Orders", href: "/admin/orders", icon: FileText },
  { name: "Students", href: "/admin/students", icon: Users },
  { name: "Referrals", href: "/admin/referrals", icon: Link2 },
  { name: "Credits", href: "/admin/quota", icon: Package },
  { name: "Cleanup", href: "/admin/cleanup", icon: Trash2 },
  { name: "Test Animation", href: "/admin/test-animation", icon: Play },
];

function NavLink({
  item,
  isMobile,
}: {
  item: { name: string; href: string; icon: React.ElementType };
  isMobile: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href;
  const Icon = item.icon;
  const { setOpenMobile } = useSidebar();

  const handleClick = () => {
    // Close mobile sidebar when navigation link is clicked
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={!isMobile ? item.name : undefined}
      >
        <Link href={item.href} onClick={handleClick}>
          <Icon />
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppSidebar() {
  const { user, logout } = useAuthContext();
  const { isMobile, setOpenMobile } = useSidebar();
  const navItems = user?.role === "admin" ? adminNav : studentNav;

  const handleLogout = () => {
    // Close mobile sidebar before logout
    if (isMobile) {
      setOpenMobile(false);
    }
    logout();
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Logo />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
            Assignly
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <NavLink key={item.name} item={item} isMobile={isMobile} />
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={!isMobile ? "Logout" : undefined}>
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppHeader() {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuthContext();

  const getInitials = (email: string | undefined) => {
    if (!email) return '?';
    const parts = email.split('@');
    const name = parts[0];
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 border-b bg-background/95 backdrop-blur-sm px-3 sm:pl-4 sm:pr-3 md:pl-6 md:pr-4">
        <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={toggleSidebar}
        >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
        </Button>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.email || 'user'}.png`} alt={user?.email || 'User'} />
              <AvatarFallback className="text-xs">{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none truncate">{user?.name || (user?.role === 'admin' ? 'Administrator' : 'Student')}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();

  if (!user) {
    return null; // Or a loading spinner, but AuthProvider handles it
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col w-full min-w-0">
          <AppHeader />
          <main className="flex-1 p-0 sm:p-4 md:p-6 lg:p-8 w-full">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
