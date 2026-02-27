import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Image, Briefcase, Brain, Sparkles, Shield, Zap, Globe } from "lucide-react";
import alphaWolf from "@/assets/alpha-wolf-gold.png";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage = ({ onGetStarted }: LandingPageProps) => {
  const features = [
    {
      icon: MessageSquare,
      title: "Smart AI Chat",
      description: "Intelligence conversationnelle ultra-avancée avec mémoire contextuelle.",
    },
    {
      icon: Image,
      title: "Image Generator",
      description: "Création d'images IA photoréalistes en quelques secondes.",
    },
    {
      icon: Briefcase,
      title: "Business Tools",
      description: "Outils professionnels pour automatiser vos tâches.",
    },
    {
      icon: Brain,
      title: "Memory System",
      description: "Mémorisation de vos préférences et contexte personnel.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Disponibilité" },
    { value: "50M+", label: "Messages traités" },
    { value: "4.9★", label: "Note utilisateurs" },
    { value: "24/7", label: "Support" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gold gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#d4a520]/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#d4a520]/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#d4a520]/8 rounded-full blur-[100px]" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(212, 165, 32, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 165, 32, 0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <header className="relative z-20">
        <nav className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4a520] to-[#b8860b] flex items-center justify-center shadow-[0_0_20px_rgba(212,165,32,0.4)]">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <span className="font-display text-2xl font-bold text-white tracking-wide">AZYRA-AI</span>
            </motion.div>

            {/* Nav links - Desktop */}
            <div className="hidden lg:flex items-center gap-8">
              <a href="#" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">Home</a>
              <a href="#" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">AI Chat</a>
              <a href="/pricing" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">Pricing</a>
              <a href="#" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">Dashboard</a>
              <a href="#features" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">Features</a>
              <a href="#" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">About</a>
              <a href="#" className="text-gray-400 hover:text-[#d4a520] transition-colors text-sm font-medium">Contact</a>
            </div>

            {/* Auth buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={onGetStarted}
                className="text-gray-300 hover:text-white hover:bg-white/5 font-medium"
              >
                Login
              </Button>
              <Button 
                onClick={onGetStarted} 
                className="bg-gradient-to-r from-[#d4a520] to-[#b8860b] hover:from-[#e5b521] hover:to-[#c99610] text-black font-bold px-6 shadow-[0_0_25px_rgba(212,165,32,0.4)]"
              >
                Register
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 pt-8 lg:pt-16">
          
          {/* Left: Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left max-w-xl"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a520]/10 border border-[#d4a520]/30 mb-6"
            >
              <Zap className="w-4 h-4 text-[#d4a520]" />
              <span className="text-sm text-[#d4a520] font-medium">Next-Generation AI Platform</span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-[#d4a520] to-[#f0c850] bg-clip-text text-transparent">
                Artificial Intelligence
              </span>
            </h1>
            
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Experience limitless AI capabilities with Azyra-AI. 
              Smart conversations, image generation, and powerful tools—all in one premium platform.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4 lg:justify-start justify-center">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="h-14 px-10 text-lg rounded-xl bg-gradient-to-r from-[#d4a520] to-[#b8860b] hover:from-[#e5b521] hover:to-[#c99610] text-black font-bold shadow-[0_0_40px_rgba(212,165,32,0.5)] transition-all hover:shadow-[0_0_60px_rgba(212,165,32,0.7)]"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/10">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-xl md:text-2xl font-bold text-[#d4a520]">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Wolf Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 relative flex justify-center"
          >
            <div className="relative">
              {/* Glow effect behind wolf */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#d4a520]/30 via-[#d4a520]/10 to-transparent rounded-full blur-3xl scale-110" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[100px] bg-[#d4a520]/20 rounded-full blur-2xl" />
              
              {/* Wolf image */}
              <img 
                src={alphaWolf} 
                alt="Azyra-AI Wolf" 
                className="relative w-72 h-72 md:w-96 md:h-96 lg:w-[450px] lg:h-[450px] object-contain drop-shadow-[0_0_30px_rgba(212,165,32,0.4)] animate-float" 
              />
              
              {/* Floating elements */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 -left-8 px-4 py-2 rounded-xl glass-gold"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#d4a520]" />
                  <span className="text-xs text-white font-medium">Secure AI</span>
                </div>
              </motion.div>
              
              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute top-24 -right-4 px-4 py-2 rounded-xl glass-gold"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#d4a520]" />
                  <span className="text-xs text-white font-medium">Multilingual</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.section
          id="features"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="py-24"
        >
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Powerful <span className="text-[#d4a520]">Features</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need for next-level AI interactions
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="group relative p-6 rounded-2xl glass-card hover:border-[#d4a520]/40 transition-all duration-300"
              >
                {/* Icon */}
                <div className="w-14 h-14 mb-5 rounded-xl bg-gradient-to-br from-[#d4a520]/20 to-[#b8860b]/10 border border-[#d4a520]/30 flex items-center justify-center group-hover:shadow-[0_0_25px_rgba(212,165,32,0.3)] transition-shadow">
                  <feature.icon className="w-7 h-7 text-[#d4a520]" />
                </div>
                
                <h3 className="font-display text-lg font-bold mb-2 text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="pb-24"
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#d4a520]/10 via-[#d4a520]/5 to-transparent border border-[#d4a520]/20 p-8 md:p-12">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkNGE1MjAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            
            <div className="relative z-10 w-full flex flex-col items-center justify-center text-center">
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Experience the Future?
              </h2>
              <p className="text-gray-400 mb-8 text-sm sm:text-base">
                Join thousands of users already using Azyra-AI
              </p>
              <Button
                size="lg"
                onClick={onGetStarted}
                className="h-12 sm:h-14 px-8 sm:px-12 text-base sm:text-lg rounded-xl bg-gradient-to-r from-[#d4a520] to-[#b8860b] hover:from-[#e5b521] hover:to-[#c99610] text-black font-bold shadow-[0_0_40px_rgba(212,165,32,0.5)]"
              >
                Start Now — It's Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Azyra-AI. All rights reserved. Powered by AZYRA.
          </p>
        </div>
      </footer>

      {/* Mobile bottom button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent z-30">
        <Button
          size="lg"
          onClick={onGetStarted}
          className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-[#d4a520] to-[#b8860b] text-black font-bold shadow-[0_0_30px_rgba(212,165,32,0.5)]"
        >
          Get Started
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;
