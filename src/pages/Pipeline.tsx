import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageCircle, Sparkles, FileText, Calendar, Trash2, Grid3x3, List, Plus, Filter, DollarSign } from "lucide-react";

interface Deal {
  id: string;
  contact_name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  notes: string | null;
  avatar_url: string | null;
}

const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation'];
const stageLabels = {
  lead: 'No answer',
  qualified: 'Intro Call',
  proposal: 'Estimate Scheduled',
  negotiation: 'Appointment',
};

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterValue, setFilterValue] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load deals",
        variant: "destructive",
      });
    } else {
      setDeals(data || []);
    }
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setAiResponse("");
    setAiQuery("");
  };

  const queryKnowledge = async () => {
    if (!selectedDeal || !aiQuery) return;

    setIsAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('query-knowledge', {
        body: { dealId: selectedDeal.id, query: aiQuery }
      });

      if (error) throw error;
      setAiResponse(data.answer);
    } catch (error) {
      console.error("Error querying knowledge:", error);
      toast({
        title: "Error",
        description: "Failed to query AI knowledge base",
        variant: "destructive",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const dealsByStage = stageOrder.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage);
    return acc;
  }, {} as Record<string, Deal[]>);

  const totalOpportunities = deals.length;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Opportunities</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add opportunity
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="fb_ads">FB Ads</SelectItem>
                <SelectItem value="facebook_lead">Facebook Lead</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">{totalOpportunities} opportunities</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="ghost" size="sm">
              Sort (1)
            </Button>
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-4 gap-4">
            {stageOrder.map(stage => (
              <div key={stage} className="flex flex-col">
                {/* Stage Header */}
                <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stageLabels[stage as keyof typeof stageLabels]}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {dealsByStage[stage]?.length || 0} Opportunities
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${dealsByStage[stage]?.reduce((sum, d) => sum + (d.value || 0), 0).toFixed(2)}
                  </div>
                </div>

                {/* Opportunity Cards */}
                <div className="space-y-3">
                  {dealsByStage[stage]?.map(deal => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                      onClick={() => handleDealClick(deal)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-3">
                          {/* Contact Info */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{deal.contact_name}</h4>
                              {deal.phone && (
                                <p className="text-xs text-muted-foreground truncate">{deal.phone}</p>
                              )}
                            </div>
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-muted text-xs">
                                {getInitials(deal.contact_name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          {/* Source and Value */}
                          <div className="space-y-1">
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span className="font-medium mr-1">Opportunity Source:</span>
                              <span className="truncate">{deal.company || 'FB Ads'}</span>
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span className="font-medium mr-1">Opportunity Value:</span>
                              <span>${(deal.value || 0).toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Action Icons */}
                          <div className="flex items-center gap-2 pt-2 border-t border-border">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 relative">
                              <Mail className="h-3.5 w-3.5" />
                              {deal.probability && deal.probability > 50 && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full text-[8px] text-primary-foreground flex items-center justify-center">
                                  1
                                </span>
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Calendar className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <Dialog open={!!selectedDeal} onOpenChange={() => setSelectedDeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedDeal && getInitials(selectedDeal.contact_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div>{selectedDeal?.contact_name}</div>
                {selectedDeal?.company && (
                  <div className="text-sm text-muted-foreground font-normal">{selectedDeal.company}</div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedDeal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedDeal.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDeal.email}</span>
                  </div>
                )}
                {selectedDeal.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedDeal.phone}</span>
                  </div>
                )}
              </div>

              {selectedDeal.value && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">${selectedDeal.value.toLocaleString()}</span>
                  {selectedDeal.probability && (
                    <Badge variant="secondary">{selectedDeal.probability}% probability</Badge>
                  )}
                </div>
              )}

              {selectedDeal.notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedDeal.notes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">AI Knowledge Assistant</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask about this contact..."
                      onKeyDown={(e) => e.key === 'Enter' && queryKnowledge()}
                    />
                    <Button onClick={queryKnowledge} disabled={isAiLoading || !aiQuery}>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {isAiLoading ? "Querying..." : "Ask"}
                    </Button>
                  </div>
                  {aiResponse && (
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-sm">{aiResponse}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
