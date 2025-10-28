import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MessageCircle, Send, Star, Plus, Sparkles, CheckCircle2, Circle, Mic, Volume2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Task {
  id: number | string;
  title: string;
  completed: boolean;
  dueDate: string;
  requiresPermission?: boolean;
  permissionStatus?: 'pending' | 'approved' | 'rejected';
  permissionId?: string;
}

interface AudioMessage {
  id: string;
  conversation_id: string;
  audio_url: string;
  transcription: string | null;
  duration: number | null;
  created_at: string;
  isTranscribing?: boolean;
}

const conversations = [
  { id: 1, name: "(773) 241-8719", type: "call", time: "2:28 AM", unread: 1, snippet: "Inbound Call" },
  { id: 2, name: "Abrar Hussain", type: "instagram", time: "Sep 23", unread: 1, snippet: "Hi" },
  { id: 3, name: "Shoaib Seo", type: "instagram", time: "Sep 15", unread: 2, snippet: "Hello there, I provide High Quality g..." },
  { id: 4, name: "Naty Sanchez Pascual", type: "instagram", time: "Sep 08", unread: 1, snippet: "Hello, my name is Bonnie. I'm 35 yea..." },
  { id: 5, name: "(909) 496-7668", type: "call", time: "Sep 03", unread: 4, snippet: "Hi this is EA Pro Painters, I saw tha..." },
];

export default function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [message, setMessage] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioMessages, setAudioMessages] = useState<AudioMessage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedConversation) {
      fetchAudioMessages(selectedConversation.id.toString());
    }
  }, [selectedConversation]);

  const fetchAudioMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('audio_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching audio messages:", error);
    } else {
      setAudioMessages(data || []);
    }
  };

  const transcribeAudio = async (audioMessage: AudioMessage) => {
    if (audioMessage.transcription) return;

  setAudioMessages(prev =>
    prev.map(msg =>
      msg.id === audioMessage.id
        ? { ...msg, isTranscribing: true }
        : msg
    )
  );

  try {
    const data = await api.transcribeAudio(audioMessage.audio_url);

    // Update the audio message with transcription
    const { error: updateError } = await supabase
      .from('audio_messages')
      .update({ transcription: data.transcription })
      .eq('id', audioMessage.id);

    if (updateError) throw updateError;

    setAudioMessages(prev =>
      prev.map(msg =>
        msg.id === audioMessage.id
          ? { ...msg, transcription: data.transcription, isTranscribing: false }
          : msg
      )
    );

    await fetchAudioMessages(selectedConversation.id.toString());

    toast({
      title: "Success",
      description: "Audio transcribed successfully",
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);

    setAudioMessages(prev =>
      prev.map(msg =>
        msg.id === audioMessage.id
          ? { ...msg, isTranscribing: false }
          : msg
      )
    );

    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to transcribe audio",
      variant: "destructive",
    });
  }
};


  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedConversation.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-messages')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('audio-messages')
        .getPublicUrl(filePath);

      // Create audio message record
      const { error: insertError } = await supabase
        .from('audio_messages')
        .insert({
          conversation_id: selectedConversation.id.toString(),
          audio_url: publicUrl,
          duration: null,
          transcription: null
        });

      if (insertError) throw insertError;

      // Refresh messages
      await fetchAudioMessages(selectedConversation.id.toString());

      toast({
        title: "Success",
        description: "Audio file uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast({
        title: "Error",
        description: "Failed to upload audio file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const generateTasks = async () => {
   setIsGenerating(true);
   try {
     const data = await api.generateTasks(
       `Conversation with ${selectedConversation.name}: ${selectedConversation.snippet}`
     );

      if (error) throw error;

      // Create task permissions for each task
      const generatedTasks: Task[] = [];
      
      for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i];
        const taskId = `task-${Date.now()}-${i}`;
        
        // Insert permission request
        const { data: permissionData, error: permError } = await supabase
          .from('task_permissions')
          .insert({
            conversation_id: selectedConversation.id.toString(),
            task_id: taskId,
            task_title: task.title,
            task_description: task.description,
            status: 'pending'
          })
          .select()
          .single();

        if (permError) {
          console.error('Error creating permission:', permError);
          continue;
        }

        generatedTasks.push({
          id: taskId,
          title: task.title,
          completed: false,
          dueDate: task.dueDate,
          requiresPermission: true,
          permissionStatus: 'pending',
          permissionId: permissionData.id
        });
      }

      setTasks(generatedTasks);
      toast({
        title: "Success",
        description: "AI-generated tasks require your approval.",
      });
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast({
        title: "Error",
        description: "Failed to generate tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTaskPermission = async (task: Task, action: 'approve' | 'reject') => {
    if (!task.permissionId) return;

    try {
      const { error } = await supabase.functions.invoke('execute-task-action', {
        body: {
          taskId: task.id,
          permissionId: task.permissionId,
          action
        }
      });

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === task.id 
          ? { ...t, permissionStatus: action === 'approve' ? 'approved' : 'rejected' }
          : t
      ));

      toast({
        title: action === 'approve' ? "Task Approved" : "Task Rejected",
        description: action === 'approve' 
          ? "AI can now execute this task" 
          : "Task has been rejected",
      });
    } catch (error) {
      console.error("Error handling task permission:", error);
      toast({
        title: "Error",
        description: "Failed to process task permission",
        variant: "destructive",
      });
    }
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

            {/* Audio Messages */}
            {audioMessages.map((audioMsg) => (
              <div key={audioMsg.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg p-3 max-w-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">Audio Message</p>
                    {audioMsg.duration && (
                      <span className="text-xs text-muted-foreground">
                        {audioMsg.duration}s
                      </span>
                    )}
                  </div>
                  {!audioMsg.transcription && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => transcribeAudio(audioMsg)}
                      disabled={audioMsg.isTranscribing}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {audioMsg.isTranscribing ? "Transcribing..." : "Transcribe with AI"}
                    </Button>
                  )}
                  {audioMsg.transcription && (
                    <div className="text-sm bg-card p-2 rounded border border-border mt-2">
                      <p className="text-xs text-muted-foreground mb-1">Transcription:</p>
                      <p>{audioMsg.transcription}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(audioMsg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex gap-2 mb-2">
            <label htmlFor="audio-upload">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isUploading}
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading ? "Uploading..." : "Upload Audio"}
                </span>
              </Button>
            </label>
            <input
              id="audio-upload"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
          </div>
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
            <Button variant="ghost" size="sm" onClick={generateTasks} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-1" />
              {isGenerating ? "Generating..." : "Generate"}
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
                  <div className="flex flex-col gap-2">
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
                    
                    {task.requiresPermission && task.permissionStatus === 'pending' && (
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleTaskPermission(task, 'approve')}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleTaskPermission(task, 'reject')}
                          className="flex-1"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    
                    {task.requiresPermission && task.permissionStatus === 'approved' && (
                      <Badge variant="default" className="w-fit mt-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    
                    {task.requiresPermission && task.permissionStatus === 'rejected' && (
                      <Badge variant="secondary" className="w-fit mt-2">
                        Rejected
                      </Badge>
                    )}
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
