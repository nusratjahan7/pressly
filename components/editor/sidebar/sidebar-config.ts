import {
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  PaintBucket,
  Settings2,
  Sticker,
  type LucideIcon,
} from "lucide-react";
import type { SidebarTab } from "@/store/types";

export interface SidebarItem {
  id: SidebarTab;
  label: string;
  icon: LucideIcon;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "layouts", label: "Layouts", icon: LayoutGrid },
  { id: "backgrounds", label: "Backgrounds", icon: PaintBucket },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "setup", label: "Setup", icon: Settings2 },
];

export const SIDEBAR_META: Record<
  SidebarTab,
  { title: string; description: string }
> = {
  images: {
    title: "Images",
    description: "Photography and artwork for your pages.",
  },
  templates: {
    title: "Templates",
    description: "Finished typographic compositions, ready to use.",
  },
  layouts: {
    title: "Layouts",
    description: "Frame systems for structuring a page.",
  },
  backgrounds: {
    title: "Backgrounds",
    description: "Paper tones and subtle print patterns.",
  },
  stickers: {
    title: "Stickers",
    description: "Vector accents for covers and interiors.",
  },
  setup: {
    title: "Page setup",
    description: "Trim, bleed, margins and binding for this issue.",
  },
};
