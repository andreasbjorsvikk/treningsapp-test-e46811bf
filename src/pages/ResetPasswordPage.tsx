import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    } else {
      setError('Ugyldig eller utløpt tilbakestillingslenke.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) { setError(error.message); return; }
    setMessage('Passordet er oppdatert! Du blir sendt til forsiden…');
    setTimeout(() => navigate('/'), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="gradient-energy rounded-2xl p-3">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-xl">Nytt passord</h1>
        </div>

        {ready ? (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nytt passord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minst 6 tegn"
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">{error}</div>}
            {message && <div className="bg-success/10 text-[hsl(var(--success))] text-sm rounded-lg px-3 py-2">{message}</div>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Lagrer…' : 'Oppdater passord'}
            </Button>
          </form>
        ) : (
          <div className="glass-card rounded-2xl p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-4 w-full" onClick={() => navigate('/login')}>Gå til innlogging</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
