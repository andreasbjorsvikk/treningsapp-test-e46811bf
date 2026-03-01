import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LoginPage = () => {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setSubmitting(false);
      if (error) { setError(error); return; }
      setMessage('Sjekk e-posten din for en lenke til å tilbakestille passordet.');
      return;
    }

    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);
    setSubmitting(false);

    if (error) {
      if (error.includes('Invalid login')) setError('Feil e-post eller passord.');
      else if (error.includes('already registered')) setError('E-posten er allerede registrert.');
      else setError(error);
      return;
    }

    if (mode === 'signup') {
      setMessage('Sjekk e-posten din for å bekrefte kontoen. Etter bekreftelse kan du logge inn.');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="gradient-energy rounded-2xl p-3">
            <Activity className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl">
            Trenings<span className="text-gradient-energy">logg</span>
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === 'login' && 'Logg inn for å synkronisere treningene dine'}
            {mode === 'signup' && 'Opprett en konto for å komme i gang'}
            {mode === 'forgot' && 'Skriv inn e-posten din for å tilbakestille passordet'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              E-post
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="din@epost.no"
                className="pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                Passord
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="text-[11px] text-muted-foreground">Minst 6 tegn</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-success/10 text-[hsl(var(--success))] text-sm rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full gradient-energy text-primary-foreground" disabled={submitting}>
            {submitting ? (
              <span className="animate-pulse">Vennligst vent…</span>
            ) : (
              <>
                {mode === 'login' && <><LogIn className="w-4 h-4 mr-1" /> Logg inn</>}
                {mode === 'signup' && <><UserPlus className="w-4 h-4 mr-1" /> Opprett konto</>}
                {mode === 'forgot' && <><ArrowRight className="w-4 h-4 mr-1" /> Send tilbakestillingslenke</>}
              </>
            )}
          </Button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
            >
              Glemt passord?
            </button>
          )}
        </form>

        {/* Switch mode */}
        <div className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Har du ikke konto?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setMessage(''); }} className="text-primary font-medium hover:underline">
                Opprett konto
              </button>
            </>
          ) : (
            <>
              Har du allerede konto?{' '}
              <button onClick={() => { setMode('login'); setError(''); setMessage(''); }} className="text-primary font-medium hover:underline">
                Logg inn
              </button>
            </>
          )}
        </div>

        {/* Skip login for dev */}
        <button
          onClick={() => navigate('/')}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full text-center"
        >
          Fortsett uten innlogging →
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
