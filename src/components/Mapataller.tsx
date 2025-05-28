'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Interfaz para la estructura de un vehículo en el frontend
interface Vehiculo {
    id: string;
    tipo?: string;
    estado?: string;
    x: number;
    y: number;
    color?: string;
}

// Interfaz para la estructura de los datos de vehículo recibidos de la API
interface VehiculoFromAPI {
    id: string;
    lat: number; // Coordenada Y
    lng: number; // Coordenada X
    // Posiblemente otros campos como estado, tipo, etc., si la API los devuelve
    estado?: string;
    tipo?: string;
}

// Propiedades para el componente MapaTaller
type MapaTallerProps = {
    vehiculosIniciales?: Vehiculo[];
};

// Mapeo de estados a colores para la visualización en el mapa
const COLORES_ESTADOS: Record<string, string> = {
    'En reparación': '#FF5733', // Rojo anaranjado
    'Esperando repuestos': '#33A8FF', // Azul claro
    'Listo para entrega': '#33FF57', // Verde brillante
    'Diagnóstico': '#FF33A8', // Rosa fuerte
    'Mantenimiento': '#A833FF', // Morado
    'Lavado': '#FF5733', // Rojo anaranjado (igual que en reparación, revisar si es intencional)
    'Sin diagnóstico': '#FFFF33', // Amarillo (corregido a 'Sin diagnóstico' de 'sin diagnostico')
    'Eléctrico': '#33A8FF', // Azul claro (igual que esperando repuestos, revisar si es intencional)
    'Revisión': '#33FFFF', // Cian
    'Hidráulicos': '#FF8333' // Naranja
};

// Tipo para la referencia expuesta del componente MapaTaller
export type MapaTallerRef = {
    agregarVehiculo: (vehiculo: Vehiculo) => void;
    cargarVehiculosDesdeAPI: () => void;
};

