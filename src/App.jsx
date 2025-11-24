import { useEffect, useRef, useState } from "react";
import ChatbotIcon from "./components/ChatbotIcon";
import ChatForm from "./components/ChatForm";
import ChatMessage from "./components/ChatMessage";
import { companyInfo } from "./companyInfo";

const App = () => {
  const chatBodyRef = useRef();
  const [showChatbot, setShowChatbot] = useState(false);

  const [chatHistory, setChatHistory] = useState([
    {
      hideInChat: true,
      role: "model",
      text: companyInfo,
    },
  ]);

  const generateBotResponse = async (history) => {
    const updateHistory = (text, isError = false) => {
      setChatHistory((prev) => [
        ...prev.filter((msg) => msg.text !== "Thinking..."),
        { role: "model", text, isError },
      ]);
    };

    // Format messages for Gemini API
    const formattedHistory = history.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    try {
      const response = await fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": import.meta.env.VITE_GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents: formattedHistory }),
      });

      // Debug: response status
      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        let errorText = "";
        try {
          const errorData = await response.json();
          errorText = errorData?.error?.message || response.statusText;
        } catch {
          errorText = response.statusText;
        }
        throw new Error(`API Error: ${errorText} (Status ${response.status})`);
      }

      const text = await response.text();

      if (!text) {
        throw new Error("Empty response from API");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON response from API");
      }

      // Check API response structure
      if (
        !data.candidates ||
        !Array.isArray(data.candidates) ||
        !data.candidates[0] ||
        !data.candidates[0].content ||
        !data.candidates[0].content.parts ||
        !Array.isArray(data.candidates[0].content.parts) ||
        !data.candidates[0].content.parts[0].text
      ) {
        throw new Error("Unexpected API response format");
      }

      const botText = data.candidates[0].content.parts[0].text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .trim();

      updateHistory(botText);
    } catch (error) {
      console.error("generateBotResponse error:", error);
      updateHistory(error.message || "Unknown error occurred", true);
    }
  };

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory]);

  return (
    <div className={`container ${showChatbot ? "show-chatbot" : ""}`}>
      <button onClick={() => setShowChatbot((prev) => !prev)} id="chatbot-toggler">
        <span className="material-symbols-rounded">mode_comment</span>
        <span className="material-symbols-rounded">close</span>
      </button>

      <div className="chatbot-popup">
        {/* HEADER */}
        <div className="chat-header">
          <div className="header-info">
            <ChatbotIcon />
            <h2 className="logo-text">Chatbot</h2>
          </div>
          <button
            onClick={() => setShowChatbot((prev) => !prev)}
            className="material-symbols-rounded"
          >
            keyboard_arrow_down
          </button>
        </div>

        {/* BODY */}
        <div ref={chatBodyRef} className="chat-body">
          <div className="message bot-message">
            <ChatbotIcon />
            <p className="message-text">
              Hey there 👋 <br />
              How can I help you today?
            </p>
          </div>

          {chatHistory.map((chat, index) => (
            <ChatMessage key={index} chat={chat} />
          ))}
        </div>

        {/* FOOTER */}
        <div className="chat-footer">
          <ChatForm
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            generateBotResponse={generateBotResponse}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
