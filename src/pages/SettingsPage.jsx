import React from 'react';
import { useAuth } from '../context/AuthContext';

function SettingsPage() {
  const { user } = useAuth();

  const settingsSections = [
    {
      title: 'Profile Info',
      icon: 'person',
      items: [
        { label: 'Display Name', value: user?.name || 'Not set' },
        { label: 'Role', value: user?.role?.toUpperCase() || 'PATIENT' },
        { label: 'Email', value: user?.email || 'Not set' },
      ]
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        { label: 'Push Updates', value: 'Enabled', type: 'toggle' },
        { label: 'WhatsApp Delivery', value: 'Active', type: 'toggle' },
        { label: 'Email Reports', value: 'Weekly', type: 'select' },
      ]
    },
    {
      title: 'Security',
      icon: 'shield',
      items: [
        { label: 'Two-Factor Auth', value: 'Disabled', type: 'button' },
        { label: 'Last Login', value: '2 hours ago', type: 'text' },
      ]
    },
    {
      title: 'Language',
      icon: 'language',
      items: [
        { label: 'Primary', value: 'English (US)', type: 'select' },
        { label: 'Secondary', value: 'Bengali (বাংলা)', type: 'select' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#070e17] text-white p-6 lg:p-10 relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute -top-40 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px]" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border border-teal-500/20">Config</span>
            <div className="flex items-center gap-2 text-teal-400/80 text-xs font-medium uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              Preferences Sync
            </div>
          </div>
          <h1 className="text-4xl font-headline font-extrabold tracking-tight text-white">System Settings</h1>
          <p className="text-slate-400 text-lg font-light">Fine-tune your SwasthaLink experience and privacy.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settingsSections.map((section, idx) => (
            <article key={idx} className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col group hover:shadow-[0_20px_50px_rgba(45,212,191,0.05)] transition-all">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-teal-400/10 p-3 rounded-2xl group-hover:bg-teal-400/20 transition-colors">
                  <span className="material-symbols-outlined text-teal-400">{section.icon}</span>
                </div>
                <h3 className="text-xl font-headline font-bold text-white">{section.title}</h3>
              </div>

              <div className="space-y-6 flex-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center group/item">
                    <span className="text-sm font-medium text-slate-400 group-hover/item:text-slate-300 transition-colors">{item.label}</span>
                    {item.type === 'toggle' ? (
                      <div className="w-10 h-5 bg-teal-400/20 rounded-full relative cursor-pointer border border-teal-400/20">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.6)]"></div>
                      </div>
                    ) : item.type === 'button' ? (
                      <button className="text-[10px] font-bold uppercase tracking-widest text-teal-400 bg-teal-400/10 px-3 py-1.5 rounded-lg border border-teal-400/20 hover:bg-teal-400/20 transition-all">Enable</button>
                    ) : (
                      <span className="text-sm font-bold text-white">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>

              <button className="mt-8 w-full py-2.5 rounded-xl border border-white/5 bg-white/5 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100">
                Manage {section.title.split(' ')[0]}
              </button>
            </article>
          ))}
        </div>

        <article className="glass-card p-8 rounded-3xl border border-rose-500/10 bg-gradient-to-br from-rose-500/5 to-transparent flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xl font-headline font-bold text-rose-400">Account Safety</h4>
            <p className="text-slate-500 text-sm">Download your medical history or permanently close your account.</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Backup Data</button>
            <button className="px-6 py-3 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-xs uppercase tracking-widest border border-rose-500/20 hover:bg-rose-500/20 transition-all">Deactivate</button>
          </div>
        </article>
      </div>
    </div>
  );
}

export default SettingsPage;
