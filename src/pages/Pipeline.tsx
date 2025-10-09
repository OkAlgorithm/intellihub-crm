import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, DollarSign, Calendar, MessageCircle, Sparkles } from "lucide-react";

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

const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
const stageLabels = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export default function Pipeline() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-6 border-b border-border">
        <h1 className="text-3xl font-bold">Sales Pipeline</h1>
        <p className="text-muted-foreground mt-1">Track and manage your deals</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {stageOrder.map(stage => (
              <div key={stage} className="flex flex-col gap-3">
                <div className="sticky top-0 bg-background z-10 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{stageLabels[stage as keyof typeof stageLabels]}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {dealsByStage[stage]?.length || 0}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {dealsByStage[stage]?.map(deal => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleDealClick(deal)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(deal.contact_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{deal.contact_name}</h4>
                            {deal.company && (
                              <p className="text-xs text-muted-foreground truncate">{deal.company}</p>
                            )}
                            {deal.value && (
                              <div className="flex items-center gap-1 mt-2 text-xs">
                                <DollarSign className="h-3 w-3" />
                                <span className="font-medium">{deal.value.toLocaleString()}</span>
                                {deal.probability && (
                                  <span className="text-muted-foreground ml-1">
                                    ({deal.probability}%)
                                  </span>
                                )}
                              </div>
                            )}
                            {deal.expected_close_date && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
                              </div>
                            )}
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
