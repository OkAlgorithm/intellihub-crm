import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, Instagram, CheckCircle, XCircle } from "lucide-react";

interface Integration {
  id: string;
  integration_type: string;
  is_connected: boolean;
  connected_at: string | null;
  config: any;
}

export default function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching integrations:', error);
      return;
    }

    setIntegrations(data || []);
  };

  const getIntegrationStatus = (type: string) => {
    return integrations.find(i => i.integration_type === type);
  };

  const toggleConnection = async (type: string, currentStatus: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage integrations",
        variant: "destructive",
      });
      return;
    }

    const integration = getIntegrationStatus(type);
    
    if (integration) {
      // Update existing
      const { error } = await supabase
        .from('integrations')
        .update({ 
          is_connected: !currentStatus,
          connected_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', integration.id);

      if (error) {
        console.error('Error updating integration:', error);
        toast({
          title: "Error",
          description: "Failed to update integration",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          integration_type: type,
          is_connected: true,
          connected_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating integration:', error);
        toast({
          title: "Error",
          description: "Failed to create integration",
          variant: "destructive",
        });
        return;
      }
    }

    await fetchIntegrations();
    toast({
      title: "Integration Updated",
      description: `${type} has been ${!currentStatus ? 'connected' : 'disconnected'}`,
    });
  };

  const openIntegrationDialog = (type: string) => {
    const integration = getIntegrationStatus(type);
    setSelectedIntegration(integration || {
      id: '',
      integration_type: type,
      is_connected: false,
      connected_at: null,
      config: {}
    } as Integration);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your CRM preferences and configuration</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input defaultValue="EA Pro Painters" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input defaultValue="Bellevue, WA" />
              </div>
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select defaultValue="painting">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="painting">Painting Services</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="realestate">Real Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Settings</CardTitle>
              <CardDescription>Configure your sales pipeline stages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Pipeline</Label>
                <Select defaultValue="sales">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Pipeline</SelectItem>
                    <SelectItem value="marketing">Marketing Pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">Customize Stages</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Configure when you receive email alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Lead Assigned</Label>
                  <p className="text-sm text-muted-foreground">Get notified when a new lead is assigned to you</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Due Reminders</Label>
                  <p className="text-sm text-muted-foreground">Receive reminders for upcoming task deadlines</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Workflow Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get updates on automation workflow executions</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In-App Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Messages</Label>
                  <p className="text-sm text-muted-foreground">Show notifications for new conversations</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Communication Channels</CardTitle>
              <CardDescription>Connect your messaging platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* WhatsApp */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="font-medium">WhatsApp Business</div>
                    <div className="flex items-center gap-2 text-sm">
                      {getIntegrationStatus('whatsapp')?.is_connected ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="text-success">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Not connected</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant={getIntegrationStatus('whatsapp')?.is_connected ? "outline" : "default"} 
                  size="sm"
                  onClick={() => openIntegrationDialog('whatsapp')}
                >
                  {getIntegrationStatus('whatsapp')?.is_connected ? 'Manage' : 'Connect'}
                </Button>
              </div>

              {/* Gmail */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Gmail</div>
                    <div className="flex items-center gap-2 text-sm">
                      {getIntegrationStatus('gmail')?.is_connected ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="text-success">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Not connected</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant={getIntegrationStatus('gmail')?.is_connected ? "outline" : "default"} 
                  size="sm"
                  onClick={() => openIntegrationDialog('gmail')}
                >
                  {getIntegrationStatus('gmail')?.is_connected ? 'Manage' : 'Connect'}
                </Button>
              </div>

              {/* Instagram */}
              <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Instagram className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <div className="font-medium">Instagram</div>
                    <div className="flex items-center gap-2 text-sm">
                      {getIntegrationStatus('instagram')?.is_connected ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="text-success">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Not connected</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant={getIntegrationStatus('instagram')?.is_connected ? "outline" : "default"} 
                  size="sm"
                  onClick={() => openIntegrationDialog('instagram')}
                >
                  {getIntegrationStatus('instagram')?.is_connected ? 'Manage' : 'Connect'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Connect Google Calendar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Automation Preferences</CardTitle>
              <CardDescription>Configure automation behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-assign Leads</Label>
                  <p className="text-sm text-muted-foreground">Automatically assign new leads to team members</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI Task Generation</Label>
                  <p className="text-sm text-muted-foreground">Let AI suggest tasks for conversations</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Workflow Auto-retry</Label>
                  <p className="text-sm text-muted-foreground">Retry failed workflow steps automatically</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your team and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-medium">JD</span>
                    </div>
                    <div>
                      <div className="font-medium">John Doe</div>
                      <div className="text-sm text-muted-foreground">Owner</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
                <Button variant="outline" className="w-full">Invite Team Member</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Integration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration?.integration_type === 'whatsapp' && 'WhatsApp Business'}
              {selectedIntegration?.integration_type === 'gmail' && 'Gmail Integration'}
              {selectedIntegration?.integration_type === 'instagram' && 'Instagram Integration'}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.is_connected 
                ? 'Manage your integration settings or disconnect'
                : 'Connect this integration to start automating your workflow'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Connection Status</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedIntegration?.is_connected ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                      {selectedIntegration?.connected_at && (
                        <span className="text-xs">
                          since {new Date(selectedIntegration.connected_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {selectedIntegration?.integration_type === 'gmail' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Connecting Gmail will allow you to:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Sync emails automatically</li>
                  <li>Create workflows from email triggers</li>
                  <li>Send automated responses</li>
                </ul>
              </div>
            )}

            {selectedIntegration?.integration_type === 'whatsapp' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Connecting WhatsApp Business will enable:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Automated message responses</li>
                  <li>Lead capture from WhatsApp</li>
                  <li>Workflow triggers from messages</li>
                </ul>
              </div>
            )}

            {selectedIntegration?.integration_type === 'instagram' && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  Connecting Instagram will allow you to:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>Respond to direct messages</li>
                  <li>Capture leads from comments</li>
                  <li>Automate engagement workflows</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            {selectedIntegration?.is_connected ? (
              <Button
                variant="destructive"
                onClick={() => {
                  toggleConnection(selectedIntegration.integration_type, true);
                  setIsDialogOpen(false);
                }}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() => {
                  toggleConnection(selectedIntegration?.integration_type || '', false);
                  setIsDialogOpen(false);
                }}
              >
                Connect Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
