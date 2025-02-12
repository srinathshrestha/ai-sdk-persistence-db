"use client";

import { deleteChat } from "@/lib/db/actions";
import { Message, useChat } from "@ai-sdk/react";
import { createIdGenerator } from "ai";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Chat({
  id,
  initialMessages,
}: { id?: string | undefined; initialMessages?: Message[] } = {}) {
  const { input, isLoading, handleInputChange, handleSubmit, messages } =
    useChat({
      api: "/api/chat",
      id, // use the provided chatId
      initialMessages, // initial messages if provided
      sendExtraMessageFields: true, // send id and createdAt for each message
      body: { chatId: id },
      experimental_prepareRequestBody: ({ messages }) => {
        const lastMessage = messages[messages.length - 1];
        return {
          chatId: id,
          message: lastMessage,
        };
      },
      generateId: createIdGenerator({ prefix: "msgc", size: 16 }), // id format for client-side messages
      maxSteps: 3,
      onToolCall({ toolCall }) {
        if (toolCall.toolName == "getLocation") {
          return "London";
        }
      },
    });

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          Back
        </Link>
        <button
          onClick={async () => {
            if (id) {
              await deleteChat(id);
              redirect("/");
            }
          }}
          className="text-red-600 hover:text-red-800 ml-4"
        >
          Delete Chat
        </button>
      </div>
      <div className="space-y-8">
        {messages.map((m) => (
          <div key={m.id} className="whitespace-pre-wrap">
            <span className="font-semibold text-sm">
              {m.role === "user" ? "User: " : "AI: "}
            </span>
            <div className="space-y-4">
              {m.parts.map((part) => {
                switch (part.type) {
                  case "text":
                    return <div key={part.text}>{part.text}</div>;
                  case "tool-invocation":
                    const { toolInvocation } = part;
                    return (
                      <details
                        key={`tool-${toolInvocation.toolCallId}`}
                        className="relative p-2 rounded-lg bg-zinc-100 group"
                      >
                        <summary className="list-none cursor-pointer select-none flex justify-between items-center pr-2">
                          <span className="inline-flex items-center px-1 py-0.5 text-xs font-medium rounded-md font-mono text-zinc-900">
                            {toolInvocation.toolName}
                          </span>
                          {toolInvocation.state === "result" ? (
                            <span className="text-xs text-zinc-500 ml-2">
                              Click to expand
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-400 animate-pulse">
                              calling...
                            </span>
                          )}
                        </summary>
                        {toolInvocation.state === "result" ? (
                          <div className="mt-4 bg-zinc-50 p-2">
                            <pre className="font-mono text-xs">
                              {JSON.stringify(toolInvocation.result, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </details>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
}
