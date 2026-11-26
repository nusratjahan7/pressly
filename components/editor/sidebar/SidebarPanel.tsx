"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { useEditorStore } from "@/store";
import type { SidebarTab } from "@/store/types";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { SIDEBAR_META } from "@/components/editor/sidebar/sidebar-config";
import { ImagesPanel } from "@/components/editor/sidebar/panels/ImagesPanel";
import { TemplatesPanel } from "@/components/editor/sidebar/panels/TemplatesPanel";
import { LayoutsPanel } from "@/components/editor/sidebar/panels/LayoutsPanel";
import { BackgroundsPanel } from "@/components/editor/sidebar/panels/BackgroundsPanel";
import { StickersPanel } from "@/components/editor/sidebar/panels/StickersPanel";
import { SetupPanel } from "@/components/editor/sidebar/panels/SetupPanel";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";

function PanelBody({ tab }: { tab: SidebarTab }) {
  const openPageSetup = useEditorStore((state) => state.openPageSetup);

  switch (tab) {
    case "images":
      return <ImagesPanel />;
    case "templates":
      return <TemplatesPanel />;
    case "layouts":
      return <LayoutsPanel />;
    case "backgrounds":
      return <BackgroundsPanel />;
    case "stickers":
      return <StickersPanel />;
    case "setup":
      return (
        <SetupPanel
          onOpenDialog={() => openPageSetup("setup")}
          onCreateProject={() => openPageSetup("new")}
        />
      );
  }
}

export function SidebarPanel() {
  const activeTab = useEditorStore((state) => state.ui.activeTab);
  const sidebarOpen = useEditorStore((state) => state.ui.sidebarOpen);
  const setSidebarOpen = useEditorStore((state) => state.setSidebarOpen);
  const isTablet = useMediaQuery("(max-width: 1023px)");
  const isCompactDesktop = useMediaQuery("(max-width: 1279px)");
  const meta = SIDEBAR_META[activeTab];

  const close = () => setSidebarOpen(false);

  return (
    <>
      {!isTablet ? (
        <AnimatePresence initial={false}>
          {sidebarOpen ? (
            <motion.aside
              key="sidebar-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isCompactDesktop ? 268 : 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 shrink-0 overflow-hidden border-r border-line bg-surface"
            >
              <div className="flex h-full w-[268px] flex-col xl:w-80">
                <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-2.5 pt-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                      Library
                    </span>
                    <h2 className="text-[13.5px] font-semibold leading-5 tracking-[-0.015em] text-ink">
                      {meta.title}
                    </h2>
                    {activeTab !== "layouts" ? (
                      <p className="text-[11px] leading-4 text-ink-muted">
                        {meta.description}
                      </p>
                    ) : null}
                  </div>
                  <IconButton
                    icon={PanelLeftClose}
                    label="Collapse panel"
                    tooltip="Collapse panel"
                    size="sm"
                    variant="ghost"
                    onClick={close}
                    className="-mr-1 -mt-0.5 shrink-0"
                  />
                </header>
                <div
                  id="sidebar-panel"
                  role="tabpanel"
                  aria-labelledby={`tab-${activeTab}`}
                  className={cn(
                    "min-h-0 flex-1",
                    activeTab === "layouts" || activeTab === "stickers"
                      ? "flex flex-col overflow-hidden"
                      : "overflow-y-auto px-4 py-4",
                  )}
                >
                  <PanelBody tab={activeTab} />
                </div>
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>
      ) : null}

      {isTablet ? (
        <Modal
          open={sidebarOpen}
          onClose={close}
          title={meta.title}
          description={meta.description}
          variant="drawer"
          dismissible
          bodyClassName="p-0"
        >
          <div
            id="sidebar-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className={
              activeTab === "layouts" || activeTab === "stickers"
                ? "flex h-[72dvh] flex-col overflow-hidden"
                : "px-4 py-4"
            }
          >
            <PanelBody tab={activeTab} />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
