import { Mail, Mountain, Activity, Shield, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Tilbake til appen
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">TopTur Support</h1>
          <p className="text-muted-foreground">
            Treningslogg, målsetting og fjelltoppinnsjekking for deg og dine.
          </p>
        </div>

        {/* Contact */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Kontakt oss</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Har du spørsmål, feil å rapportere, eller tilbakemeldinger? Send oss en e-post.
          </p>
          <a
            href="mailto:support@toptur.app"
            className="text-sm font-medium text-accent hover:underline"
          >
            support@toptur.app
          </a>
        </section>

        {/* Strava FAQ */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-[#FC4C02]" />
            <h2 className="text-lg font-semibold">Strava-tilkobling</h2>
          </div>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">Hvordan kobler jeg til Strava?</p>
              <p>Gå til Innstillinger → Strava-seksjon → «Koble til Strava». Du blir sendt til Strava for å autorisere tilgangen.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Hvilke data hentes fra Strava?</p>
              <p>Vi henter kun dine egne treningsøkter: type, varighet, distanse, høydemeter, puls og rute. Ingen data deles med andre brukere.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Hvordan kobler jeg fra Strava?</p>
              <p>Gå til Innstillinger → Strava → «Koble fra». Du kan også fjerne tilgangen direkte i Strava under Innstillinger → Mine apper.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Kan andre se mine Strava-data?</p>
              <p>Nei. Strava-data vises kun til deg selv. Sosiale funksjoner som utfordringer bruker kun manuelt registrerte økter.</p>
            </div>
          </div>
        </section>

        {/* About the app */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Mountain className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Om TopTur</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            TopTur er en treningsapp laget for det norske markedet. Registrer treningsøkter manuelt eller via Strava, sett deg treningsmål,
            og sjekk inn på fjelltopper med GPS-verifisering. Del utfordringer med venner og familie — basert på manuelt registrerte økter.
          </p>
        </section>

        {/* Privacy */}
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Personvern</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Vi tar personvern på alvor. Dine data brukes kun for å gi deg en bedre treningsopplevelse.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Treningsdata lagres sikkert og er kun tilgjengelig for deg.</li>
              <li>Strava-data deles aldri med andre brukere.</li>
              <li>Fjelltoppinnsjekking bruker GPS kun for verifisering — posisjonen lagres ikke.</li>
              <li>Du kan slette kontoen din og alle tilhørende data når som helst.</li>
            </ul>
            {/* <p className="mt-3">
              <a href="/privacy" className="text-accent hover:underline font-medium">
                Les full personvernerklæring →
              </a>
            </p> */}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-4 pb-8 border-t border-border">
          © {new Date().getFullYear()} TopTur. Alle rettigheter reservert.
        </footer>
      </div>
    </div>
  );
};

export default SupportPage;
