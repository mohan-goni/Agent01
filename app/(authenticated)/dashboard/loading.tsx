import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Placeholder for KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>

      {/* Placeholder for Search and Action Buttons */}
      <div className="flex flex-col md:flex-row gap-2 items-center">
        <Skeleton className="h-10 flex-grow w-full md:w-auto" />
        <div className="flex gap-2 mt-2 md:mt-0">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Placeholder for Main Content Tabs */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-10 w-full" /> {/* TabsList */}
          {/* Article List Placeholder */}
          <div className="grid gap-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>

        {/* Sidebar for Charts & Stats Placeholder */}
        <div className="lg:col-span-1 space-y-6">
          <Skeleton className="h-72 w-full" /> {/* Chart Placeholder */}
          <Skeleton className="h-72 w-full" /> {/* Chart Placeholder */}
          <Skeleton className="h-24 w-full" /> {/* Stats Placeholder */}
        </div>
      </div>
    </div>
  );
}
