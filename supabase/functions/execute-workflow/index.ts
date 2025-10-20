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

    const { workflowId, triggerData } = await req.json();
    
    console.log('Executing workflow:', workflowId);

    // Fetch workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active') {
      throw new Error('Workflow is not active');
    }

    console.log('Workflow found:', workflow.name);
    console.log('Actions to execute:', workflow.actions);

    // Execute each action in the workflow
    const results = [];
    for (const action of (workflow.actions as any[] || [])) {
      console.log('Executing action:', action.type);
      
      let actionResult;
      switch (action.type) {
        case 'send_email':
          // Simulate email sending
          actionResult = {
            type: 'send_email',
            success: true,
            message: `Email sent to ${action.to}: ${action.subject}`,
          };
          break;
          
        case 'create_deal':
          // Create a deal in the CRM
          const { data: deal, error: dealError } = await supabase
            .from('deals')
            .insert({
              contact_name: action.contact_name || 'New Lead',
              company: action.company || '',
              email: action.email || '',
              stage: 'lead',
              value: action.value || 0,
              notes: action.notes || `Created by workflow: ${workflow.name}`,
            })
            .select()
            .single();
            
          actionResult = {
            type: 'create_deal',
            success: !dealError,
            dealId: deal?.id,
            error: dealError?.message,
          };
          break;
          
        case 'send_whatsapp':
          // Simulate WhatsApp message
          actionResult = {
            type: 'send_whatsapp',
            success: true,
            message: `WhatsApp sent to ${action.to}: ${action.message}`,
          };
          break;
          
        case 'notify_team':
          // Simulate team notification
          actionResult = {
            type: 'notify_team',
            success: true,
            message: `Team notified: ${action.message}`,
          };
          break;
          
        default:
          actionResult = {
            type: action.type,
            success: false,
            error: 'Unknown action type',
          };
      }
      
      results.push(actionResult);
    }

    // Update workflow execution stats
    await supabase
      .from('workflows')
      .update({ 
        triggers_executed: workflow.triggers_executed + 1,
        last_run_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    console.log('Workflow execution completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true,
        workflowId,
        workflowName: workflow.name,
        results,
        executedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error executing workflow:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
