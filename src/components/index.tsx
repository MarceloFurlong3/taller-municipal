'use client';

import { useState } from 'react';

interface Props {
  onAgregarVehiculo: (v: { id: string; tipo: string; estado: string }) => void;
}

export default function Formulario({ onAgregarVehiculo }: Props) {
  const [id, setId] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !tipo || !estado) return;

    onAgregarVehiculo({ id, tipo, estado });

    setId('');
    setTipo('');
    setEstado('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
      <div>
        <label className="block font-semibold">ID del vehículo</label>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block font-semibold">Tipo</label>
        <input
          type="text"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block font-semibold">Estado</label>
        <input
          type="text"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Agregar al Mapa
      </button>
    </form>
  );
}