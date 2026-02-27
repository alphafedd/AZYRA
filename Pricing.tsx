import { motion } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Star, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import alphaLogo from "@/assets/alpha-logo.png";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";

const plans = [
  {
    name: "Gratuit",
    price: "0",
    priceHTG: "0",
    period: "/mois",
    description: "Pour découvrir Azyra-AI",
    icon: Zap,
    features: [
      "25 questions par jour",
      "Accès aux fonctionnalités de base",
      "Publicités affichées",
      "Support communautaire"
    ],
    cta: "Commencer gratuitement",
    popular: false,
    gradient: "from-slate-500/20 to-gray-500/20"
  },
  {
    name: "Plus",
    price: "4.99",
    priceHTG: "598",
    period: "/mois",
    description: "Pour une utilisation régulière",
    icon: Sparkles,
    features: [
      "250 questions par jour",
      "Génération d'images incluse",
      "Moins de publicités",
      "Support prioritaire"
    ],
    cta: "Choisir Plus",
    popular: false,
    gradient: "from-blue-500/20 to-cyan-500/20"
  },
  {
    name: "Premium",
    price: "9.99",
    priceHTG: "1198",
    period: "/mois",
    description: "Pour les utilisateurs intensifs",
    icon: Crown,
    features: [
      "Questions illimitées",
      "Génération d'images & vidéos",
      "Zéro publicité",
      "Accès prioritaire aux nouvelles fonctionnalités",
      "Support VIP"
    ],
    cta: "Passer à Premium",
    popular: true,
    gradient: "from-amber-500/20 to-orange-500/20"
  },
  {
    name: "VIP",
    price: "19.99",
    priceHTG: "2398",
    period: "/mois",
    description: "L'expérience ultime",
    icon: Star,
    features: [
      "Tout de Premium",
      "Accès prioritaire aux serveurs",
      "Génération de musique",
      "API personnalisée",
      "Manager dédié"
    ],
    cta: "Devenir VIP",
    popular: false,
    gradient: "from-purple-500/20 to-pink-500/20"
  }
];

const alcPacks = [
  { alc: 250, price: "1", priceHTG: "120", bonus: "" },
  { alc: 500, price: "4", priceHTG: "480", bonus: "" },
  { alc: 1000, price: "7", priceHTG: "840", bonus: "+10% bonus" },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={alphaLogo} alt="Azyra-AI" className="w-10 h-10 rounded-xl" />
            <span className="font-display font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Azyra-AI
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Accueil</Link>
            <Link to="/pricing" className="text-foreground font-medium">Tarifs</Link>
            <Link to="/payment" className="text-muted-foreground hover:text-foreground transition-colors">Comment payer</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/')} className="bg-primary hover:bg-primary/90">
                Retour au chat
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/')}>Connexion</Button>
                <Button className="bg-gradient-to-r from-primary to-secondary">S'inscrire</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Choisissez votre plan
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Débloquez tout le potentiel d'Azyra-AI avec nos plans adaptés à vos besoins
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className={`relative h-full bg-gradient-to-br ${plan.gradient} border-border hover:border-primary/50 transition-all ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                      Populaire
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <plan.icon className="w-7 h-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <span className="text-4xl font-display font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                      <p className="text-sm text-muted-foreground mt-1">~{plan.priceHTG} gourdes</p>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => navigate('/payment')}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ALC Packs */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Coins className="w-8 h-8 text-amber-500" />
              <h2 className="text-3xl md:text-4xl font-display font-bold">Azyra-Coins (ALC)</h2>
            </div>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Achetez des crédits pour utiliser les fonctionnalités avancées. 1 ALC = 1 action IA.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {alcPacks.map((pack, index) => (
              <motion.div
                key={pack.alc}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 transition-all">
                  {pack.bonus && (
                    <div className="absolute -top-3 right-4 px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                      {pack.bonus}
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Coins className="w-10 h-10 text-amber-500" />
                      <span className="text-4xl font-display font-bold text-amber-500">{pack.alc}</span>
                    </div>
                    <p className="text-lg font-medium mb-1">ALC</p>
                    <div className="mb-6">
                      <span className="text-2xl font-bold">${pack.price}</span>
                      <p className="text-sm text-muted-foreground">~{pack.priceHTG} gourdes</p>
                    </div>
                    <Button 
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => navigate('/payment')}
                    >
                      Acheter
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Free ALC with ads section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mt-12"
        >
          <RewardedAdButton variant="large" />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={alphaLogo} alt="Azyra-AI" className="w-8 h-8 rounded-lg" />
            <span className="font-display font-bold">Azyra-AI</span>
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            Contact: pierrejacquesfeddly@gmail.com | +50940005000
          </p>
          <p className="text-muted-foreground text-xs">
            © 2025 Azyra-AI. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
