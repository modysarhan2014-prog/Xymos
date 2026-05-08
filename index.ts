import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Anthropic } from "npm:@anthropic-ai/sdk@^0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversationId, files } = await req.json();

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    // Build content array with text and files
    const content: Array<{type: string; text?: string; source?: {type: string; media_type: string; data: string}}> = [];

    // Add text message
    content.push({
      type: "text",
      text: message,
    });

    // Add file attachments if provided
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: file.type,
              data: file.data,
            },
          });
        } else if (file.type === "application/pdf" || file.type.includes("text")) {
          // For PDFs and text, include in the message
          content.push({
            type: "text",
            text: `\n\n[File: ${file.name} (${file.type})]\n${file.data}`,
          });
        }
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    const responseText =
      textContent && textContent.type === "text" ? textContent.text : "No response generated";

    return new Response(JSON.stringify({ response: responseText }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
