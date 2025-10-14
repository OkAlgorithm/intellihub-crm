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
      setWorkflows(data || []);
    }
  };

  const handleMessageSent = async (message: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow', {
        body: { prompt: message, triggerType: selectedTrigger }
      });

      if (error) throw error;

      // Save workflow to database (user_id can be null for public workflows)
      const { data: newWorkflow, error: insertError } = await supabase
        .from('workflows')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // Default UUID for public workflows
          name: data.workflow.name,
          description: data.workflow.description,
          trigger_type: selectedTrigger,
          status: 'active',
          actions: []
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Created "${data.workflow.name}"\n\n${data.workflow.description}\n\nTrigger: ${selectedTrigger}\nStatus: Active`,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
      await fetchWorkflows();
      setShowAIDialog(false);
      
      toast({
        title: "Workflow Created",
        description: data.workflow.name,
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
                <div className="h-[500px]">
                  <AIChat
                    placeholder="Describe the workflow you want..."
                    suggestions={[
                      "Send welcome email when lead submits form",
                      "Notify team when high-value deal is created",
                      "Auto-respond to incoming WhatsApp messages",
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
                            {workflow.status === "active" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Published
                              </Badge>
                            )}
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
                            {new Date(workflow.last_run_at || Date.now()).toLocaleDateString('en-US', { 
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
                                <DropdownMenuItem onClick={() => runWorkflow(workflow.id, workflow.trigger_type)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Run Workflow
                                </DropdownMenuItem>
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
