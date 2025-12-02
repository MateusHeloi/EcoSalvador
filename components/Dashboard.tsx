import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Report, ReportCategory } from '../types';
import { AlertTriangle, BarChart3, MapPin, TrendingUp, Activity, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

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

const COLORS = {
  primary: '#008069',
  secondary: '#25D366',
  danger: '#ef4444',
  warning: '#eab308',
  info: '#3b82f6',
  neutral: '#9ca3af'
};

const CATEGORY_COLORS: Record<string, string> = {
  [ReportCategory.STRUCTURE]: '#8D6E63',
  [ReportCategory.FLOODING]: '#4FC3F7',
  [ReportCategory.LANDSLIDE]: '#795548',
  [ReportCategory.INFRASTRUCTURE]: '#607D8B',
  [ReportCategory.INDOOR]: '#9E9E9E',
  [ReportCategory.EXTREME]: '#FF7043',
  [ReportCategory.OTHER]: '#BDBDBD'
};

const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-500 text-white';
    if (severity === 3) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
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

  // --- Data Processing for Charts ---

  // 1. Risk by Neighborhood
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

  // 2. Reports by Category (Bar Chart)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
        const cat = r.category as string;
        counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
        name: name.split(' ')[1] || name.substring(0, 10), // Shorten name for x-axis
        fullName: name,
        value 
    })).sort((a, b) => b.value - a.value);
  }, [reports]);

  // 3. Severity Distribution (Pie Chart)
  const severityData = useMemo(() => {
      let low = 0, medium = 0, high = 0;
      reports.forEach(r => {
          if (r.severity >= 4) high++;
          else if (r.severity === 3) medium++;
          else low++;
      });
      return [
          { name: 'Baixo (1-2)', value: low, color: COLORS.primary },
          { name: 'Médio (3)', value: medium, color: COLORS.warning },
          { name: 'Crítico (4-5)', value: high, color: COLORS.danger },
      ].filter(d => d.value > 0);
  }, [reports]);

  // 4. KPIs
  const totalReports = reports.length;
  const criticalReports = reports.filter(r => r.severity >= 4).length;
  const avgSeverity = totalReports > 0 
    ? (reports.reduce((acc, r) => acc + r.severity, 0) / totalReports).toFixed(1) 
    : "0.0";


  if (activeView !== 'dashboard') return null;

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-50 font-sans overflow-hidden">
      
      {/* --- Analytics Panel (Left Side) --- */}
      <div className="w-full md:w-[450px] lg:w-[500px] flex flex-col h-1/2 md:h-full bg-white border-r border-gray-200 shadow-xl z-20 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-[#008069] w-6 h-6" />
                <span>Painel de Controle</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Monitoramento em tempo real de Salvador/BA</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase">Total</span>
                    <span className="text-2xl font-bold text-gray-700">{totalReports}</span>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold text-red-400 uppercase">Críticos</span>
                    <span className="text-2xl font-bold text-red-600">{criticalReports}</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-semibold text-blue-400 uppercase">Média Sev.</span>
                    <span className="text-2xl font-bold text-blue-600">{avgSeverity}</span>
                </div>
            </div>

            {/* Charts Section */}
            {reports.length > 0 ? (
                <>
                    {/* Category Chart */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> Ocorrências por Tipo
                        </h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} interval={0} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.fullName] || COLORS.primary} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Severity Pie Chart */}
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                         <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4" /> Distribuição de Severidade
                        </h3>
                        <div className="h-48 w-full flex items-center justify-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {severityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '10px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Neighborhood Risk List */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> Bairros em Risco
                            </h3>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            {neighborhoodRisks.map((area, idx) => (
                                <div key={area.name} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-gray-400 w-4">{idx + 1}</span>
                                        <span className="text-sm font-medium text-gray-700">{area.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{area.totalReports} oc.</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${parseFloat(area.riskScore) >= 4 ? 'bg-red-500' : parseFloat(area.riskScore) >= 3 ? 'bg-yellow-500' : 'bg-green-500'}`}>
                                            {area.riskScore}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                    <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">Aguardando dados...</p>
                </div>
            )}
        </div>
      </div>

      {/* --- Map View (Right Side / Bottom) --- */}
      <div className="flex-1 h-1/2 md:h-full relative z-0">
        {/* Floating Stats for Map Context */}
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs hidden md:block">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Status da Cidade</h4>
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${criticalReports > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-sm font-medium text-gray-700">
                    {criticalReports > 0 ? "Alerta Ativo" : "Monitoramento Normal"}
                </span>
            </div>
        </div>

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
                                <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" />
                                    {report.neighborhood || 'Local desconhecido'}
                                </span>
                                <span className={`text-[9px] px-1.5 rounded ${getSeverityColor(report.severity)}`}>
                                    Nível {report.severity}
                                </span>
                            </div>
                            
                            {report.imageUrl && (
                                <div className="mb-2 rounded overflow-hidden shadow-sm">
                                    <img src={report.imageUrl} alt="Foto" className="w-full h-24 object-cover" />
                                </div>
                            )}

                            <div className="text-xs text-gray-700 mb-2 max-h-20 overflow-y-auto leading-relaxed">
                                {report.description}
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-[10px] border border-gray-100">
                                <span className="font-semibold text-gray-500 block mb-0.5 flex items-center gap-1">
                                    <Activity className="w-3 h-3" /> Análise IA:
                                </span>
                                <span className="text-gray-700 italic">{report.aiAnalysis}</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Dashboard;