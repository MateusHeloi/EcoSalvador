import React, { useRef, useEffect, useState } from 'react';
import { Send, MapPin, MoreVertical, Phone, Video, Loader2, Check, CheckCheck, Paperclip, X, Map as MapIcon, Type as TypeIcon } from 'lucide-react';
import { Message, Sender, QuickReplyOption, Coordinates } from '../types';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, image?: string) => void;
  onQuickReply: (value: string) => void;
  onLocationRequest: (method: 'gps' | 'map' | 'text') => void;
  onMapLocationSelect: (coords: Coordinates) => void;
  isTyping: boolean;
  waitingForLocation: boolean;
  showMapPicker: boolean;
  onCloseMapPicker: () => void;
}

// Map picker component
const LocationPickerMap: React.FC<{ onSelect: (coords: Coordinates) => void }> = ({ onSelect }) => {
    const [position, setPosition] = useState<Coordinates | null>(null);
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });

    return (
        <>
            {position && (
                <Marker position={[position.lat, position.lng]} />
            )}
            <div className="absolute bottom-4 left-0 right-0 z-[1000] flex justify-center">
                <button
                    onClick={() => position && onSelect(position)}
                    disabled={!position}
                    className="bg-[#008069] text-white px-6 py-3 rounded-full shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#006d59] transition-all"
                >
                    {position ? 'Confirmar Localização' : 'Toque no mapa para marcar'}
                </button>
            </div>
        </>
    );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  onQuickReply, 
  onLocationRequest,
  onMapLocationSelect,
  isTyping,
  waitingForLocation,
  showMapPicker,
  onCloseMapPicker
}) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, selectedImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || selectedImage) {
      onSendMessage(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Fix for map markers
  const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative font-sans">
      {/* Header */}
      <div className="bg-[#008069] text-white py-2.5 px-4 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
            <img src="https://api.dicebear.com/7.x/bottts/svg?seed=EcoSalvador" alt="Bot Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-medium text-base leading-tight">EcoSalvador Denúncias</h1>
            <p className="text-[11px] text-white/90 font-light truncate">
                {isTyping ? 'digitando...' : 'online'}
            </p>
          </div>
        </div>
        <div className="flex gap-5 text-white items-center">
          <Video className="w-5 h-5 cursor-pointer opacity-90 hover:opacity-100" />
          <Phone className="w-5 h-5 cursor-pointer opacity-90 hover:opacity-100" />
          <MoreVertical className="w-5 h-5 cursor-pointer opacity-90 hover:opacity-100" />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-center">
        {/* Date Divider */}
        <div className="flex justify-center mb-4">
            <span className="bg-[#e1f3fb] text-gray-600 text-[11px] px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-wide">Hoje</span>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === Sender.USER ? 'justify-end' : 'justify-start'} group`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-2 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-[14.2px] leading-[19px] ${
                msg.sender === Sender.USER
                  ? 'bg-[#dcf8c6] rounded-tr-none'
                  : 'bg-white rounded-tl-none'
              }`}
            >
              {/* Image Message */}
              {msg.image && (
                  <div className="mb-2 mt-1 rounded-lg overflow-hidden relative">
                      <img src={msg.image} alt="Upload" className="w-full h-auto max-h-[300px] object-cover" />
                  </div>
              )}

              <p className="mb-0 whitespace-pre-wrap text-[#111b21] pb-4 min-w-[60px]">{msg.text}</p>
              
              {/* Quick Replies */}
              {msg.isQuickReply && msg.options && (
                <div className="mt-2 mb-1 grid grid-cols-1 gap-2">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1 px-1">Selecione uma opção:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.options.map((option) => (
                        <button
                        key={option.value}
                        onClick={() => onQuickReply(option.value)}
                        className="bg-white hover:bg-gray-50 text-[#008069] font-medium py-2.5 px-4 rounded border border-gray-200 shadow-sm transition-colors text-center text-sm"
                        >
                        {option.label}
                        </button>
                    ))}
                  </div>
                </div>
              )}

               {/* Location Request Options */}
               {msg.isLocationRequest && (
                 <div className="mt-2 mb-1 grid grid-cols-1 gap-2">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1 px-1">Escolha como enviar a localização:</p>
                    
                    <button
                      onClick={() => onLocationRequest('gps')}
                      disabled={waitingForLocation}
                      className="flex items-center justify-center gap-2 w-full bg-[#008069] hover:bg-[#006d59] active:bg-[#005c4b] text-white font-medium py-2.5 px-4 rounded shadow-sm transition-all disabled:opacity-70 text-sm"
                    >
                      {waitingForLocation ? <Loader2 className="animate-spin w-4 h-4"/> : <MapPin className="w-4 h-4" />}
                      <span>Usar GPS Atual</span>
                    </button>

                    <div className="flex gap-2">
                        <button
                        onClick={() => onLocationRequest('map')}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-[#008069] border border-gray-200 hover:bg-gray-50 font-medium py-2.5 px-2 rounded shadow-sm transition-all text-sm"
                        >
                        <MapIcon className="w-4 h-4" />
                        <span>Marcar Mapa</span>
                        </button>
                        <button
                        onClick={() => onLocationRequest('text')}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-[#008069] border border-gray-200 hover:bg-gray-50 font-medium py-2.5 px-2 rounded shadow-sm transition-all text-sm"
                        >
                        <TypeIcon className="w-4 h-4" />
                        <span>Digitar</span>
                        </button>
                    </div>
                 </div>
               )}

              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                <span className="text-[11px] text-[rgba(17,27,33,0.5)]">
                    {formatTime(msg.timestamp)}
                </span>
                {msg.sender === Sender.USER && (
                    <span className="text-[#53bdeb]">
                        <CheckCheck className="w-3.5 h-3.5" />
                    </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex justify-start animate-in fade-in duration-300">
             <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]">
                <div className="flex gap-1.5 items-center h-4">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Area */}
      {selectedImage && (
          <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center gap-3">
              <div className="relative w-16 h-16 rounded overflow-hidden border border-gray-300">
                  <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-0 right-0 bg-black/50 text-white p-0.5"
                  >
                      <X className="w-3 h-3" />
                  </button>
              </div>
              <span className="text-sm text-gray-600">Imagem selecionada</span>
          </div>
      )}

      {/* Input Area */}
      <div className="bg-[#f0f2f5] px-4 py-2 shrink-0 flex items-center gap-2 min-h-[62px]">
        <button 
            className="text-[#54656f] hover:text-gray-600 transition p-1"
            onClick={() => fileInputRef.current?.click()}
        >
            <Paperclip className="w-6 h-6" />
        </button>
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
        />
        
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <div className="flex-1 relative">
                <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={selectedImage ? "Adicionar legenda..." : "Mensagem"}
                className="w-full py-2.5 px-4 rounded-lg border border-white focus:outline-none focus:border-white bg-white text-[#111b21] placeholder:text-[#54656f] text-[15px]"
                disabled={waitingForLocation || showMapPicker}
                />
            </div>
            {input.trim() || selectedImage ? (
                <button
                type="submit"
                className="p-2 bg-[#008069] rounded-full text-white hover:bg-[#006d59] transition shadow-sm transform hover:scale-105"
                >
                <Send className="w-5 h-5 pl-0.5" />
                </button>
            ) : (
                <button
                type="button"
                className="p-2 text-[#54656f] hover:text-gray-600 transition"
                >
                    <div className="w-6 h-6 flex items-center justify-center">
                        <span className="text-xl">🎤</span> 
                    </div>
                </button>
            )}
        </form>
      </div>

      {/* Map Picker Modal Overlay */}
      {showMapPicker && (
          <div className="absolute inset-0 z-50 bg-gray-100 flex flex-col animate-in fade-in duration-300">
              <div className="bg-[#008069] text-white p-4 flex items-center justify-between shadow-md z-[1001]">
                  <h2 className="font-semibold">Marcar Localização</h2>
                  <button onClick={onCloseMapPicker} className="p-1 hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6" />
                  </button>
              </div>
              <div className="flex-1 relative">
                  <MapContainer 
                    center={[-12.9777, -38.5016]} 
                    zoom={13} 
                    className="h-full w-full"
                  >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <LocationPickerMap onSelect={onMapLocationSelect} />
                  </MapContainer>
              </div>
          </div>
      )}
    </div>
  );
};

export default ChatInterface;