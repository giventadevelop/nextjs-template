"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultLinks, additionalLinks } from "@/config/nav";

export interface SidebarItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarLinkProps {
  link: SidebarItem;
  active?: boolean;
  className?: string;
}

function SidebarLink({ link, active, className }: SidebarLinkProps) {
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
        active && "bg-gray-100 text-gray-900",
        className
      )}
    >
      <link.icon className="h-4 w-4" />
      <span>{link.title}</span>
    </Link>
  );
}

interface SidebarLinkGroupProps {
  links: SidebarItem[];
  title?: string;
  border?: boolean;
}

function SidebarLinkGroup({ links, title, border }: SidebarLinkGroupProps) {
  const fullPathname = usePathname();
  const pathname = "/" + fullPathname.split("/")[1];

  return (
    <div className={border ? "border-border border-t my-8 pt-4" : ""}>
      {title ? (
        <h4 className="px-2 mb-2 text-xs uppercase text-muted-foreground tracking-wider">
          {title}
        </h4>
      ) : null}
      <ul>
        {links.map((link) => (
          <li key={link.title}>
            <SidebarLink link={link} active={pathname === link.href} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SidebarItems() {
  return (
    <>
      <SidebarLinkGroup links={defaultLinks} />
      {additionalLinks.length > 0
        ? additionalLinks.map((l) => (
          <SidebarLinkGroup
            links={l.links}
            title={l.title}
            border
            key={l.title}
          />
        ))
        : null}
    </>
  );
}
