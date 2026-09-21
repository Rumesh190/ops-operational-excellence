import { Skeleton } from "@/components/ui/skeleton";

export function OpsRecordLoading({ label = "record" }: { label?: string }) {
  return <div className="grid w-full gap-5" aria-label={`Loading ${label}`} aria-busy="true"><Skeleton className="h-24 w-full" /><Skeleton className="h-10 w-full" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div><div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" /></div></div>;
}
