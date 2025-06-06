"use server";

import { auth } from "@/lib/auth";

// Determine API base URL logic similar to chat action
const PYTHON_AGENT_RUN_ANALYSIS_URL = process.env.PYTHON_AGENT_API_BASE_URL
    ? `${process.env.PYTHON_AGENT_API_BASE_URL}/run-analysis`
    : "/api/python_agent/run-analysis";
    // Default for Vercel. For local, PYTHON_AGENT_API_BASE_URL could be http://localhost:8008

interface RunAnalysisPayload {
  query_str: string;
  market_domain_str: string;
  question_str?: string | null; // Allow null to be passed if optional field is empty
}

// Define the expected response structure from the FastAPI endpoint
// This should align with RunAnalysisResponse in api_python/main.py
interface AgentAnalysisResponse {
  success: boolean;
  state_id?: string | null;
  query_response?: string | null;
  report_dir_relative?: string | null;
  report_filename?: string | null;
  chart_filenames?: string[] | null;
  data_json_filename?: string | null;
  data_csv_filename?: string | null;
  readme_filename?: string | null;
  log_filename?: string | null;
  rag_log_filename?: string | null;
  vector_store_dirname?: string | null;
  error?: string | null;
  warnings?: string | null; // Though not currently in Python response
}


export async function triggerRunAnalysisAction(data: RunAnalysisPayload): Promise<AgentAnalysisResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    console.error("triggerRunAnalysisAction: User not authenticated.");
    return { success: false, error: "User not authenticated. Please log in." };
  }

  if (!data.query_str || data.query_str.trim().length < 5) {
    return { success: false, error: "Query must be at least 5 characters." };
  }
  if (!data.market_domain_str || data.market_domain_str.trim().length < 3) {
    return { success: false, error: "Market domain must be at least 3 characters." };
  }

  const requestUrl = (process.env.NODE_ENV === 'development' && !process.env.PYTHON_AGENT_API_BASE_URL)
    ? `http://localhost:8008/run-analysis` // Hardcode for local dev if Python server is separate and no base URL is set
    : PYTHON_AGENT_RUN_ANALYSIS_URL;

  console.log(`triggerRunAnalysisAction: Sending request to Agent API at ${requestUrl}. Payload:`, data);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_str: data.query_str,
        market_domain_str: data.market_domain_str,
        question_str: data.question_str || null, // Ensure null is sent if empty string or undefined
      }),
    });

    if (!response.ok) {
      let errorData = "No additional error details from server.";
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errJson = await response.json();
            errorData = errJson.detail || JSON.stringify(errJson);
        } else {
            errorData = await response.text();
        }
      } catch (e) {
        errorData = await response.text() || "Could not retrieve error details.";
      }
      console.error(`triggerRunAnalysisAction: API Error: ${response.status} ${response.statusText}. Details: ${errorData}`);
      return {
        success: false,
        error: `Failed to get response from agent analysis. Status: ${response.status}. Details: ${errorData}`,
      };
    }

    const resultData: AgentAnalysisResponse = await response.json();

    // If FastAPI returns an error within a 200 response (e.g. success:false from agent logic)
    if (resultData.error && !resultData.success) {
         console.error(`triggerRunAnalysisAction: FastAPI endpoint returned an error: ${resultData.error}`);
    } else if (!resultData.success) {
        // If success is false but no specific error message, provide a generic one.
        console.error(`triggerRunAnalysisAction: Analysis reported as unsuccessful but no specific error message from FastAPI.`);
        // Ensure resultData has an error field
        return { ...resultData, error: resultData.error || "Analysis reported as unsuccessful by the agent."};
    }


    console.log("triggerRunAnalysisAction: Successfully received response from agent analysis.");
    return resultData;

  } catch (e: any) {
    console.error("triggerRunAnalysisAction: Network error or other exception:", e);
    return {
      success: false,
      error: `Network error or failed to connect to agent analysis service: ${e.message}`,
    };
  }
}
