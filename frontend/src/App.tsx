import React, { useState, useEffect, useCallback, useRef } from "react";
import { PingForm } from "./components/PingForm";
import { LobbyList } from "./components/LobbyList";
import { NearbyPage } from "./components/NearbyPage";
import { ChatRoom, ChatMessage } from "./components/ChatRoom";
import { PingDetailModal } from "./components/PingDetailModal";
import { useGeolocation } from "./hooks/useGeolocation";
import { useWebSocket } from "./hooks/useWebSocket";
import { getNearbyPings, getLobby, deleteLobby } from "./api/client";

const USER_ID = crypto.randomUUID();;

type Page = "home" | "nearby";

export default function App() {
  const { coords, error: geoError } = useGeolocation();
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingBlockedMsg, setPingBlockedMsg] = useState(false);
  const [page, setPage] = useState<Page>("home");
  const [chatLobbyId, setChatLobbyId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedLobby, setSelectedLobby] = useState<any | null>(null);
  const chatLobbyIdRef = useRef<string | null>(null);

  const openChat = useCallback((lobbyId: string) => {
    chatLobbyIdRef.current = lobbyId;
    setChatLobbyId(lobbyId);
    setChatMessages([]);
  }, []);

  const handleCloseChat = useCallback(() => {
    chatLobbyIdRef.current = null;
    setChatLobbyId(null);
    setChatMessages([]);
  }, []);

  const handleWsMessage = useCallback((msg: any) => {
    if (msg.type === "match_formed") {
      openChat(msg.payload.lobby_id);
    }
    if (msg.type === "lobby_update") setLobbies((prev) => [...prev]);
    if (msg.type === "chat_message") {
      // Skip own messages — they are added locally in handleChatSend
      if (chatLobbyIdRef.current && msg.payload.user_id !== USER_ID) {
        setChatMessages((prev) => [...prev, msg.payload]);
      }
    }
  }, [openChat]);

  const { send } = useWebSocket(USER_ID, handleWsMessage);

  const refreshLobbies = useCallback(async () => {
    if (!coords) return;
    try {
      const data = await getNearbyPings(coords.lat, coords.lon, 100);
      setLobbies(data.lobbies ?? []);
    } catch {}
  }, [coords]);

  useEffect(() => {
    refreshLobbies();
    const id = setInterval(refreshLobbies, 15000);
    return () => clearInterval(id);
  }, [refreshLobbies]);

  const handlePingCreated = (result: any) => {
    setActiveLobbyId(result.lobby_id);
    send({ type: "subscribe_lobby", lobby_id: result.lobby_id });
    setShowPingModal(false);
    refreshLobbies();
  };

  const handlePingClick = useCallback(async (lobbyId: string) => {
    const cached = lobbies.find((l) => l.lobby_id === lobbyId);
    let lobby = cached;
    if (!lobby) {
      try { lobby = await getLobby(lobbyId); } catch { return; }
    }
    // Creator or already-joined: go straight to chat
    if (lobby.creator_id === USER_ID || activeLobbyId === lobbyId) {
      openChat(lobbyId);
    } else {
      setSelectedLobby(lobby);
    }
  }, [lobbies, activeLobbyId, openChat]);

  const handleModalJoinSuccess = useCallback((lobbyId: string, result: any) => {
    setActiveLobbyId(lobbyId);
    send({ type: "subscribe_lobby", lobby_id: lobbyId });
    setSelectedLobby(null);
    openChat(lobbyId);
    refreshLobbies();
  }, [send, openChat, refreshLobbies]);

  const handleChatSend = useCallback((text: string) => {
    if (!chatLobbyIdRef.current) return;
    send({ type: "chat", lobby_id: chatLobbyIdRef.current, text });
    // Add own message locally so it appears immediately with correct user_id
    setChatMessages((prev) => [...prev, {
      user_id: USER_ID,
      text,
      timestamp: new Date().toISOString(),
    }]);
  }, [send]);

  const handleOpenPingForm = useCallback(() => {
    if (activeLobbyId) {
      setPingBlockedMsg(true);
      setTimeout(() => setPingBlockedMsg(false), 3000);
    } else {
      setShowPingModal(true);
    }
  }, [activeLobbyId]);

  const handleDeleteLobby = useCallback(async (lobbyId: string) => {
    try {
      await deleteLobby(lobbyId, USER_ID);
      if (activeLobbyId === lobbyId) setActiveLobbyId(null);
      refreshLobbies();
    } catch {}
  }, [activeLobbyId, refreshLobbies]);

  const locState = geoError ? "error" : coords ? "ready" : "locating";
  const locText = geoError ? "location unavailable" : coords ? "live · hyper-local · 10m radius" : "locating you...";

  const openNearby = () => setPage("nearby");
  const openHome = () => setPage("home");

  return (
    <>
      {/* ── NAV (full-width outer, constrained inner) ── */}
      <div className="nav-outer">
        <nav className="nav">
          <div className="nav-logo" style={{ cursor: "pointer" }} onClick={openHome}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="9" cy="7" r="3.5" fill="#1D9E75"/>
              <path d="M2 19c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="17" cy="7" r="2.8" fill="#1D9E75" opacity="0.55"/>
              <path d="M17 13c2.761 0 5 2.019 5 4.5" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55"/>
            </svg>
            need a <span>sidekick</span>
          </div>
          <div className="nav-links">
            <button className={`nav-link${page === "home" ? " active" : ""}`} onClick={openHome}>home</button>
            <button className="nav-link" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>how it works</button>
            <button className="nav-link" onClick={() => { openHome(); setTimeout(() => document.getElementById("activities")?.scrollIntoView({ behavior: "smooth" }), 50); }}>activities</button>
          </div>
          <button className="nav-cta" onClick={openNearby}>
            find a sidekick
          </button>
        </nav>
      </div>

      {/* ── PAGE ROUTING ── */}
      {page === "nearby" ? (
        <div className="page">
          <NearbyPage
            coords={coords}
            currentUserId={USER_ID}
            activeLobbyId={activeLobbyId}
            onBack={openHome}
            onPingClick={handlePingClick}
            onDelete={handleDeleteLobby}
            onOpenPingForm={handleOpenPingForm}
          />
        </div>
      ) : (
        <div className="page">

          {/* ── HERO ── */}
          <section className="hero" id="home">
            <div className="hero-pill">
              <div className={`hero-pill-dot ${locState}`}></div>
              <span className={`hero-pill-text ${locState}`}>{locText}</span>
            </div>
            <h1 className="hero-h1">
              find someone nearby,<br /><span>right now.</span>
            </h1>
            <p className="hero-sub">
              Post a 15-minute ping. Get matched with someone in the same space.
              No accounts, no scheduling — just spontaneous activity.
            </p>
            <div className="hero-btns">
              <button className="btn-primary" onClick={handleOpenPingForm}>
                post a ping →
              </button>
              <button className="btn-secondary" onClick={openNearby}>
                browse nearby
              </button>
            </div>

            {/* MAP PREVIEW */}
            <div className="map-preview">
              <div className="map-topbar">
                <div className="map-topbar-left">
                  <div className="win-dot" style={{ background: "#E24B4A" }}></div>
                  <div className="win-dot" style={{ background: "#EF9F27" }}></div>
                  <div className="win-dot" style={{ background: "#1D9E75" }}></div>
                  <span className="map-topbar-title">nearby pings · live view</span>
                </div>
                <div className="map-topbar-live">
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#1D9E75", animation: "blink 1.5s infinite" }}></div>
                  {lobbies.length > 0 ? `${lobbies.length} ping${lobbies.length > 1 ? "s" : ""} nearby` : "no pings yet"}
                </div>
              </div>
              <div className="map-body">
                {/* Decorative map */}
                <div className="map-area">
                  <div className="map-grid-lines"></div>
                  <div className="map-road-h" style={{ top: "38%" }}></div>
                  <div className="map-road-h" style={{ top: "66%" }}></div>
                  <div className="map-road-v" style={{ left: "44%" }}></div>
                  <div className="map-blk" style={{ width: 90, height: 52, top: "9%", left: "6%" }}></div>
                  <div className="map-blk" style={{ width: 70, height: 60, top: "9%", left: "54%" }}></div>
                  <div className="map-blk" style={{ width: 80, height: 44, top: "44%", left: "53%" }}></div>
                  <div className="map-blk" style={{ width: 60, height: 72, top: "70%", left: "6%" }}></div>
                  <div className="map-radius" style={{ width: 120, height: 120, top: "50%", left: "50%" }}></div>
                  <div className="map-user" style={{ top: "50%", left: "50%" }}>
                    <div className="u-ring"><div className="u-core"></div></div>
                  </div>
                  {lobbies.slice(0, 3).map((l, i) => {
                    const positions = [
                      { top: "41%", left: "36%" },
                      { top: "54%", left: "63%" },
                      { top: "34%", left: "61%" },
                    ];
                    const colors = ["g", "a", "p"] as const;
                    const c = colors[i % 3];
                    const label = l.message
                      ? l.message.slice(0, 14) + (l.message.length > 14 ? "…" : "")
                      : l.activity_type.replace(/_/g, " ");
                    return (
                      <div key={l.lobby_id} className="ping-marker" style={positions[i]}>
                        <div className={`ping-bub ${c}`}>{label}</div>
                        <div className={`ping-stem ${c}`}></div>
                        <div className={`ping-dot2 ${c}`}></div>
                      </div>
                    );
                  })}
                </div>
                {/* Real sidebar */}
                <LobbyList
                  lobbies={lobbies}
                  currentUserId={USER_ID}
                  activeLobbyId={activeLobbyId}
                  onPingClick={handlePingClick}
                  onDelete={handleDeleteLobby}
                  onOpenPingForm={handleOpenPingForm}
                />
              </div>
            </div>
          </section>

          {/* ── STATS ── */}
          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-val">15<span>min</span></div>
              <div className="stat-label">ping lifespan</div>
            </div>
            <div className="stat-item">
              <div className="stat-val"><span>~</span>10<span>m</span></div>
              <div className="stat-label">match radius</div>
            </div>
            <div className="stat-item">
              <div className="stat-val"><span>0</span></div>
              <div className="stat-label">accounts needed</div>
            </div>
            <div className="stat-item">
              <div className="stat-val"><span>&lt;</span>2<span>s</span></div>
              <div className="stat-label">avg. match time</div>
            </div>
          </div>

          {/* ── HOW IT WORKS ── */}
          <section className="how-section" id="how">
            <div className="section-label">how it works</div>
            <h2 className="section-h2">three steps to your sidekick</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-num">01</div>
                <div className="step-icon-wrap g">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill="#9FE1CB"/>
                    <circle cx="12" cy="12" r="7" stroke="#1D9E75" strokeWidth="1.5" fill="none"/>
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="step-h">post a ping</div>
                <div className="step-p">Describe what you need — a gym spotter, a tennis partner, an extra board game player. Your ping is live for 15 minutes, visible only within your area.</div>
              </div>
              <div className="step-card">
                <div className="step-num">02</div>
                <div className="step-icon-wrap a">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="#FAC775" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="step-h">get matched</div>
                <div className="step-p">Our system instantly runs a geospatial query across nearby active pings. When a compatible match is found within your radius, both users are notified instantly.</div>
              </div>
              <div className="step-card">
                <div className="step-num">03</div>
                <div className="step-icon-wrap p">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="#CECBF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="8" stroke="#7F77DD" strokeWidth="1.5" fill="none"/>
                  </svg>
                </div>
                <div className="step-h">confirm &amp; go</div>
                <div className="step-p">Both users get a ready check. Confirm, and you're connected — find each other and start the activity.</div>
              </div>
            </div>
          </section>

          {/* ── ACTIVITIES ── */}
          <section className="activities-section" id="activities">
            <div className="act-header">
              <div>
                <div className="section-label">activities</div>
                <h2 className="section-h2 no-mb">what people ping for</h2>
              </div>
            </div>
            <div className="act-grid">
              {[
                { label: "Gym Spotter",     meta: "fitness · most pinged",  color: "g", badge: "live" },
                { label: "Table Tennis",    meta: "sports · rec rooms",      color: "a", badge: "live" },
                { label: "Board Games",     meta: "games · common areas",    color: "p", badge: "live" },
                { label: "Badminton",       meta: "sports · courts",         color: "r", badge: "popular" },
                { label: "Jogging Partner", meta: "fitness · parks",         color: "g", badge: "live" },
                { label: "Chess",           meta: "games · cafes",           color: "p", badge: "popular" },
              ].map((a) => (
                <div className="act-card" key={a.label} style={{ cursor: "pointer" }} onClick={handleOpenPingForm}>
                  <div className={`act-ico ${a.color}`}>
                    {a.color === "g" ? "🏋️" : a.color === "a" ? "🏓" : a.color === "r" ? "🏸" : "♟️"}
                  </div>
                  <div>
                    <div className="act-title">{a.label}</div>
                    <div className="act-meta">{a.meta}</div>
                  </div>
                  <div className={`act-badge ${a.color}`}>{a.badge}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── CTA ── */}
          <div className="cta-section">
            <div className="cta-h">someone nearby needs a <span>sidekick.</span></div>
            <p className="cta-sub">
              No account. No app download. Just open the page, post a ping, and see who's around. Takes 10 seconds.
            </p>
            <button className="btn-primary btn-lg" onClick={handleOpenPingForm}>
              find a sidekick now →
            </button>
            <div className="cta-note">anonymous · free · pings expire in 15 min</div>
          </div>

          {/* ── FOOTER ── */}
          <footer className="footer">
            <div className="footer-logo">need a <span>sidekick</span></div>
            <div className="footer-note">CS5224 · Cloud Computing · Group 27 · NUS 2026</div>
          </footer>

        </div>
      )}

      {/* ── ACTIVE PING TOAST ── */}
      {pingBlockedMsg && (
        <div className="ping-blocked-toast">you already have an active ping</div>
      )}

      {/* ── GLOBAL MODALS ── */}
      {showPingModal && (
        <PingForm
          userId={USER_ID}
          coords={coords}
          onPingCreated={handlePingCreated}
          onClose={() => setShowPingModal(false)}
        />
      )}
      {selectedLobby && (
        <PingDetailModal
          lobby={selectedLobby}
          currentUserId={USER_ID}
          onJoinSuccess={handleModalJoinSuccess}
          onClose={() => setSelectedLobby(null)}
        />
      )}
      {chatLobbyId && (
        <ChatRoom
          lobbyId={chatLobbyId}
          currentUserId={USER_ID}
          activityType={lobbies.find(l => l.lobby_id === chatLobbyId)?.activity_type ?? "other"}
          messages={chatMessages}
          onSend={handleChatSend}
          onClose={handleCloseChat}
        />
      )}
    </>
  );
}
