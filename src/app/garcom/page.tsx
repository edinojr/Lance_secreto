'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Check, Wine, ReceiptText, ArrowLeft } from 'lucide-react';

export default function GarcomPage() {
  const [prontos, setProntos] = useState<any[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'entregas' | 'fechamento'>('entregas');
  
  // Controle de Fechamento Dinâmico
  const [mesasAtivas, setMesasAtivas] = useState<number[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);
  const [pedidosMesaSelecionada, setPedidosMesaSelecionada] = useState<any[]>([]);
  const [incluirTaxa, setIncluirTaxa] = useState(true);

  const carregarDados = async () => {
    // 1. Carrega itens prontos para entregar, a caminho, ou bebidas novas
    const { data: itensEntrega } = await supabase
      .from('pedidos_itens')
      .select(`
        id, quantidade, status, destino,
        clientes (id, nome),
        cardapio_itens (nome),
        comandas_mesa (mesas (numero))
      `)
      .or('status.eq.pronto,status.eq.a_caminho,and(destino.eq.bar_garcom,status.eq.aguardando)')
      .order('solicitado_em', { ascending: true });

    if (itensEntrega) setProntos(itensEntrega);

    // 2. Carrega lista de mesas com comandas abertas
    const { data: comandas } = await supabase
      .from('comandas_mesa')
      .select('mesas (numero)')
      .eq('status', 'aberta');
      
    if (comandas) {
      const nums = comandas.map((c: any) => c.mesas?.numero).filter(Boolean);
      setMesasAtivas(Array.from(new Set(nums)).sort((a: any, b: any) => a - b));
    }
  };

  const carregarContaMesa = async (numero: number) => {
    const { data } = await supabase
      .from('pedidos_itens')
      .select(`
        id, quantidade, preco_unitario, pago,
        clientes (id, nome),
        cardapio_itens (nome),
        comandas_mesa!inner(status, mesas!inner(numero))
      `)
      .eq('comandas_mesa.mesas.numero', numero)
      .eq('comandas_mesa.status', 'aberta');

    if (data) {
      setPedidosMesaSelecionada(data);
      setMesaSelecionada(numero);
      setIncluirTaxa(true); // Reseta para sempre incluir por padrão ao abrir
    }
  };

  useEffect(() => {
    carregarDados();

    const canal = supabase
      .channel('garcom-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens' }, () => {
        carregarDados();
        if (mesaSelecionada) carregarContaMesa(mesaSelecionada);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [mesaSelecionada]);

  const alterarStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    if (status === 'servido') {
      updateData.entregue_em = new Date().toISOString();
    }
    await supabase.from('pedidos_itens').update(updateData).eq('id', id);
  };

  // Agrupa pedidos da mesa selecionada
  const clientesMap = pedidosMesaSelecionada.reduce((acc: any, ped) => {
    const nome = ped.clientes?.nome || 'Anônimo';
    if (!acc[nome]) {
      acc[nome] = { nome, itens: [], subtotal: 0, pago: ped.pago };
    }
    acc[nome].itens.push(ped);
    acc[nome].subtotal += ped.quantidade * ped.preco_unitario;
    return acc;
  }, {});

  const clientesArray = Object.values(clientesMap);
  const consumoPendente = clientesArray.filter((c: any) => !c.pago).reduce((acc: number, c: any) => acc + c.subtotal, 0);
  const taxaServicoPendente = incluirTaxa ? consumoPendente * 0.10 : 0;
  const totalMesaPagar = consumoPendente + taxaServicoPendente;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 pb-20">
      <header className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-bold">PAINEL DO GARÇOM</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setAbaAtiva('entregas'); setMesaSelecionada(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              abaAtiva === 'entregas' ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            Servir ({prontos.length})
          </button>
          <button
            onClick={() => setAbaAtiva('fechamento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              abaAtiva === 'fechamento' ? 'bg-[#8B261E] text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" /> Fechamento
          </button>
        </div>
      </header>

      {abaAtiva === 'entregas' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prontos.map((item) => (
            <div key={item.id} className={`border rounded-xl p-4 flex justify-between items-center transition ${item.status === 'a_caminho' ? 'bg-blue-950/30 border-blue-500/40' : 'bg-zinc-900 border-emerald-500/40'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-extrabold text-lg ${item.status === 'a_caminho' ? 'text-blue-400' : 'text-emerald-400'}`}>MESA {item.comandas_mesa?.mesas?.numero || '??'}</span>
                  {item.destino === 'bar_garcom' && item.status !== 'a_caminho' && (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded font-bold">
                      <Wine className="w-3 h-3" /> BEBIDA
                    </span>
                  )}
                  {item.status === 'a_caminho' && (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">
                      NA BANDEJA
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400">Cliente: {item.clientes?.nome}</p>
                <p className="text-base font-semibold text-white mt-1">{item.quantidade}x {item.cardapio_itens?.nome}</p>
              </div>
              {item.status === 'a_caminho' ? (
                <button
                  onClick={() => alterarStatus(item.id, 'servido')}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-lg text-xs flex items-center gap-1 transition shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                >
                  <Check className="w-4 h-4" /> ENTREGUE NA MESA
                </button>
              ) : (
                <button
                  onClick={() => alterarStatus(item.id, 'a_caminho')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-lg text-xs flex items-center gap-1 transition"
                >
                  RETIRAR DO BALCÃO
                </button>
              )}
            </div>
          ))}
          {prontos.length === 0 && (
            <p className="text-zinc-500 text-sm">Nenhum prato ou bebida para entregar no momento.</p>
          )}
        </div>
      ) : (
        /* Fechamento Dinâmico */
        mesaSelecionada === null ? (
          <div>
            <h2 className="text-lg font-bold mb-4 text-zinc-300">Selecione uma mesa para fechar a conta:</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {mesasAtivas.map(num => (
                <button
                  key={num}
                  onClick={() => carregarContaMesa(num)}
                  className="bg-zinc-900 border border-zinc-700 hover:border-[#8B261E] rounded-xl p-4 font-bold text-xl text-center transition"
                >
                  {num}
                </button>
              ))}
              {mesasAtivas.length === 0 && (
                <p className="text-zinc-500 text-sm col-span-3">Não há mesas com consumo ativo no momento.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white text-zinc-900 rounded-xl p-6 shadow-xl font-mono text-xs relative">
            <button 
              onClick={() => setMesaSelecionada(null)}
              className="absolute -top-12 left-0 text-zinc-400 hover:text-white flex items-center gap-1 text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4"/> Voltar
            </button>

            <div className="text-center pb-4 border-b border-zinc-200">
              <h2 className="text-xl font-black">CANTINA DO JÃO KIM</h2>
              <p className="text-zinc-500">FECHAMENTO DA MESA {mesaSelecionada}</p>
            </div>

            <div className="py-4 space-y-4">
              {clientesArray.length === 0 ? (
                <p className="text-center text-zinc-500 py-4">Nenhum consumo registrado.</p>
              ) : (
                clientesArray.map((c: any, i) => (
                  <div key={i} className={`p-3 rounded-lg ${c.pago ? 'bg-zinc-100 opacity-60' : 'bg-zinc-50'}`}>
                    <div className="flex justify-between font-bold text-sm mb-1">
                      <span>{c.nome}</span>
                      {c.pago ? (
                        <span className="text-emerald-700 font-black">PAGO (SAÍDA ANTECIPADA)</span>
                      ) : (
                        <span>R$ {c.subtotal.toFixed(2)}</span>
                      )}
                    </div>
                    {c.itens.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-zinc-500 pl-2">
                        <span>{it.quantidade}x {it.cardapio_itens?.nome}</span>
                        <span>R$ {(it.quantidade * it.preco_unitario).toFixed(2)}</span>
                      </div>
                    ))}
                    {!c.pago && (
                      <div className="flex justify-between text-zinc-400 text-[11px] pl-2 pt-1 border-t border-zinc-200 mt-1">
                        <span>Taxa de Serviço (10%):</span>
                        <span>R$ {(c.subtotal * 0.1).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t-2 border-dashed border-zinc-300 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal Restante:</span>
                <span>R$ {consumoPendente.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500 py-1">
                <label className="flex items-center gap-2 cursor-pointer hover:text-zinc-700 transition">
                  <input 
                    type="checkbox" 
                    checked={incluirTaxa} 
                    onChange={(e) => setIncluirTaxa(e.target.checked)} 
                    className="w-4 h-4 rounded text-[#8B261E] focus:ring-[#8B261E]"
                  />
                  <span>Taxa de Serviço (10%):</span>
                </label>
                <span>R$ {taxaServicoPendente.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-base pt-2 border-t border-zinc-200">
                <span>TOTAL A PAGAR:</span>
                <span className="text-[#8B261E]">R$ {totalMesaPagar.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )
      )}
    </main>
  );
}
