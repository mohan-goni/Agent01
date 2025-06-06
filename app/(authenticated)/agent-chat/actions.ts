"use server";

import { auth } from "@/lib/auth";
// Assuming PYTHON_AGENT_API_BASE_URL is set in environment for flexibility
// For Vercel deployment, this would typically not be needed if using relative paths handled by vercel.json rewrites.
// For local development, if Next.js is on 3000 and Python on 8008, this would be 'http://localhost:8008'.
// However, vercel.json routes /api/python_agent/* to the python app, so on Vercel,
// the Next.js app can call its own /api/python_agent/chat path.
// For local `vercel dev`, this routing should also work.
// If running `pnpm dev` for Next.js and `python api_python/main.py` separately without `vercel dev`,
// then an absolute URL to the Python service (e.g. http://localhost:8008/chat) would be needed here.

const PYTHON_AGENT_URL = process.env.PYTHON_AGENT_API_BASE_URL
    ? `${process.env.PYTHON_AGENT_API_BASE_URL}/chat`
    : "/api/python_agent/chat";
    // Defaults to relative path for Vercel's routing.
    // process.env.PYTHON_AGENT_API_BASE_URL could be http://localhost:8008 if Python runs separately on 8008
    // and the FastAPI endpoint in main.py is just /chat.

export async function sendMessageToAgentAction(message: string, chatId: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    console.error("sendMessageToAgentAction: User not authenticated.");
    return {
      error: "User not authenticated. Please log in.",
      responseText: null,
    };
  }

  if (!chatId) {
    console.error("sendMessageToAgentAction: Chat session ID is missing.");
    return {
      error: "Chat session ID is missing.",
      responseText: null,
    };
  }

  if (!message || message.trim() === "") {
    console.error("sendMessageToAgentAction: Message cannot be empty.");
    return {
      error: "Message cannot be empty.",
      responseText: null,
    };
  }

  const requestUrl = (process.env.NODE_ENV === 'development' && !process.env.PYTHON_AGENT_API_BASE_URL)
    ? `http://localhost:8008/chat` // Hardcode for local dev if Python server is separate and no base URL is set
    : PYTHON_AGENT_URL;

  console.log(`sendMessageToAgentAction: Sending message to Agent API at ${requestUrl}. Session ID: ${chatId}`);

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Potentially add an API key or other auth header if the Python API is further secured
        // "Authorization": `Bearer ${process.env.PYTHON_API_INTERNAL_SECRET}`
      },
      body: JSON.stringify({
        message: message,
        session_id: chatId,
      }),
    });

    if (!response.ok) {
      let errorData = "No additional error details from server.";
      try {
        // Try to parse error response if JSON, otherwise use text
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errJson = await response.json();
            errorData = errJson.detail || JSON.stringify(errJson);
        } else {
            errorData = await response.text();
        }
      } catch (e) {
        // Failed to parse error response body, use text from initial attempt or generic message
        errorData = await response.text() || "Could not retrieve error details.";
      }
      console.error(`sendMessageToAgentAction: API Error: ${response.status} ${response.statusText}. Details: ${errorData}`);
      return {
        error: `Failed to get response from agent. Status: ${response.status}. Details: ${errorData}`,
        responseText: null,
      };
    }

    const data = await response.json();

    // Check if FastAPI returned an error within a 200 response (less common, but possible)
    if (data.error) {
      console.error(`sendMessageToAgentAction: FastAPI endpoint returned an error: ${data.error}`);
      return { error: data.error, responseText: null };
    }

    console.log("sendMessageToAgentAction: Successfully received response from agent.");
    return {
      responseText: data.response_text,
      error: null,
    };

  } catch (e: any) {
    console.error("sendMessageToAgentAction: Network error or other exception:", e);
    return {
      error: `Network error or failed to connect to agent: ${e.message}`,
      responseText: null,
    };
  }
}
