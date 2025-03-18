import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    // Create placeholder for assistant response
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);
    
    setIsLoading(true);
    const userInput = input;
    setInput('');
    
    try {
      const response = await fetch('http://localhost:8000/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInput)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Process the stream
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.text) {
                // Update the assistant's message with new content
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMessage = updated[updated.length - 1];
                  
                  // Make sure we're updating the assistant message
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content += data.text;
                  }
                  
                  return updated;
                });
              }
              
              // Handle long wait notification
              if (data.longwait) {
                console.log("Long wait indicated, assistant is processing...");
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      
      // Add error message
      setMessages(prev => {
        const updated = [...prev];
        const lastMessage = updated[updated.length - 1];
        
        if (lastMessage.role === 'assistant') {
          lastMessage.content += " [Error: " + error.message + "]";
        }
        
        return updated;
      });
    }
  };

  return (
    <div className="chat-container">      
      <div className="message-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            Start chatting with the assistant
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-role">{message.role === 'user' ? 'You' : 'AI'}</div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="loading-indicator">AI is typing...</div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;