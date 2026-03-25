function SettingsPage() {
  return (
    <section className="page-wrap">
      <header className="page-header">
        <div>
          <p className="kicker">Settings</p>
          <h2>System Preferences</h2>
          <p className="subtitle">Adjust language, alerts, and communication settings</p>
        </div>
      </header>

      <article className="glass card-large tilt-card glow-hover float-in">
        <h3>Quick Settings</h3>
        <div className="simple-list">
          <p>Language: English + বাংলা</p>
          <p>Notifications: Enabled</p>
          <p>Patient update delivery: WhatsApp + Dashboard</p>
        </div>
      </article>
    </section>
  );
}

export default SettingsPage;
