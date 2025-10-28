# This is a sample Python script.

# Press ⌃R to execute it or replace it with your code.
# Press Double ⇧ to search everywhere for classes, files, tool windows, actions, and settings.


"""
FastAPI backend with LOCAL AI using Ollama
No external API calls needed
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.pool import SimpleConnectionPool
import os
import json
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import logging

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection pool
DB_POOL = SimpleConnectionPool(
    1, 10,
    host=os.getenv("DB_HOST", "localhost"),
    port=os.getenv("DB_PORT", "5432"),
    database=os.getenv("DB_NAME", "crm_db"),
    user=os.getenv("DB_USER", "zhanik"),
    password=os.getenv("DB_PASSWORD", ""),
)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

def get_db():
    """Get database connection from pool"""
    return DB_POOL.getconn()

def return_db(conn):
    """Return connection to pool"""
    DB_POOL.putconn(conn)

# Models
class ChatMessage(BaseModel):
    message: str

class TaskGenRequest(BaseModel):
    conversationContext: str

class ContentGenRequest(BaseModel):
    prompt: str

class WorkflowGenRequest(BaseModel):
    prompt: str

class AudioTranscribeRequest(BaseModel):
    audioUrl: str

class KnowledgeQueryRequest(BaseModel):
    dealId: str
    query: str

class TaskActionRequest(BaseModel):
    taskId: str
    permissionId: str
    action: str

# Utility function for local AI calls
async def call_ollama(prompt: str, system_prompt: Optional[str] = None, format: Optional[str] = None):
    """Call local Ollama API"""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }

        if system_prompt:
            payload["system"] = system_prompt

        if format == "json":
            payload["format"] = "json"

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload
            )

            if response.status_code != 200:
                logger.error(f"Ollama error: {response.status_code} {response.text}")
                raise HTTPException(status_code=500, detail=f"AI error: {response.status_code}")

            data = response.json()
            return data["response"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with: ollama serve"
        )
    except Exception as e:
        logger.error(f"Error calling Ollama: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Routes

@app.post("/api/chat")
async def chat_assistant(req: ChatMessage):
    """Chat endpoint - CRM analytics assistant"""
    try:
        system_prompt = "You are a CRM analytics assistant. Help users understand their lead quality, conversion rates, and pipeline performance. Provide actionable insights based on the data they mention."

        reply = await call_ollama(req.message, system_prompt=system_prompt)
        return {"reply": reply}
    except Exception as e:
        logger.error(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tasks/generate")
async def generate_tasks(req: TaskGenRequest):
    """Generate tasks from conversation context"""
    try:
        system_prompt = """You are a task generation assistant for a CRM. 
Based on conversation context, generate 3-5 relevant follow-up tasks.
Return ONLY valid JSON with this structure:
{
  "tasks": [
    {"title": "Task title", "dueDate": "2025-11-01"},
    {"title": "Another task", "dueDate": "2025-11-05"}
  ]
}"""

        prompt = f"Generate tasks for this conversation:\n{req.conversationContext}"

        response = await call_ollama(prompt, system_prompt=system_prompt, format="json")

        # Parse JSON response
        try:
            tasks_data = json.loads(response)
            return {"tasks": tasks_data.get("tasks", [])}
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            logger.warning("Failed to parse tasks JSON, using default")
            return {"tasks": [
                {"title": "Follow up on conversation", "dueDate": "2025-10-25"},
                {"title": "Review discussion points", "dueDate": "2025-10-27"}
            ]}
    except Exception as e:
        logger.error(f"Error generating tasks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/content/generate")
async def generate_content(req: ContentGenRequest):
    """Generate marketing content"""
    try:
        system_prompt = "You are a marketing content creation assistant. Generate engaging, persuasive marketing content based on user prompts. Be creative and align with modern marketing best practices."

        content = await call_ollama(req.prompt, system_prompt=system_prompt)
        return {"content": content}
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/workflows/generate")
async def generate_workflow(req: WorkflowGenRequest):
    """Generate workflow from description"""
    try:
        system_prompt = """You are a workflow automation assistant.
