
// app/api/pedidos/route.ts
import { NextResponse } from 'next/server';

// Definimos los tipos para los datos que esperamos
interface VehiculoData {
  id: string | number;
  x: number | string;
  y: number | string;
  ri?: string | number;
  [key: string]: unknown; // Para otras propiedades que pueda tener
}

interface ApiResponse {
  data: VehiculoData[];
  [key: string]: unknown;
}

interface VehiculoConCoordenadas {
  id: string | number;
  lat: number;
  lng: number;
}

export async function GET() {
  const baseScriptUrl = 'https://script.google.com/macros/s/AKfycbyQzxHBkU5TdvSlXtnqAdiUPoEgTToDXQlNGcRSeHDrGCfnhcZ5kgBuHOy3QBhz_wkB/exec';

  console.log("GET /vehiculos - Obteniendo datos de vehículos");
  
  try {
    const response = await fetch(`${baseScriptUrl}?action=getData`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error al obtener datos:", errorText);
      return Response.json({ error: "Error al obtener datos", details: errorText }, { status: 500 });
    }

    const data = await response.json() as ApiResponse;
    console.log("Datos obtenidos:", data);

    const vehiculosConCoordenadas: VehiculoConCoordenadas[] = data.data
      .filter((vehiculo: VehiculoData) => vehiculo.x && vehiculo.y)
      .map((vehiculo: VehiculoData) => ({
        id: vehiculo.id,
        lat: typeof vehiculo.y === 'string' ? parseFloat(vehiculo.y) : vehiculo.y,
        lng: typeof vehiculo.x === 'string' ? parseFloat(vehiculo.x) : vehiculo.x,
      }));
  
    return NextResponse.json(vehiculosConCoordenadas);

  } catch (error) {
    console.error("Error en GET /vehiculos:", error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const baseScriptUrl = 'https://script.google.com/macros/s/AKfycbyQzxHBkU5TdvSlXtnqAdiUPoEgTToDXQlNGcRSeHDrGCfnhcZ5kgBuHOy3QBhz_wkB/exec';

  try {
    const body = await request.json() as { ri: string | number; x: number; y: number };
    const { ri, x, y } = body;

    if (!ri || x === undefined || y === undefined) {
      return Response.json({ error: "Faltan datos: se necesita ri, x, y" }, { status: 400 });
    }

    const params = new URLSearchParams({
      action: 'updatePosition',
      ri: String(ri),
      x: String(x),
      y: String(y)
    });

    const scriptUrl = `${baseScriptUrl}?${params.toString()}`;

    const response = await fetch(scriptUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error en actualización:", errorText);
      return Response.json({ error: "Error al actualizar posición", details: errorText }, { status: 500 });
    }

    const data = await response.json();
    return Response.json({ success: true, message: "Coordenadas actualizadas", data });

  } catch (error) {
    console.error("Error en PUT /vehiculos:", error);
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}