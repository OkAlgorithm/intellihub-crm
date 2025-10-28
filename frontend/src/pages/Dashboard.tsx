import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AIChat from "@/components/shared/AIChat";
import { ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hi! I'm your CRM analytics assistant. I can help you understand lead quality, conversion rates, and pipeline performance.",
    },
  ]);
  const { toast } = useToast();

  const handleMessageSent = async (message: string) => {
  try {
    const data = await api.chat(message);

    const aiMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: data.reply,
    };

    setMessages((prev) => [...prev, aiMessage]);
  } catch (error) {
    console.error("Error calling AI:", error);
    toast({
      title: "Error",
      description: "Failed to get AI response. Please try again.",
      variant: "destructive",
    });
  }
};
  const metrics = [
    { title: "Opportunity Status", value: "1", change: "+100%", trend: "up", subtitle: "vs Last 31 Days" },
    { title: "Opportunity Value", value: "$0", change: "0%", trend: "neutral", subtitle: "vs Last 31 Days" },
    { title: "Conversion Rate", value: "0%", change: "0%", trend: "neutral", subtitle: "Won revenue: $0" },
  ];

  const funnelData = [
    { stage: "Lead In", value: "$0", cumulative: "100.00%", nextStep: "100.00%" },
    { stage: "Lead Responded", value: "$0", cumulative: "0.00%", nextStep: "0.00%" },
    { stage: "No Answer", value: "$0", cumulative: "0.00%", nextStep: "0.00%" },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Track your leads and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Metrics Cards */}
        {metrics.map((metric, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pipelines</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{metric.value}</div>
              <div className="flex items-center gap-2 text-sm">
                {metric.trend === "up" && (
                  <span className="flex items-center text-success">
                    <ArrowUp className="h-4 w-4 mr-1" />
                    {metric.change}
                  </span>
                )}
                {metric.trend === "neutral" && (
                  <span className="text-muted-foreground">{metric.change}</span>
                )}
                <span className="text-muted-foreground">{metric.subtitle}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Funnel</CardTitle>
              <Select defaultValue="2025">
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025 DB</SelectItem>
                  <SelectItem value="2024">2024 DB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold mb-4">$0</div>
              <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground mb-2">
                <div>Stage</div>
                <div className="text-center">Cumulative</div>
                <div className="text-center">Next Step Conversion</div>
              </div>
              {funnelData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="font-medium">{item.stage}</div>
                    <div className="text-center">{item.cumulative}</div>
                    <div className="text-center">{item.nextStep}</div>
                  </div>
                  <div className="h-10 bg-primary/20 rounded flex items-center px-3 text-sm">
                    {item.stage} {item.value}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Chat */}
        <div className="h-[600px]">
          <AIChat
            placeholder="Ask about lead quality, workflows..."
            suggestions={[
              "Show lead quality metrics",
              "How are workflows performing?",
              "Analyze conversion rates",
            ]}
            messages={messages}
            onMessagesChange={setMessages}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Stage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Stage Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">1</div>
                <p className="text-sm text-muted-foreground">Total Opportunities</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full bg-primary"></div>
                    <span>Lead In: $0 (100.00%) - 1</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Opportunity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p>No data to display</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
 }
