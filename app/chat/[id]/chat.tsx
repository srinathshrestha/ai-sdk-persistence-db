"use client";

import { createIdGenerator } from "ai";
import { Message, useChat } from "@ai-sdk/react";
import Link from "next/link";
import { deleteChat } from "@/lib/db/actions";
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
      {messages.map((m) => (
        <div key={m.id} className="whitespace-pre-wrap">
          {m.role === "user" ? "User: " : "AI: "}
          {m.parts.map((part) => {
            switch (part.type) {
              case "text":
                return <span key={part.text}>{part.text}</span>;
              case "tool-invocation":
                const { toolInvocation } = part;
                return (
                  <span key={`tool-${toolInvocation.toolName}`}>
                    <span className="bg-zinc-50 p-1">
                      Using Tool: {toolInvocation.toolName}
                    </span>
                    <span>
                      {toolInvocation.state === "result" ? (
                        <pre>
                          {JSON.stringify(toolInvocation.result, null, 2)}
                        </pre>
                      ) : null}
                    </span>
                  </span>
                );
              default:
                return null;
            }
          })}
        </div>
      ))}

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
