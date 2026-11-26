import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { EditorShell } from "@/components/editor/EditorShell";

export default function Page() {
  return (
    <ThemeProvider>
      <EditorShell />
    </ThemeProvider>
  );
}
