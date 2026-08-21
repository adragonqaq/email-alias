"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "email-code-console:v1";
const DEFAULT_CONFIG = {
  domain: "",
  tempmailEmail: "",
  pin: "",
};

const ADJECTIVES = ["silent", "swift", "bright", "fresh", "calm", "clean", "wild", "plain"];
const NOUNS = ["signal", "pulse", "atlas", "ember", "drift", "lumen", "frame", "orbit"];

function normalizeDomain(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "");
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function splitMailbox(value) {
  const normalized = normalizeEmail(value);
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error("请输入有效的临时邮箱地址，例如 xxx@mailto.plus");
  }
  return {
    localPart: normalized.slice(0, atIndex),
    domain: normalized.slice(atIndex + 1),
  };
}

function makePrefix() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `${adjective}-${noun}-${digits}`;
}

function formatDate(value) {
  if (value === undefined || value === null || value === "") return "时间未知";

  const numericValue = typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value) : null;
  const date = numericValue !== null
    ? new Date(numericValue < 100000000000 ? numericValue * 1000 : numericValue)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "时间未知";

  const age = Date.now() - date.getTime();
  if (age >= 0 && age < 60 * 1000) return "刚刚";
  if (age >= 0 && age < 60 * 60 * 1000) return `${Math.floor(age / 60000)} 分钟前`;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMailStatus(message) {
  if (typeof message.isNew === "boolean") return message.isNew ? "未读" : "已读";
  if (typeof message.isSeen === "boolean") return message.isSeen ? "已读" : "未读";
  return "状态未知";
}

function readStoredState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredState(payload) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
}

async function readApiResponse(response) {
  const raw = await response.text();
  let payload;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      response.ok
        ? "服务器返回了无法识别的响应，请重试。"
        : `服务器错误 (${response.status})，请重启本地开发服务后重试。`,
    );
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `请求失败 (${response.status})`);
  }

  return payload;
}

