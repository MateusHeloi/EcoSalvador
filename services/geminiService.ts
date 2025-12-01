import { GoogleGenAI, Type } from "@google/genai";
import { AiResponse, LocationExtractionResponse, ReportCategory } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelId = 'gemini-2.5-flash';

export const analyzeReportDescription = async (
  description: string,
  selectedCategory: string
): Promise<AiResponse> => {
  try {
    const prompt = `
      Você é um assistente de IA para um sistema de denúncias climáticas em Salvador, Bahia.
      O usuário selecionou a categoria: "${selectedCategory}".
      A descrição do usuário é: "${description}".

      Sua tarefa:
      1. Gerar uma resposta curta, empática e útil (máximo 2 frases) confirmando o entendimento do problema e pedindo para ele informar a localização (oferecendo opções de GPS, digitar ou mapa).
      2. Estimar a gravidade do problema de 1 a 5 (1 = leve, 5 = emergência crítica) com base na descrição.

      Responda EXCLUSIVAMENTE em formato JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            severity: { type: Type.NUMBER },
          },
          required: ["text", "severity"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText) as AiResponse;

  } catch (error) {
    console.error("Error analyzing report:", error);
    return {
      text: "Entendido. Por favor, compartilhe a localização para que possamos registrar a ocorrência.",
      severity: 3 // Default severity
    };
  }
};

export const extractLocationFromText = async (text: string): Promise<LocationExtractionResponse> => {
    try {
        const prompt = `
            O usuário está descrevendo uma localização em Salvador, Bahia, Brasil para uma denúncia ambiental.
            Texto do usuário: "${text}"

            Tarefas:
            1. Identifique o bairro ou ponto de referência principal.
            2. Estime as coordenadas (latitude e longitude) para esse bairro/local em Salvador. Se não encontrar exato, use o centro do bairro.
            3. Gere uma frase de confirmação curta (ex: "Entendi, você está se referindo ao bairro Rio Vermelho.").

            Responda em JSON.
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        neighborhood: { type: Type.STRING },
                        coordinates: {
                            type: Type.OBJECT,
                            properties: {
                                lat: { type: Type.NUMBER },
                                lng: { type: Type.NUMBER }
                            }
                        },
                        confirmationText: { type: Type.STRING }
                    },
                    required: ["neighborhood", "coordinates", "confirmationText"]
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from AI");

        return JSON.parse(jsonText) as LocationExtractionResponse;
    } catch (error) {
        console.error("Error extracting location", error);
        // Fallback to Salvador Center
        return {
            neighborhood: "Salvador (Centro)",
            coordinates: { lat: -12.9777, lng: -38.5016 },
            confirmationText: "Não consegui identificar o local exato pelo texto. Usarei o centro da cidade como referência."
        };
    }
}

export const generateInitialGreeting = async (): Promise<string> => {
    try {
        const prompt = `
            Aja como o "EcoSalvador", um chatbot inteligente de monitoramento climático e ambiental de Salvador/BA.
            
            Gere uma mensagem de apresentação envolvente e amigável.
            Estrutura da mensagem:
            1. Apresente-se como EcoSalvador.
            2. Explique brevemente que você utiliza Inteligência Artificial e Geolocalização em tempo real para monitorar riscos (alagamentos, deslizamentos, etc).
            3. Diga que seu objetivo é agilizar o atendimento e alertar a população.
            4. Pergunte como pode ajudar hoje, indicando que o usuário pode selecionar uma opção ou digitar.
            
            Use emojis relevantes (🌍, 🤖, 📍, 🌱). Seja conciso.
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        return response.text || "Olá! 🤖 Sou o EcoSalvador, seu assistente virtual inteligente. Utilizo IA e geolocalização para monitorar e registrar problemas ambientais em nossa cidade 🌍. Como posso ajudar você hoje?";
    } catch (e) {
        return "Olá! 🤖 Sou o EcoSalvador, seu assistente virtual inteligente. Utilizo IA e geolocalização para monitorar e registrar problemas ambientais em nossa cidade 🌍. Como posso ajudar você hoje?";
    }
}

export const inferCategoryFromText = async (text: string): Promise<string | null> => {
    try {
        const prompt = `
            O usuário digitou: "${text}".
            Analise o texto e veja se corresponde a alguma das seguintes categorias PRINCIPAIS de denúncia ambiental:
            - ${ReportCategory.STRUCTURE}
            - ${ReportCategory.FLOODING}
            - ${ReportCategory.LANDSLIDE}
            - ${ReportCategory.INFRASTRUCTURE}
            - ${ReportCategory.INDOOR}
            - ${ReportCategory.EXTREME}
            
            Se o usuário falar sobre rachaduras, muros, postes -> ${ReportCategory.STRUCTURE}.
            Se o usuário falar sobre chuva, alagamento, bueiro -> ${ReportCategory.FLOODING}.
            Se o usuário falar sobre terra, barranco, encosta -> ${ReportCategory.LANDSLIDE}.
            Se o usuário falar sobre buracos na rua, ponte, asfalto -> ${ReportCategory.INFRASTRUCTURE}.
            Se o usuário falar sobre mofo, infiltração interna -> ${ReportCategory.INDOOR}.
            Se o usuário falar sobre ventania, rio subindo, cheiro forte -> ${ReportCategory.EXTREME}.

            Retorne apenas a string exata da categoria identificada acima. Se não for possível identificar claramente, retorne "null".
        `;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: prompt,
        });
        
        const result = response.text?.trim();
        
        // Validate if result is a valid category
        const validCategories = Object.values(ReportCategory);
        if (result && validCategories.includes(result as ReportCategory)) {
            return result;
        }
        
        return null;
    } catch (e) {
        console.error("Error inferring category", e);
        return null;
    }
}