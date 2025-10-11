import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AIChat from "@/components/shared/AIChat";
import { Workflow as WorkflowIcon, Play, Plus, Sparkles, Check, Mail, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  trigger_type: string;
  triggers_executed: number;
  last_run_at: string | null;
}

export default function Automation() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedTrigger, setSelectedTrigger] = useState<string>("gmail");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I can help you create automation workflows for Gmail and WhatsApp. What would you like to automate?",
    },
  ]);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
    } else {
      setWorkflows(data || []);
    }
  };

  const handleMessageSent = async (message: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('generate-workflow', {
        body: { prompt: message, triggerType: selectedTrigger }
      });

      if (error) throw error;

      // Save workflow to database
      const { error: insertError } = await supabase
        .from('workflows')
        .insert({
          user_id: user.id,
          name: data.workflow.name,
          description: data.workflow.description,
          trigger_type: selectedTrigger,
          actions: data.workflow.actions || []
        });

      if (insertError) throw insertError;

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `I've created a ${selectedTrigger} workflow: "${data.workflow.name}"\n\n${data.workflow.description}`,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      setShowBuilder(true);
      fetchWorkflows();
      
      toast({
        title: "Workflow Created",
        description: data.workflow.name,
      });
    } catch (error) {
      console.error("Error generating workflow:", error);
      toast({
        title: "Error",
        description: "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runWorkflow = async (workflowId: string, triggerType: string) => {
    try {
      if (triggerType === 'gmail') {
        await supabase.functions.invoke('gmail-sync', {
          body: { action: 'sync' }
        });
      } else if (triggerType === 'whatsapp') {
        // For WhatsApp, this would typically be triggered by incoming webhooks
        toast({
          title: "WhatsApp Integration",
          description: "WhatsApp workflows are triggered automatically by incoming messages",
        });
        return;
      }

      await supabase
        .from('workflows')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', workflowId);

      fetchWorkflows();
      
      toast({
        title: "Workflow Executed",
        description: "Workflow ran successfully",
      });
    } catch (error) {
      console.error("Error running workflow:", error);
      toast({
        title: "Error",
        description: "Failed to run workflow",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Automation</h1>
        <p className="text-muted-foreground">Create and manage workflow automations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Your Workflows</CardTitle>
                <Button onClick={() => setShowBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Workflow
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflows.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No workflows yet</p>
                    <p className="text-xs mt-1">Use AI to create your first automation</p>
                  </div>
                ) : (
                  workflows.map((workflow) => (
                    <Card key={workflow.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            {workflow.trigger_type === 'gmail' ? (
                              <Mail className="h-5 w-5 text-primary" />
                            ) : workflow.trigger_type === 'whatsapp' ? (
                              <MessageCircle className="h-5 w-5 text-primary" />
                            ) : (
                              <WorkflowIcon className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{workflow.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Last run: {workflow.last_run_at 
                                ? new Date(workflow.last_run_at).toLocaleString() 
                                : 'Never'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                          {workflow.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="outline" className="text-xs">
                          {workflow.trigger_type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {workflow.triggers_executed} triggers executed
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => runWorkflow(workflow.id, workflow.trigger_type)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Run
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workflow Builder Placeholder */}
          {showBuilder && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Workflow Builder</CardTitle>
                  <Button variant="outline" onClick={() => setShowBuilder(false)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center">
                  <div className="max-w-md text-center space-y-4">
                    <div className="space-y-6">
                      {/* Trigger */}
                      <div className="bg-card rounded-lg p-4 border-2 border-primary shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            1
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold">When lead submits form</div>
                            <div className="text-xs text-muted-foreground">Trigger event</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="h-8 w-0.5 bg-border"></div>
                      </div>

                      {/* Action */}
                      <div className="bg-card rounded-lg p-4 border-2 border-border shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-bold">
                            2
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold">Send welcome email</div>
                            <div className="text-xs text-muted-foreground">Email action</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="h-8 w-0.5 bg-border"></div>
                      </div>

                      {/* End */}
                      <div className="bg-card rounded-lg p-4 border-2 border-success shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold">Workflow complete</div>
                            <div className="text-xs text-muted-foreground">End</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-6">
                      This is a sample workflow created by AI. Use the AI assistant to customize it.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Workflow Creator */}
        <div className="h-[calc(100vh-12rem)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Workflow Creator</CardTitle>
              </div>
              <div className="mt-4">
                <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>Gmail</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AIChat
                placeholder="Describe the workflow you want..."
                suggestions={[
                  "Create lead nurture flow",
                  "Automate follow-ups",
                  "Build email sequence",
                ]}
                messages={messages}
                onMessagesChange={setMessages}
                onMessageSent={handleMessageSent}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
