"use server";

import { auth } from "@/lib/auth";
import {
  getApiKeysByUserId,
  createApiKey,
  deleteApiKeyById,
  updateApiKeyStatus,
  // Import Data Source CRUD functions
  getDataSourcesByUserId,
  createDataSource,
  updateDataSource,
  deleteDataSourceById as deleteDbDataSourceById // Alias to avoid name clash
} from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { dataSources } from "@/db/schema"; // Import type for updates

// Helper to get authenticated user ID
async function getAuthenticatedUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated.");
  }
  return session.user.id;
}

export async function getApiKeysAction() {
  try {
    const userId = await getAuthenticatedUserId();
    const keys = await getApiKeysByUserId(userId);
    return { success: true, keys };
  } catch (error: any) {
    console.error("Error in getApiKeysAction:", error);
    return { success: false, error: error.message || "Failed to fetch API keys.", keys: [] };
  }
}

export async function saveApiKeyAction(serviceName: string, apiKey: string) {
  if (!serviceName || !apiKey) {
    return { success: false, error: "Service name and API key are required." };
  }
  try {
    const userId = await getAuthenticatedUserId();
    // Basic validation
    if (serviceName.trim().length === 0) {
      return { success: false, error: "Service name cannot be empty." };
    }
    if (apiKey.trim().length === 0) {
      return { success: false, error: "API key cannot be empty." };
    }

    const newKey = await createApiKey(userId, serviceName.trim(), apiKey.trim());
    revalidatePath("/data-integration"); // Revalidate the page to show the new key
    return { success: true, newKey };
  } catch (error: any) {
    console.error("Error in saveApiKeyAction:", error);
    // Could check for unique constraint violation if serviceName per user should be unique
    // e.g. if (error.code === 'P2002' && error.meta?.target?.includes('serviceName'))
    return { success: false, error: error.message || "Failed to save API key." };
  }
}

export async function deleteApiKeyAction(apiKeyId: number) {
  try {
    const userId = await getAuthenticatedUserId();
    const success = await deleteApiKeyById(apiKeyId, userId);
    if (success) {
      revalidatePath("/data-integration");
      return { success: true, message: "API key deleted." };
    }
    return { success: false, error: "Failed to delete API key or key not found." };
  } catch (error: any) {
    console.error("Error in deleteApiKeyAction:", error);
    return { success: false, error: error.message || "Failed to delete API key." };
  }
}

export async function verifyApiKeyAction(apiKeyId: number) {
  try {
    const userId = await getAuthenticatedUserId();
    // Simulate verification process
    // In a real scenario, this would involve making a test call with the key.
    // For now, we'll just try to update its status.
    // This simulation can be expanded later.

    // Simulate a successful verification for now
    const newStatus = "verified"; // Can also be 'failed_verification'

    const updatedKey = await updateApiKeyStatus(apiKeyId, userId, newStatus);
    if (updatedKey) {
      revalidatePath("/data-integration");
      return { success: true, message: `API key status updated to ${newStatus}.`, updatedKey };
    }
    return { success: false, error: "Failed to verify API key or key not found." };
  } catch (error: any) {
    console.error("Error in verifyApiKeyAction:", error);
    return { success: false, error: error.message || "Failed to verify API key." };
  }
}

// --- Data Source Actions ---

export async function getDataSourcesAction() {
  try {
    const userId = await getAuthenticatedUserId();
    const sources = await getDataSourcesByUserId(userId);
    return { success: true, sources };
  } catch (error: any) {
    console.error("Error in getDataSourcesAction:", error);
    return { success: false, error: error.message || "Failed to fetch data sources.", sources: [] };
  }
}

interface SaveDataSourceData {
  name: string;
  type: string;
  config: any; // JSON
  isEnabled?: boolean;
  status?: string;
}

