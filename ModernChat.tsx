import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Send, Bot, User, Sparkles, Mic, MicOff, Image, Languages, 
  Camera, Loader2, Plus, LogOut, Menu, Settings, 
  Copy, Check, RefreshCw, X, Paperclip, Home, Download, ArrowLeft,
  Code, FileText, Lightbulb, Zap, MessageSquare, Sun, Moon, Volume2, VolumeX, Trash2, Coins, Shield, Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useConversations, Message } from "@/hooks/useConversations";
import { useMemory } from "@/hooks/useMemory";
import { useWallet } from "@/hooks/useWallet";
import { useAds, ALC_COSTS } from "@/hooks/useAds";
import { useNavigate } from "react-router-dom";
import alphaLogo from "@/assets/alpha-logo.png";
import { RewardedAdButton } from "@/components/ads/RewardedAdButton";
import QuotaDisplay from "@/components/QuotaDisplay";
import ReactMarkdown from "react-markdown";
import WolfLoadingAnimation from "@/components/WolfLoadingAnimation";
import { useNotifications } from "@/hooks/useNotifications";


type Mode = "chat";

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

const suggestionCards = [
  { icon: Lightbulb, title: "Explique-moi", subtitle: "un concept complexe", gradient: "from-primary/20 to-secondary/20" },
  { icon: Code, title: "Aide-moi à coder", subtitle: "résous un problème technique", gradient: "from-secondary/20 to-primary/20" },
  { icon: FileText, title: "Rédige pour moi", subtitle: "un texte professionnel", gradient: "from-primary/20 to-secondary/20" },
  { icon: Zap, title: "Génère une image", subtitle: "créative et unique", gradient: "from-secondary/20 to-primary/20" },
];

interface ModernChatProps {
  onBackToHome?: () => void;
}

