/* 'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Vehiculo {
  id: string;
  tipo?: string;
  estado?: string;
  x: number;
  y: number;
  color?: string;
}

interface VehiculoFromAPI {
  id: string;
  lat: number;
  lng: number;
}

type MapaTallerProps = {
  vehiculosIniciales?: Vehiculo[];
};

const COLORES_ESTADOS: Record<string, string> = {
  'En reparación': '#FF5733',
  'Esperando repuestos': '#33A8FF',
  'Listo para entrega': '#33FF57',
  'Diagnóstico': '#FF33A8',
  'Mantenimiento': '#A833FF',
  'Lavado': '#FF5733',
  'sin diagnostico': '#FFFF33',
  'Eléctrico': '#33A8FF',
  'Revisión': '#33FFFF',
  'Hidráulicos': '#FF8333'
};

export type MapaTallerRef = {
  agregarVehiculo: (vehiculo: Vehiculo) => void;
  cargarVehiculosDesdeAPI: () => void;
};

const MapaTaller = forwardRef<MapaTallerRef, MapaTallerProps>(({ vehiculosIniciales = [] }, ref) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(vehiculosIniciales);
  const mapRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<{ [key: string]: L.Marker }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Función para cargar vehículos desde la API
  const cargarVehiculosDesdeAPI = async () => {
    try {
      console.log('Cargando vehículos desde API...');
      const response = await fetch('/api/pedidos');
      if (!response.ok) throw new Error('Error al cargar vehículos');
      
      const vehiculosAPI: VehiculoFromAPI[] = await response.json();
      console.log('Vehículos obtenidos:', vehiculosAPI);
      
      // Convertir los datos de la API al formato que necesita el mapa
      const vehiculosConvertidos: Vehiculo[] = vehiculosAPI.map(v => ({
        id: v.id,
        tipo: 'Vehículo Municipal', // valor por defecto
        estado: 'sin diagnostico', // valor por defecto
        x: v.lng, // lng -> x
        y: v.lat, // lat -> y
        color: COLORES_ESTADOS['sin diagnostico'] || '#FFFF33'
      }));
      
      setVehiculos(vehiculosConvertidos);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
    }
  };

  // Función para actualizar posición en la API
  const actualizarPosicionEnAPI = async (ri: string, x: number, y: number) => {
    try {
      const response = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ri, x, y }),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar posición');
      }
      
      console.log(`Posición actualizada para ${ri}: x=${x}, y=${y}`);
    } catch (error) {
      console.error('Error al actualizar posición:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    agregarVehiculo: (nuevo) => {
      setVehiculos((prev) => [...prev, nuevo]);
    },
    cargarVehiculosDesdeAPI
  }));

  // Inicializar mapa cuando el componente se monta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fix para iconos de Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

      // Limpiar mapa anterior si existe
      if (mapRef.current) mapRef.current.remove();

      // Crear mapa con coordenadas simples
      const map = L.map('mapa-taller', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: true,
        attributionControl: false
      });

      const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

      // Crear canvas con el plano del taller
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      canvasRef.current = canvas;
      dibujarPlano(ctx);

      const dataUrl = canvas.toDataURL();
      L.imageOverlay(dataUrl, bounds).addTo(map);
      map.fitBounds(bounds);

      mapRef.current = map;

      // Cargar vehículos desde la API al inicializar
      cargarVehiculosDesdeAPI();

      return () => {
        if (mapRef.current) mapRef.current.remove();
      };
    }
  }, []);

  // Actualizar marcadores cuando cambian los vehículos
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcadores existentes
    Object.values(marcadoresRef.current).forEach(marker => marker.remove());
    marcadoresRef.current = {};

    // Agregar nuevos marcadores
    vehiculos.forEach(v => agregarMarcadorVehiculo(v, mapRef.current!));
  }, [vehiculos]);

  const dibujarPlano = (ctx: CanvasRenderingContext2D) => {
    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Borde principal del taller
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, 800, 800);

    // Área principal del taller
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(150, 150, 700, 600);

    // Espacios de estacionamiento
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 2;
    
    // Estacionamientos superiores
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(200 + i * 65, 180);
      ctx.lineTo(200 + i * 65, 300);
      ctx.stroke();
    }
    
    // Estacionamientos inferiores
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(200 + i * 65, 600);
      ctx.lineTo(200 + i * 65, 720);
      ctx.stroke();
    }
    
    // Estacionamientos laterales
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(180, 350 + i * 50);
      ctx.lineTo(300, 350 + i * 50);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(700, 350 + i * 50);
      ctx.lineTo(820, 350 + i * 50);
      ctx.stroke();
    }

    // Área de trabajo central
    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(400, 400, 200, 200);
    
    // Oficinas
    ctx.fillRect(100, 750, 100, 150);
    ctx.fillRect(800, 750, 100, 150);

    // Pasillos
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(350, 150, 50, 700);
    ctx.fillRect(650, 150, 50, 700);
    ctx.fillRect(150, 350, 700, 50);
    ctx.fillRect(150, 550, 700, 50);
  };

  const crearIconoVehiculo = (color: string) =>
    L.divIcon({
      html: `<svg width="30" height="20">
        <rect x="5" y="5" width="20" height="10" fill="${color}" stroke="#000" stroke-width="1" rx="3" />
        <circle cx="10" cy="15" r="2" fill="#333"/>
        <circle cx="20" cy="15" r="2" fill="#333"/>
      </svg>`,
      className: '',
      iconSize: [30, 20]
    });

  const agregarMarcadorVehiculo = (v: Vehiculo, map: L.Map) => {
    const marker = L.marker([v.y, v.x], {
      icon: crearIconoVehiculo(v.color || '#FFFF33'),
      draggable: true
    }).addTo(map);

    marker.bindPopup(`
      <div class="p-2 bg-white rounded">
        <h3 class="font-bold">Vehículo: ${v.id}</h3>
        <p><strong>Tipo:</strong> ${v.tipo || 'N/A'}</p>
        <p><strong>Estado:</strong> ${v.estado || 'N/A'}</p>
        <p><strong>Posición:</strong> X: ${Math.round(v.x)}, Y: ${Math.round(v.y)}</p>
      </div>
    `);

    marker.on('dragend', async (event: any) => {
      const { lat: y, lng: x } = event.target.getLatLng();
      
      // Actualizar estado local
      setVehiculos(prev => prev.map(veh => 
        veh.id === v.id ? { ...veh, x, y } : veh
      ));
      
      // Actualizar en Google Sheets
      await actualizarPosicionEnAPI(v.id, x, y);
    });

    marcadoresRef.current[v.id] = marker;
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-2">
        <button 
          onClick={cargarVehiculosDesdeAPI}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Recargar Vehículos
        </button>
        <span className="px-3 py-2 bg-gray-100 rounded">
          Vehículos cargados: {vehiculos.length}
        </span>
      </div>
      <div id="mapa-taller" className="w-full h-[600px] rounded shadow border" />
    </div>
  );
});

MapaTaller.displayName = 'MapaTaller';
export default MapaTaller; */

