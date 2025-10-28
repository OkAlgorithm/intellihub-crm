import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { message, from, timestamp } = await req.json();
    
    console.log('WhatsApp webhook received:', { from, message: message.substring(0, 50) });

    // Find or create workflows triggered by whatsapp
    const { data: workflows } = await supabase
      .from('workflows')
      .select('*')
      .eq('trigger_type', 'whatsapp')
      .eq('status', 'active');

    // Process each workflow
    if (workflows && workflows.length > 0) {
      for (const workflow of workflows) {
        // Update trigger count
        await supabase
          .from('workflows')
          .update({ 
            triggers_executed: workflow.triggers_executed + 1,
            last_run_at: new Date().toISOString()
          })
          .eq('id', workflow.id);

        console.log(`Workflow ${workflow.name} triggered by WhatsApp message`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'WhatsApp message processed',
        workflows_triggered: workflows?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});