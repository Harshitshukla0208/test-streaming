import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState('eyJraWQiOiJXMnRwOFA1eCt5VU1LbEhBd3FueUFsOEhzWDZTYWx3NTJYRTBRTHBpXC9HVT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0MWQzNGRiYS04MGExLTcwNzctNGQxMC02M2I1OGY4ZDYxNDciLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGgtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aC0xX25HeVlBbkNtMSIsImNsaWVudF9pZCI6IjZrZmhzYTVsaGZiOGpvZ21kZG11YmwzYmJjIiwib3JpZ2luX2p0aSI6IjRlZTVjNmIyLTUxNmItNDEyYi1hMWU4LTUzOGE0Mjk4Y2JiZiIsImV2ZW50X2lkIjoiMzQ0MTQyZTQtZWQ1Ny00ZjM1LWI2NTQtYTdmYmY4NWE3YmNhIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTc0MjcwNjg5OCwiZXhwIjoxNzQyNzM1Njk4LCJpYXQiOjE3NDI3MDY4OTgsImp0aSI6ImE1ZDZjOTFhLTUyOGQtNDMxZS04MDRhLTJiYWU4ZTFkZTU5MyIsInVzZXJuYW1lIjoiNDFkMzRkYmEtODBhMS03MDc3LTRkMTAtNjNiNThmOGQ2MTQ3In0.Yn0axCQiAEPejqZ4LlxTdlBon7J1xPkdh7G3t7wlV7m5uncrhOlH45vTuBhtOzAGLDHTaEzkLyDnIubgbh2tV2I8gT5_WyNbKM1gZZrapUtOnE0QrZ5x08m34NXbYPmeM4yiPFKNwJFh3YuOWllWhHwIjagRxS_ZnWXo92Niv1hnPTwrxVGBc74FB_V-SvREVV7DTRD0J5gqJMQ4duFBdDXvoyNlbRVTcP4-grg6i0wmWfSmqRB3Ck3LtSNAUc9D0lcgrjJtTrKsP-DEozptA5PiKjVBeX8IMTxO0HH_NrdTvTtf_NYviupIgxWMll2PnHI3WAKU0FmHFe0IcGYOqA');
  const [astId, setAstId] = useState('asst_vj32xccLWqWCUkQiOWzHOHht');
  const [threadId, setThreadId] = useState('thread_TlNRdGAiPwKA8VPXrueisNjL');
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
      // Create FormData object
      const formData = new FormData();
      formData.append('astId', astId);
      formData.append('threadId', threadId);
      formData.append('message', userInput);

      const response = await fetch('http://127.0.0.1:8000/api/chats/create-chat', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          // Note: Do not set Content-Type when using FormData, the browser will set it with the correct boundary
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // First try to parse as JSON
      let responseData;
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON first
        responseData = JSON.parse(responseText);
        // If it's JSON, extract the response text
        const responseContent = responseData.response || responseData.message || JSON.stringify(responseData);
        
        // Update the assistant message with the response
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          
          if (lastMessage.role === 'assistant') {
            lastMessage.content = responseContent;
          }
          
          return updated;
        });
      } catch (parseError) {
        // If it's not JSON, use the plain text directly
        // Remove "[STREAM COMPLETED]" if present
        const cleanedText = responseText.replace('[STREAM COMPLETED]', '').trim();
        
        // Update the assistant message with the text response
        setMessages(prev => {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          
          if (lastMessage.role === 'assistant') {
            lastMessage.content = cleanedText;
          }
          
          return updated;
        });
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
          lastMessage.content = `Error: ${error.message}`;
        }
        
        return updated;
      });
    }
  };

  return (
    <div className="chat-container">      
      {/* Authentication config section */}
      <div className="config-section">
        <div className="config-item">
          <label>Auth Token:</label>
          <input 
            type="text" 
            value={authToken} 
            onChange={(e) => setAuthToken(e.target.value)} 
            className="config-input"
            placeholder="Enter auth token"
          />
        </div>
        <div className="config-item">
          <label>Assistant ID:</label>
          <input 
            type="text" 
            value={astId} 
            onChange={(e) => setAstId(e.target.value)} 
            className="config-input"
            placeholder="Enter assistant ID"
          />
        </div>
        <div className="config-item">
          <label>Thread ID:</label>
          <input 
            type="text" 
            value={threadId} 
            onChange={(e) => setThreadId(e.target.value)} 
            className="config-input"
            placeholder="Enter thread ID"
          />
        </div>
      </div>

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