'use client'

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Vehiculo {
  id: string;
  tipo?: string;
  estado?: string;
  x: number;
  y: number;
  color?: string;
}

interface VehiculoFromAPI {
  id: string;
  lat: number;
  lng: number;
}

type MapaTallerProps = {
  vehiculosIniciales?: Vehiculo[];
};

const COLORES_ESTADOS: Record<string, string> = {
  'En reparación': '#FF5733',
  'Esperando repuestos': '#33A8FF',
  'Listo para entrega': '#33FF57',
  'Diagnóstico': '#FF33A8',
  'Mantenimiento': '#A833FF',
  'Lavado': '#FF5733',
  'sin diagnostico': '#FFFF33',
  'Eléctrico': '#33A8FF',
  'Revisión': '#33FFFF',
  'Hidráulicos': '#FF8333'
};

export type MapaTallerRef = {
  agregarVehiculo: (vehiculo: Vehiculo) => void;
  cargarVehiculosDesdeAPI: () => void;
};

const MapaTaller = forwardRef<MapaTallerRef, MapaTallerProps>(({ vehiculosIniciales = [] }, ref) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(vehiculosIniciales);
  const mapRef = useRef<L.Map | null>(null);
  const marcadoresRef = useRef<{ [key: string]: L.Marker }>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Función para cargar vehículos desde la API
  const cargarVehiculosDesdeAPI = useCallback(async () => {
    try {
      console.log('Cargando vehículos desde API...');
      const response = await fetch('/api/pedidos');
      if (!response.ok) throw new Error('Error al cargar vehículos');
      
      const vehiculosAPI: VehiculoFromAPI[] = await response.json();
      console.log('Vehículos obtenidos:', vehiculosAPI);
      
      // Convertir los datos de la API al formato que necesita el mapa
      const vehiculosConvertidos: Vehiculo[] = vehiculosAPI.map(v => ({
        id: v.id,
        tipo: 'Vehículo Municipal', // valor por defecto
        estado: 'sin diagnostico', // valor por defecto
        x: v.lng, // lng -> x
        y: v.lat, // lat -> y
        color: COLORES_ESTADOS['sin diagnostico'] || '#FFFF33'
      }));
      
      setVehiculos(vehiculosConvertidos);
    } catch (error) {
      console.error('Error al cargar vehículos:', error);
    }
  }, []);

  // Función para actualizar posición en la API
  const actualizarPosicionEnAPI = async (ri: string, x: number, y: number) => {
    try {
      const response = await fetch('/api/pedidos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ri, x, y }),
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar posición');
      }
      
      console.log(`Posición actualizada para ${ri}: x=${x}, y=${y}`);
    } catch (error) {
      console.error('Error al actualizar posición:', error);
    }
  };

  useImperativeHandle(ref, () => ({
    agregarVehiculo: (nuevo) => {
      setVehiculos((prev) => [...prev, nuevo]);
    },
    cargarVehiculosDesdeAPI
  }));

  const dibujarPlano = (ctx: CanvasRenderingContext2D) => {
    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 1000, 1000);
    
    // Borde principal del taller
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, 800, 800);

    // Área principal del taller
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(150, 150, 700, 600);

    // Espacios de estacionamiento
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 2;
    
    // Estacionamientos superiores
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(200 + i * 65, 180);
      ctx.lineTo(200 + i * 65, 300);
      ctx.stroke();
    }
    
    // Estacionamientos inferiores
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(200 + i * 65, 600);
      ctx.lineTo(200 + i * 65, 720);
      ctx.stroke();
    }
    
    // Estacionamientos laterales
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(180, 350 + i * 50);
      ctx.lineTo(300, 350 + i * 50);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(700, 350 + i * 50);
      ctx.lineTo(820, 350 + i * 50);
      ctx.stroke();
    }

    // Área de trabajo central
    ctx.fillStyle = '#E8F5E9';
    ctx.fillRect(400, 400, 200, 200);
    
    // Oficinas
    ctx.fillRect(100, 750, 100, 150);
    ctx.fillRect(800, 750, 100, 150);

    // Pasillos
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(350, 150, 50, 700);
    ctx.fillRect(650, 150, 50, 700);
    ctx.fillRect(150, 350, 700, 50);
    ctx.fillRect(150, 550, 700, 50);
  };

  const crearIconoVehiculo = (color: string) =>
    L.divIcon({
      html: `<svg width="30" height="20">
        <rect x="5" y="5" width="20" height="10" fill="${color}" stroke="#000" stroke-width="1" rx="3" />
        <circle cx="10" cy="15" r="2" fill="#333"/>
        <circle cx="20" cy="15" r="2" fill="#333"/>
      </svg>`,
      className: '',
      iconSize: [30, 20]
    });

  const agregarMarcadorVehiculo = useCallback((v: Vehiculo, map: L.Map) => {
    const marker = L.marker([v.y, v.x], {
      icon: crearIconoVehiculo(v.color || '#FFFF33'),
      draggable: true
    }).addTo(map);

    marker.bindPopup(`
      <div class="p-2 bg-white rounded">
        <h3 class="font-bold">Vehículo: ${v.id}</h3>
        <p><strong>Tipo:</strong> ${v.tipo || 'N/A'}</p>
        <p><strong>Estado:</strong> ${v.estado || 'N/A'}</p>
        <p><strong>Posición:</strong> X: ${Math.round(v.x)}, Y: ${Math.round(v.y)}</p>
      </div>
    `);

    marker.on('dragend', async (event: L.DragEndEvent) => {
      const { lat: y, lng: x } = event.target.getLatLng();
      
      // Actualizar estado local
      setVehiculos(prev => prev.map(veh => 
        veh.id === v.id ? { ...veh, x, y } : veh
      ));
      
      // Actualizar en Google Sheets
      await actualizarPosicionEnAPI(v.id, x, y);
    });

    marcadoresRef.current[v.id] = marker;
  }, []);

  // Inicializar mapa cuando el componente se monta
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Fix para iconos de Leaflet
      const DefaultIcon = L.Icon.Default.prototype as unknown as {
        _getIconUrl?: string;
      };
      
      delete DefaultIcon._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' });

      // Limpiar mapa anterior si existe
      if (mapRef.current) mapRef.current.remove();

      // Crear mapa con coordenadas simples
      const map = L.map('mapa-taller', {
        crs: L.CRS.Simple,
        minZoom: -2,
        maxZoom: 2,
        zoomControl: true,
        attributionControl: false
      });

      const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

      // Crear canvas con el plano del taller
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d')!;
      canvasRef.current = canvas;
      dibujarPlano(ctx);

      const dataUrl = canvas.toDataURL();
      L.imageOverlay(dataUrl, bounds).addTo(map);
      map.fitBounds(bounds);

      mapRef.current = map;

      // Cargar vehículos desde la API al inicializar
      cargarVehiculosDesdeAPI();

      return () => {
        if (mapRef.current) mapRef.current.remove();
      };
    }
  }, [cargarVehiculosDesdeAPI]);

  // Actualizar marcadores cuando cambian los vehículos
  useEffect(() => {
    if (!mapRef.current) return;

    // Limpiar marcadores existentes
    Object.values(marcadoresRef.current).forEach(marker => marker.remove());
    marcadoresRef.current = {};

    // Agregar nuevos marcadores
    vehiculos.forEach(v => agregarMarcadorVehiculo(v, mapRef.current!));
  }, [vehiculos, agregarMarcadorVehiculo]);

  return (
    <div className="w-full">
      <div className="mb-4 flex gap-2">
        <button 
          onClick={cargarVehiculosDesdeAPI}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Recargar Vehículos
        </button>
        <span className="px-3 py-2 bg-gray-100 rounded">
          Vehículos cargados: {vehiculos.length}
        </span>
      </div>
      <div id="mapa-taller" className="w-full h-[600px] rounded shadow border" />
    </div>
  );
});

MapaTaller.displayName = 'MapaTaller';
export default MapaTaller;