const ModernChat = ({ onBackToHome }: ModernChatProps) => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { wallet, spendALC, subscription, incrementQuestionCount, canAskQuestion } = useWallet();
  const { adState } = useAds();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversationId,
    messages,
    setMessages,
    loadMessages,
    createConversation,
    addMessage,
    saveMessageContent,
    deleteConversation,
    startNewChat,
    setCurrentConversationId
  } = useConversations();
  const { getMemoryContext, extractAndSaveMemory } = useMemory();
  const { notifyGeneration, notifyMessage, requestPermission, permission } = useNotifications();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [mode] = useState<Mode>("chat");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if user is admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    };
    checkAdminRole();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

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

      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [toast]);

  const toggleVoice = async () => {
    if (!recognitionRef.current) {
      toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas la reconnaissance vocale", variant: "destructive" });
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Request microphone permission explicitly
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Microphone permission denied:', err);
        toast({ 
          title: "Accès micro refusé", 
          description: "Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur pour utiliser la commande vocale.", 
          variant: "destructive" 
        });
      }
    }
  };

  const speakText = (text: string, messageId: string) => {
    if (!('speechSynthesis' in window)) {
      toast({ title: "Non supporté", description: "Votre navigateur ne supporte pas la synthèse vocale", variant: "destructive" });
      return;
    }

    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMessageId === messageId) {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    const threshold = 80;
    
    // Swipe right from left edge to open
    if (diff > threshold && touchStartX < 50 && !sidebarOpen) {
      setSidebarOpen(true);
    }
    // Swipe left to close
    else if (diff < -threshold && sidebarOpen) {
      setSidebarOpen(false);
    }
    
    setTouchStartX(null);
  }, [touchStartX, sidebarOpen]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Copié !", description: "Message copié dans le presse-papier" });
  };

  const streamChat = async (userMessages: Message[], memoryContext: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alpha-ai-chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
        mode: mode,
        memoryContext: memoryContext
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.error || `Erreur ${resp.status}`);
    }

    if (!resp.body) throw new Error('Pas de réponse');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let assistantContent = '';

    const assistantId = Date.now().toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

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

    return assistantContent;
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
      throw new Error(error.error || "Échec de génération");
    }

    return await resp.json();
  };

  const editImage = async (imageUrl: string, prompt: string) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edit-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ imageUrl, prompt }),
    });

    if (!resp.ok) {
      const error = await resp.json();
      throw new Error(error.error || "Échec d'édition");
    }

    return await resp.json();
  };

  const analyzeImage = async (imageUrl: string, prompt: string) => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ imageUrl, prompt }),
    });

    if (!resp.ok || !resp.body) throw new Error("Échec d'analyse");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantContent = "";

    const assistantId = Date.now().toString() + "-assistant";
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

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

    return assistantContent;
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isLoading) return;

    const userContent = input.trim() || "Analyse cette image";
    
    // Determine the action type and cost
    // Enhanced patterns - accepts synonyms and flexible wording
    const imageGenPatterns = /(?:génère|génerer|génération|créer?|crée|création|fais?|faire|dessine|dessiner|imagine|imaginer|fabrique|fabriquer|produis|produire|conçois|concevoir|réalise|réaliser|construis|construire|compose|composer|invente|inventer|illustre|illustrer|peins|peindre|render|rends?|generate|create|make|draw|design|craft|build|produce|render)[\s\-]*(une?|un|moi|me|pour)?\s*(?:image|photo|illustration|dessin|art|visuel|picture|portrait|tableau|œuvre|affiche|poster|logo|icône|icon|graphique|graphic|artwork)/i;
    const editImagePatterns = /(?:modifie|modifier|édite|éditer|change|changer|transforme|transformer|retouche|retoucher|ajuste|ajuster|corrige|corriger|améliore|améliorer|update|modify|edit|alter|fix|adjust|enhance|tweak)[\s\-]*(cette|cette|mon|ma|l['']|cette|son|sa|the|this|my|his|her)?[\s\-]*(?:image|photo|picture|illustration|portrait)?/i;
    const videoGenPatterns = /(?:génère|génerer|génération|créer?|crée|création|fais?|faire|fabrique|fabriquer|produis|produire|réalise|réaliser|tourne|tourner|filme|filmer|animate|animer|generate|create|make|produce|render)[\s\-]*(une?|un|moi|me|pour)?\s*(?:vidéo|video|clip|animation|film|court[- ]métrage|short|motion|cinématique|cinematic)/i;
    const codePatterns = /(?:code|programme|script|fonction|class|api|debug|debugger|fix|corrige|développe|implémente|algorithm|algorithme)/i;

    let actionCost = ALC_COSTS.CHAT; // Default: 5 ALC
    let actionType = "chat";
    
    if (videoGenPatterns.test(userContent)) {
      actionCost = ALC_COSTS.VIDEO_GEN; // 75 ALC
      actionType = "video";
    } else if (imageGenPatterns.test(userContent) || (uploadedImage && editImagePatterns.test(userContent)) || uploadedImage) {
      actionCost = ALC_COSTS.IMAGE_GEN; // 25 ALC for image work
      actionType = "image";
    } else if (codePatterns.test(userContent)) {
      actionCost = ALC_COSTS.CODE; // 45 ALC
      actionType = "code";
    }

    // Check if user can ask (has ALC or within daily limit)
    const hasALC = wallet && wallet.alpha_coins >= actionCost;
    const withinDailyLimit = canAskQuestion();
    
    if (!hasALC && !withinDailyLimit) {
      toast({
        title: "Solde insuffisant",
        description: `Cette action coûte ${actionCost} ALC. Rechargez votre compte ou regardez une pub pour gagner des ALC.`,
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      imageUrl: uploadedImage || undefined,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    
    // Clear uploaded image immediately after sending to fix attachment bug
    const imageToProcess = uploadedImage;
    setUploadedImage(null);
    setIsLoading(true);

    // Deduct ALC based on action type
    if (hasALC) {
      const spent = await spendALC(actionCost, `${actionType}: ${userContent.slice(0, 40)}...`);
      if (!spent) {
        console.warn('Failed to deduct ALC, but continuing...');
      }
    }

    // Increment daily question count
    await incrementQuestionCount();

    // Create or get conversation
    let convId = currentConversationId;
    if (!convId) {
      const title = userContent.slice(0, 30) + (userContent.length > 30 ? "..." : "");
      convId = await createConversation(title);
    }

    // Save user message
    if (convId) {
      await addMessage(convId, "user", userContent);
    }

    try {
      let assistantContent = "";
      const memoryContext = getMemoryContext();
      
      if (videoGenPatterns.test(userContent)) {
        // Video generation placeholder
        assistantContent = "🎬 **Génération vidéo en cours de développement !**\n\nCette fonctionnalité arrive bientôt avec l'intégration Runway ML et Pika Labs.\n\n💡 En attendant, je peux générer des images ultra-réalistes pour toi !";
        setMessages(prev => [...prev, {
          id: Date.now().toString() + "-assistant",
          role: "assistant",
          content: assistantContent,
          timestamp: new Date()
        }]);
      } else if (imageGenPatterns.test(userContent) && !uploadedImage) {
        // Image generation request - Add wolf loading animation
        const loadingId = Date.now().toString() + "-loading";
        setMessages(prev => [...prev, {
          id: loadingId,
          role: "assistant",
          content: "___WOLF_LOADING_IMAGE___",
          timestamp: new Date()
        }]);
        
        const result = await generateImage(userContent);
        
        // Remove loading message and add result
        setMessages(prev => prev.filter(m => m.id !== loadingId));
        
        if (result.imageUrl) {
          assistantContent = result.text || "✨ Voilà ton image générée ! 🎨";
          setMessages(prev => [...prev, {
            id: Date.now().toString() + "-assistant",
            role: "assistant",
            content: assistantContent,
            imageUrl: result.imageUrl,
            timestamp: new Date()
          }]);
          notifyGeneration("image");
        }
      } else if (imageToProcess && (editImagePatterns.test(userContent) || userContent.toLowerCase().includes("modif"))) {
        // Image editing request - Add wolf loading animation
        const loadingId = Date.now().toString() + "-loading";
        setMessages(prev => [...prev, {
          id: loadingId,
          role: "assistant",
          content: "___WOLF_LOADING_IMAGE___",
          timestamp: new Date()
        }]);
        
        const result = await editImage(imageToProcess, userContent);
        
        // Remove loading message and add result
        setMessages(prev => prev.filter(m => m.id !== loadingId));
        
        if (result.imageUrl) {
          assistantContent = result.text || "✨ Voilà ton image modifiée !";
          setMessages(prev => [...prev, {
            id: Date.now().toString() + "-assistant",
            role: "assistant",
            content: assistantContent,
            imageUrl: result.imageUrl,
            timestamp: new Date()
          }]);
          notifyGeneration("image");
        }
      } else if (imageToProcess) {
        // Image analysis request - image already cleared above
        assistantContent = await analyzeImage(imageToProcess, userContent);
      } else {
        // Standard chat
        assistantContent = await streamChat(updatedMessages, memoryContext);
      }

      // Save assistant message
      if (convId && assistantContent) {
        await addMessage(convId, "assistant", assistantContent);
      }

      // Notify if page is hidden
      if (assistantContent) {
        notifyMessage(assistantContent);
      }

      // Extract memory from conversation
      await extractAndSaveMemory(userContent, assistantContent);

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

  const handleSuggestionClick = (title: string, subtitle: string) => {
    setInput(`${title} ${subtitle}`);
    textareaRef.current?.focus();
  };

  const handleStartNewChat = () => {
    startNewChat();
    setInput("");
    setUploadedImage(null);
  };

  const handleLoadConversation = async (convId: string) => {
    await loadMessages(convId);
    setSidebarOpen(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div 
      className="flex h-screen bg-background relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sidebar overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed md:relative left-0 top-0 h-full w-[280px] bg-card border-r border-border flex flex-col z-50"
          >
            <div className="p-3 flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden">
                  <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Azyra-AI
                </span>
              </div>
              {/* Close button for mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground md:hidden"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-3">
              <Button
                onClick={handleStartNewChat}
                variant="outline"
                className="w-full justify-start gap-3 h-11 bg-transparent border-border hover:bg-muted text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Nouvelle conversation
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {conversations.length > 0 && (
                <div className="px-2 py-2 text-xs text-muted-foreground font-medium">Récent</div>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    currentConversationId === conv.id 
                      ? "bg-muted text-foreground" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <button
                    onClick={() => handleLoadConversation(conv.id)}
                    className="flex-1 flex items-center gap-2 truncate"
                  >
                    <MessageSquare className="w-4 h-4 opacity-50 flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </button>
                  <button
                    onClick={() => deleteConversation(conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-border">
              {user && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground truncate flex-1">{user.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-16 border-b border-border">
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBackToHome}
                className="text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/30">
                <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
              </div>
              <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent hidden sm:block">
                AZYRA-AI
              </span>
            </div>
          </div>
          
          {/* Center: Quota Display */}
          <div className="hidden md:flex">
            {wallet && subscription && (
              <QuotaDisplay
                questionsToday={subscription.questions_today}
                questionsLimit={subscription.questions_limit}
                alphaCoins={wallet.alpha_coins}
                plan={subscription.plan}
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile ALC Balance */}
            {wallet && (
              <div className="flex md:hidden items-center gap-1.5 px-2 py-1 bg-secondary/10 rounded-full">
                <Coins className="w-3.5 h-3.5 text-secondary" />
                <span className="text-xs font-bold text-secondary">{wallet.alpha_coins}</span>
              </div>
            )}
            {/* Admin button */}
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/admin')}
                className="text-primary hover:text-primary hover:bg-primary/10"
                title="Panel Admin"
              >
                <Shield className="w-5 h-5" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/settings')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center p-6 max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
              >
                <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-6 border border-border">
                  <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                  <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                    Bonjour
                  </span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-md mb-4">
                  Je suis Azyra-AI. Comment puis-je t'aider ?
                </p>
                {/* Rewarded ad button */}
                <RewardedAdButton variant="compact" className="mt-2" />
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggestionCards.map((card, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSuggestionClick(card.title, card.subtitle)}
                    className={`p-5 rounded-2xl border border-border bg-gradient-to-br ${card.gradient} hover:border-primary/30 transition-all text-left group`}
                  >
                    <card.icon className="w-6 h-6 mb-3 text-foreground/70 group-hover:text-primary transition-colors" />
                    <span className="font-medium text-foreground block">{card.title}</span>
                    <span className="text-muted-foreground text-sm">{card.subtitle}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto p-4 space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <div className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        message.role === "assistant" 
                          ? "border border-primary/20" 
                          : "bg-muted"
                      }`}>
                        {message.role === "assistant" ? (
                          <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                        {message.imageUrl && (
                          <div className="relative inline-block mb-3">
                            <img 
                              src={message.imageUrl} 
                              alt="Image" 
                              className="max-w-full rounded-2xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                              style={{ maxHeight: '400px' }}
                              onClick={() => window.open(message.imageUrl, '_blank')}
                            />
                            <a
                              href={message.imageUrl}
                              download={`alpha-ai-image-${Date.now()}.png`}
                              className="absolute bottom-2 right-2 p-2 bg-background/80 backdrop-blur rounded-lg border border-border hover:bg-background transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                        <div className={`inline-block max-w-[90%] text-left ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-3xl rounded-br-lg px-5 py-3"
                            : ""
                        }`} dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
                          {message.role === "assistant" ? (
                            message.content === "___WOLF_LOADING_IMAGE___" ? (
                              <WolfLoadingAnimation type="image" />
                            ) : message.content === "___WOLF_LOADING_VIDEO___" ? (
                              <WolfLoadingAnimation type="video" />
                            ) : (
                              <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-code:text-primary prose-strong:text-foreground prose-em:text-muted-foreground max-w-none text-left" dir="ltr">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            )
                          ) : (
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-left" dir="ltr">
                              {message.content}
                            </p>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        {message.timestamp && (
                          <p className={`text-[10px] text-muted-foreground mt-1 ${message.role === "user" ? "text-right" : "text-left"}`}>
                            {new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        
                        {/* Action buttons for assistant messages */}
                        {message.role === "assistant" && message.content && (
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => speakText(message.content, message.id)}
                            >
                              {speakingMessageId === message.id && isSpeaking ? (
                                <VolumeX className="w-4 h-4 text-primary" />
                              ) : (
                                <Volume2 className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => copyToClipboard(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <Check className="w-4 h-4 text-secondary" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 flex items-center justify-center">
                    <img src={alphaLogo} alt="Azyra-AI" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-muted-foreground text-sm">Azyra-AI réfléchit...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 pb-6">
          <div className="max-w-3xl mx-auto">
            {/* Uploaded image preview */}
            {uploadedImage && (
              <div className="mb-3">
                <div className="relative inline-block">
                  <img src={uploadedImage} alt="Upload" className="h-20 rounded-xl border border-border" />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute -top-2 -right-2 bg-muted border border-border text-foreground rounded-full p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input box */}
            <div className="relative">
              <div className="flex items-end gap-2 p-3 rounded-2xl bg-card border border-border focus-within:border-primary/50 transition-all shadow-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                {/* Left buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </div>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Envoie un message à Azyra-AI..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent px-2 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 resize-none min-h-[40px] max-h-[200px] overflow-y-auto text-[15px]"
                />

                {/* Right buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoice}
                    className={`h-9 w-9 rounded-xl ${isListening ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </Button>
                  
                  <Button
                    onClick={handleSend}
                    disabled={(!input.trim() && !uploadedImage) || isLoading}
                    size="icon"
                    className="h-9 w-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-3">
              Azyra-AI peut faire des erreurs. Vérifie les informations importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChat;
