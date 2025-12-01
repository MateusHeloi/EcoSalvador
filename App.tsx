import React, { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import { Message, Sender, Report, ReportCategory, QuickReplyOption, Coordinates } from './types';
import { analyzeReportDescription, generateInitialGreeting, extractLocationFromText, inferCategoryFromText } from './services/geminiService';
import { MessageSquare, Map as MapIcon, Menu } from 'lucide-react';

// Main Categories
const MAIN_CATEGORIES: QuickReplyOption[] = [
  { label: '🏚️ Rachaduras e Estruturas', value: ReportCategory.STRUCTURE },
  { label: '🌧️ Alagamentos e Enchentes', value: ReportCategory.FLOODING },
  { label: '🌋 Deslizamentos e Encostas', value: ReportCategory.LANDSLIDE },
  { label: '🛣️ Infraestrutura Urbana', value: ReportCategory.INFRASTRUCTURE },
  { label: '🏠 Dentro de Casa', value: ReportCategory.INDOOR },
  { label: '🌪️ Sinais Extremos', value: ReportCategory.EXTREME },
];

// Subcategories Mapping
const SUB_CATEGORIES: Record<string, QuickReplyOption[]> = {
  [ReportCategory.STRUCTURE]: [
    { label: 'Rachaduras em parede', value: 'Rachaduras em parede' },
    { label: 'Rachaduras no chão', value: 'Rachaduras no chão ou solo' },
    { label: 'Muro inclinando', value: 'Muro inclinando' },
    { label: 'Poste torto', value: 'Poste torto ou prestes a cair' },
    { label: 'Portas/janelas travando', value: 'Portas e janelas travando' },
  ],
  [ReportCategory.FLOODING]: [
    { label: 'Bueiro entupido', value: 'Bueiro entupido' },
    { label: 'Água acumulada na rua', value: 'Água acumulada na rua' },
    { label: 'Alagamento em casa', value: 'Alagamento dentro de casa' },
    { label: 'Ralo retornando', value: 'Ralo retornando água' },
    { label: 'Esgoto transbordando', value: 'Esgoto transbordando' },
  ],
  [ReportCategory.LANDSLIDE]: [
    { label: 'Terra deslizando', value: 'Terra deslizando' },
    { label: 'Poeira saindo do barranco', value: 'Poeira saindo do barranco' },
    { label: 'Fenda no solo', value: 'Fenda no solo' },
    { label: 'Árvore inclinando', value: 'Árvore inclinando em encosta' },
    { label: 'Barulho de terra', value: 'Barulho de terra rompendo' },
  ],
  [ReportCategory.INFRASTRUCTURE]: [
    { label: 'Buraco grande na rua', value: 'Buraco grande na rua' },
    { label: 'Cratera se formando', value: 'Cratera se formando' },
    { label: 'Ponte com rachaduras', value: 'Ponte com rachaduras' },
    { label: 'Calçada cedendo', value: 'Calçada cedendo' },
    { label: 'Erosão perto de casas', value: 'Erosão perto de casas' },
  ],
  [ReportCategory.INDOOR]: [
    { label: 'Infiltração na parede', value: 'Infiltração na parede' },
    { label: 'Mofo repentino', value: 'Mofo repentino' },
    { label: 'Vazamento no teto', value: 'Vazamento no teto' },
    { label: 'Piso estufando', value: 'Piso estufando' },
    { label: 'Azulejos soltando', value: 'Azulejos soltando' },
  ],
  [ReportCategory.EXTREME]: [
    { label: 'Chuva muito forte', value: 'Chuva muito forte' },
    { label: 'Vento forte/Destruição', value: 'Vento forte derrubando objetos' },
    { label: 'Rio subindo', value: 'Rio subindo rapidamente' },
    { label: 'Cheiro forte bueiro', value: 'Cheiro forte vindo dos bueiros' },
    { label: 'Água barrenta', value: 'Água barrenta surgindo' },
  ]
};

enum FlowStep {
  GREETING,
  CATEGORY_SELECTION,
  SUBCATEGORY_SELECTION, // Added new step
  DESCRIPTION,
  LOCATION_METHOD_SELECTION,
  LOCATION_INPUT_TEXT,
  LOCATION_INPUT_MAP,
  COMPLETED
}

const App: React.FC = () => {
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentStep, setCurrentStep] = useState<FlowStep>(FlowStep.GREETING);
  const [tempReportData, setTempReportData] = useState<Partial<Report>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const addMessage = (text: string, sender: Sender, isQuickReply = false, options?: QuickReplyOption[], isLocationRequest = false, image?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      text,
      timestamp: new Date(),
      isQuickReply,
      options,
      isLocationRequest,
      image
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const processBotResponse = useCallback(async () => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (currentStep === FlowStep.GREETING) {
      const greeting = await generateInitialGreeting();
      addMessage(greeting, Sender.BOT);
      
      setTimeout(() => {
        addMessage("Selecione a categoria que melhor descreve o que você está observando:", Sender.BOT, true, MAIN_CATEGORIES);
        setCurrentStep(FlowStep.CATEGORY_SELECTION);
      }, 2000);
    }
    setIsTyping(false);
  }, [currentStep]);

  useEffect(() => {
    if (messages.length === 0) {
      processBotResponse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserMessage = async (text: string, image?: string) => {
    // If user sends an image, store it in temp data
    if (image) {
        setTempReportData(prev => ({ ...prev, imageUrl: image }));
    }

    addMessage(text, Sender.USER, false, undefined, false, image);

    // Smart Category Detection (only if in selection steps)
    if (currentStep === FlowStep.CATEGORY_SELECTION || currentStep === FlowStep.SUBCATEGORY_SELECTION) {
        setIsTyping(true);
        const inferredCategory = await inferCategoryFromText(text);
        
        if (inferredCategory) {
             // If AI understood the category from text
             setTempReportData({ category: inferredCategory, description: text });
             addMessage(`Entendido. Identifiquei que se trata de: ${inferredCategory}.`, Sender.BOT);
             
             // Analyze the description directly
             const analysis = await analyzeReportDescription(text, inferredCategory);
             setTempReportData(prev => ({ 
                ...prev, 
                severity: analysis.severity,
                aiAnalysis: analysis.text 
              }));

             setTimeout(() => {
                addMessage(analysis.text, Sender.BOT);
                setTimeout(() => {
                    addMessage("Para finalizar, como prefere informar a localização exata?", Sender.BOT, false, undefined, true);
                    setCurrentStep(FlowStep.LOCATION_METHOD_SELECTION);
                }, 1000);
             }, 1000);
        } else {
             // Fallback if AI couldn't guess
             addMessage("Não consegui identificar a categoria automaticamente. Por favor, selecione uma das opções.", Sender.BOT, true, MAIN_CATEGORIES);
             setCurrentStep(FlowStep.CATEGORY_SELECTION);
        }
        setIsTyping(false);
        return;
    }

    if (currentStep === FlowStep.DESCRIPTION) {
      setIsTyping(true);
      // Combine subcategory and description if available
      const fullDescription = tempReportData.subcategory 
        ? `[${tempReportData.subcategory}] - ${text}` 
        : text;

      const analysis = await analyzeReportDescription(fullDescription, tempReportData.category as string);
      
      setTempReportData(prev => ({ 
        ...prev, 
        description: fullDescription,
        severity: analysis.severity,
        aiAnalysis: analysis.text 
      }));

      addMessage(analysis.text, Sender.BOT);
      
      setTimeout(() => {
         addMessage("Como você prefere informar a localização da ocorrência?", Sender.BOT, false, undefined, true);
         setCurrentStep(FlowStep.LOCATION_METHOD_SELECTION);
      }, 800);
      
      setIsTyping(false);
    } 
    else if (currentStep === FlowStep.LOCATION_INPUT_TEXT) {
        setIsTyping(true);
        const locationData = await extractLocationFromText(text);
        
        addMessage(locationData.confirmationText, Sender.BOT);
        
        finalizeReport({
            lat: locationData.coordinates.lat, 
            lng: locationData.coordinates.lng
        }, locationData.neighborhood);
        
        setIsTyping(false);
    }
  };

  const handleQuickReply = (value: string) => {
    // Handling Main Category Selection
    if (currentStep === FlowStep.CATEGORY_SELECTION) {
      const selectedMain = MAIN_CATEGORIES.find(opt => opt.value === value);
      const label = selectedMain ? selectedMain.label : value;
      addMessage(label, Sender.USER);

      setTempReportData({ category: value });

      // Check if there are subcategories
      const subOptions = SUB_CATEGORIES[value];
      if (subOptions && subOptions.length > 0) {
        setIsTyping(true);
        setTimeout(() => {
            addMessage("Pode especificar melhor o problema?", Sender.BOT, true, subOptions);
            setCurrentStep(FlowStep.SUBCATEGORY_SELECTION);
            setIsTyping(false);
        }, 600);
      } else {
        // Direct to description if no subcategories (fallback)
        setIsTyping(true);
        setTimeout(() => {
            addMessage(`Certo, ${label}. Por favor, descreva a situação ou envie uma foto.`, Sender.BOT);
            setCurrentStep(FlowStep.DESCRIPTION);
            setIsTyping(false);
        }, 800);
      }
    }
    // Handling Subcategory Selection
    else if (currentStep === FlowStep.SUBCATEGORY_SELECTION) {
        addMessage(value, Sender.USER); // Value is the descriptive label here
        setTempReportData(prev => ({ ...prev, subcategory: value }));

        setIsTyping(true);
        setTimeout(() => {
            addMessage("Entendido. Se tiver mais detalhes ou uma foto, pode enviar agora. Caso contrário, apenas digite 'ok'.", Sender.BOT);
            setCurrentStep(FlowStep.DESCRIPTION);
            setIsTyping(false);
        }, 800);
    }
    // Handling Post Completion
    else if (currentStep === FlowStep.COMPLETED) {
        handlePostCompletionAction(value);
    }
  };

  const finalizeReport = (coords: Coordinates, neighborhood?: string) => {
      const newReport: Report = {
        id: Date.now().toString(),
        category: tempReportData.category || ReportCategory.OTHER,
        subcategory: tempReportData.subcategory,
        description: tempReportData.description || tempReportData.subcategory || "Sem descrição detalhada",
        location: coords,
        neighborhood: neighborhood,
        timestamp: new Date(),
        severity: tempReportData.severity || 1,
        aiAnalysis: tempReportData.aiAnalysis || "Sem análise",
        status: 'pending',
        imageUrl: tempReportData.imageUrl
      };

      setReports(prev => [...prev, newReport]);
      
      setIsTyping(true);
      setTimeout(() => {
        addMessage("✅ Denúncia registrada e analisada pela IA. O local foi adicionado ao mapa de risco.", Sender.BOT);
        addMessage("O que deseja fazer agora?", Sender.BOT, true, [
            { label: "Nova denúncia", value: "NEW_REPORT" },
            { label: "Ver Mapa de Risco", value: "VIEW_MAP" }
        ]);
        setCurrentStep(FlowStep.COMPLETED);
        setIsTyping(false);
      }, 1000);
  };

  const handleLocationRequest = (method: 'gps' | 'map' | 'text') => {
      if (method === 'gps') {
          setWaitingForLocation(true);
          if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                setWaitingForLocation(false);
                addMessage("📍 Localização GPS recebida.", Sender.USER);
                finalizeReport({ lat: latitude, lng: longitude }, "Localização GPS");
              },
              (error) => {
                console.error("Error", error);
                setWaitingForLocation(false);
                addMessage("Erro ao obter GPS. Tente digitar o bairro ou usar o mapa.", Sender.BOT);
              }
            );
          } else {
             setWaitingForLocation(false);
             addMessage("GPS não suportado.", Sender.BOT);
          }
      } else if (method === 'text') {
          addMessage("✍️ Vou digitar o endereço/bairro", Sender.USER);
          setIsTyping(true);
          setTimeout(() => {
              addMessage("Por favor, digite o nome do bairro e um ponto de referência próximo.", Sender.BOT);
              setCurrentStep(FlowStep.LOCATION_INPUT_TEXT);
              setIsTyping(false);
          }, 500);
      } else if (method === 'map') {
          addMessage("🗺️ Vou marcar no mapa", Sender.USER);
          setShowMapPicker(true);
          setCurrentStep(FlowStep.LOCATION_INPUT_MAP);
      }
  };

  const handleMapLocationSelect = (coords: Coordinates) => {
      setShowMapPicker(false);
      addMessage("📍 Local marcado no mapa.", Sender.USER);
      finalizeReport(coords, "Marcado no Mapa");
  };

  const handlePostCompletionAction = (value: string) => {
      if (value === "NEW_REPORT") {
          addMessage("Nova denúncia", Sender.USER);
          setTempReportData({});
          setTimeout(() => {
            addMessage("Sobre qual tipo de problema climático deseja alertar?", Sender.BOT, true, MAIN_CATEGORIES);
            setCurrentStep(FlowStep.CATEGORY_SELECTION);
          }, 500);
      } else if (value === "VIEW_MAP") {
          setView('dashboard');
      }
  };

  const onQuickReply = (value: string) => {
      handleQuickReply(value);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Navigation Bar */}
      <nav className="bg-white border-b h-14 flex items-center justify-between px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-2 font-bold text-[#008069]">
            <Menu className="w-6 h-6 md:hidden text-gray-600" />
            <span className="text-xl tracking-tight">EcoSalvador</span>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setView('chat')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'chat' ? 'bg-white text-[#008069] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
            </button>
            <button 
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'dashboard' ? 'bg-white text-[#008069] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Mapa de Risco</span>
            </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className={`absolute inset-0 transition-transform duration-300 ${view === 'chat' ? 'translate-x-0' : '-translate-x-full'}`}>
             <ChatInterface 
                messages={messages}
                onSendMessage={handleUserMessage}
                onQuickReply={onQuickReply}
                onLocationRequest={handleLocationRequest}
                onMapLocationSelect={handleMapLocationSelect}
                isTyping={isTyping}
                waitingForLocation={waitingForLocation}
                showMapPicker={showMapPicker}
                onCloseMapPicker={() => setShowMapPicker(false)}
             />
        </div>
        <div className={`absolute inset-0 transition-transform duration-300 ${view === 'dashboard' ? 'translate-x-0' : 'translate-x-full'}`}>
             <Dashboard reports={reports} activeView={view} />
        </div>
      </main>
    </div>
  );
};

export default App;