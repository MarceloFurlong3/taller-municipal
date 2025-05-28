'use client'

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { type MapaTallerRef } from '../components/Mapataller';

// Cargar MapaTaller solo en el cliente (sin SSR)
const MapaTaller = dynamic(
  () => import('../components/Mapataller'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando mapa...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  const [formData, setFormData] = useState({
    ri: '',
    ubicacion: 'Taller',
    observaciones: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  
  const mapaRef = useRef<MapaTallerRef>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje('');

    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ri: formData.ri,
          ubicacion: formData.ubicacion,
          observaciones: formData.observaciones,
          fechaSolicitada: new Date().toLocaleDateString('es-AR'),
        }),
      });

      if (response.ok) {
        setMensaje('✅ Pedido enviado correctamente');
        setFormData({ ri: '', ubicacion: 'Taller', observaciones: '' });
        
        // Recargar vehículos en el mapa después de agregar uno nuevo
        setTimeout(() => {
          mapaRef.current?.cargarVehiculosDesdeAPI();
        }, 1000);
      } else {
        const error = await response.text();
        setMensaje(`❌ Error: ${error}`);
      }
    } catch (error) {
      setMensaje(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          🚗 Sistema de Gestión de Vehículos Municipales
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              📋 Solicitar Reparación/Repuesto
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="ri" className="block text-sm font-medium text-gray-700 mb-1">
                  ID del Vehículo (RI)
                </label>
                <input
                  type="text"
                  id="ri"
                  name="ri"
                  value={formData.ri}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: v123, c345, Juan"
                />
              </div>

              <div>
                <label htmlFor="ubicacion" className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación
                </label>
                <select
                  id="ubicacion"
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Taller">Taller</option>
                  <option value="Depósito">Depósito</option>
                  <option value="Oficina">Oficina</option>
                  <option value="Exterior">Exterior</option>
                </select>
              </div>

              <div>
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe el problema o repuesto necesario..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '⏳ Enviando...' : '📤 Enviar Solicitud'}
              </button>
            </form>

            {mensaje && (
              <div className={`mt-4 p-3 rounded-md ${
                mensaje.includes('✅') 
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {mensaje}
              </div>
            )}
          </div>

          {/* Información del sistema */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              ℹ️ Información del Sistema
            </h2>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">🔧</span>
                <span>Los pedidos se registran automáticamente en Google Sheets</span>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-green-500">🗺️</span>
                <span>Los vehículos aparecen en el mapa del taller en tiempo real</span>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-purple-500">🚗</span>
                <span>Puedes arrastrar los vehículos en el mapa para cambiar su posición</span>
              </div>
              
              <div className="flex items-start gap-2">
                <span className="text-orange-500">📊</span>
                <span>Todos los cambios se sincronizan automáticamente</span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-medium text-gray-700 mb-2">Estados de vehículos:</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>En reparación</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Esperando repuestos</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Listo para entrega</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Sin diagnóstico</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa del Taller */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            🗺️ Mapa del Taller
          </h2>
          <MapaTaller ref={mapaRef} />
        </div>
      </div>
    </div>
  );
}