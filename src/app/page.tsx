'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CardapioItem } from '@/types';

export default function Home() {
  const [categoriaAtiva, setCategoriaAtiva] = useState<'pratos' | 'carnes' | 'bebidas' | 'sobremesas'>('pratos');
  const [itensCardapio, setItensCardapio] = useState<CardapioItem[]>([]);

  useEffect(() => {
    async function carregarCardapio() {
      const { data } = await supabase.from('cardapio_itens').select('*').eq('ativo', true);
      if (data) setItensCardapio(data);
    }
    carregarCardapio();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C1810] pb-24">
      <header className="bg-white border-b border-[#EADBCE] sticky top-0 z-30 px-4 py-4 shadow-sm text-center">
        <h2 className="font-serif font-black text-xl text-[#8B261E]">CANTINA DO JÃO KIM</h2>
        <span className="text-xs font-bold text-gray-500 block mt-1">Conheça nosso cardápio</span>
      </header>

      {/* Navegação por Categorias */}
      <div className="flex justify-around bg-white/80 backdrop-blur border-b border-[#EADBCE] py-3 sticky top-[73px] z-20">
        {(['pratos', 'carnes', 'bebidas', 'sobremesas'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`text-sm font-bold capitalize px-4 py-2 rounded-lg transition ${
              categoriaAtiva === cat ? 'bg-[#8B261E] text-white shadow' : 'text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Itens */}
      <main className="p-4 max-w-3xl mx-auto space-y-4 mt-2">
        {itensCardapio.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Carregando cardápio...</div>
        ) : (
          itensCardapio
            .filter((i) => i.categoria === categoriaAtiva)
            .map((item) => (
              <div key={item.id} className="bg-white border border-[#EADBCE] rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h3 className="font-bold text-lg text-[#2C1810]">{item.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.descricao}</p>
                    <span className="text-lg font-black text-[#8B261E] mt-3 block">
                      R$ {item.preco.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ))
        )}
      </main>
      
      <div className="fixed bottom-0 w-full bg-[#8B261E] text-white text-center py-3 text-xs font-bold shadow-lg">
        Para fazer um pedido, escaneie o QR Code na sua mesa.
      </div>
    </div>
  );
}
