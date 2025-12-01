import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Report } from '../types';
import { AlertTriangle, AlertCircle, BarChart3, MapPin } from 'lucide-react';

const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface DashboardProps {
  reports: Report[];
  activeView: 'chat' | 'dashboard';
}

const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-500';
    if (severity === 3) return 'bg-yellow-500';
    return 'bg-green-500';
};

const getSeverityLabel = (severity: number) => {
    if (severity >= 4) return 'Crítico';
    if (severity === 3) return 'Médio';
    return 'Baixo';
};

const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    return null;
};

const Dashboard: React.FC<DashboardProps> = ({ reports, activeView }) => {
  const center = { lat: -12.9777, lng: -38.5016 }; 
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const lastReport = reports.length > 0 ? reports[reports.length - 1] : null;
  const mapCenter = lastReport ? lastReport.location : center;

  useEffect(() => {
    if (activeView === 'dashboard') {
        window.dispatchEvent(new Event('resize'));
    }
  }, [activeView]);

  // Aggregate risks by neighborhood
  const neighborhoodRisks = useMemo(() => {
      const stats: Record<string, { total: number; sumSeverity: number; count: number }> = {};
      
      reports.forEach(r => {
          const hood = r.neighborhood || "Desconhecido";
          if (!stats[hood]) stats[hood] = { total: 0, sumSeverity: 0, count: 0 };
          stats[hood].total++;
          stats[hood].sumSeverity += r.severity;
          stats[hood].count++;
      });

      return Object.entries(stats).map(([name, data]) => ({
          name,
          riskScore: (data.sumSeverity / data.count).toFixed(1),
          totalReports: data.total
      })).sort((a, b) => parseFloat(b.riskScore) - parseFloat(a.riskScore));
  }, [reports]);

  if (activeView !== 'dashboard') return null;

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50 font-sans">
      {/* Sidebar Stats & Risks */}
      <div className="w-full md:w-80 lg:w-96 p-4 overflow-y-auto border-r border-gray-200 bg-white flex flex-col h-1/3 md:h-full shadow-lg z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="text-[#008069] w-6 h-6" />
            <span>Painel de Risco</span>
        </h2>

        {/* Global Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-50 p-3 rounded-xl shadow-sm border border-green-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                <p className="text-2xl font-bold text-[#008069] mt-0.5">{reports.length}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl shadow-sm border border-red-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alto Risco</span>
                <p className="text-2xl font-bold text-red-600 mt-0.5">
                    {reports.filter(r => r.severity >= 4).length}
                </p>
            </div>
        </div>

        {/* Risk by Neighborhood */}
        <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide border-b pb-1">Risco por Bairro</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {neighborhoodRisks.length === 0 ? (
                    <p className="text-xs text-gray-400">Nenhum dado disponível.</p>
                ) : (
                    neighborhoodRisks.map((area) => (
                        <div key={area.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded border border-gray-100">
                            <span className="font-medium text-gray-700 truncate max-w-[120px]" title={area.name}>{area.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{area.totalReports} denúncias</span>
                                <span className={`font-bold px-1.5 py-0.5 rounded text-xs text-white ${parseFloat(area.riskScore) >= 4 ? 'bg-red-500' : parseFloat(area.riskScore) >= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}>
                                    {area.riskScore}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Últimas Ocorrências</h3>
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
            {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma denúncia registrada.</p>
                </div>
            ) : (
                reports.slice().reverse().map(report => (
                    <div 
                        key={report.id} 
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedReport?.id === report.id ? 'bg-green-50 border-green-500 shadow-md' : 'bg-white border-gray-100 hover:border-green-200'}`}
                        onClick={() => setSelectedReport(report)}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-gray-800 text-sm flex items-center gap-1">
                                {report.category}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium ${getSeverityColor(report.severity)}`}>
                                {getSeverityLabel(report.severity)}
                            </span>
                        </div>
                        {report.neighborhood && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mb-1">
                                <MapPin className="w-3 h-3" /> {report.neighborhood}
                            </p>
                        )}
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2 leading-relaxed">{report.description}</p>
                        
                        {/* Thumbnail if exists */}
                        {report.imageUrl && (
                            <div className="mb-2 h-16 w-full overflow-hidden rounded bg-gray-100">
                                <img src={report.imageUrl} alt="Evidência" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 h-2/3 md:h-full relative z-0">
        <MapContainer 
            center={[mapCenter.lat, mapCenter.lng]} 
            zoom={13} 
            scrollWheelZoom={true}
            className="h-full w-full"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {lastReport && <RecenterMap lat={mapCenter.lat} lng={mapCenter.lng} />}

            {reports.map((report) => (
                <Marker 
                    key={report.id} 
                    position={[report.location.lat, report.location.lng]}
                    eventHandlers={{
                        click: () => setSelectedReport(report),
                    }}
                >
                    <Popup className="custom-popup">
                        <div className="p-1 max-w-[220px]">
                            <h3 className="font-bold text-sm mb-0.5 text-[#008069]">{report.category}</h3>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] text-gray-500">{report.neighborhood || 'Local desconhecido'}</span>
                                <span className={`text-[9px] px-1.5 rounded text-white ${getSeverityColor(report.severity)}`}>Nível {report.severity}</span>
                            </div>
                            
                            {report.imageUrl && (
                                <div className="mb-2 rounded overflow-hidden">
                                    <img src={report.imageUrl} alt="Foto" className="w-full h-24 object-cover" />
                                </div>
                            )}

                            <div className="text-xs text-gray-700 mb-2 max-h-20 overflow-y-auto">
                                {report.description}
                            </div>
                            <div className="bg-gray-50 p-1.5 rounded text-[10px] border border-gray-100">
                                <span className="font-semibold text-gray-500 block mb-0.5">IA:</span>
                                <span className="text-gray-700 italic">{report.aiAnalysis}</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
        
        {/* Floating Legend for Mobile */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg z-[1000] text-xs md:hidden border border-gray-200">
            <span className="font-bold text-gray-700 block text-center mb-1">Total</span>
            <span className="text-xl font-bold text-[#008069] block text-center">{reports.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;