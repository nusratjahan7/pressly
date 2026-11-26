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
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";

function PanelBody({ tab }: { tab: SidebarTab }) {
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
  }
}

export function SidebarPanel() {
  const activeTab = useEditorStore((state) => state.ui.activeTab);
  const sidebarOpen = useEditorStore((state) => state.ui.sidebarOpen);
  const setSidebarOpen = useEditorStore((state) => state.setSidebarOpen);
  const isTablet = useMediaQuery("(max-width: 1023px)");
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
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 shrink-0 overflow-hidden border-r border-line bg-surface"
            >
              <div className="flex h-full w-80 flex-col">
                <header className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3.5 pt-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
                      Library
                    </span>
                    <h2 className="text-[14px] font-semibold leading-5 tracking-[-0.015em] text-ink">
                      {meta.title}
                    </h2>
                    <p className="text-[11px] leading-4 text-ink-muted">
                      {meta.description}
                    </p>
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
                  className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
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
            className="px-4 py-4"
          >
            <PanelBody tab={activeTab} />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
