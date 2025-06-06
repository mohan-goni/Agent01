"use client";

import type React from "react";
import { useState, useTransition, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import {
  getApiKeysAction,
  saveApiKeyAction,
  deleteApiKeyAction,
  verifyApiKeyAction,
} from "./actions";

// Define the Zod schema for the form
const apiKeySchema = z.object({
  serviceName: z.string().min(2, { message: "Service name must be at least 2 characters." }).max(100),
  apiKey: z.string().min(10, { message: "API key must be at least 10 characters." }), // Basic length check
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

interface ApiKey {
  id: number;
  serviceName: string;
  apiKey: string; // The actual key, will be masked for display
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // userId is not typically sent to client for direct display in a list
}

interface ApiKeysTabProps {
  initialApiKeys: ApiKey[];
}

export default function ApiKeysTab({ initialApiKeys }: ApiKeysTabProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showKeyId, setShowKeyId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { serviceName: "", apiKey: "" },
  });

  // Effect to update state if initialApiKeys prop changes
  useEffect(() => {
    setApiKeys(initialApiKeys);
  }, [initialApiKeys]);


  const fetchApiKeys = () => {
    startTransition(async () => {
        const result = await getApiKeysAction();
        if (result.success) {
            setApiKeys(result.keys as ApiKey[]); // Type assertion
        } else {
            setError(result.error || "Failed to fetch API keys.");
        }
    });
  };

  const onSubmit: SubmitHandler<ApiKeyFormValues> = async (data) => {
    setError(null);
    startTransition(async () => {
      const result = await saveApiKeyAction(data.serviceName, data.apiKey);
      if (result.success) {
        // setApiKeys((prev) => [...prev, result.newKey as ApiKey]); // Optimistic update, or re-fetch
        fetchApiKeys(); // Re-fetch to get the latest list including the new key with its ID
        reset(); // Reset form fields
      } else {
        setError(result.error || "Failed to save API key.");
      }
    });
  };

  const handleDelete = (id: number) => {
    setError(null);
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
        return;
    }
    startTransition(async () => {
      const result = await deleteApiKeyAction(id);
      if (result.success) {
        // setApiKeys((prev) => prev.filter((key) => key.id !== id)); // Optimistic update
        fetchApiKeys(); // Re-fetch
      } else {
        setError(result.error || "Failed to delete API key.");
      }
    });
  };

  const handleVerify = (id: number) => {
    setError(null);
    startTransition(async () => {
      const result = await verifyApiKeyAction(id);
      if (result.success && result.updatedKey) {
        // setApiKeys((prev) => prev.map(key => key.id === id ? result.updatedKey as ApiKey : key)); // Optimistic
        fetchApiKeys(); // Re-fetch
      } else {
        setError(result.error || "Failed to verify API key.");
      }
    });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "********";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified': return 'success';
      case 'unverified': return 'outline';
      case 'failed_verification': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New API Key</CardTitle>
          <CardDescription>Enter the details for the new API key you want to integrate.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="serviceName">Service Name</Label>
                <Input id="serviceName" placeholder="e.g., OpenAI, Google Maps" {...register("serviceName")} />
                {errors.serviceName && <p className="text-xs text-red-500">{errors.serviceName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" type="password" placeholder="Enter your API key" {...register("apiKey")} />
                {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey.message}</p>}
              </div>
            </div>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add API Key
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Managed API Keys</CardTitle>
          <CardDescription>View, verify, and manage your existing API keys.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && apiKeys.length === 0 && <p className="text-center text-muted-foreground">Loading keys...</p>}
          {!isPending && apiKeys.length === 0 && (
            <p className="text-center text-muted-foreground py-4">No API keys added yet. Add one above to get started.</p>
          )}
          {apiKeys.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.serviceName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{showKeyId === key.id ? key.apiKey : maskApiKey(key.apiKey)}</span>
                        <Button variant="ghost" size="icon" onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)} title={showKeyId === key.id ? "Hide key" : "Show key"}>
                          {showKeyId === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(key.status) as any} className="capitalize">
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(key.id)}
                        disabled={isPending || key.status === 'verified'}
                        title={key.status === 'verified' ? "Key already verified" : "Verify Key"}
                      >
                        {key.status === 'verified' ? <CheckCircle className="mr-1 h-4 w-4 text-green-500" /> : <AlertTriangle className="mr-1 h-4 w-4 text-yellow-500" />}
                        {key.status === 'verified' ? 'Verified' : 'Verify'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(key.id)}
                        disabled={isPending}
                        title="Delete Key"
                      >
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
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