function IconCopy(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9 9.75V7.5A2.5 2.5 0 0 1 11.5 5h5A2.5 2.5 0 0 1 19 7.5v5a2.5 2.5 0 0 1-2.5 2.5H14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8 9h4.5A2.5 2.5 0 0 1 15 11.5V16A2.5 2.5 0 0 1 12.5 18H8A2.5 2.5 0 0 1 5.5 15.5v-4A2.5 2.5 0 0 1 8 9Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function IconRefresh(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M20 7v5h-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66L20 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3.5l1.6 4.9 4.9 1.6-4.9 1.6-1.6 4.9-1.6-4.9-4.9-1.6 4.9-1.6L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconInbox(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.5 7.5h15L21 13v3.5A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5V13l1.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 13.5a3 3 0 0 0 6 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 4.5 21 19H3L12 4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9v4.5M12 16.8v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClose(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Page() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [aliasPrefix, setAliasPrefix] = useState("");
  const [inboxToken, setInboxToken] = useState("");
  const [connectedEmail, setConnectedEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [statusText, setStatusText] = useState("等待配置");
  const [errorText, setErrorText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  function showNotice(title, message, tone = "info") {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice({ title, message, tone });
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), tone === "error" ? 5600 : 3600);
  }

  function closeNotice() {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    setNotice(null);
  }

  useEffect(() => () => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
  }, []);

  const generatedEmail = useMemo(() => {
    const domain = normalizeDomain(config.domain);
    return aliasPrefix && domain ? `${aliasPrefix}@${domain}` : "";
  }, [aliasPrefix, config.domain]);

  useEffect(() => {
    const stored = readStoredState();
    if (!stored) {
      setAliasPrefix(makePrefix());
      return;
    }

    setConfig({
      domain: stored.config?.domain || "",
      tempmailEmail: stored.config?.tempmailEmail || "",
      pin: stored.config?.pin || "",
    });
    setAliasPrefix(stored.aliasPrefix || makePrefix());
    setInboxToken(stored.inboxToken || "");
    setConnectedEmail(stored.connectedEmail || "");
  }, []);

  useEffect(() => {
    saveStoredState({
      config,
      aliasPrefix,
      inboxToken,
      connectedEmail,
    });
  }, [config, aliasPrefix, inboxToken, connectedEmail]);

  useEffect(() => {
    if (!config.pin || !inboxToken) return;
    void refreshInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboxToken]);

  useEffect(() => {
    if (!messages.length) {
      setSelectedMessage(null);
      setSelectedMessageId("");
      return;
    }

    if (!selectedMessageId || !messages.some((item) => item.id === selectedMessageId)) {
      setSelectedMessageId(messages[0].id);
      void openMessage(messages[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setStatusText("已复制");
      showNotice("邮箱已复制", text, "success");
    } catch {
      showNotice("复制失败", "浏览器没有授予剪贴板权限，请手动复制。", "error");
    }
  }

  async function connectInbox(event) {
    event.preventDefault();
    setErrorText("");

    if (!config.pin.trim()) {
      setErrorText("请输入 PIN");
      showNotice("还差一步", "请输入 TempMail.Plus 邮箱 PIN。", "error");
      return;
    }

    if (!config.tempmailEmail.trim()) {
      setErrorText("请输入临时邮箱地址");
      showNotice("还差一步", "请输入要读取的临时邮箱地址。", "error");
      return;
    }

    setBusy(true);
    setStatusText("正在连接临时邮箱");

    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin: config.pin,
          tempmailEmail: config.tempmailEmail,
        }),
      });

      const payload = await readApiResponse(response);

      setInboxToken(payload.email);
      setConnectedEmail(payload.email);
      setStatusText("收件箱已连接");
      await refreshInbox(payload.email);
      showNotice("收件箱已连接", `已连接 ${payload.email}`, "success");
    } catch (error) {
      setErrorText(error.message || "连接失败");
      setStatusText("连接失败");
      showNotice("连接失败", error.message || "无法连接临时邮箱。", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshInbox(overrideToken) {
    // React passes the click event to a direct handler reference. Only accept
    // a string mailbox override here, never a DOM event object.
    const token = typeof overrideToken === "string" ? overrideToken : inboxToken;
    if (!token || !config.pin.trim()) return;

    setListBusy(true);
    setErrorText("");
    setStatusText("正在刷新邮件");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin: config.pin,
          email: token,
        }),
      });

      const payload = await readApiResponse(response);

      setMessages(payload.messages || []);
      setStatusText(`已加载 ${payload.messages?.length || 0} 封邮件`);
      showNotice("邮件已刷新", `当前收件箱有 ${payload.messages?.length || 0} 封邮件。`, "success");

      if (payload.messages?.length) {
        const firstId = payload.messages[0].id;
        setSelectedMessageId(firstId);
        await openMessage(firstId, payload.messages[0]);
      } else {
        setSelectedMessage(null);
        setSelectedMessageId("");
      }
    } catch (error) {
      setErrorText(error.message || "获取邮件列表失败");
      setStatusText("刷新失败");
      showNotice("刷新失败", error.message || "无法获取邮件列表。", "error");
    } finally {
      setListBusy(false);
    }
  }

  async function openMessage(messageId, cachedMessage) {
    if (!messageId || !config.pin.trim()) return;

    setSelectedMessageId(messageId);
    setMessageBusy(true);
    setErrorText("");

    try {
      if (cachedMessage?.content) {
        setSelectedMessage(cachedMessage);
        return;
      }

      const response = await fetch("/api/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pin: config.pin,
          email: connectedEmail || config.tempmailEmail,
          messageId,
        }),
      });

      const payload = await readApiResponse(response);

      setSelectedMessage(payload.message);
    } catch (error) {
      setErrorText(error.message || "获取邮件内容失败");
      setSelectedMessage(null);
      showNotice("邮件打开失败", error.message || "无法读取邮件正文。", "error");
    } finally {
      setMessageBusy(false);
    }
  }

  function generateAlias() {
    const domain = normalizeDomain(config.domain);
    if (!domain) {
      setErrorText("先填写域名");
      showNotice("还差一步", "先填写你的个人域名，再生成随机邮箱。", "error");
      return;
    }

    setAliasPrefix(makePrefix());
    setStatusText("已生成新邮箱");
    setErrorText("");
    showNotice("新邮箱已生成", "Cloudflare 路由匹配后即可接收转发邮件。", "success");
  }

  const aliasLine = generatedEmail || (aliasPrefix ? `${aliasPrefix}@你的域名` : "点击生成随机邮箱");

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Email relay console</p>
          <h1>邮件别名控制台</h1>
        </div>
      </header>

      <section className="workspace">
        <section className="panel config-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">配置</p>
              <h2>基础参数</h2>
            </div>
            <div className={`connection-status ${busy ? "connecting" : connectedEmail ? "connected" : errorText ? "error" : "idle"}`}>
              <span className="connection-dot" />
              <span>{busy ? "连接中" : connectedEmail ? "已连接" : errorText ? "连接失败" : "未连接"}</span>
            </div>
          </div>

          <form className="form-grid" onSubmit={connectInbox}>
            <label className="field">
              <span>域名</span>
              <input
                value={config.domain}
                onChange={(event) => setConfig((state) => ({ ...state, domain: event.target.value }))}
                placeholder="mydomain.com"
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>tempmail 邮箱</span>
              <input
                value={config.tempmailEmail}
                onChange={(event) =>
                  setConfig((state) => ({ ...state, tempmailEmail: event.target.value }))
                }
                placeholder="xxx@mailto.plus"
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>PIN</span>
              <input
                value={config.pin}
                onChange={(event) => setConfig((state) => ({ ...state, pin: event.target.value }))}
                placeholder="TempMail.Plus 邮箱 PIN"
                autoComplete="off"
              />
            </label>
          </form>

          <div className="config-footer">
            <div className="info-strip">
              <span>收件邮箱</span>
              <strong>{connectedEmail || "尚未连接"}</strong>
            </div>
            <button className="ghost-button connect-button" type="button" onClick={connectInbox} disabled={busy}>
              <IconInbox className="button-icon" />
              {busy ? "连接中" : "连接收件箱"}
            </button>
          </div>
        </section>

        <section className="panel alias-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">生成</p>
              <h2>随机前缀邮箱</h2>
            </div>
          </div>

          <div className="alias-box">
            <div className="alias-label">当前邮箱</div>
            <div className="alias-main-row">
              <div className="alias-value">{aliasLine}</div>
              <button
                className="alias-copy-button"
                type="button"
                onClick={() => generatedEmail && copy(generatedEmail)}
                disabled={!generatedEmail}
                aria-label="复制当前邮箱"
                title="复制当前邮箱"
              >
                <IconCopy className="button-icon" />
              </button>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-button" type="button" onClick={generateAlias}>
              <IconRefresh className="button-icon" />
              重新生成邮箱
            </button>
          </div>
        </section>

        <section className="panel list-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">收件箱</p>
              <h2>邮件列表</h2>
            </div>
            <div className="panel-tools">
              <div className="mail-count">{messages.length} 封</div>
              <button className="secondary-button compact-button" type="button" onClick={() => refreshInbox()} disabled={listBusy}>
                <IconRefresh className="button-icon" />
                {listBusy ? "刷新中" : "刷新邮件"}
              </button>
            </div>
          </div>

          <div className="mail-list">
            {!messages.length ? (
              <div className="empty-state">
                <p>这里会显示 Cloudflare 转发过来的邮件。</p>
                <span>连接成功后点击刷新即可查看。</span>
              </div>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  className={`mail-row ${selectedMessageId === message.id ? "active" : ""}`}
                  onClick={() => openMessage(message.id, message)}
                >
                  <div className="mail-row-top">
                    <strong>{message.subject || "无主题"}</strong>
                    <span>{formatDate(message.receivedAt || message.created_at || message.date || message.received_at)}</span>
                  </div>
                  <div className="mail-row-bottom">
                    <span className="truncate">{message.from || message.from_email || message.sender || "未知发件人"}</span>
                    <span>{getMailStatus(message)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-head">
            <div>
              <p className="panel-kicker">内容</p>
              <h2>邮件正文</h2>
            </div>
            <div className="mail-count">{messageBusy ? "加载中" : selectedMessage ? "已打开" : "未选择"}</div>
          </div>

          {selectedMessage ? (
            <div className="message-view">
              <div className="message-meta">
                <div>
                  <div className="message-subject">{selectedMessage.subject || "无主题"}</div>
                  <div className="message-from">
                    {selectedMessage.from || selectedMessage.from_email || selectedMessage.sender || "-"}
                  </div>
                </div>
                <div className="message-time">
                  {formatDate(
                    selectedMessage.receivedAt ||
                      selectedMessage.created_at ||
                      selectedMessage.date ||
                      selectedMessage.received_at,
                  )}
                </div>
              </div>

              <iframe
                title="邮件正文"
                className="mail-frame"
                sandbox=""
                srcDoc={selectedMessage.content || "<html><body><p>无正文</p></body></html>"}
              />
            </div>
          ) : (
            <div className="empty-state detail-empty">
              <p>选择一封邮件后，这里会显示完整内容。</p>
              <span>支持 HTML 邮件预览。</span>
            </div>
          )}
        </section>
      </section>

      {notice ? (
        <div className="notice-backdrop" role="presentation" onMouseDown={closeNotice}>
          <section
            className={`notice-dialog ${notice.tone}`}
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="notice-icon">
              {notice.tone === "error" ? <IconAlert /> : <IconCheck />}
            </div>
            <div className="notice-copy">
              <strong>{notice.title}</strong>
              <span>{notice.message}</span>
            </div>
            <button className="icon-button" type="button" aria-label="关闭提示" onClick={closeNotice}>
              <IconClose />
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
