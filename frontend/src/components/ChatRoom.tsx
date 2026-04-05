import { useState, useEffect, useRef, KeyboardEvent } from "react";

export interface ChatMessage {
  user_id: string;
  text: string;
  timestamp: string;
}

interface Props {
  lobbyId: string;
  currentUserId: string;
  activityType: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

const ACTIVITY_LABELS: Record<string, string> = {
  gym_spotter: "Gym Spotter",
  table_tennis: "Table Tennis",
  board_game: "Board Game",
  badminton: "Badminton",
  chess: "Chess",
  running: "Running",
  other: "Other",
};

export function ChatRoom({ currentUserId, activityType, messages, onSend, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const activityLabel = ACTIVITY_LABELS[activityType] ?? activityType;

  return (
    <div className="modal-overlay">
      <div className="modal-card chat-room">
        <div className="chat-room-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="chat-room-title">{activityLabel}</span>
            <span className="chat-room-badge">live chat</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close chat">✕</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12, textAlign: "center", marginTop: 24 }}>
              no messages yet — say hi!
            </div>
          )}
          {messages.map((msg, i) => {
            const mine = msg.user_id === currentUserId;
            return (
              <div key={i} className={`chat-msg${mine ? " mine" : ""}`}>
                <div className="chat-msg-bubble">{msg.text}</div>
                <div className="chat-msg-meta">
                  {mine ? "you" : "sidekick"} · {formatTime(msg.timestamp)}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="chat-input"
            type="text"
            placeholder="type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!draft.trim()}
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
