import React from "react";

interface BusinessPageProps {
  onScrollToId?: (id: string) => void;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function BusinessPage(_: BusinessPageProps) {
  return (
    <div className="biz-page">
      {/* ── HERO ── */}
      <section className="biz-hero">
        <div className="biz-hero-pill">
          <div className="biz-hero-pill-dot"></div>
          <span className="biz-hero-pill-text">business partner program</span>
        </div>
        <h1>
          reach people nearby,<br />
          <span>right when they need you.</span>
        </h1>
        <p className="biz-hero-sub">
          Create sponsored long-lived pings that stay active for hours or days.
          Drive foot traffic to your venue by showing up when nearby users are
          looking for their next activity.
        </p>
        <div className="biz-hero-btns">
          <button className="biz-btn-primary" onClick={() => scrollToId("biz-pricing")}>
            view plans →
          </button>
          <button className="biz-btn-secondary" onClick={() => scrollToId("biz-value")}>
            learn more
          </button>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="biz-stats-bar">
        <div className="biz-stat-item">
          <div className="biz-stat-val amber">100<span>m</span></div>
          <div className="biz-stat-label">broadcast radius</div>
        </div>
        <div className="biz-stat-item">
          <div className="biz-stat-val green">12h<span>+</span></div>
          <div className="biz-stat-label">ping lifespan</div>
        </div>
        <div className="biz-stat-item">
          <div className="biz-stat-val amber">∞</div>
          <div className="biz-stat-label">impressions</div>
        </div>
        <div className="biz-stat-item">
          <div className="biz-stat-val green">&lt;1<span>s</span></div>
          <div className="biz-stat-label">to reach nearby users</div>
        </div>
      </div>

      {/* ── VALUE PROPS ── */}
      <section className="biz-value-section" id="biz-value">
        <div className="biz-section-label">why sidekick for business</div>
        <h2 className="biz-section-h2">
          unlock hyper-local <span>demand data</span>
        </h2>
        <div className="biz-value-grid">
          <div className="biz-value-card">
            <div className="biz-value-icon g">📊</div>
            <h3>Community Pulse Dashboard</h3>
            <p>
              Access real-time, anonymised analytics on what activities people
              are looking for near your venue. See ping volume, match rates,
              peak hours, and demand heatmaps.
            </p>
          </div>
          <div className="biz-value-card">
            <div className="biz-value-icon a">📍</div>
            <h3>Sponsored Pings</h3>
            <p>
              Broadcast long-lived sponsored pings to users within 100 metres of
              your venue. "2 ping-pong tables open now — 10% off!" Reach people
              when they're ready to act.
            </p>
          </div>
          <div className="biz-value-card">
            <div className="biz-value-icon p">📈</div>
            <h3>Actionable Insights</h3>
            <p>
              Understand unmet social demand in your area. Know which activities
              trend on Friday nights, identify peak hours, and plan events or
              facility upgrades with real data.
            </p>
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="biz-preview-section">
        <div className="biz-section-label">dashboard preview</div>
        <h2 className="biz-section-h2">
          your <span>community pulse</span> at a glance
        </h2>
        <div className="biz-preview-container">
          <div className="biz-preview-topbar">
            <div className="biz-win-dot" style={{ background: "#E24B4A" }}></div>
            <div className="biz-win-dot" style={{ background: "#EF9F27" }}></div>
            <div className="biz-win-dot" style={{ background: "#1D9E75" }}></div>
            <span className="biz-preview-topbar-title">
              community pulse — analytics dashboard
            </span>
          </div>
          <div className="biz-preview-body">
            <div className="biz-preview-grid">
              <div className="biz-preview-stat">
                <div className="biz-preview-stat-head">
                  <div className="biz-preview-stat-label">total pings</div>
                  <div className="biz-preview-stat-ico g">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9"></circle>
                      <circle cx="12" cy="12" r="3" fill="#1D9E75"></circle>
                    </svg>
                  </div>
                </div>
                <div className="biz-preview-stat-val">1,247</div>
                <div className="biz-preview-stat-sub">in selected period</div>
              </div>
              <div className="biz-preview-stat">
                <div className="biz-preview-stat-head">
                  <div className="biz-preview-stat-label">matches made</div>
                  <div className="biz-preview-stat-ico a">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"></path>
                    </svg>
                  </div>
                </div>
                <div className="biz-preview-stat-val">834</div>
                <div className="biz-preview-stat-sub">in selected period</div>
              </div>
              <div className="biz-preview-stat">
                <div className="biz-preview-stat-head">
                  <div className="biz-preview-stat-label">match rate</div>
                  <div className="biz-preview-stat-ico p">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M9 12l2 2 4-4"></path>
                    </svg>
                  </div>
                </div>
                <div className="biz-preview-stat-val">66.8%</div>
                <div className="biz-preview-stat-sub">overall</div>
              </div>
              <div className="biz-preview-stat">
                <div className="biz-preview-stat-head">
                  <div className="biz-preview-stat-label">peak hours</div>
                  <div className="biz-preview-stat-ico g">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M12 7v5l3 2"></path>
                    </svg>
                  </div>
                </div>
                <div className="biz-preview-stat-val">6<span>pm</span></div>
                <div className="biz-preview-stat-sub">busiest hour</div>
              </div>
            </div>
            <div className="biz-preview-card biz-preview-chart-card">
              <h3 className="biz-preview-card-title">Ping &amp; Match Volume</h3>
              <p className="biz-preview-card-sub">Hourly activity over selected period</p>
              <div className="biz-preview-chart">
                {[30,25,40,35,50,45,55,60,70,65,85,90,95,100,88,75,60,50,40,35,25,20,15,12].map((h, i) => {
                  const hour = `${String(i).padStart(2, "0")}:00`;
                  const pings = Math.round(h * 12);
                  const matches = Math.round(pings * 0.668);
                  return (
                    <div
                      key={i}
                      className="biz-chart-bar g"
                      style={{ height: `${h}%` }}
                    >
                      <div className="biz-chart-tooltip">
                        <div className="biz-chart-tooltip-hour">{hour}</div>
                        <div className="biz-chart-tooltip-row">
                          <span className="biz-chart-tooltip-dot g"></span>
                          <span>{pings} pings</span>
                        </div>
                        <div className="biz-chart-tooltip-row">
                          <span className="biz-chart-tooltip-dot a"></span>
                          <span>{matches} matches</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="biz-preview-split">
            {/* Activity Heatmap */}
            <div className="biz-preview-card biz-preview-heatmap">
              <h3 className="biz-preview-card-title">Activity Heatmap</h3>
              <p className="biz-preview-card-sub">Ping density by day and time slot</p>
              <div className="biz-heatmap-grid">
                <div className="biz-heatmap-corner"></div>
                {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
                  <div key={d} className="biz-heatmap-day">{d}</div>
                ))}
                {[
                  { label: "06:00", vals: [0,0,1,0,0,1,1] },
                  { label: "09:00", vals: [1,1,2,1,2,2,1] },
                  { label: "12:00", vals: [2,2,3,2,3,4,3] },
                  { label: "14:00", vals: [2,3,3,3,4,4,3] },
                  { label: "17:00", vals: [3,3,4,4,5,5,4] },
                  { label: "20:00", vals: [2,2,3,3,4,5,3] },
                ].map(row => {
                  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
                  return (
                    <React.Fragment key={row.label}>
                      <div className="biz-heatmap-time">{row.label}</div>
                      {row.vals.map((v, i) => {
                        const pings = v * 14 + Math.round(v * 3.5);
                        return (
                          <div key={i} className={`biz-heatmap-cell l${v}`}>
                            <div className="biz-heatmap-tooltip">
                              <div className="biz-heatmap-tooltip-head">{days[i]} · {row.label}</div>
                              <div className="biz-heatmap-tooltip-row">
                                <span className="biz-chart-tooltip-dot g"></span>
                                <span>{pings} pings</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
              <div className="biz-heatmap-legend">
                <span>less</span>
                <div className="biz-heatmap-cell l0"></div>
                <div className="biz-heatmap-cell l1"></div>
                <div className="biz-heatmap-cell l2"></div>
                <div className="biz-heatmap-cell l3"></div>
                <div className="biz-heatmap-cell l4"></div>
                <div className="biz-heatmap-cell l5"></div>
                <span>more</span>
              </div>
            </div>

            {/* Live Feed */}
            <div className="biz-preview-card biz-preview-feed">
              <div className="biz-preview-feed-head">
                <div>
                  <h3 className="biz-preview-card-title">Live Feed</h3>
                  <p className="biz-preview-card-sub">Recent platform activity</p>
                </div>
                <div className="biz-live-pill">
                  <span className="biz-live-dot"></span>live
                </div>
              </div>
              <div className="biz-feed-list">
                {[
                  { c: "g", text: "ping-pong @ Clementi Mall", time: "2m ago" },
                  { c: "a", text: "sponsored ping matched", time: "5m ago" },
                  { c: "g", text: "badminton @ Bukit Timah", time: "8m ago" },
                  { c: "p", text: "coffee chat · Holland V", time: "12m ago" },
                  { c: "g", text: "study group @ NUS Central", time: "18m ago" },
                ].map((item, i) => (
                  <div key={i} className="biz-feed-item">
                    <div className={`biz-feed-dot ${item.c}`}></div>
                    <span className="biz-feed-text">{item.text}</span>
                    <span className="biz-feed-time">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPONSORED PINGS SECTION ── */}
      <section className="biz-ping-preview-section" id="biz-sponsored">
        <div className="biz-ping-preview-layout">
          {/* LEFT: text + features */}
          <div className="biz-ping-preview-text">
            <div className="biz-section-label">sponsored pings</div>
            <h3>Your venue, visible to everyone nearby.</h3>
            <p>
              Unlike regular 15-minute pings, sponsored pings are long-lived and
              reach up to a 100-metre radius. They appear with a "sponsored"
              badge so users know it's a venue offer — not a stranger.
            </p>
            <ul className="biz-feature-list">
              <li>
                <div className="biz-feature-dot"></div>
                Custom duration — hours, days, or weeks
              </li>
              <li>
                <div className="biz-feature-dot"></div>
                Up to 100m broadcast radius (10x normal range)
              </li>
              <li>
                <div className="biz-feature-dot"></div>
                Custom business name &amp; message
              </li>
              <li>
                <div className="biz-feature-dot"></div>
                Choose any location in Singapore
              </li>
              <li>
                <div className="biz-feature-dot"></div>
                Impression analytics via dashboard{" "}
                <span className="biz-feature-tag">subscription only</span>
              </li>
            </ul>
          </div>

          {/* RIGHT: form preview + live preview */}
          <div className="biz-ping-preview-right">
            <div className="biz-form-container biz-preview-locked">
              <div className="biz-form-row-split">
                <div className="biz-form-row">
                  <label>Business Name</label>
                  <input type="text" placeholder="e.g. GameHaven Cafe" disabled />
                </div>
                <div className="biz-form-row">
                  <label>Activity Category</label>
                  <select disabled defaultValue="">
                    <option value="">Select category...</option>
                  </select>
                </div>
              </div>
              <div className="biz-form-row">
                <label>Ping Message</label>
                <textarea
                  placeholder="e.g. 2 open tables available — 10% off for Sidekick users!"
                  disabled
                ></textarea>
              </div>
              <div className="biz-form-row-split">
                <div className="biz-form-row">
                  <label>Latitude</label>
                  <input type="text" placeholder="1.3521" disabled />
                </div>
                <div className="biz-form-row">
                  <label>Longitude</label>
                  <input type="text" placeholder="103.8198" disabled />
                </div>
              </div>
              <div className="biz-form-linear">
                <div className="biz-form-linear-item">
                  <label>Broadcast Radius</label>
                  <div className="biz-slider-wrap">
                    <input type="range" min={10} max={100} defaultValue={100} disabled />
                    <span className="biz-slider-val">100<span>m</span></span>
                  </div>
                </div>
                <div className="biz-form-linear-item">
                  <label>Ping Duration</label>
                  <div className="biz-duration-picker">
                    <button className="biz-dur-btn" disabled>12h</button>
                    <button className="biz-dur-btn active" disabled>24h</button>
                    <button className="biz-dur-btn" disabled>3d</button>
                    <button className="biz-dur-btn" disabled>7d</button>
                  </div>
                </div>
                <div className="biz-form-linear-item biz-form-linear-total">
                  <label>Total</label>
                  <div className="biz-price-total">$8</div>
                </div>
              </div>
              <div className="biz-live-preview-wrap">
                <div className="biz-live-preview-label">Live Preview</div>
                <div className="biz-ping-mock-card">
                  <div className="biz-ping-mock-header">
                    <span className="biz-ping-mock-badge">sponsored</span>
                    <span className="biz-ping-mock-activity">Activity Category</span>
                  </div>
                  <div className="biz-ping-mock-msg">
                    your message will appear here
                  </div>
                  <div className="biz-ping-mock-meta">
                    <span>Your Business Name</span> · 30m away · 24h remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="biz-how-section">
        <div className="biz-section-label">how it works</div>
        <h2 className="biz-section-h2">
          start reaching nearby users in <span>3 steps</span>
        </h2>
        <div className="biz-steps-row">
          <div className="biz-step-card">
            <div className="biz-step-num">01</div>
            <h3>Choose your plan</h3>
            <p>
              Select a subscription for full dashboard access, or opt for
              pay-per-use if you only need sponsored pings.
            </p>
          </div>
          <div className="biz-step-arrow">→</div>
          <div className="biz-step-card">
            <div className="biz-step-num">02</div>
            <h3>Set up your venue</h3>
            <p>
              Register your venue location and configure your sponsored ping
              templates — activity type, message, radius, and duration.
            </p>
          </div>
          <div className="biz-step-arrow">→</div>
          <div className="biz-step-card">
            <div className="biz-step-num">03</div>
            <h3>Go live</h3>
            <p>
              Your sponsored pings appear to nearby users immediately. Track
              performance on your Community Pulse dashboard in real time.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="biz-pricing-section" id="biz-pricing">
        <div className="biz-section-label">pricing</div>
        <h2 className="biz-section-h2">
          simple plans, <span>real results</span>
        </h2>
        <div className="biz-pricing-grid">
          {/* Sponsored Ping (Pay Per Use) */}
          <div className="biz-pricing-card">
            <div className="biz-pricing-badge amber">business</div>
            <h3>Sponsored Ping</h3>
            <div className="biz-price-tag">
              <span className="biz-price-prefix">from</span> $5{" "}
              <span>/ ping</span>
            </div>
            <p className="biz-pricing-desc">
              For venues and businesses that want to attract nearby users in
              real-time. Pay only for what you post.
            </p>
            <ul className="biz-pricing-features">
              <li><div className="biz-check a">✓</div>Broadcast to nearby users</li>
              <li><div className="biz-check a">✓</div>Up to 100m broadcast radius</li>
              <li><div className="biz-check a">✓</div>Long-lived — hours, days, or weeks</li>
              <li><div className="biz-check a">✓</div>Custom business name &amp; message</li>
              <li><div className="biz-check a">✓</div>Choose any location in Singapore</li>
            </ul>
            <button className="biz-btn-secondary" onClick={() => scrollToId("biz-pricing")}>
              create a sponsored ping
            </button>
          </div>

          {/* Subscription */}
          <div className="biz-pricing-card featured">
            <div className="biz-pricing-badge green">subscription</div>
            <h3>Business Pro</h3>
            <div className="biz-price-tag">
              $49 <span>/ month</span>
            </div>
            <p className="biz-pricing-desc">
              Full access to the Community Pulse analytics dashboard plus
              unlimited sponsored pings. Built for venues that want ongoing
              local reach.
            </p>
            <ul className="biz-pricing-features">
              <li><div className="biz-check g">✓</div>Community Pulse dashboard access</li>
              <li><div className="biz-check g">✓</div>Unlimited sponsored pings</li>
              <li><div className="biz-check g">✓</div>Up to 100m broadcast radius</li>
              <li><div className="biz-check g">✓</div>Advanced analytics &amp; heatmaps</li>
              <li><div className="biz-check g">✓</div>Scheduled ping automation</li>
              <li><div className="biz-check g">✓</div>Impression &amp; click-through tracking</li>
              <li><div className="biz-check g">✓</div>Priority support</li>
            </ul>
            <button className="biz-btn-primary" onClick={() => scrollToId("biz-pricing")}>
              subscribe now
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="biz-cta-section">
        <div className="biz-cta-h">
          your next customer is <span>10 metres away.</span>
        </div>
        <p className="biz-cta-sub">
          Join the Sidekick partner network and start reaching people exactly
          when they're looking for what you offer.
        </p>
        <button
          className="biz-btn-primary"
          style={{ fontSize: 16, padding: "16px 40px" }}
          onClick={() => scrollToId("biz-pricing")}
        >
          become a partner
        </button>
      </div>

      {/* ── FOOTER ── */}
      <footer className="biz-footer">
        <div className="biz-footer-logo">
          need a <span>sidekick</span>
        </div>
        <div className="biz-footer-note">
          CS5224 · Cloud Computing · Group 27 · NUS 2026
        </div>
      </footer>
    </div>
  );
}
