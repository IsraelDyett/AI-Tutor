// app/(dashboard)/dashboard/layout-client.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, Menu, BookOpen } from 'lucide-react';

export default function DashboardLayoutClient({
  children,
  activeLevels,
  dbLevels,
}: {
  children: React.ReactNode;
  activeLevels: string[]; 
  dbLevels: { name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const dynamicLevelItems = dbLevels.map((level) => ({
    href: `/dashboard/${level.slug}`, 
    icon: BookOpen,
    label: level.name, 
    level: level.name, 
  }));

  // All potential nav items (Note the added `level` property for the curriculums)
  const allNavItems = [
    ...dynamicLevelItems,
    { href: '/dashboard/sea', icon: BookOpen, label: 'SEA', level: 'SEA' },
    { href: '/dashboard/csec', icon: BookOpen, label: 'CSEC', level: 'CSEC' },
    { href: '/dashboard/cape', icon: BookOpen, label: 'CAPE', level: 'CAPE' },
    { href: '/dashboard/general', icon: Settings, label: 'Settings', level: undefined  },
    { href: '/dashboard/team', label: 'My Organization', icon: Users, level: undefined },
  ];

  // 3. Filter to only show general links AND active levels for this team
  const navItems = allNavItems.filter((item) => !item.level || activeLevels.includes(item.level));

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">Menu</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${isSidebarOpen ? 'block' : 'hidden'
            } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname.startsWith(item.href) && item.level ? 'secondary' : (pathname === item.href ? 'secondary' : 'ghost')}
                  className={`shadow-none my-1 w-full justify-start ${pathname.startsWith(item.href) && item.level ? 'bg-gray-100' : ''
                    }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden h-full">{children}</main>
      </div>
    </div>
  );
}