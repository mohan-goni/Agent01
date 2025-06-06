"use client";

import type React from "react";
import { useState, useTransition, useRef, useEffect } from "react"; // Corrected import
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Bot, Loader2, Brain } from "lucide-react";
import { sendMessageToAgentAction } from "./actions";
import { v4 as uuidv4 } from 'uuid'; // For generating unique message IDs

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string | React.ReactNode; // Allow ReactNode for potential rich content
  timestamp: Date;
}

export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Placeholder for a chat session ID - could be generated on page load or fetched
  const [chatId, setChatId] = useState<string | null>(null);
  useEffect(() => {
    setChatId(uuidv4()); // Generate a new chat ID when the component mounts
    setMessages([ // Initial agent message
        {
            id: uuidv4(),
            sender: "agent",
            text: "Hello! I'm your RAG-powered Market Intelligence Agent. How can I assist you today?",
            timestamp: new Date(),
        }
    ])
  }, []);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      sender: "user",
      text: currentMessage,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setCurrentMessage("");
    setError(null);

    startTransition(async () => {
      const result = await sendMessageToAgentAction(userMessage.text as string, chatId);
      if (result.error) {
        setError(result.error);
        const errorMessage: ChatMessage = {
            id: uuidv4(),
            sender: "agent",
            text: `Error: ${result.error}`,
            timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      } else if (result.responseText) {
        const agentMessage: ChatMessage = {
          id: uuidv4(),
          sender: "agent",
          text: result.responseText,
          timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, agentMessage]);
      }
    });
  };

  return (
    // Changed to h-full to take height from parent <main> which is flex-1
    <div className="flex flex-col h-full">
      {/* Removed outer p-1 sm:p-2 md:p-4, padding should be on messages or scroll area content if needed */}
      <ScrollArea className="flex-grow pr-4" ref={scrollAreaRef as any}> {/* Type assertion for ref */}
          {/* Added padding to the content div inside ScrollArea */}
          <div className="space-y-6 p-1 sm:p-2 md:p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "agent" && (
                  <Avatar className="h-8 w-8 border-2 border-blue-500">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-xl shadow-md ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-200" : "text-gray-500 dark:text-gray-400"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === "user" && (
                  <Avatar className="h-8 w-8 border-2 border-gray-300">
                    <AvatarFallback><User size={18} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isPending && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8 border-2 border-blue-500">
                  <AvatarFallback><Bot size={18} /></AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] p-3 rounded-xl shadow-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <p className="text-sm italic">Agent is typing...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      {/* Ensure border-t has correct dark mode color if needed, bg-background will adapt */}
      <div className="p-2 sm:p-4 border-t bg-background">
        <form onSubmit={handleSubmitMessage} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            className="flex-1"
            disabled={isPending}
            aria-label="Chat message input"
          />
          <Button type="submit" disabled={isPending || !currentMessage.trim()} size="icon" aria-label="Send message">
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        {error && <p className="text-xs text-red-500 mt-1 text-center">{error}</p>}
      </div>
    </div>
  );
}
