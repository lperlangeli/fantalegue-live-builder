import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo_fantabuilder.png";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img 
            src={logo} 
            alt="FantaBuilder" 
            className="mx-auto h-32 mb-6 animate-fade-in"
          />
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            FantaBuilder
          </h1>
          <p className="text-xl text-muted-foreground">
            Asta di Fantacalcio Realtime
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <Card className="p-8 hover:shadow-lg transition-all duration-300 border-2">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Crea Sessione</h2>
              <p className="text-muted-foreground">
                Diventa l'admin e configura la tua asta personalizzata
              </p>
              <Button 
                onClick={() => navigate("/create-session")}
                className="w-full"
                size="lg"
              >
                Inizia
              </Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-all duration-300 border-2">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-secondary to-secondary/70 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold">Partecipa</h2>
              <p className="text-muted-foreground">
                Unisciti a una sessione esistente con il codice
              </p>
              <Button 
                onClick={() => navigate("/join-session")}
                className="w-full"
                size="lg"
                variant="secondary"
              >
                Partecipa
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
