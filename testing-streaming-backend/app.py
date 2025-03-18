from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from typing import AsyncGenerator
from fastapi.responses import StreamingResponse

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    api_key: str  # Pass API key from frontend (not recommended for production)

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    # Configure OpenAI client with provided API key
    client = openai.OpenAI(api_key=request.api_key)
    
    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            # Create a streaming response from OpenAI
            response = client.chat.completions.create(
                model="gpt-4",  # Or another model that supports streaming
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": request.message}
                ],
                stream=True,  # Enable streaming
                max_tokens=1000
            )
            
            # Process the stream
            for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {content}\n\n"
                    
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(
        generate_stream(), 
        media_type="text/event-stream"
    )

# Add a GET endpoint for health check
@app.get("/")
def read_root():
    return {"status": "healthy", "message": "Server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)