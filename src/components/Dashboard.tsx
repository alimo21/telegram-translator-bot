"use client";

import { useState, useEffect, useCallback } from "react";

interface BotConfig {
  id: number;
  botToken: string;
  apiId: number;
  apiHash: string;
  phoneNumber: string | null;
  sessionString: string | null;
  sourceChannel: string;
  destChannel: string;
  isActive: boolean | null;
}

interface LogEntry {
  id: number;
  level: string;
  message: string;
  details: string | null;
  createdAt: string | null;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"setup" | "config" | "auth" | "control" | "logs" | "deploy">("setup");
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [dbReady, setDbReady] = useState(false);

  // Config form
  const [botToken, setBotToken] = useState("");
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [sourceChannel, setSourceChannel] = useState("");
  const [destChannel, setDestChannel] = useState("");

  // Auth form
  const [phoneNumber, setPhoneNumber] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [password2FA, setPassword2FA] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "code" | "password" | "done">("phone");

  // Bot status
  const [botStatus, setBotStatus] = useState({ isRunning: false, userClientConnected: false });

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000);
  };

  const checkSetup = useCallback(async () => {
    try {
      const res = await fetch("/api/setup");
      const data = await res.json();
      if (data.configured) {
        setDbReady(true);
        setActiveTab("config");
      }
    } catch {
      // ignore
    }
  }, []);

  const runSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setDbReady(true);
        showMessage("✅ دیتابیس با موفقیت راه‌اندازی شد!", "success");
        setActiveTab("config");
      } else {
        showMessage(data.error || "خطا در راه‌اندازی", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot");
      const data = await res.json();
      setBotStatus(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkSetup();
  }, [checkSetup]);

  useEffect(() => {
    if (dbReady) {
      fetchConfig();
      fetchStatus();
    }
  }, [dbReady, fetchConfig, fetchStatus]);

  useEffect(() => {
    if (activeTab === "logs" && dbReady) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, dbReady, fetchLogs]);

  useEffect(() => {
    if (dbReady) {
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [dbReady, fetchStatus]);

  const saveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, apiId, apiHash, sourceChannel, destChannel }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("✅ تنظیمات با موفقیت ذخیره شد", "success");
        fetchConfig();
      } else {
        showMessage(data.error || "خطا در ذخیره تنظیمات", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  const sendCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendCode", phoneNumber }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep("code");
        showMessage("✅ کد تایید ارسال شد", "success");
      } else {
        showMessage(data.error || "خطا در ارسال کد", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyCode", phoneNumber, code: authCode }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.step === "enterPassword") {
          setAuthStep("password");
          showMessage("🔐 رمز دوم (2FA) لازم است", "success");
        } else {
          setAuthStep("done");
          showMessage("✅ احراز هویت با موفقیت انجام شد", "success");
          fetchConfig();
        }
      } else {
        showMessage(data.error || "کد نادرست است", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  const verifyPassword = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyPassword", phoneNumber, password: password2FA }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep("done");
        showMessage("✅ احراز هویت با موفقیت انجام شد", "success");
        fetchConfig();
      } else {
        showMessage(data.error || "رمز نادرست است", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  const controlBot = async (action: "start" | "stop") => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(action === "start" ? "✅ ربات شروع به کار کرد" : "⏹ ربات متوقف شد", "success");
        fetchStatus();
      } else {
        showMessage(data.message || data.error || "خطا", "error");
      }
    } catch {
      showMessage("خطا در اتصال به سرور", "error");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ربات ترجمه تلگرام</h1>
              <p className="text-xs text-slate-400">عربی ← فارسی | کپی خودکار کانال</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            botStatus.isRunning
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}>
            <span className={`w-2 h-2 rounded-full ${botStatus.isRunning ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {botStatus.isRunning ? "فعال" : "غیرفعال"}
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-xl shadow-2xl text-sm font-medium backdrop-blur-sm ${
            messageType === "success"
              ? "bg-green-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}>
            {message}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 backdrop-blur-sm overflow-x-auto">
          {[
            { key: "setup" as const, label: "🔧 راه‌اندازی", show: !dbReady },
            { key: "config" as const, label: "⚙️ تنظیمات", show: dbReady },
            { key: "auth" as const, label: "🔑 احراز هویت", show: dbReady },
            { key: "control" as const, label: "🎮 کنترل", show: dbReady },
            { key: "logs" as const, label: "📋 لاگ‌ها", show: dbReady },
            { key: "deploy" as const, label: "🚀 راهنما", show: true },
          ].filter(t => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* Setup Tab */}
        {activeTab === "setup" && !dbReady && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🗄️</div>
              <h2 className="text-2xl font-bold text-white mb-2">راه‌اندازی دیتابیس</h2>
              <p className="text-slate-400">برای شروع، ابتدا دیتابیس رو راه‌اندازی کنید</p>
            </div>
            
            <button
              onClick={runSetup}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 transition-all"
            >
              {loading ? "⏳ در حال راه‌اندازی..." : "🚀 راه‌اندازی دیتابیس"}
            </button>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === "config" && dbReady && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">تنظیمات ربات</h2>
              <p className="text-sm text-slate-400">اطلاعات مورد نیاز برای اتصال ربات به تلگرام</p>
            </div>

            {config && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
                ✅ تنظیمات قبلاً ذخیره شده
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">🤖 توکن ربات</label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="از @BotFather بگیرید"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">🔢 API ID</label>
                  <input
                    type="number"
                    value={apiId}
                    onChange={(e) => setApiId(e.target.value)}
                    placeholder="از my.telegram.org"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">🔑 API Hash</label>
                  <input
                    type="password"
                    value={apiHash}
                    onChange={(e) => setApiHash(e.target.value)}
                    placeholder="از my.telegram.org"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">📥 کانال مبدا (عربی)</label>
                <input
                  type="text"
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  placeholder="@arabic_channel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">📤 کانال مقصد (فارسی)</label>
                <input
                  type="text"
                  value={destChannel}
                  onChange={(e) => setDestChannel(e.target.value)}
                  placeholder="@my_channel"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              onClick={saveConfig}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50 transition-all"
            >
              {loading ? "⏳..." : "💾 ذخیره تنظیمات"}
            </button>
          </div>
        )}

        {/* Auth Tab */}
        {activeTab === "auth" && dbReady && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">احراز هویت تلگرام</h2>
              <p className="text-sm text-slate-400">با حساب تلگرام خود وارد شوید</p>
            </div>

            {config?.sessionString === "***configured***" && authStep === "phone" && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm text-green-300">
                ✅ قبلاً احراز هویت شده‌اید
              </div>
            )}

            {authStep === "phone" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">📱 شماره تلفن</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+989123456789"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={sendCode}
                  disabled={loading || !phoneNumber}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {loading ? "⏳..." : "📨 ارسال کد"}
                </button>
              </div>
            )}

            {authStep === "code" && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
                  📨 کد به {phoneNumber} ارسال شد
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">🔢 کد تایید</label>
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="12345"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest"
                    dir="ltr"
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={verifyCode}
                  disabled={loading || !authCode}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {loading ? "⏳..." : "✅ تایید کد"}
                </button>
              </div>
            )}

            {authStep === "password" && (
              <div className="space-y-4">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-sm text-orange-300">
                  🔐 رمز دوم (2FA) لازم است
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">🔒 رمز 2FA</label>
                  <input
                    type="password"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    placeholder="رمز 2FA"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                    dir="ltr"
                  />
                </div>
                <button
                  onClick={verifyPassword}
                  disabled={loading || !password2FA}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  {loading ? "⏳..." : "🔓 تایید"}
                </button>
              </div>
            )}

            {authStep === "done" && (
              <div className="text-center space-y-4">
                <div className="text-4xl">🎉</div>
                <p className="text-lg font-bold text-green-300">احراز هویت انجام شد!</p>
                <button
                  onClick={() => setActiveTab("control")}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-medium text-sm"
                >
                  🎮 کنترل ربات
                </button>
              </div>
            )}
          </div>
        )}

        {/* Control Tab */}
        {activeTab === "control" && dbReady && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-bold text-white mb-4">کنترل ربات</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`rounded-xl p-4 text-center ${
                  botStatus.isRunning ? "bg-green-500/10 border border-green-500/20" : "bg-slate-500/10 border border-slate-500/20"
                }`}>
                  <div className="text-2xl mb-1">{botStatus.isRunning ? "🟢" : "🔴"}</div>
                  <p className="text-sm text-slate-300">وضعیت</p>
                  <p className={`text-xs ${botStatus.isRunning ? "text-green-400" : "text-red-400"}`}>
                    {botStatus.isRunning ? "فعال" : "غیرفعال"}
                  </p>
                </div>
                <div className={`rounded-xl p-4 text-center ${
                  botStatus.userClientConnected ? "bg-blue-500/10 border border-blue-500/20" : "bg-slate-500/10 border border-slate-500/20"
                }`}>
                  <div className="text-2xl mb-1">{botStatus.userClientConnected ? "🔗" : "🔌"}</div>
                  <p className="text-sm text-slate-300">اتصال</p>
                  <p className={`text-xs ${botStatus.userClientConnected ? "text-blue-400" : "text-slate-400"}`}>
                    {botStatus.userClientConnected ? "متصل" : "قطع"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => controlBot("start")}
                  disabled={loading || botStatus.isRunning}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  ▶️ شروع
                </button>
                <button
                  onClick={() => controlBot("stop")}
                  disabled={loading || !botStatus.isRunning}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                  ⏹ توقف
                </button>
              </div>
            </div>

            {config && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-3">📊 تنظیمات فعلی</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">کانال مبدا:</span>
                    <span className="text-white font-mono">{config.sourceChannel}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">کانال مقصد:</span>
                    <span className="text-white font-mono">{config.destChannel}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">سشن:</span>
                    <span className={config.sessionString ? "text-green-400" : "text-red-400"}>
                      {config.sessionString ? "✅ تنظیم شده" : "❌ نیاز به احراز هویت"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && dbReady && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">📋 لاگ‌ها</h2>
              <button onClick={fetchLogs} className="text-sm text-slate-400 hover:text-white">
                🔄 بروزرسانی
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">هنوز لاگی ثبت نشده</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`rounded-lg p-3 text-sm border ${
                      log.level === "error"
                        ? "bg-red-500/10 border-red-500/20 text-red-300"
                        : "bg-slate-500/10 border-slate-500/20 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {log.level === "error" ? "❌" : "ℹ️"} {log.message}
                      </span>
                      <span className="text-xs text-slate-500">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString("fa-IR") : ""}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-400 mt-1 font-mono" dir="ltr">{log.details}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Deploy Tab */}
        {activeTab === "deploy" && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">🚀 راهنمای راه‌اندازی</h2>
              <p className="text-sm text-slate-400">مراحل زیر رو دنبال کن</p>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="text-base font-bold text-purple-400 mb-3">۱. پیش‌نیازها</h3>
                <ul className="space-y-2 text-sm text-slate-300 list-disc list-inside">
                  <li><a href="https://my.telegram.org" target="_blank" className="text-blue-400 hover:underline">my.telegram.org</a> → API ID و API Hash</li>
                  <li><a href="https://t.me/BotFather" target="_blank" className="text-blue-400 hover:underline">@BotFather</a> → توکن ربات</li>
                  <li>ربات رو ادمین کانال مقصد کن</li>
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="text-base font-bold text-blue-400 mb-3">۲. مراحل</h3>
                <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside">
                  <li>دکمه «راه‌اندازی دیتابیس» رو بزن</li>
                  <li>تنظیمات ربات رو وارد کن</li>
                  <li>با شماره تلگرام احراز هویت کن</li>
                  <li>ربات رو استارت کن ✅</li>
                </ol>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
                💡 ربات ۲۴/۷ کار می‌کنه و پست‌های کانال عربی رو به فارسی ترجمه و ارسال می‌کنه!
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
          ربات ترجمه تلگرام | عربی ← فارسی
        </div>
      </footer>
    </div>
  );
}
