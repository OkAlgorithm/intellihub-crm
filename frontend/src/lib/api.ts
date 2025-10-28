const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  chat: async (message: string) => {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('Chat API failed');
    return response.json();
  },

  generateTasks: async (conversationContext: string) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationContext }),
    });
    if (!response.ok) throw new Error('Generate tasks failed');
    return response.json();
  },

  generateContent: async (prompt: string) => {
    const response = await fetch(`${API_BASE_URL}/api/content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Generate content failed');
    return response.json();
  },

  generateWorkflow: async (prompt: string) => {
    const response = await fetch(`${API_BASE_URL}/api/workflows/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Generate workflow failed');
    return response.json();
  },

  transcribeAudio: async (audioUrl: string) => {
    const response = await fetch(`${API_BASE_URL}/api/audio/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl }),
    });
    if (!response.ok) throw new Error('Transcribe audio failed');
    return response.json();
  },

  queryKnowledge: async (dealId: string, query: string) => {
    const response = await fetch(`${API_BASE_URL}/api/knowledge/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, query }),
    });
    if (!response.ok) throw new Error('Query knowledge failed');
    return response.json();
  },

  executeTaskAction: async (taskId: string, permissionId: string, action: string) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, permissionId, action }),
    });
    if (!response.ok) throw new Error('Execute task failed');
    return response.json();
  },
};