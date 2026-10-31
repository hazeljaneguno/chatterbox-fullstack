import { useState } from "react";
import { MessageCircle, LoaderCircle, LockKeyhole, Mail, UserRound, Eye, EyeOff } from "lucide-react";
import { api } from "../api.js";
import "./AuthScreen.css";
function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = mode === "signup"
        ? await api.signup({ username, email, password })
        : await api.login({ login, password });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message || "Could not authenticate.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-shell">
    <section className="auth-art">
      <div className="auth-brand"><span className="brand-mark"><MessageCircle size={22} strokeWidth={2.5} /></span><span className="brand-name">chatter<span>box</span></span></div>
      <div className="art-copy"><span className="eyebrow">YOUR PEOPLE, YOUR SPACE</span><h1>Good things<br />happen when<br /><em>we talk.</em></h1><p>A little hello can turn into a great conversation. Your people are just a message away.</p></div>
      <div className="art-bubbles"><div className="art-bubble bubble-one">Hey, how are you? <span>✨</span></div><div className="art-bubble bubble-two">Doing great! You? <span>💜</span></div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /></div>
      <div className="auth-art-footer"><span>✳</span> A little closer, wherever you are.</div>
    </section>
    <section className="auth-form-side">
      <div className="auth-mobile-brand"><span className="brand-mark"><MessageCircle size={22} /></span><span className="brand-name">chatter<span>box</span></span></div>
      <form className="auth-form" onSubmit={submit}>
        <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "LET'S GET STARTED"}</span>
        <h2>{mode === "login" ? "Sign in to Chatterbox" : "Create your account"}</h2>
        <p className="auth-intro">{mode === "login" ? "Your conversations are waiting for you." : "Join in and start talking to your people."}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {mode === "signup" && <label className="field-label">Username<div className="auth-input"><UserRound size={18} /><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Choose a username" minLength={2} maxLength={30} autoComplete="username" required /></div></label>}
        {mode === "signup" ? <label className="field-label">Email address<div className="auth-input"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div></label> : <label className="field-label">Username or email<div className="auth-input"><UserRound size={18} /><input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Your username or email" autoComplete="username" required /></div></label>}
        <label className="field-label">Password<div className="auth-input"><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} minLength={mode === "signup" ? 8 : undefined} autoComplete={mode === "signup" ? "new-password" : "current-password"} required /><button type="button" className="show-password" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : null}{mode === "login" ? "Sign in" : "Create account"} <span>→</span></button>
        <div className="auth-switch">{mode === "login" ? "New to Chatterbox?" : "Already have an account?"}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}> {mode === "login" ? "Create an account" : "Sign in"}</button></div>
        {mode === "signup" && <p className="password-note">By creating an account, you agree to use Chatterbox respectfully.</p>}
      </form>
      <div className="auth-bottom-note">Private conversations. Real connections. <span>✦</span></div>
    </section>
  </main>;
}


export default AuthScreen;
