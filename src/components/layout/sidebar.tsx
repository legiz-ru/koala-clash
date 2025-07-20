import { Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent, SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"
import { t } from 'i18next';
import { cn } from '@root/lib/utils';

import {
  Home,
  Users,
  Server,
  Cable,
  ListChecks,
  FileText,
  Settings, EarthLock,
} from 'lucide-react';
import { UpdateButton } from "@/components/layout/update-button";
import React from "react";
import { SheetClose } from '@/components/ui/sheet';

const menuItems = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Profiles', url: '/profile', icon: Users },
  { title: 'Proxies', url: '/proxies', icon: Server },
  { title: 'Connections', url: '/connections', icon: Cable },
  { title: 'Rules', url: '/rules', icon: ListChecks },
  { title: 'Logs', url: '/logs', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { isMobile } = useSidebar();
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenuButton>
          <EarthLock/>
          <span className="font-semibold group-data-[state=collapsed]:hidden">
            Clash Koala
          </span>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const linkElement = (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                      'data-[active=true]:font-semibold data-[active=true]:border'
                    )}
                  >
                    <item.icon className="h-4 w-4 drop-shadow-md" />
                    {t(item.title)}
                  </Link>
                )
                return (
                <SidebarMenuItem key={item.title} className="my-1">
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={t(item.title)}>
                    {isMobile ? (
                        <SheetClose asChild>
                          {linkElement}
                        </SheetClose>
                      ) : (
                        linkElement
                      )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="w-full flex justify-center">
          <UpdateButton className="bg-green-700 hover:bg-green-500 hover:text-white text-white text-shadow-md" />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
