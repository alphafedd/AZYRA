import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Send, X, Bot, User, Sparkles, Mic, MicOff, Image, Languages, Camera, Loader2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

type Mode = "chat" | "translate" | "image-gen" | "video-gen" | "image-scan";

const modeConfig = {
  chat: { icon: Sparkles, label: "Chat", color: "text-primary" },
  translate: { icon: Languages, label: "Traduire", color: "text-green-400" },
  "image-gen": { icon: Image, label: "Image", color: "text-purple-400" },
  "video-gen": { icon: Video, label: "Vidéo", color: "text-pink-400" },
  "image-scan": { icon: Camera, label: "Scanner", color: "text-orange-400" },
};

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const ChatInterface = ({ onClose }: { onClose: () => void }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Salut ! Je suis Azyra-AI, ton assistant unifié. Je peux discuter, traduire, générer des images ultra-réalistes avec Gemini 3, et analyser des photos. Le mode vidéo arrive bientôt ! Choisis un mode et parlons !"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionClass();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "fr-FR";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => prev + " " + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({ title: "Erreur", description: "Reconnaissance vocale échouée", variant: "destructive" });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [toast]);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas la reconnaissance vocale", variant: "destructive" });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast({ title: "Écoute...", description: "Parlez maintenant" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setMode("image-scan");
      };
      reader.readAsDataURL(file);
    }
  };

  const streamChat = async (userMessages: Message[], customSystemPrompt?: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpha-ai-chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        systemPrompt: customSystemPrompt
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${resp.status}`);
    }

    if (!resp.body) throw new Error('No response body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    const assistantId = Date.now().toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages(prev => 
              prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
            );
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  };

  const generateImage = async (prompt: string) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || "Failed to generate image");
    }

    return await resp.json();
  };

  const analyzeImage = async (imageUrl: string, prompt: string) => {
    const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`;
    
    const resp = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ imageUrl, prompt }),
    });

    if (!resp.ok || !resp.body) throw new Error("Failed to analyze image");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    const assistantId = Date.now().toString() + "-assistant";
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantContent += content;
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
            );
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return;

    const userContent = input.trim() || "Analyse cette image";
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      imageUrl: uploadedImage || undefined
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      if (mode === "image-gen") {
        const result = await generateImage(userContent);
        if (result.imageUrl) {
          setMessages(prev => [...prev, {
            id: Date.now().toString() + "-assistant",
            role: "assistant",
            content: result.text || "🎨 Voici ton image générée avec Gemini 3 Pro !",
            imageUrl: result.imageUrl
          }]);
        } else {
          throw new Error("No image generated");
        }
      } else if (mode === "video-gen") {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "-assistant",
          role: "assistant",
          content: `🎬 La génération vidéo arrive bientôt ! Pour l'instant, cette fonctionnalité nécessite une intégration avec des services externes comme Runway, Pika Labs ou Sora (OpenAI).\n\n**Ton prompt vidéo :** "${userContent}"\n\n💡 En attendant, je peux générer des images ultra-réalistes en mode Image !`
        }]);
      } else if (mode === "image-scan" && uploadedImage) {
        await analyzeImage(uploadedImage, userContent);
        setUploadedImage(null);
      } else {
        let systemPrompt: string | undefined;
        if (mode === "translate") {
          systemPrompt = "Tu es Azyra-AI, un traducteur expert. Traduis le texte dans la langue demandée ou vers le français si non spécifié. Sois naturel et précis.";
        }
        await streamChat(updatedMessages.filter(m => m.id !== 'welcome'), systemPrompt);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl"
    >
      <div className="container h-full flex flex-col max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse-glow">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gradient">AZYRA-AI</h2>
              <p className="text-xs text-muted-foreground">Intelligence Unifiée • En ligne</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(Object.keys(modeConfig) as Mode[]).map((m) => {
            const config = modeConfig[m];
            const Icon = config.icon;
            return (
              <Button
                key={m}
                variant={mode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(m)}
                className={`flex items-center gap-2 whitespace-nowrap ${mode !== m ? config.color : ""}`}
              >
                <Icon className="w-4 h-4" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass"
                  }`}
                >
                  {message.imageUrl && (
                    <img 
                      src={message.imageUrl} 
                      alt="Image" 
                      className="max-w-full rounded-lg mb-2"
                    />
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Uploaded Image Preview */}
        {uploadedImage && (
          <div className="mb-2">
            <div className="relative inline-block">
              <img src={uploadedImage} alt="Upload" className="h-20 rounded-lg" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="glass rounded-2xl p-2 flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 w-12 rounded-xl shrink-0"
          >
            <Camera className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            className={`h-12 w-12 rounded-xl shrink-0 ${isListening ? "text-red-500 animate-pulse" : ""}`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              mode === "translate" 
                ? "Texte à traduire..." 
                : mode === "image-gen" 
                ? "Décris l'image ultra-réaliste..."
                : mode === "video-gen"
                ? "Décris la vidéo à générer..."
                : mode === "image-scan"
                ? "Question sur l'image..."
                : "Demande ce que tu veux..."
            }
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
            style={{ height: 'auto' }}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 200) + 'px';
              }
            }}
          />

          <Button
            variant="glow"
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !uploadedImage) || isLoading}
            className="h-12 w-12 rounded-xl shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatInterface;