const MapaTaller = forwardRef<MapaTallerRef, MapaTallerProps>(({ vehiculosIniciales = [] }, ref) => {
    // Estado para almacenar la lista de vehículos
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>(vehiculosIniciales);
    // Referencia para el elemento DIV que contendrá el mapa de Leaflet
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    // Referencia para la instancia del mapa de Leaflet
    const leafletMapInstanceRef = useRef<L.Map | null>(null);
    // Referencia para almacenar los marcadores de Leaflet por ID de vehículo
    const marcadoresRef = useRef<{ [key: string]: L.Marker }>({});
    // Referencia para el elemento CANVAS donde se dibuja el plano del taller
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Efecto para configurar los iconos por defecto de Leaflet, necesario en entornos como Next.js
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Esta línea es un workaround común para un problema de Webpack/Leaflet con las URLs de iconos.
            // Se usa 'as any' porque la propiedad '_getIconUrl' no está en los tipos oficiales de Leaflet,
            // pero es una forma de sobrescribir el comportamiento por defecto.
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });
        }
    }, []); // Se ejecuta solo una vez al montar el componente

    // Función memoizada para actualizar la posición de un vehículo en la API de backend
    const actualizarPosicionEnAPI = useCallback(async (ri: string, x: number, y: number) => {
        try {
            // El endpoint para PUT vehículos es /api/pedidos según la documentación del usuario
            const response = await fetch('/api/pedidos', { // <-- CORREGIDO EL ENDPOINT A /api/pedidos
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ri, x, y }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al actualizar posición: ${response.status} - ${errorText}`);
            }

            console.log(`Posición actualizada para ${ri}: x=${x}, y=${y}`);
            // No se necesita actualizar el estado local aquí, ya que el dragend lo hace.
            // Si se desea una confirmación desde la DB, se podría llamar a cargarVehiculosDesdeAPI().
        } catch (error) {
            console.error('Error al actualizar posición:', error);
        }
    }, []); // Esta función no depende de props o estado del componente, por lo que se memoiza una vez

    // Función memoizada para cargar vehículos desde la API de backend
    const cargarVehiculosDesdeAPI = useCallback(async () => {
        try {
            console.log('Cargando vehículos desde API...');
            // El endpoint para GET vehículos es /api/pedidos según la documentación del usuario
            const response = await fetch('/api/pedidos'); // <-- CORREGIDO EL ENDPOINT A /api/pedidos
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error al cargar vehículos: ${response.status} - ${errorText}`);
            }

            const vehiculosAPI: VehiculoFromAPI[] = await response.json();
            console.log('Vehículos obtenidos:', vehiculosAPI);

            // Convertir los datos de la API al formato que necesita el mapa
            const vehiculosConvertidos: Vehiculo[] = vehiculosAPI.map(v => ({
                id: v.id,
                tipo: v.tipo || 'Vehículo Municipal', // Usar tipo de la API si existe, sino por defecto
                estado: v.estado || 'Sin diagnóstico', // Usar estado de la API si existe, sino por defecto
                x: v.lng, // lng -> x en tu sistema de coordenadas
                y: v.lat, // lat -> y en tu sistema de coordenadas
                color: COLORES_ESTADOS[v.estado || 'Sin diagnóstico'] || '#FFFF33' // Asignar color basado en el estado
            }));

            setVehiculos(vehiculosConvertidos);
        } catch (error) {
            console.error('Error al cargar vehículos:', error);
        }
    }, []); // Esta función no depende de props o estado del componente, por lo que se memoiza una vez

    // Expone funciones a través de la referencia (ref) del componente
    useImperativeHandle(ref, () => ({
        agregarVehiculo: (nuevo) => {
            // Esto agrega un vehículo al estado local. Para persistencia, se necesitaría una llamada a la API POST.
            setVehiculos((prev) => [...prev, nuevo]);
        },
        cargarVehiculosDesdeAPI
    }));

    // Función para dibujar el plano del taller en un contexto de canvas
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

    // Función para crear un icono SVG personalizado para los marcadores de vehículos
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

    // Función memoizada para agregar o actualizar un marcador de vehículo en el mapa
    const agregarMarcadorVehiculo = useCallback((v: Vehiculo, map: L.Map) => {
        const marker = L.marker([v.y, v.x], { // [lat, lng] de Leaflet se mapea a [y, x] de tu sistema
            icon: crearIconoVehiculo(v.color || COLORES_ESTADOS['Sin diagnóstico']),
            draggable: true
        }).addTo(map);

        // Contenido del popup para mostrar información del vehículo
        marker.bindPopup(`
            <div class="p-2 bg-white rounded">
                <h3 class="font-bold">Vehículo: ${v.id}</h3>
                <p><strong>Tipo:</strong> ${v.tipo || 'N/A'}</p>
                <p><strong>Estado:</strong> ${v.estado || 'N/A'}</p>
                <p><strong>Posición:</strong> X: ${Math.round(v.x)}, Y: ${Math.round(v.y)}</p>
            </div>
        `);

        // Evento 'dragend' para actualizar la posición del vehículo al soltar el marcador
        marker.on('dragend', async (event: L.DragEndEvent) => {
            const { lat: y, lng: x } = event.target.getLatLng();

            // Actualizar estado local inmediatamente para feedback visual
            setVehiculos(prev => prev.map(veh =>
                veh.id === v.id ? { ...veh, x: x, y: y } : veh
            ));

            // Llamar a la función memoizada para actualizar en Google Sheets
            await actualizarPosicionEnAPI(v.id, x, y);
        });

        marcadoresRef.current[v.id] = marker;
    }, [actualizarPosicionEnAPI]); // Dependencia: actualizarPosicionEnAPI (ahora memoizada)

    // Efecto principal para la inicialización y limpieza del mapa de Leaflet
    useEffect(() => {
        // Asegúrate de que este código solo se ejecute en el cliente (navegador)
        if (typeof window === 'undefined') return;

        // Si ya hay una instancia del mapa, no hacer nada (esto previene re-inicializaciones por Fast Refresh)
        if (leafletMapInstanceRef.current) {
            console.log("Mapa ya inicializado, saltando re-inicialización.");
            return;
        }

        const mapDiv = mapContainerRef.current;
        if (!mapDiv) {
            console.error("Div del mapa no encontrado.");
            return;
        }

        // Crear mapa con un sistema de coordenadas simple (no geográfico)
        const map = L.map(mapDiv, {
            crs: L.CRS.Simple,
            minZoom: -2,
            maxZoom: 2,
            zoomControl: true,
            attributionControl: false
        });

        // Definir los límites del mapa para tu plano (de 0,0 a 1000,1000)
        const bounds: L.LatLngBoundsExpression = [[0, 0], [1000, 1000]];

        // Crear un elemento canvas para dibujar el plano del taller
        const canvas = document.createElement('canvas');
        canvas.width = 1000;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d')!; // Obtener el contexto 2D del canvas
        canvasRef.current = canvas; // Guardar la referencia al canvas
        dibujarPlano(ctx); // Dibujar el plano en el canvas

        // Convertir el canvas a una URL de datos y usarlo como capa de imagen en Leaflet
        const dataUrl = canvas.toDataURL();
        L.imageOverlay(dataUrl, bounds).addTo(map);
        map.fitBounds(bounds); // Ajustar la vista del mapa a los límites del plano

        leafletMapInstanceRef.current = map; // Guardar la instancia del mapa

        // Cargar vehículos desde la API al inicializar el mapa
        cargarVehiculosDesdeAPI();

        // Función de limpieza que se ejecuta al desmontar el componente
        return () => {
            if (leafletMapInstanceRef.current) {
                leafletMapInstanceRef.current.remove(); // Eliminar el mapa de Leaflet
                leafletMapInstanceRef.current = null; // Limpiar la referencia
                console.log("Mapa destruido.");
            }
        };
    }, [cargarVehiculosDesdeAPI]); // Se ejecuta una vez al montar y si cargarVehiculosDesdeAPI cambia (es memoizada)

    // Efecto para gestionar la adición, actualización y eliminación de marcadores en el mapa
    useEffect(() => {
        if (!leafletMapInstanceRef.current) return;

        // Limpiar marcadores existentes que ya no estén en la lista de vehículos
        Object.keys(marcadoresRef.current).forEach(id => {
            if (!vehiculos.some(v => v.id === id)) {
                marcadoresRef.current[id].remove();
                delete marcadoresRef.current[id];
            }
        });

        // Actualizar o añadir nuevos marcadores
        vehiculos.forEach(v => {
            if (marcadoresRef.current[v.id]) {
                // Si el marcador ya existe, actualiza su posición y contenido del popup
                marcadoresRef.current[v.id].setLatLng([v.y, v.x]);
                marcadoresRef.current[v.id].setIcon(crearIconoVehiculo(v.color || COLORES_ESTADOS['Sin diagnóstico']));
                marcadoresRef.current[v.id].getPopup()?.setContent(`
                    <div class="p-2 bg-white rounded">
                        <h3 class="font-bold">Vehículo: ${v.id}</h3>
                        <p><strong>Tipo:</strong> ${v.tipo || 'N/A'}</p>
                        <p><strong>Estado:</strong> ${v.estado || 'N/A'}</p>
                        <p><strong>Posición:</strong> X: ${Math.round(v.x)}, Y: ${Math.round(v.y)}</p>
                    </div>
                `);
            } else {
                // Si el marcador no existe, agrégalo al mapa
                agregarMarcadorVehiculo(v, leafletMapInstanceRef.current!);
            }
        });

    }, [vehiculos, agregarMarcadorVehiculo]); // Dependencias: lista de vehículos y la función agregarMarcadorVehiculo (memoizada)

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
            {/* Contenedor del mapa de Leaflet */}
            <div id="mapa-taller" ref={mapContainerRef} className="w-full h-[600px] rounded shadow border" />
        </div>
    );
});

// Asignar un nombre de visualización al componente para facilitar la depuración
MapaTaller.displayName = 'MapaTaller';
export default MapaTaller;
