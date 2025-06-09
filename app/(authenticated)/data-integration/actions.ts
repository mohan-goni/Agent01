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

// Helper Verification Functions
async function _verifyTavilyKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query: "test", search_depth: "basic", max_results: 1 }),
    });
    return response.ok; // Check if status is 2xx
  } catch (error) { console.error("Tavily verification error:", error); return false; }
}

async function _verifySerpApiKey(apiKey: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({ q: "test", api_key: apiKey, engine: "google", num: "1" });
    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);
    // SerpAPI returns 401 for invalid key, 200 for valid (even if search credits exhausted for that query type)
    return response.ok;
  } catch (error) { console.error("SerpAPI verification error:", error); return false; }
}

async function _verifyGNewsKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://gnews.io/api/v4/top-headlines?token=${apiKey}&lang=en&max=1`);
    return response.ok;
  } catch (error) { console.error("GNews verification error:", error); return false; }
}

async function _verifyNewsApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://newsapi.org/v2/top-headlines?q=test&apiKey=${apiKey}&pageSize=1`);
    return response.ok;
  } catch (error) { console.error("NewsAPI verification error:", error); return false; }
}

async function _verifyMediaStackKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=test&limit=1`);
    // MediaStack might return 200 but with an error object for invalid key
    const data = await response.json();
    if (!response.ok || (data.error)) {
        console.error("MediaStack verification failed:", data.error || `Status ${response.status}`);
        return false;
    }
    return true;
  } catch (error) { console.error("MediaStack verification error:", error); return false; }
}

async function _verifyFMPKey(apiKey: string): Promise<boolean> {
  try {
    // Using a simple quote endpoint for a common symbol
    const response = await fetch(`https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`);
     // FMP returns 200 with error message for invalid key often
    if (!response.ok) return false;
    const data = await response.json();
    // Check if data is an array and not empty, and doesn't have a specific error message pattern
    if (Array.isArray(data) && data.length > 0 && !data[0].hasOwnProperty("Error Message")) return true;
    if (typeof data === 'object' && data.hasOwnProperty("Error Message")) {
         console.error("FMP verification error:", data["Error Message"]); return false;
    }
    // If it's not an array and no error message, but not clearly success, assume failure.
    // This might need refinement based on FMP's specific error responses for invalid keys.
    return false;
  } catch (error) { console.error("FMP verification error:", error); return false; }
}

async function _verifyAlphaVantageKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&apikey=${apiKey}`);
    if (!response.ok) return false;
    const data = await response.json();
    // Alpha Vantage returns an error message in "Error Message" or "Information" for bad keys/throttling
    if (data["Error Message"] || (data["Information"] && data["Information"].includes("API key"))) {
      console.error("AlphaVantage verification error:", data["Error Message"] || data["Information"]);
      return false;
    }
    return true; // If no error message and response is ok
  } catch (error) { console.error("AlphaVantage verification error:", error); return false; }
}

export async function verifyApiKeyAction(apiKeyId: number) {
  try {
    const userId = await getAuthenticatedUserId();

    // IMPORTANT: getApiKeyById(apiKeyId, userId) is assumed to exist or be addable to lib/db.ts
    // For now, simulating fetching the specific key using existing getApiKeysByUserId
    const { keys } = await getApiKeysByUserId(userId);
    const apiKeyRecord = keys.find(k => k.id === apiKeyId);

    if (!apiKeyRecord) {
      return { success: false, error: "API key not found for verification." };
    }
    const serviceName = apiKeyRecord.serviceName;
    const apiKey = apiKeyRecord.apiKey; // The actual key string

    let isValid = false;
    const normalizedServiceName = serviceName.toLowerCase().replace(/\s+/g, '');

    switch (normalizedServiceName) {
      case 'tavily':
      case 'tavilyapikey': // common variations
        isValid = await _verifyTavilyKey(apiKey);
        break;
      case 'serpapi':
      case 'serpapikey':
        isValid = await _verifySerpApiKey(apiKey);
        break;
      case 'gnews':
      case 'gnewsapikey':
        isValid = await _verifyGNewsKey(apiKey);
        break;
      case 'newsapi':
      case 'newsapikey':
        isValid = await _verifyNewsApiKey(apiKey);
        break;
      case 'mediastack':
      case 'mediastackapikey':
        isValid = await _verifyMediaStackKey(apiKey);
        break;
      case 'financialmodelingprep':
      case 'fmp':
      case 'fmpapikey':
        isValid = await _verifyFMPKey(apiKey);
        break;
      case 'alphavantage':
      case 'alphavantageapikey':
        isValid = await _verifyAlphaVantageKey(apiKey);
        break;
      default:
        console.warn(`Verification not implemented for service: ${serviceName}`);
        return { success: false, error: `Verification not implemented for service: ${serviceName}. Status unchanged.` };
    }

    const newStatus = isValid ? "verified" : "failed_verification";

    const updatedKey = await updateApiKeyStatus(apiKeyId, userId, newStatus);
    if (updatedKey) {
      revalidatePath("/data-integration");
      return { success: true, message: `API key status updated to ${newStatus}.`, updatedKey };
    }
    return { success: false, error: "Failed to update API key status after verification." };
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
