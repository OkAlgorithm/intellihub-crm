import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AIChat from "@/components/shared/AIChat";
import { Workflow as WorkflowIcon, Play, Plus, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const workflows = [
  { id: 1, name: "Lead Follow-up Sequence", status: "active", triggers: 45, lastRun: "2 hours ago" },
  { id: 2, name: "Email Campaign Automation", status: "active", triggers: 23, lastRun: "1 day ago" },
  { id: 3, name: "Task Assignment Flow", status: "paused", triggers: 12, lastRun: "3 days ago" },
];

export default function Automation() {
  const [showBuilder, setShowBuilder] = useState(false);

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
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <WorkflowIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{workflow.name}</h4>
                          <p className="text-sm text-muted-foreground">Last run: {workflow.lastRun}</p>
                        </div>
                      </div>
                      <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                        {workflow.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{workflow.triggers} triggers executed</span>
                      <Button variant="ghost" size="sm">
                        <Play className="h-3 w-3 mr-1" />
                        Run
                      </Button>
                    </div>
                  </Card>
                ))}
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
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AIChat
                placeholder="Describe the workflow you want..."
                suggestions={[
                  "Create lead nurture flow",
                  "Automate follow-ups",
                  "Build email sequence",
                ]}
                onMessageSent={() => setShowBuilder(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