Generate a workflow name and description based on the user's request.
Return ONLY valid JSON with this structure:
{
  "name": "Workflow name",
  "description": "Brief description of what the workflow does"
}"""

        response = await call_ollama(req.prompt, system_prompt=system_prompt, format="json")

        try:
            workflow = json.loads(response)
            return {"workflow": workflow}
        except json.JSONDecodeError:
            # Fallback
            return {"workflow": {
                "name": "Custom Workflow",
                "description": req.prompt[:100]
            }}
    except Exception as e:
        logger.error(f"Error generating workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audio/transcribe")
async def transcribe_audio(req: AudioTranscribeRequest):
    """Transcribe audio file using Whisper"""
    try:
        # Download audio
        async with httpx.AsyncClient() as client:
            audio_response = await client.get(req.audioUrl)
            if audio_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to fetch audio")

            # Save temporarily
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
                tmp_file.write(audio_response.content)
                tmp_path = tmp_file.name

        # Use Whisper for transcription (requires whisper.cpp or faster-whisper)
        # For now, return a placeholder - you'll need to set up Whisper separately
        import subprocess

        # Option 1: If you have whisper.cpp installed
        # result = subprocess.run(['whisper', tmp_path, '--output-format', 'txt'], capture_output=True)
        # transcription = result.stdout.decode()

        # Option 2: Using faster-whisper (install: pip install faster-whisper)
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel("base", device="cpu", compute_type="int8")
            segments, info = model.transcribe(tmp_path)
            transcription = " ".join([segment.text for segment in segments])
        except ImportError:
            # Fallback if whisper not installed
            transcription = "[Audio transcription requires Whisper model - install faster-whisper]"

        # Cleanup
        os.unlink(tmp_path)

        return {"transcription": transcription}
    except Exception as e:
        logger.error(f"Error transcribing audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/knowledge/query")
async def query_knowledge(req: KnowledgeQueryRequest):
    """Query knowledge base with RAG"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Fetch knowledge base
        cursor.execute(
            "SELECT content FROM contact_knowledge WHERE deal_id = %s",
            (req.dealId,)
        )
        rows = cursor.fetchall()
        context = "\n\n".join([row[0] for row in rows]) if rows else "No previous knowledge available."

        cursor.close()
        return_db(conn)

        system_prompt = f"""You are a CRM assistant with access to the following knowledge about this contact:

{context}

Use this information to answer questions accurately and helpfully."""

        answer = await call_ollama(req.query, system_prompt=system_prompt)
        return {"answer": answer}
    except Exception as e:
        logger.error(f"Error querying knowledge: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tasks/execute")
async def execute_task_action(req: TaskActionRequest):
    """Approve or reject task"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update permission status
        status = "approved" if req.action == "approve" else "rejected"
        cursor.execute(
            """UPDATE task_permissions 
               SET status = %s, approved_at = NOW() 
               WHERE id = %s""",
            (status, req.permissionId)
        )

        conn.commit()
        cursor.close()
        return_db(conn)

        message = "Task approved and executed" if req.action == "approve" else "Task rejected"
        return {"success": True, "message": message, "taskId": req.taskId}
    except Exception as e:
        logger.error(f"Error executing task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhooks/whatsapp")
async def whatsapp_webhook(req: dict):
    """WhatsApp webhook - trigger workflows"""
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Find active WhatsApp workflows
        cursor.execute(
            """SELECT * FROM workflows 
               WHERE trigger_type = 'whatsapp' AND status = 'active'"""
        )
        workflows = cursor.fetchall()

        # Update trigger count for each
        for workflow in workflows:
            cursor.execute(
                """UPDATE workflows 
                   SET triggers_executed = triggers_executed + 1, last_run_at = NOW() 
                   WHERE id = %s""",
                (workflow[0],)
            )

        conn.commit()
        cursor.close()
        return_db(conn)

        return {
            "success": True,
            "message": "WhatsApp message processed",
            "workflows_triggered": len(workflows)
        }
    except Exception as e:
        logger.error(f"Error in WhatsApp webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "ai_backend": "ollama", "model": OLLAMA_MODEL}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CRM Backend API",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# See PyCharm help at https://www.jetbrains.com/help/pycharm/
