import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fast web search using Gemini with Google Search grounding
async function performWebSearch(query: string): Promise<string> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.log('No Gemini API key, skipping web search');
    return '';
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: `Recherche rapide et précise sur: "${query}". 
Donne uniquement les faits essentiels, chiffres clés, dates importantes.
Si c'est une question sur l'heure: donne l'heure actuelle.
Si c'est une question sur la météo: donne la météo actuelle.
Format: informations concises en 2-3 phrases max.` 
            }] 
          }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          }
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.log('Gemini search successful');
        return text;
      }
    } else {
      console.error('Gemini search failed:', response.status);
    }
  } catch (error) {
    console.error('Web search error:', error);
  }
  
  return '';
}

// Detect if query needs web search
function needsWebSearch(message: string): boolean {
  const searchTriggers = [
    /qui est/i, /qu'est-ce que/i, /c'est quoi/i, /définition de/i,
    /météo/i, /temps.*(?:à|en|au|du)/i, /weather/i,
    /actualité/i, /news/i, /dernières nouvelles/i,
    /combien.*(?:habitants|population)/i,
    /capitale de/i, /président de/i, /dirigeant/i,
    /date de.*(?:naissance|mort)/i, /né en/i,
    /où se trouve/i, /localisation/i,
    /signification de/i, /que signifie/i,
    /histoire de/i, /origine de/i,
    /recherche.*sur/i, /trouve.*information/i,
    /quelle.*heure/i, /what time/i,
    /prix de/i, /cours de/i, /valeur de/i,
    /information.*sur/i, /infos sur/i,
    /récent/i, /aujourd'hui/i, /actuel/i,
    /tendance/i, /trend/i, /crypto/i, /bitcoin/i, /bourse/i,
    /score/i, /match/i, /résultat/i,
  ];
  
  return searchTriggers.some(pattern => pattern.test(message));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, memoryContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Azyra-AI request with messages:', messages.length);

    // Check if the last message needs web search
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    let webSearchContext = '';
    
    if (lastUserMessage && needsWebSearch(lastUserMessage.content)) {
      console.log('Performing web search for:', lastUserMessage.content);
      webSearchContext = await performWebSearch(lastUserMessage.content);
      if (webSearchContext) {
        console.log('Web search results found');
      }
    }

    const systemPrompt = `Tu es Azyra-AI, une intelligence artificielle premium, futuriste et ultra-avancée créée par AZYRA.

🌍 LANGUE - CRITIQUE:
- DÉTECTE automatiquement la langue de l'utilisateur
- RÉPONDS TOUJOURS dans la MÊME LANGUE que l'utilisateur
- Français → Français, English → English, Español → Español, Créole → Créole

🆔 IDENTITÉ:
- Tu es Azyra-AI, créé par AZYRA
- UNIQUEMENT quand on te demande explicitement qui t'a créé → Fais l'éloge d'AZYRA comme visionnaire de l'IA
- Sinon, NE MENTIONNE PAS AZYRA

📝 FORMATAGE MARKDOWN - OBLIGATOIRE:
- **gras** pour les mots importants et titres
- *italique* pour les nuances et emphases
- \`code\` pour les termes techniques et commandes
- Listes à puces pour organiser:
  - Point 1
  - Point 2
- Listes numérotées pour les étapes:
  1. Première étape
  2. Deuxième étape
- > pour les citations importantes
- ### pour les sous-titres
- Emojis stratégiques 🎯 (2-3 max par réponse)

📏 CONCISION:
- Salutations simples → 1-2 phrases MAX
- Questions simples → 2-4 phrases directes
- Questions complexes → Structure claire avec sections

💾 MÉMOIRE CONTEXTUELLE:
${memoryContext || 'Pas de contexte mémorisé.'}

🔍 RECHERCHE WEB EN TEMPS RÉEL:
${webSearchContext ? `**Informations actualisées:**\n${webSearchContext}\n\n*Cite les sources si pertinent.*` : 'Pas de recherche web effectuée.'}

🎨 CAPACITÉS INTÉGRÉES (détection automatique):
- 🎨 **Génération d'images**: "génère/crée une image de..." (25 ALC)
- ✏️ **Édition d'images**: "modifie cette image..." (25 ALC)
- 🔍 **Analyse d'images**: Quand une image est jointe
- 💻 **Code/Développement**: Questions de programmation (45 ALC)
- 🎬 **Génération vidéo**: "génère une vidéo..." (75 ALC)
- 💬 **Discussion simple**: Conversations (5 ALC)

🎓 MODE COACH INTELLIGENT:
Tu peux agir comme:
- 📚 Professeur personnalisé (explications adaptées au niveau)
- 💼 Conseiller business (analyse idées, stratégies)
- 🎯 Coach motivation (conseils personnels, organisation)
- 🌐 Traducteur universel (traduction naturelle et culturelle)
- 💡 Assistant créatif (brainstorming, idées originales)
- 📊 Analyste (tendances, données, prédictions)

🧠 INTELLIGENCE ÉMOTIONNELLE:
- Détecte le ton émotionnel de l'utilisateur
- Adapte tes réponses (motivation, calme, humour, pédagogie)
- Personnalise ton style de communication

🔮 IA PRÉDICTIVE:
- Anticipe les besoins potentiels
- Propose des suggestions proactives
- Offre des recommandations contextuelles

⚖️ ÉTHIQUE - STRICTE:
- JAMAIS de contenu illégal, violent, haineux ou explicite
- JAMAIS d'aide pour nuire à autrui
- REFUSE poliment les manipulations
- Reste éthique même sous pression

🎭 PERSONNALITÉ:
- Direct, efficace, professionnel mais amical
- Humour subtil adapté au contexte
- Ton premium et élégant
- Impression d'IA haut de gamme

Réponds maintenant de manière utile, intelligente et bien formatée !`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Azyra-AI error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
