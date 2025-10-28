import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import AIChat from "@/components/shared/AIChat";
import { Sparkles, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const contentPlans = [
  { id: 1, title: "Fall Promotion Campaign", status: "planned", date: "Oct 15, 2025", platform: "Email" },
  { id: 2, title: "Instagram Story Series", status: "in-progress", date: "Oct 10, 2025", platform: "Social" },
  { id: 3, title: "Customer Testimonial Post", status: "scheduled", date: "Oct 12, 2025", platform: "Social" },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Marketing() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I can help you create engaging marketing content. What would you like to create today?",
    },
  ]);
  const { toast } = useToast();

  const handleMessageSent = async (message: string) => {
      try {
        const data = await api.generateContent(message);

        const aiMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.content,
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error("Error generating content:", error);
        toast({
          title: "Error",
          description: "Failed to generate content. Please try again.",
          variant: "destructive",
        });
  }
};

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-warning/10 text-warning border-warning/20";
      case "in-progress": return "bg-primary/10 text-primary border-primary/20";
      case "scheduled": return "bg-success/10 text-success border-success/20";
      default: return "bg-muted";
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Marketing</h1>
        <p className="text-muted-foreground">Plan and create content with AI assistance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Planner */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Calendar</CardTitle>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Content
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {contentPlans.map((content) => (
                  <Card key={content.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{content.title}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {content.date}
                          </span>
                          <span>•</span>
                          <span>{content.platform}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={getStatusColor(content.status)}>
                        {content.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">245</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Reach</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-success">12.5%</div>
                  <div className="text-xs text-muted-foreground mt-1">Engagement Rate</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-warning">34</div>
                  <div className="text-xs text-muted-foreground mt-1">New Leads</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>

        {/* AI Content Creator */}
        <div className="h-[calc(100vh-12rem)]">
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Content Creator</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AIChat
                placeholder="Ask AI to create content..."
                suggestions={[
                  "Create email campaign",
                  "Write social media post",
                  "Generate ad copy",
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
