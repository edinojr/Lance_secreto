'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CardapioItem } from '@/types';
import { Settings, Eye, EyeOff } from 'lucide-react';

export default function AdminPage() {
  const [itens, setItens] = useState<CardapioItem[]>([]);

  const carregarCardapio = async () => {
    const { data } = await supabase.from('cardapio_itens').select('*').order('categoria').order('nome');
    if (data) setItens(data);
  };

  useEffect(() => {
    carregarCardapio();
  }, []);

  const alternarDisponibilidade = async (id: string, ativoAtual: boolean) => {
    const { error } = await supabase
      .from('cardapio_itens')
      .update({ ativo: !ativoAtual })
      .eq('id', id);

    if (!error) {
      setItens(itens.map(i => i.id === id ? { ...i, ativo: !ativoAtual } : i));
    }
  };

  const categorias = Array.from(new Set(itens.map(i => i.categoria)));

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 p-4 sm:p-6 pb-20">
      <header className="max-w-3xl mx-auto flex items-center gap-3 border-b border-zinc-200 pb-4 mb-6">
        <Settings className="w-8 h-8 text-[#8B261E]" />
        <div>
          <h1 className="text-2xl font-black text-[#8B261E]">Painel Gerencial</h1>
          <p className="text-sm text-zinc-500">Controle o que aparece no cardápio digital</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto space-y-8">
        {categorias.map(cat => (
          <div key={cat}>
            <h2 className="text-lg font-bold uppercase tracking-wider text-zinc-400 mb-3 border-b border-zinc-200 pb-1">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {itens.filter(i => i.categoria === cat).map(item => (
                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition ${item.ativo ? 'bg-white border-zinc-200 shadow-sm' : 'bg-zinc-100 border-zinc-300 opacity-60'}`}>
                  <div className="flex items-center gap-3 truncate pr-2">
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt="" className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-zinc-200" />
                    )}
                    <span className="font-bold text-sm truncate">{item.nome}</span>
                  </div>
                  
                  <button
                    onClick={() => alternarDisponibilidade(item.id, item.ativo)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                      item.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                    }`}
                  >
                    {item.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {item.ativo ? 'Disponível' : 'Oculto'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
