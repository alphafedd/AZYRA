import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DuckDuckGo Instant Answer API (no key needed)
async function searchDuckDuckGo(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url);
    const data = await response.json();
    
    let results: string[] = [];
    
    // Abstract (main answer)
    if (data.Abstract) {
      results.push(`📌 **Résumé**: ${data.Abstract}`);
      if (data.AbstractSource) {
        results.push(`Source: ${data.AbstractSource}`);
      }
    }
    
    // Answer (for calculations, conversions, etc.)
    if (data.Answer) {
      results.push(`✅ **Réponse directe**: ${data.Answer}`);
    }
    
    // Definition
    if (data.Definition) {
      results.push(`📖 **Définition**: ${data.Definition}`);
    }
    
    // Related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: any) => t.Text)
        .slice(0, 5)
        .map((t: any) => `• ${t.Text}`)
        .join('\n');
      if (topics) {
        results.push(`\n📚 **Informations liées**:\n${topics}`);
      }
    }
    
    // Infobox (facts)
    if (data.Infobox && data.Infobox.content) {
      const facts = data.Infobox.content
        .slice(0, 5)
        .map((f: any) => `• ${f.label}: ${f.value}`)
        .join('\n');
      if (facts) {
        results.push(`\n📊 **Faits**:\n${facts}`);
      }
    }
    
    return results.length > 0 ? results.join('\n\n') : '';
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return '';
  }
}

// Wikipedia API (no key needed)
async function searchWikipedia(query: string): Promise<string> {
  try {
    // First search for relevant pages
    const searchUrl = `https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();
    
    if (!searchData.query?.search?.length) return '';
    
    const firstResult = searchData.query.search[0];
    
    // Get extract for the first result
    const extractUrl = `https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(firstResult.title)}&format=json`;
    const extractResp = await fetch(extractUrl);
    const extractData = await extractResp.json();
    
    const pages = extractData.query?.pages;
    if (!pages) return '';
    
    const pageId = Object.keys(pages)[0];
    const extract = pages[pageId]?.extract;
    
    if (extract) {
      // Limit to ~500 chars
      const shortExtract = extract.length > 500 ? extract.substring(0, 500) + '...' : extract;
      return `🌐 **Wikipedia**:\n${shortExtract}\n\n_Source: fr.wikipedia.org_`;
    }
    
    return '';
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return '';
  }
}

// Open-Meteo Weather API (no key needed)
async function getWeather(location: string): Promise<string> {
  try {
    // First geocode the location
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=fr&format=json`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();
    
    if (!geoData.results?.length) return '';
    
    const { latitude, longitude, name, country } = geoData.results[0];
    
    // Get current weather
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const weatherResp = await fetch(weatherUrl);
    const weatherData = await weatherResp.json();
    
    if (!weatherData.current) return '';
    
    const current = weatherData.current;
    const weatherCodes: Record<number, string> = {
      0: '☀️ Ciel dégagé',
      1: '🌤️ Principalement dégagé',
      2: '⛅ Partiellement nuageux',
      3: '☁️ Nuageux',
      45: '🌫️ Brouillard',
      48: '🌫️ Brouillard givrant',
      51: '🌧️ Bruine légère',
      53: '🌧️ Bruine modérée',
      55: '🌧️ Bruine dense',
      61: '🌧️ Pluie légère',
      63: '🌧️ Pluie modérée',
      65: '🌧️ Pluie forte',
      71: '🌨️ Neige légère',
      73: '🌨️ Neige modérée',
      75: '🌨️ Neige forte',
      80: '🌦️ Averses légères',
      81: '🌦️ Averses modérées',
      82: '🌦️ Averses violentes',
      95: '⛈️ Orage',
    };
    
    const description = weatherCodes[current.weather_code] || '🌡️ Conditions variables';
    
    return `🌡️ **Météo à ${name}, ${country}**:
${description}
- Température: ${current.temperature_2m}°C
- Humidité: ${current.relative_humidity_2m}%
- Vent: ${current.wind_speed_10m} km/h`;
  } catch (error) {
    console.error('Weather error:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type } = await req.json();
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Web search for:', query, 'type:', type);
    
    let results: string[] = [];
    
    // Check for weather queries
    const weatherPatterns = [
      /m[ée]t[ée]o\s+(?:à|a|de|du|en|au)?\s*(.+)/i,
      /temps\s+(?:à|a|de|du|en|au|qu'il fait)?\s*(.+)/i,
      /quel\s+temps\s+(?:fait-il\s+)?(?:à|a)?\s*(.+)/i,
      /weather\s+(?:in|at|for)?\s*(.+)/i,
    ];
    
    for (const pattern of weatherPatterns) {
      const match = query.match(pattern);
      if (match) {
        const location = match[1]?.trim();
        if (location) {
          const weather = await getWeather(location);
          if (weather) results.push(weather);
          break;
        }
      }
    }
    
    // General search - run in parallel
    const [ddgResult, wikiResult] = await Promise.all([
      searchDuckDuckGo(query),
      searchWikipedia(query),
    ]);
    
    if (ddgResult) results.push(ddgResult);
    if (wikiResult) results.push(wikiResult);
    
    const searchResults = results.length > 0 
      ? results.join('\n\n---\n\n')
      : 'Aucun résultat trouvé pour cette recherche.';
    
    return new Response(JSON.stringify({ 
      results: searchResults,
      sources: ['DuckDuckGo', 'Wikipedia', 'Open-Meteo'],
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Web search error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
