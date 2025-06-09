import type React from "react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Home, BarChart2, TrendingUp, Users, Settings, Download, MessageSquare, UserCircle, Bell, LogOut, FileSearch } from "lucide-react"; // Added FileSearch
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { getCurrentUser } from "@/lib/auth"; // Using Supabase auth
import { redirect } from "next/navigation"; // For redirecting

// Placeholder for a logo component if you have one
// const YourLogoComponent = () => <img src="/placeholder-logo.svg" alt="Logo" className="h-8 w-auto" />;

export default async function AuthenticatedLayout({ // Made component async
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser(); // Get user from Supabase

  if (!user) {
    redirect("/auth/login?message=Please+login+to+access+this+page."); // Redirect if not logged in
  }

  // The old mock session was:
  // const session = {
  //   user: {
  //     id: "mock-user-id",
  //     email: "user@example.com",
  //   },
  //   expires: new Date(Date.now() + 3600 * 1000).toISOString(),
  // };
  // We now use the `user` object directly from Supabase.

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className="bg-gray-900 text-white dark"
      >
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-blue-400" />
            <span className="text-xl font-semibold">Market Intel</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard">
                <Link href="/dashboard"><Home className="h-5 w-5" /> <span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Competitor Analysis">
                <Link href="/competitor-analysis"><BarChart2 className="h-5 w-5" /> <span>Competitor Analysis</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Market Trends">
                <Link href="/market-trends"><TrendingUp className="h-5 w-5" /> <span>Market Trends</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Customer Insights">
                <Link href="/customer-insights"><Users className="h-5 w-5" /> <span>Customer Insights</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Data Integration">
                <Link href="/data-integration"><Settings className="h-5 w-5" /> <span>Data Integration</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Agent Chat">
                <Link href="/agent-chat"><MessageSquare className="h-5 w-5" /> <span>Agent Chat</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem> {/* New Item for Run Analysis */}
              <SidebarMenuButton asChild tooltip="Run Full Analysis">
                <Link href="/run-analysis"><FileSearch className="h-5 w-5" /> <span>Run Analysis</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Downloads">
                <Link href="/downloads"><Download className="h-5 w-5" /> <span>Downloads</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-gray-700">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Profile Settings">
                <Link href="/profile/settings"><UserCircle className="h-5 w-5" /> <span>My Profile</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* Sign Out Button - This would typically be a form that POSTs to the signout endpoint */}
            <SidebarMenuItem>
                <form action="/api/auth/sign-out" method="post"> {/* better-auth signout endpoint */}
                    <SidebarMenuButton type="submit" isFullWidth={true} tooltip="Sign Out">
                        <LogOut className="h-5 w-5" /> <span>Sign Out</span>
                    </SidebarMenuButton>
                </form>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Dashboard</h2> {/* Placeholder title */}
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>
              {user ? ( // Check for user object
                <div className="flex items-center gap-2">
                  <UserCircle className="h-7 w-7 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-200 hidden md:inline">
                    {user.email} {/* Display user's email */}
                  </span>
                  {/* Future: Replace with a DropdownMenu for user actions (profile, settings, sign out) */}
                </div>
              ) : (
                // This part should not be reached if redirect logic is working, but as a fallback:
                <Link href="/auth/login" aria-label="Login">
                  <UserCircle className="h-7 w-7 text-gray-600 dark:text-gray-300" />
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
