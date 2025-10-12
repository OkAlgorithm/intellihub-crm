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
import { z } from "zod";

interface Integration {
  id: string;
  integration_type: string;
  is_connected: boolean;
  connected_at: string | null;
  config: any;
}

interface IntegrationConfig {
  // Gmail
  gmail_client_id?: string;
  gmail_client_secret?: string;
  gmail_refresh_token?: string;
  // WhatsApp
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
  whatsapp_business_account_id?: string;
  // Instagram
  instagram_access_token?: string;
  instagram_page_id?: string;
}

// Validation schemas
const gmailConfigSchema = z.object({
  gmail_client_id: z.string().trim().min(1, "Client ID is required"),
  gmail_client_secret: z.string().trim().min(1, "Client Secret is required"),
  gmail_refresh_token: z.string().trim().min(1, "Refresh Token is required"),
});

const whatsappConfigSchema = z.object({
  whatsapp_phone_number_id: z.string().trim().min(1, "Phone Number ID is required"),
  whatsapp_access_token: z.string().trim().min(1, "Access Token is required"),
  whatsapp_business_account_id: z.string().trim().min(1, "Business Account ID is required"),
});

const instagramConfigSchema = z.object({
  instagram_access_token: z.string().trim().min(1, "Access Token is required"),
  instagram_page_id: z.string().trim().min(1, "Page ID is required"),
});

