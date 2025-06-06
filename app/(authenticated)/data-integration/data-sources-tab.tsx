"use client";

import type React from "react";
import { useState, useTransition, useEffect } from "react";
import { useForm, type SubmitHandler, useWatch } from "react-hook-form"; // Changed to useWatch, or can use control from useForm
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, CheckCircle, AlertTriangle, Loader2, PlusCircle, Power, Zap } from "lucide-react";
import {
  getDataSourcesAction,
  saveDataSourceAction,
  updateDataSourceAction,
  deleteDataSourceAction,
  toggleDataSourceAction,
  testDataSourceAction,
} from "./actions";

// Zod schema for data source form
const dataSourceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(100),
  type: z.string().min(1, "Type is required."), // Example types: 'api', 'web-scraper', 'database'
  config: z.string().refine((val) => { // Storing config as JSON string in form
    try { JSON.parse(val); return true; } catch { return false; }
  }, { message: "Configuration must be valid JSON." }),
  isEnabled: z.boolean().optional(),
});

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

// Type for Data Source object matching DB schema and actions
interface DataSource {
  id: number;
  name: string;
  type: string;
  config: any; // JSONB in DB, parsed object here
  status: string;
  lastSyncedAt?: Date | string | null;
  isEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface DataSourcesTabProps {
  initialDataSources: DataSource[];
}

export default function DataSourcesTab({ initialDataSources }: DataSourcesTabProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>(initialDataSources);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<DataSource | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch, // Added watch here
    formState: { errors },
  } = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: { name: "", type: "", config: "{}", isEnabled: true },
  });

  useEffect(() => {
    setDataSources(initialDataSources);
  }, [initialDataSources]);

  const fetchSources = () => {
    startTransition(async () => {
      const result = await getDataSourcesAction();
      if (result.success) {
        setDataSources(result.sources as DataSource[]);
      } else {
        setError(result.error || "Failed to fetch data sources.");
      }
    });
  };

  const handleFormSubmit: SubmitHandler<DataSourceFormValues> = async (data) => {
    setError(null);
    let parsedConfig;
    try {
      parsedConfig = JSON.parse(data.config);
    } catch (e) {
      setError("Invalid JSON configuration.");
      return;
    }

    startTransition(async () => {
      const action = editingDataSource
        ? updateDataSourceAction(editingDataSource.id, { ...data, config: parsedConfig })
        : saveDataSourceAction({ ...data, config: parsedConfig });

      const result = await action;
      if (result.success) {
        fetchSources();
        setIsFormOpen(false);
        setEditingDataSource(null);
        reset({ name: "", type: "", config: "{}", isEnabled: true });
      } else {
        setError(result.error || `Failed to ${editingDataSource ? 'update' : 'save'} data source.`);
      }
    });
  };

  const handleEdit = (source: DataSource) => {
    setEditingDataSource(source);
    setValue("name", source.name);
    setValue("type", source.type);
    setValue("config", JSON.stringify(source.config || {}, null, 2));
    setValue("isEnabled", source.isEnabled);
    setIsFormOpen(true);
  };

  const handleDelete = (id: number) => {
    setError(null);
    if (!confirm("Are you sure you want to delete this data source? This may affect dependent services.")) {
        return;
    }
    startTransition(async () => {
      const result = await deleteDataSourceAction(id);
      if (result.success) {
        fetchSources();
      } else {
        setError(result.error || "Failed to delete data source.");
      }
    });
  };

  const handleToggleEnable = (id: number, currentIsEnabled: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await toggleDataSourceAction(id, !currentIsEnabled);
      if (result.success) {
        fetchSources();
      } else {
        setError(result.error || "Failed to toggle data source status.");
      }
    });
  };

  const handleTestConnection = (id: number) => {
    setError(null);
    startTransition(async () => {
      const result = await testDataSourceAction(id);
       if (result.success) {
        // alert(result.message); // Or use a toast
        fetchSources(); // To update status and lastSyncedAt
      } else {
        setError(result.error || "Failed to test data source connection.");
      }
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': case 'verified': return 'success';
      case 'pending': case 'unverified': return 'outline';
      case 'error': case 'failed_verification': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingDataSource(null);
            reset({ name: "", type: "", config: "{}", isEnabled: true });
            setError(null);
          }
      }}>
        <DialogTrigger asChild>
          <Button onClick={() => { setEditingDataSource(null); reset(); setIsFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Data Source
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDataSource ? "Edit" : "Add New"} Data Source</DialogTitle>
            <DialogDescription>
              Configure the details for your data source connection.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            {error && <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-md">{error}</p>}
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="e.g., My Company API, Competitor X Scraper" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value) => setValue("type", value, { shouldValidate: true })} defaultValue={editingDataSource?.type || ""}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select data source type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="web-scraper">Web Scraper</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  {/* Add other types as needed */}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <Label htmlFor="config">Configuration (JSON)</Label>
              <Textarea id="config" placeholder='{ "url": "https://api.example.com", "apiKeyRef": "your-api-key-id" }' {...register("config")} rows={5} />
              {errors.config && <p className="text-xs text-red-500 mt-1">{errors.config.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="isEnabled" {...register("isEnabled")} defaultChecked={true}
                        checked={watch("isEnabled")}
                        onCheckedChange={(checked) => setValue("isEnabled", checked)}
                />
                <Label htmlFor="isEnabled">Enable this data source</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingDataSource ? "Save Changes" : "Add Data Source"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Managed Data Sources</CardTitle>
          <CardDescription>View, configure, and manage your data sources.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && dataSources.length === 0 && <p className="text-center text-muted-foreground py-4">Loading data sources...</p>}
          {!isPending && dataSources.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No data sources configured yet. Add one to begin.</p>
          )}
          {dataSources.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSources.map((source) => (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">{source.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{source.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(source.status) as any} className="capitalize">
                        {source.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{source.lastSyncedAt ? new Date(source.lastSyncedAt).toLocaleString() : 'Never'}</TableCell>
                    <TableCell>
                      <Switch
                        checked={source.isEnabled}
                        onCheckedChange={() => handleToggleEnable(source.id, source.isEnabled)}
                        disabled={isPending}
                        aria-label={source.isEnabled ? "Disable" : "Enable"}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button variant="ghost" size="icon" onClick={() => handleTestConnection(source.id)} disabled={isPending} title="Test Connection">
                        <Zap className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(source)} disabled={isPending} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(source.id)} disabled={isPending} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
// Note: The duplicate import of useForm was removed.
// `watch` can be obtained from `useForm` or `useWatch` can be used with `control`.
// For the Switch `checked={watch("isEnabled")}` to work, `control` from `useForm` should be passed if using `useWatch`,
// or `watch` should be destructured from `useForm` results.
// The current `register("isEnabled")` for Switch might not correctly bind two-way.
// A more robust way for Switch with RHF is to use `<Controller>` component from RHF or manually use `setValue` in `onCheckedChange`.
// The current implementation `checked={watch("isEnabled")}` requires `watch` to be available.
// Let's assume `watch` is destructured from `useForm()` call.
// The `setValue("isEnabled", checked)` in onCheckedChange is good.
