from fastapi import FastAPI, Body
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import openai
import asyncio
import json
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client
client = openai.OpenAI(api_key='')
# Replace with your actual Assistant ID
ASSISTANT_ID = ""

async def stream_openai_responses(thread_id):
    """Handles streaming of OpenAI Assistant responses"""
    tool_outputs = []
    is_completed = False
    loop_count = 0
    run_id = None
    while not is_completed:
        print(f"🔹 Loop: {loop_count}")
        # Create a new run or submit tool outputs if required
        if not tool_outputs:
            stream = client.beta.threads.runs.create(
                thread_id=thread_id,
                assistant_id=ASSISTANT_ID,
                stream=True,
            )
        else:
            stream = client.beta.threads.runs.submit_tool_outputs_stream(
                thread_id=thread_id,
                run_id=run_id,
                tool_outputs=tool_outputs,
            )
        str_content = ""
        for event in stream:
            print("🔸 Event received:", event)
            if event.event == "thread.message.delta":
                content = event.data.delta.content[0].text.value
                print("📢 Assistant:", content, flush=True)
                yield f"data: {json.dumps({'text': content})}\n\n"
                str_content += content
            elif event.event == "thread.run.completed":
                print("✅ Run Completed")
                is_completed = True
            elif event.event == "thread.run.requires_action":
                if event.data.required_action.type == "submit_tool_outputs":
                    run_id = event.data.id
                    tools_called = event.data.required_action.submit_tool_outputs.tool_calls
                    print("🛠 Tools Called:", tools_called)
                    tool_outputs = [
                        {
                            "tool_call_id": tool.id,
                            "output": json.dumps(mock_tool_output(tool.function.name, json.loads(tool.function.arguments))),
                        }
                        for tool in tools_called
                    ]
                    print("🔧 Tool Outputs:", tool_outputs)
                    break  # Restart loop to submit tool outputs
        if str_content and not is_completed:
            yield f"data: {json.dumps({'longwait': True})}\n\n"
        loop_count += 1
    print("🔹 Streaming complete.")

def mock_tool_output(tool_name, args):
    """Mock API to simulate tool call outputs."""
    return {"tool": tool_name, "args": args, "result": "Mocked result"}

@app.post("/stream")
async def stream(message: str = Body(...)):
    """Endpoint to handle streaming"""
    thread_id = 'thread_twgQRMj4jRoQLEHD6f7T3Xo5'
    if not message:
        return {"error": "Message is required"}
    # Retrieve or create a thread
    try:
        if thread_id:
            thread = client.beta.threads.retrieve(thread_id)
        else:
            thread = client.beta.threads.create()
            thread_id = thread.id
    except Exception as e:
        print(f"❌ Error retrieving/creating thread: {e}")
        return {"error": f"Failed to create/retrieve thread {e}"}
    # Add user message to thread
    client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=message,
    )
    return StreamingResponse(
        stream_openai_responses(thread_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",  # Additional CORS header for SSE
        }
    )