export default function Settings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [configData, setConfigData] = useState<IntegrationConfig>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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

  const validateConfig = (type: string, config: IntegrationConfig): { success: boolean; errors?: Record<string, string> } => {
    try {
      if (type === 'gmail') {
        gmailConfigSchema.parse({
          gmail_client_id: config.gmail_client_id,
          gmail_client_secret: config.gmail_client_secret,
          gmail_refresh_token: config.gmail_refresh_token,
        });
      } else if (type === 'whatsapp') {
        whatsappConfigSchema.parse({
          whatsapp_phone_number_id: config.whatsapp_phone_number_id,
          whatsapp_access_token: config.whatsapp_access_token,
          whatsapp_business_account_id: config.whatsapp_business_account_id,
        });
      } else if (type === 'instagram') {
        instagramConfigSchema.parse({
          instagram_access_token: config.instagram_access_token,
          instagram_page_id: config.instagram_page_id,
        });
      }
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        return { success: false, errors };
      }
      return { success: false };
    }
  };

  const connectIntegration = async () => {
    if (!selectedIntegration) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to manage integrations",
        variant: "destructive",
      });
      return;
    }

    // Validate configuration
    const validation = validateConfig(selectedIntegration.integration_type, configData);
    if (!validation.success) {
      setValidationErrors(validation.errors || {});
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    setValidationErrors({});

    const integration = getIntegrationStatus(selectedIntegration.integration_type);
    
    if (integration) {
      // Update existing
      const { error } = await supabase
        .from('integrations')
        .update({ 
          is_connected: true,
          connected_at: new Date().toISOString(),
          config: configData as any
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
        .insert([{
          user_id: user.id,
          integration_type: selectedIntegration.integration_type,
          is_connected: true,
          connected_at: new Date().toISOString(),
          config: configData as any
        }]);

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
    setIsDialogOpen(false);
    setConfigData({});
    toast({
      title: "Integration Connected",
      description: `${selectedIntegration.integration_type} has been successfully connected`,
    });
  };

  const disconnectIntegration = async () => {
    if (!selectedIntegration) return;

    const integration = getIntegrationStatus(selectedIntegration.integration_type);
    if (!integration) return;

    const { error } = await supabase
      .from('integrations')
      .update({ 
        is_connected: false,
        connected_at: null,
        config: {} as any
      })
      .eq('id', integration.id);

    if (error) {
      console.error('Error disconnecting integration:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect integration",
        variant: "destructive",
      });
      return;
    }

    await fetchIntegrations();
    setIsDialogOpen(false);
    setConfigData({});
    toast({
      title: "Integration Disconnected",
      description: `${selectedIntegration.integration_type} has been disconnected`,
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
    
    // Load existing config if connected
    if (integration?.config) {
      setConfigData(integration.config);
    } else {
      setConfigData({});
    }
    
    setValidationErrors({});
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

            {/* Gmail Configuration */}
            {selectedIntegration?.integration_type === 'gmail' && !selectedIntegration?.is_connected && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gmail_client_id">Client ID *</Label>
                  <Input
                    id="gmail_client_id"
                    type="text"
                    placeholder="Your Gmail OAuth Client ID"
                    value={configData.gmail_client_id || ''}
                    onChange={(e) => setConfigData({ ...configData, gmail_client_id: e.target.value })}
                    className={validationErrors.gmail_client_id ? "border-destructive" : ""}
                  />
                  {validationErrors.gmail_client_id && (
                    <p className="text-xs text-destructive">{validationErrors.gmail_client_id}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmail_client_secret">Client Secret *</Label>
                  <Input
                    id="gmail_client_secret"
                    type="password"
                    placeholder="Your Gmail OAuth Client Secret"
                    value={configData.gmail_client_secret || ''}
                    onChange={(e) => setConfigData({ ...configData, gmail_client_secret: e.target.value })}
                    className={validationErrors.gmail_client_secret ? "border-destructive" : ""}
                  />
                  {validationErrors.gmail_client_secret && (
                    <p className="text-xs text-destructive">{validationErrors.gmail_client_secret}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gmail_refresh_token">Refresh Token *</Label>
                  <Input
                    id="gmail_refresh_token"
                    type="password"
                    placeholder="Your Gmail Refresh Token"
                    value={configData.gmail_refresh_token || ''}
                    onChange={(e) => setConfigData({ ...configData, gmail_refresh_token: e.target.value })}
                    className={validationErrors.gmail_refresh_token ? "border-destructive" : ""}
                  />
                  {validationErrors.gmail_refresh_token && (
                    <p className="text-xs text-destructive">{validationErrors.gmail_refresh_token}</p>
                  )}
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <p className="font-medium mb-1">How to get Gmail credentials:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Google Cloud Console</li>
                    <li>Create OAuth 2.0 credentials</li>
                    <li>Enable Gmail API</li>
                    <li>Generate refresh token</li>
                  </ol>
                </div>
              </div>
            )}

            {/* WhatsApp Configuration */}
            {selectedIntegration?.integration_type === 'whatsapp' && !selectedIntegration?.is_connected && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_phone_number_id">Phone Number ID *</Label>
                  <Input
                    id="whatsapp_phone_number_id"
                    type="text"
                    placeholder="Your WhatsApp Phone Number ID"
                    value={configData.whatsapp_phone_number_id || ''}
                    onChange={(e) => setConfigData({ ...configData, whatsapp_phone_number_id: e.target.value })}
                    className={validationErrors.whatsapp_phone_number_id ? "border-destructive" : ""}
                  />
                  {validationErrors.whatsapp_phone_number_id && (
                    <p className="text-xs text-destructive">{validationErrors.whatsapp_phone_number_id}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_access_token">Access Token *</Label>
                  <Input
                    id="whatsapp_access_token"
                    type="password"
                    placeholder="Your WhatsApp Access Token"
                    value={configData.whatsapp_access_token || ''}
                    onChange={(e) => setConfigData({ ...configData, whatsapp_access_token: e.target.value })}
                    className={validationErrors.whatsapp_access_token ? "border-destructive" : ""}
                  />
                  {validationErrors.whatsapp_access_token && (
                    <p className="text-xs text-destructive">{validationErrors.whatsapp_access_token}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_business_account_id">Business Account ID *</Label>
                  <Input
                    id="whatsapp_business_account_id"
                    type="text"
                    placeholder="Your WhatsApp Business Account ID"
                    value={configData.whatsapp_business_account_id || ''}
                    onChange={(e) => setConfigData({ ...configData, whatsapp_business_account_id: e.target.value })}
                    className={validationErrors.whatsapp_business_account_id ? "border-destructive" : ""}
                  />
                  {validationErrors.whatsapp_business_account_id && (
                    <p className="text-xs text-destructive">{validationErrors.whatsapp_business_account_id}</p>
                  )}
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <p className="font-medium mb-1">How to get WhatsApp credentials:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Meta Business Suite</li>
                    <li>Set up WhatsApp Business API</li>
                    <li>Get your Phone Number ID and Access Token</li>
                    <li>Find your Business Account ID in settings</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Instagram Configuration */}
            {selectedIntegration?.integration_type === 'instagram' && !selectedIntegration?.is_connected && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram_access_token">Access Token *</Label>
                  <Input
                    id="instagram_access_token"
                    type="password"
                    placeholder="Your Instagram Access Token"
                    value={configData.instagram_access_token || ''}
                    onChange={(e) => setConfigData({ ...configData, instagram_access_token: e.target.value })}
                    className={validationErrors.instagram_access_token ? "border-destructive" : ""}
                  />
                  {validationErrors.instagram_access_token && (
                    <p className="text-xs text-destructive">{validationErrors.instagram_access_token}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram_page_id">Page ID *</Label>
                  <Input
                    id="instagram_page_id"
                    type="text"
                    placeholder="Your Instagram Page ID"
                    value={configData.instagram_page_id || ''}
                    onChange={(e) => setConfigData({ ...configData, instagram_page_id: e.target.value })}
                    className={validationErrors.instagram_page_id ? "border-destructive" : ""}
                  />
                  {validationErrors.instagram_page_id && (
                    <p className="text-xs text-destructive">{validationErrors.instagram_page_id}</p>
                  )}
                </div>
                <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <p className="font-medium mb-1">How to get Instagram credentials:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to Meta for Developers</li>
                    <li>Create an app with Instagram Basic Display</li>
                    <li>Generate an access token</li>
                    <li>Get your Instagram Page ID</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Connected State Info */}
            {selectedIntegration?.is_connected && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Integration Active</p>
                <p className="text-sm text-muted-foreground">
                  This integration is currently connected and active. You can disconnect it to reconfigure or remove the integration.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedIntegration?.is_connected ? (
              <Button
                variant="destructive"
                onClick={disconnectIntegration}
              >
                Disconnect
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setConfigData({});
                    setValidationErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={connectIntegration}>
                  Connect Integration
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
