const SettingsPage = () => {
  const handleClearData = () => {
    if (confirm('Er du sikker på at du vil slette all data? Dette kan ikke angres.')) {
      localStorage.removeItem('treningslogg_sessions');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Innstillinger
      </h2>

      <div className="glass-card rounded-lg p-4 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-sm">Profil</h3>
          <p className="text-xs text-muted-foreground mt-1">Innlogging og profiler kommer snart.</p>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="font-display font-semibold text-sm text-destructive">Faresone</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3">Slett all treningsdata fra denne enheten.</p>
          <button
            onClick={handleClearData}
            className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Slett all data
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
