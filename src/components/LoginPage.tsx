import React, { useState } from 'react';
import { Shield, Eye, EyeOff, BarChart2, CheckCircle, Map, Users } from 'lucide-react';

interface Props { onLogin: () => void; }

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    await new Promise((r) => setTimeout(r, 600));
    if (username === 'amf_pdm' && password === 'admin') {
      onLogin();
    } else {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  const features = [
    { icon: BarChart2,   title: 'Data Comparison',       desc: 'Binary similarity analysis across key PDM variables',    color: 'text-blue-200' },
    { icon: CheckCircle, title: '8-Layer Quality Checks', desc: 'GPS, duration, duplicates, stackpoints & more',          color: 'text-green-200' },
    { icon: Map,         title: 'Interactive GPS Maps',   desc: 'Satellite imagery with stackpoint & proximity overlays', color: 'text-amber-200' },
    { icon: Users,       title: 'Enumerator Reports',     desc: 'Individual performance scorecards & dismissal flags',    color: 'text-pink-200' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-4"
      style={{ background: 'linear-gradient(135deg, #0090fc 0%, #005ec2 50%, #002f7a 100%)' }}
    >
      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-5%]  w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/3   w-64 h-64 rounded-full bg-white/5  blur-2xl  pointer-events-none animate-pulse-slow" style={{ animationDelay: '3s' }} />

      {/* Centered container — limits total width so panels sit close together */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col lg:flex-row items-stretch rounded-2xl overflow-hidden shadow-2xl"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>

        {/* ── LEFT PANEL ────────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-center px-10 py-10 flex-1"
          style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)', borderRight: '1px solid rgba(255,255,255,0.15)' }}>

          {/* Branding */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Against Malaria Foundation</p>
              <h1 className="text-white font-black text-2xl leading-tight">EHA-(AMF-PDM)</h1>
            </div>
          </div>

          <p className="text-blue-100/75 text-xs leading-relaxed mb-6 max-w-xs">
            Survey Data Quality Monitoring Analyser — comprehensive platform for monitoring PDM survey quality across malaria prevention campaigns.
          </p>

          {/* Feature cards */}
          <div className="space-y-2.5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/15 bg-white/08 hover:bg-white/12 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                  <p className="text-blue-100/65 text-xs mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="flex gap-6 mt-6 pt-5 border-t border-white/15">
            {[
              { value: '8',    label: 'Quality Checks' },
              { value: '5',    label: 'Comparison Vars' },
              { value: '100%', label: 'Client-Side' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-white font-black text-xl">{value}</p>
                <p className="text-blue-200/70 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL — Login ───────────────────────────────────── */}
        <div className="flex items-center justify-center lg:w-[380px] bg-white p-8">
          <div className="w-full animate-slide-up">
            {/* Blue accent top bar */}
            <div className="h-1.5 -mx-8 -mt-8 mb-7 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-3 shadow-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Secure Access</h2>
              <p className="text-slate-400 text-xs mt-0.5">EHA-(AMF-PDM) · Survey Platform</p>
            </div>

            {/* Form */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your username"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Enter your password"
                    className="input-field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm font-medium animate-fade-in flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="btn-primary w-full py-3 text-sm font-bold"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  '→ Access Dashboard'
                )}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
              EHA · Against Malaria Foundation<br />PDM Survey Quality Platform
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
