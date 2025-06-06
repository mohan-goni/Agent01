import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiKeysTab from "./api-keys-tab";
import DataSourcesTab from "./data-sources-tab"; // Import the new DataSourcesTab
import { getApiKeysAction, getDataSourcesAction } from "./actions"; // Import both actions
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Define types here or import from a shared location
interface ApiKey {
  id: number;
  serviceName: string;
  apiKey: string; // Masked or full, depending on context if ever directly displayed from here
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface DataSource {
  id: number;
  name: string;
  type: string;
  config: any; // JSONB
  status: string;
  lastSyncedAt?: Date | string | null;
  isEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default async function DataIntegrationPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login?message=Session_expired_DI_Page");
  }

  // Fetch initial data for both tabs in parallel
  const [apiKeysResult, dataSourcesResult] = await Promise.all([
    getApiKeysAction(),
    getDataSourcesAction()
  ]);

  // Process API keys data for the client component
  const apiKeysForClient: ApiKey[] = (apiKeysResult.keys || []).map(key => ({
    ...key,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  }));

  // Process Data Sources data for the client component
  const dataSourcesForClient: DataSource[] = (dataSourcesResult.sources || []).map(source => ({
    ...source,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    lastSyncedAt: source.lastSyncedAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Data Integration</h1>
        <p className="text-muted-foreground mt-1">
          Manage your API keys and connect various data sources to enrich your market intelligence.
        </p>
      </div>
      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:max-w-md">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-4">
          {apiKeysResult.error && (
            <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/30">
              <CardHeader><CardTitle className="text-red-700 dark:text-red-400">Error Loading API Keys</CardTitle></CardHeader>
              <CardContent><p className="text-red-600 dark:text-red-300">{apiKeysResult.error}</p></CardContent>
            </Card>
          )}
          {!apiKeysResult.error && <ApiKeysTab initialApiKeys={apiKeysForClient} />}
        </TabsContent>

        <TabsContent value="data-sources" className="mt-4">
          {dataSourcesResult.error && (
             <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/30">
              <CardHeader><CardTitle className="text-red-700 dark:text-red-400">Error Loading Data Sources</CardTitle></CardHeader>
              <CardContent><p className="text-red-600 dark:text-red-300">{dataSourcesResult.error}</p></CardContent>
            </Card>
          )}
          {!dataSourcesResult.error && <DataSourcesTab initialDataSources={dataSourcesForClient} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
