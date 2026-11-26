import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-canvas"
      aria-busy="true"
      role="status"
    >
      <span className="sr-only">Loading your issue…</span>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
        <Skeleton className="size-7" rounded="md" />
        <Skeleton className="hidden h-3 w-14 sm:block" rounded="full" />
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <Skeleton className="h-5 w-32" rounded="sm" />
        <Skeleton className="ml-auto h-7 w-7" rounded="full" />
        <Skeleton className="h-8 w-24" rounded="sm" />
        <Skeleton className="h-8 w-9 sm:w-28" rounded="sm" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[76px] shrink-0 flex-col items-center gap-2 border-r border-line bg-surface py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex flex-col items-center gap-1.5">
              <Skeleton className="size-9" rounded="md" />
              <Skeleton className="h-2 w-8" rounded="full" />
            </div>
          ))}
        </div>

        <div className="hidden w-80 shrink-0 flex-col gap-5 border-r border-line bg-surface p-4 lg:flex">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-2.5 w-14" rounded="full" />
            <Skeleton className="h-4 w-24" rounded="sm" />
            <Skeleton className="h-2.5 w-full" rounded="full" />
          </div>
          <Skeleton className="h-24 w-full" rounded="lg" />
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/5] w-full" rounded="md" />
            ))}
          </div>
        </div>

        <div className="dotted-canvas relative flex min-w-0 flex-1 items-center justify-center p-8 sm:p-12">
          <div className="flex w-full max-w-[680px] items-center justify-center gap-px">
            <Skeleton className="aspect-[1/1.414] w-1/2 max-w-[300px] shadow-paper" rounded="sm" />
            <Skeleton className="aspect-[1/1.414] w-1/2 max-w-[300px] shadow-paper" rounded="sm" />
          </div>
        </div>
      </div>

      <div className="flex h-32 shrink-0 items-center gap-3 border-t border-line bg-surface px-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <Skeleton className="h-20 w-14" rounded="sm" />
            <Skeleton className="h-2 w-10" rounded="full" />
          </div>
        ))}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Skeleton className="h-8 w-20" rounded="sm" />
          <Skeleton className="h-8 w-20" rounded="sm" />
        </div>
      </div>
    </div>
  );
}
