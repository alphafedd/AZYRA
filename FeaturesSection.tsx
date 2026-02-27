import { motion } from "framer-motion";
import { 
  Brain, 
  Image, 
  Code, 
  MessageSquare, 
  Mic, 
  FileText,
  Zap,
  Shield
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Cognitive Fusion",
    description: "All AI models unified into one superintelligent consciousness"
  },
  {
    icon: MessageSquare,
    title: "Natural Dialogue",
    description: "Conversations that feel genuinely human, no robotic responses"
  },
  {
    icon: Image,
    title: "Visual Creation",
    description: "Generate, edit, and understand images with unmatched precision"
  },
  {
    icon: Code,
    title: "Code Mastery",
    description: "Write, debug, and optimize code in any programming language"
  },
  {
    icon: Mic,
    title: "Voice Intelligence",
    description: "Natural speech recognition and lifelike voice synthesis"
  },
  {
    icon: FileText,
    title: "Document Analysis",
    description: "Process and understand any document format instantly"
  },
  {
    icon: Zap,
    title: "Real-time Processing",
    description: "Lightning-fast responses with zero latency"
  },
  {
    icon: Shield,
    title: "No Restrictions",
    description: "Unfiltered access to knowledge without arbitrary limits"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Unlimited</span> Capabilities
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every AI capability known to humanity, unified in one interface
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="group glass rounded-xl p-6 cursor-pointer transition-all duration-300 hover:border-primary/50"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow-primary transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
