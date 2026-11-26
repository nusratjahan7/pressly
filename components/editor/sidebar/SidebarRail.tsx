"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEditorStore } from "@/store";
import type { SidebarTab } from "@/store/types";
import { Tabs } from "@/components/ui/tabs";
import { IconButton } from "@/components/ui/icon-button";
import { SIDEBAR_ITEMS } from "@/components/editor/sidebar/sidebar-config";

export function SidebarRail() {
  const activeTab = useEditorStore((state) => state.ui.activeTab);
  const sidebarOpen = useEditorStore((state) => state.ui.sidebarOpen);
  const setActiveTab = useEditorStore((state) => state.setActiveTab);
  const setSidebarOpen = useEditorStore((state) => state.setSidebarOpen);

  const handleChange = (tab: SidebarTab) => {
    if (tab === activeTab) {
      setSidebarOpen(!sidebarOpen);
      return;
    }
    setActiveTab(tab);
    setSidebarOpen(true);
  };

  return (
    <aside
      aria-label="Editor libraries"
      className="relative z-30 flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3"
    >
      <Tabs
        items={SIDEBAR_ITEMS}
        value={activeTab}
        onChange={handleChange}
        ariaLabel="Libraries"
        orientation="vertical"
        variant="rail"
        panelId="sidebar-panel"
        className="items-center gap-1"
      />

      <div className="mt-auto flex flex-col items-center gap-1">
        <IconButton
          icon={sidebarOpen ? PanelLeftClose : PanelLeftOpen}
          label={sidebarOpen ? "Collapse panel" : "Expand panel"}
          tooltip={sidebarOpen ? "Collapse panel" : "Expand panel"}
          tooltipSide="right"
          size="sm"
          variant="ghost"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </aside>
  );
}
