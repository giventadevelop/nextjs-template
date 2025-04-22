import { type SidebarItem } from "@/components/SidebarItems";
import { Cog, User, HomeIcon } from "lucide-react";

type AdditionalLinks = {
  title: string;
  links: SidebarItem[];
};

export const defaultLinks: SidebarItem[] = [
  { href: "/dashboard", title: "Home", icon: HomeIcon },
  { href: "/profile", title: "Profile", icon: User },
  { href: "/settings", title: "Settings", icon: Cog },
];

export const additionalLinks: AdditionalLinks[] = [];
