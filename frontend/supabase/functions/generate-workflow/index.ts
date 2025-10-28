import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, triggerType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Generating workflow for trigger:', triggerType);
    console.log('User prompt:', prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are a workflow automation assistant. Based on user descriptions, generate a complete workflow with name, description, and actions.

The trigger type is: ${triggerType}

Generate specific actions based on the trigger:
- For Gmail: actions could include create_deal, send_email, notify_team
- For WhatsApp: actions could include send_whatsapp, create_deal, notify_team

Each action should have a type and relevant parameters. Be specific and actionable.`
          },
          { role: "user", content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_workflow",
              description: "Generate a complete workflow with name, description, and actions",
              parameters: {
                type: "object",
                properties: {
                  name: { 
                    type: "string",
                    description: "A clear, concise name for the workflow"
                  },
                  description: { 
                    type: "string",
                    description: "A detailed description of what the workflow does"
                  },
                  actions: {
                    type: "array",
                    description: "List of actions to execute when workflow is triggered",
                    items: {
                      type: "object",
                      properties: {
                        type: { 
                          type: "string",
                          enum: ["send_email", "create_deal", "send_whatsapp", "notify_team"],
                          description: "Type of action to perform"
                        },
                        to: { type: "string", description: "Recipient (for email/whatsapp)" },
                        subject: { type: "string", description: "Email subject" },
                        message: { type: "string", description: "Message content" },
                        contact_name: { type: "string", description: "Contact name for deal" },
                        company: { type: "string", description: "Company name" },
                        email: { type: "string", description: "Email address" },
                        value: { type: "number", description: "Deal value" },
                        notes: { type: "string", description: "Additional notes" }
                      },
                      required: ["type"]
                    }
                  }
                },
                required: ["name", "description", "actions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_workflow" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const workflow = JSON.parse(toolCall.function.arguments);

    console.log('Generated workflow:', workflow);

    return new Response(JSON.stringify({ workflow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-workflow:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
