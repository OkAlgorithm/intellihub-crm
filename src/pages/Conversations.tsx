import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageCircle, Send, Star, Plus, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const conversations = [
  { id: 1, name: "(773) 241-8719", type: "call", time: "2:28 AM", unread: 1, snippet: "Inbound Call" },
  { id: 2, name: "Abrar Hussain", type: "instagram", time: "Sep 23", unread: 1, snippet: "Hi" },
  { id: 3, name: "Shoaib Seo", type: "instagram", time: "Sep 15", unread: 2, snippet: "Hello there, I provide High Quality g..." },
  { id: 4, name: "Naty Sanchez Pascual", type: "instagram", time: "Sep 08", unread: 1, snippet: "Hello, my name is Bonnie. I'm 35 yea..." },
  { id: 5, name: "(909) 496-7668", type: "call", time: "Sep 03", unread: 4, snippet: "Hi this is EA Pro Painters, I saw tha..." },
];

const dummyTasks = [
  { id: 1, title: "Follow up on quote request", completed: false, dueDate: "Tomorrow" },
  { id: 2, title: "Send painting samples", completed: true, dueDate: "Today" },
  { id: 3, title: "Schedule site visit", completed: false, dueDate: "Oct 10" },
];

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [message, setMessage] = useState("");
  const [tasks, setTasks] = useState(dummyTasks);

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const generateTasks = () => {
    const newTasks = [
      { id: Date.now(), title: "Send project estimate for exterior painting", completed: false, dueDate: "Oct 10" },
      { id: Date.now() + 1, title: "Confirm availability for October 15th", completed: false, dueDate: "Oct 9" },
      { id: Date.now() + 2, title: "Provide references from similar projects", completed: false, dueDate: "Oct 11" },
    ];
    setTasks(newTasks);
  };

  return (
    <div className="flex h-screen">
      {/* Conversations List */}
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold mb-4">Conversations</h2>
          <Input placeholder="Search" className="w-full" />
          <div className="flex gap-2 mt-3">
            <Button variant="ghost" size="sm">Unread</Button>
            <Button variant="ghost" size="sm">Recents</Button>
            <Button variant="ghost" size="sm">Starred</Button>
            <Button variant="ghost" size="sm">All</Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-1",
                  selectedConversation.id === conv.id && "bg-muted"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {getIcon(conv.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{conv.name}</span>
                      <span className="text-xs text-muted-foreground">{conv.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">{conv.snippet}</p>
                      {conv.unread > 0 && (
                        <Badge className="bg-primary text-primary-foreground h-5 min-w-5 rounded-full text-xs">
                          {conv.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{selectedConversation.name}</h3>
            <p className="text-xs text-muted-foreground">Active conversation</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon"><Star className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon"><Mail className="h-4 w-4" /></Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Oct 8th, 2025
              </span>
            </div>
            
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="bg-muted rounded-lg p-3 max-w-md">
                <p className="text-sm">Inbound Call</p>
                <p className="text-xs text-muted-foreground mt-1">02:28 AM</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              className="flex-1"
            />
            <Button size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks Sidebar */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Circle className="h-4 w-4" />
              Tasks
            </h3>
            <Button variant="ghost" size="sm" onClick={generateTasks}>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">No tasks found</p>
                <p className="text-xs mt-1">Click Generate to create AI tasks</p>
              </div>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="p-3">
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "mt-0.5 flex-shrink-0",
                      task.completed ? "text-success" : "text-muted-foreground"
                    )}>
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{task.dueDate}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
