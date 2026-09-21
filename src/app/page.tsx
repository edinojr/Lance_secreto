import React from 'react';
import { QrCode } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#2C1810] flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm bg-white p-8 rounded-2xl shadow-xl border border-[#EADBCE]">
        <h1 className="text-3xl font-black font-serif text-[#8B261E] mb-6">CANTINA DO JÃO KIM</h1>
        
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-[#8B261E]/10 rounded-2xl">
            <QrCode className="w-20 h-20 text-[#8B261E]" />
          </div>
        </div>

        <h2 className="text-lg font-bold mb-2">Bem-vindo!</h2>
        <p className="text-gray-500 text-sm">
          Para acessar nosso cardápio e fazer seus pedidos, por favor <strong>escaneie o QR Code</strong> que está na sua mesa usando a câmera do seu celular.
        </p>
      </div>
    </main>
  );
}