export async function saveDataSourceAction(data: SaveDataSourceData) {
  if (!data.name || !data.type || !data.config) {
    return { success: false, error: "Name, type, and configuration are required." };
  }
  try {
    const userId = await getAuthenticatedUserId();
    if (data.name.trim().length === 0) {
      return { success: false, error: "Data source name cannot be empty." };
    }
    if (data.type.trim().length === 0) {
      return { success: false, error: "Data source type cannot be empty." };
    }
    // Basic config validation (ensure it's an object)
    if (typeof data.config !== 'object' || data.config === null) {
        return { success: false, error: "Configuration must be a valid JSON object." };
    }


    const newSource = await createDataSource(
      userId,
      data.name.trim(),
      data.type.trim(),
      data.config,
      data.status || 'pending',
      data.isEnabled !== undefined ? data.isEnabled : true
    );
    revalidatePath("/data-integration");
    return { success: true, newSource };
  } catch (error: any) {
    console.error("Error in saveDataSourceAction:", error);
    return { success: false, error: error.message || "Failed to save data source." };
  }
}

// Use a more specific type for updates if possible, excluding id, userId, createdAt
type DataSourceUpdatePayload = Partial<Omit<InstanceType<typeof dataSources>['$inferInsert'], 'id' | 'userId' | 'createdAt'>>;

export async function updateDataSourceAction(dataSourceId: number, updates: DataSourceUpdatePayload) {
  try {
    const userId = await getAuthenticatedUserId();
    // Ensure config is an object if provided in updates
    if (updates.config && (typeof updates.config !== 'object' || updates.config === null)) {
        return { success: false, error: "Configuration must be a valid JSON object." };
    }

    const updatedSource = await updateDataSource(dataSourceId, userId, updates);
    if (updatedSource) {
      revalidatePath("/data-integration");
      return { success: true, updatedSource };
    }
    return { success: false, error: "Failed to update data source or source not found." };
  } catch (error: any) {
    console.error("Error in updateDataSourceAction:", error);
    return { success: false, error: error.message || "Failed to update data source." };
  }
}

export async function deleteDataSourceAction(dataSourceId: number) {
  try {
    const userId = await getAuthenticatedUserId();
    const success = await deleteDbDataSourceById(dataSourceId, userId); // Use aliased import
    if (success) {
      revalidatePath("/data-integration");
      return { success: true, message: "Data source deleted." };
    }
    return { success: false, error: "Failed to delete data source or source not found." };
  } catch (error: any) {
    console.error("Error in deleteDataSourceAction:", error);
    return { success: false, error: error.message || "Failed to delete data source." };
  }
}

export async function toggleDataSourceAction(dataSourceId: number, isEnabled: boolean) {
  try {
    const userId = await getAuthenticatedUserId();
    const updatedSource = await updateDataSource(dataSourceId, userId, { isEnabled });
    if (updatedSource) {
      revalidatePath("/data-integration");
      return { success: true, updatedSource };
    }
    return { success: false, error: "Failed to toggle data source or source not found." };
  } catch (error: any) {
    console.error("Error in toggleDataSourceAction:", error);
    return { success: false, error: error.message || "Failed to toggle data source." };
  }
}

export async function testDataSourceAction(dataSourceId: number) {
  try {
    const userId = await getAuthenticatedUserId();
    // Simulate test: In a real app, connect to the data source using its config.
    // For now, just update status to 'active' if pending/error, or 'error' if it was active (to simulate a failure).
    // This is a very basic simulation.
    const sources = await getDataSourcesByUserId(userId);
    const sourceToTest = sources.find(s => s.id === dataSourceId);

    if (!sourceToTest) {
      return { success: false, error: "Data source not found." };
    }

    // Simulate a successful test for now
    const newStatus = sourceToTest.status === 'active' ? 'error' : 'active';

    const updatedSource = await updateDataSource(dataSourceId, userId, { status: newStatus, lastSyncedAt: new Date() });
    if (updatedSource) {
      revalidatePath("/data-integration");
      return { success: true, message: `Data source connection tested. Status: ${newStatus}.`, updatedSource };
    }
    return { success: false, error: "Failed to test data source." };
  } catch (error: any) {
    console.error("Error in testDataSourceAction:", error);
    return { success: false, error: error.message || "Failed to test data source." };
  }
}
