import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AIChat from "@/components/shared/AIChat";
import { Folder, Play, Plus, Sparkles, Mail, MessageCircle, Settings, MoreVertical, Search, List, Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  triggers_executed: number;
  last_run_at: string | null;
  actions: any[] | null;
  created_at: string;
  updated_at: string;
}

export default function Automation() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedTrigger, setSelectedTrigger] = useState<string>("gmail");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAIDialog, setShowAIDialog] = useState(false);
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
      setWorkflows((data || []) as Workflow[]);
    }
  };

  const handleMessageSent = async (message: string) => {
   try {
     const data = await api.generateWorkflow(message);

      if (error) throw error;

      console.log('AI generated workflow:', data.workflow);

      // Save workflow to database
      const { data: newWorkflow, error: insertError } = await supabase
        .from('workflows')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          name: data.workflow.name,
          description: data.workflow.description,
          trigger_type: selectedTrigger,
          status: 'active',
          actions: data.workflow.actions || []
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const actionsCount = data.workflow.actions?.length || 0;
      const actionsList = data.workflow.actions?.map((a: any) => `• ${a.type}`).join('\n') || 'None';
      
      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Created "${data.workflow.name}"\n\n${data.workflow.description}\n\n**Trigger:** ${selectedTrigger}\n**Actions (${actionsCount}):**\n${actionsList}\n\n**Status:** Published & Active`,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      await fetchWorkflows();
      setShowAIDialog(false);
      
      toast({
        title: "Workflow Created",
        description: `${data.workflow.name} with ${actionsCount} action(s)`,
      });
    } catch (error) {
      console.error("Error generating workflow:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      console.log('Executing workflow:', workflowId);
      
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { workflowId, triggerData: {} }
      });

      if (error) throw error;

      console.log('Workflow execution result:', data);

      await fetchWorkflows();
      
      toast({
        title: "Workflow Executed",
        description: `${data.workflowName} completed with ${data.results.length} action(s)`,
      });
    } catch (error) {
      console.error("Error running workflow:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to run workflow",
        variant: "destructive",
      });
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'draft' : 'active';
      await supabase
        .from('workflows')
        .update({ status: newStatus })
        .eq('id', workflowId);

      await fetchWorkflows();
      
      toast({
        title: "Status Updated",
        description: `Workflow is now ${newStatus === 'active' ? 'published' : 'draft'}`,
      });
    } catch (error) {
      console.error("Error updating workflow status:", error);
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive",
      });
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    try {
      await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      await fetchWorkflows();
      
      toast({
        title: "Workflow Deleted",
        description: "Workflow has been removed",
      });
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Automation</h1>
          <Tabs defaultValue="workflows" className="w-auto">
            <TabsList>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Global Workflow Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Folder className="h-4 w-4 mr-2" />
            Create Folder
          </Button>
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Workflow Creator
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">Trigger Type</label>
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
                <div className="space-y-2 mb-4">
                  <label className="text-xs text-muted-foreground">Popular Automations</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-auto py-2"
                      onClick={() => {
                        const suggestion = selectedTrigger === 'gmail' 
                          ? "When I receive an email from a new lead, create a deal in the CRM and send a welcome email"
                          : "When I receive a WhatsApp message, create a new deal and notify the team";
                        const userMsg: Message = { id: Date.now().toString(), role: "user", content: suggestion };
                        setMessages(prev => [...prev, userMsg]);
                        handleMessageSent(suggestion);
                      }}
                    >
                      <Sparkles className="h-3 w-3 mr-2" />
                      {selectedTrigger === 'gmail' ? 'Lead to Deal' : 'Message to Deal'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="justify-start text-xs h-auto py-2"
                      onClick={() => {
                        const suggestion = selectedTrigger === 'gmail'
                          ? "When I get an email with 'urgent' in the subject, notify the team immediately"
                          : "When a customer says 'help', send an auto-response and notify support team";
                        const userMsg: Message = { id: Date.now().toString(), role: "user", content: suggestion };
                        setMessages(prev => [...prev, userMsg]);
                        handleMessageSent(suggestion);
                      }}
                    >
                      <Sparkles className="h-3 w-3 mr-2" />
                      {selectedTrigger === 'gmail' ? 'Urgent Alert' : 'Auto-Response'}
                    </Button>
                  </div>
                </div>
                <div className="h-[450px]">
                  <AIChat
                    placeholder="Describe the workflow you want..."
                    suggestions={[
                      selectedTrigger === 'gmail' 
                        ? "Create a deal when I receive an email from a new customer"
                        : "Send a thank you message when someone says 'order placed'",
                      selectedTrigger === 'gmail'
                        ? "Notify sales team when high-value lead emails"
                        : "Create a support ticket for messages containing 'issue'",
                      selectedTrigger === 'gmail'
                        ? "Auto-respond to partnership inquiries"
                        : "Send business hours message after 6 PM",
                    ]}
                    messages={messages}
                    onMessagesChange={setMessages}
                    onMessageSent={handleMessageSent}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Workflow List */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Workflow List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Tabs and Filters */}
          <div className="p-4 border-b">
            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TabsList>
                    <TabsTrigger value="all">All Workflows</TabsTrigger>
                    <TabsTrigger value="review">Needs Review (0)</TabsTrigger>
                    <TabsTrigger value="deleted">Deleted</TabsTrigger>
                  </TabsList>
                  <Button variant="ghost" size="sm">
                    + New Smart List
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Customize List
                </Button>
              </div>
              
              {/* Advanced Filters and Search */}
              <div className="flex items-center justify-between mt-4">
                <Button variant="ghost" size="sm">
                  ▼ Advanced Filters
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <List className="h-4 w-4" />
                  </Button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>

              <TabsContent value="all" className="mt-4">
                <div className="text-sm text-muted-foreground mb-2 px-2">Home</div>
                
                {/* Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Total Enrolled</TableHead>
                      <TableHead className="text-center">Active Enrolled</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead className="w-[100px]">Stats</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkflows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <p className="text-sm font-medium">No workflows yet</p>
                          <p className="text-xs mt-1">Click "Create Workflow" to get started</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkflows.map((workflow) => (
                        <TableRow key={workflow.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{workflow.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={workflow.status === "active" 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-gray-50 text-gray-700 border-gray-200"
                              }
                            >
                              {workflow.status === "active" ? "Published" : "Draft"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{workflow.triggers_executed}</TableCell>
                          <TableCell className="text-center">0</TableCell>
                          <TableCell>
                            {workflow.last_run_at 
                              ? new Date(workflow.last_run_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: '2-digit', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(workflow.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: '2-digit', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => runWorkflow(workflow.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Run Now
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleWorkflowStatus(workflow.id, workflow.status)}>
                                  {workflow.status === 'active' ? 'Unpublish' : 'Publish'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteWorkflow(workflow.id)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
