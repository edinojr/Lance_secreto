'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CardapioItem } from '@/types';
import { Utensils, Beer, IceCream, Plus, ShoppingBag, Check, Trash2, Minus, Receipt } from 'lucide-react';

export default function MesaClientePage() {
  const params = useParams();
  const mesaNumero = params.numero as string;

  // Estado de Autenticação / Check-in
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [comandaId, setComandaId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  // Estado do Cardápio, Pedido e Customização
  const [categoriaAtiva, setCategoriaAtiva] = useState<'lanches' | 'pratos' | 'porcoes' | 'bebidas' | 'sobremesas'>('lanches');
  const [itensCardapio, setItensCardapio] = useState<CardapioItem[]>([]);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [meusPedidos, setMeusPedidos] = useState<any[]>([]);
  
  // Modal Pedir Conta
  const [mostrarModalConta, setMostrarModalConta] = useState(false);
  const [totaisConta, setTotaisConta] = useState({ individual: 0, mesa: 0 });

  // Máscaras de entrada
  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');

  // Configuração do Item (Modal)
  const [itemSelecionado, setItemSelecionado] = useState<CardapioItem | null>(null);
  const [observacaoItem, setObservacaoItem] = useState('');
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<{ [nome: string]: number }>({});
  const [agora, setAgora] = useState(Date.now());

  // Atualiza relógio (Cronômetro)
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  
  const ADICIONAIS_POR_CATEGORIA: Record<string, { nome: string; preco: number }[]> = {
    lanches: [
      { nome: 'Carne Extra (150g)', preco: 10.00 },
      { nome: 'Queijo Extra', preco: 4.00 },
      { nome: 'Bacon Extra', preco: 6.00 },
      { nome: 'Ovo Frito', preco: 3.00 }
    ],
    bebidas: [
      { nome: 'Gelo e Limão', preco: 0.00 },
      { nome: 'Só Gelo', preco: 0.00 },
      { nome: 'Só Limão', preco: 0.00 }
    ],
    pratos: [
      { nome: 'Ovo Frito Extra', preco: 3.00 },
      { nome: 'Batata Frita Extra', preco: 8.00 },
      { nome: 'Arroz Extra', preco: 5.00 }
    ],
    porcoes: [
      { nome: 'Cheddar Extra', preco: 8.00 },
      { nome: 'Bacon Extra', preco: 6.00 }
    ],
    sobremesas: [
      { nome: 'Calda de Chocolate Extra', preco: 3.00 },
      { nome: 'Calda de Morango Extra', preco: 3.00 }
    ]
  };

  const calcularTotalItem = () => {
    if (!itemSelecionado) return 0;
    const opcionais = ADICIONAIS_POR_CATEGORIA[itemSelecionado.categoria] || [];
    const totalAdicionais = opcionais.reduce((acc, adic) => acc + (adic.preco * (adicionaisSelecionados[adic.nome] || 0)), 0);
    return itemSelecionado.preco + totalAdicionais;
  };

  // Carregar Cardápio
  useEffect(() => {
    async function carregarCardapio() {
      const { data } = await supabase.from('cardapio_itens').select('*').eq('ativo', true);
      if (data) setItensCardapio(data);
    }
    carregarCardapio();

    async function autoCheckin() {
      const local = localStorage.getItem('jao_kim_customer');
      if (local) {
        const u = JSON.parse(local);
        setNome(u.nome);
        setCpf(u.cpf || '');
        setWhatsapp(u.whatsapp || '');
        
        if (u.id) {
          setCliente({ id: u.id, nome: u.nome });
          buscarOuCriarComanda(u.id);
        } else if (u.cpf) {
          const { data: clienteData } = await supabase.from('clientes').upsert({ nome: u.nome, cpf: u.cpf, whatsapp: u.whatsapp }, { onConflict: 'cpf' }).select().single();
          if (clienteData) {
            setCliente({ id: clienteData.id, nome: clienteData.nome });
            localStorage.setItem('jao_kim_customer', JSON.stringify({ id: clienteData.id, nome: u.nome, cpf: u.cpf, whatsapp: u.whatsapp }));
            buscarOuCriarComanda(clienteData.id);
          }
        }
      }
    }
    autoCheckin();
  }, []);

  // Monitorar Meus Pedidos
  useEffect(() => {
    if (!comandaId || !cliente) return;

    const carregarPedidos = async () => {
      const { data } = await supabase
        .from('pedidos_itens')
        .select(`id, quantidade, status, preco_unitario, cardapio_itens(nome), clientes(nome)`)
        .eq('comanda_mesa_id', comandaId)
        .eq('cliente_id', cliente.id)
        .order('solicitado_em', { ascending: false });
      if (data) setMeusPedidos(data);
    };

    carregarPedidos();

    const canal = supabase
      .channel(`cliente-pedidos-${comandaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_itens', filter: `comanda_mesa_id=eq.${comandaId}` }, (payload) => {
        carregarPedidos();
        if (payload.eventType === 'UPDATE' && 'Notification' in window && Notification.permission === 'granted') {
          const novoStatus = payload.new.status;
          if (novoStatus === 'em_preparo') {
            new Notification('O chef está preparando! 🔥', { body: 'Seu pedido já começou a ser feito na cozinha.' });
          } else if (novoStatus === 'pronto') {
            new Notification('Pedido Pronto! 😋', { body: 'Seu pedido está pronto e o garçom já vai levar na mesa.' });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [comandaId, cliente]);

  const buscarOuCriarComanda = async (clienteId: string) => {
    let { data: mesaData } = await supabase.from('mesas').select('id').eq('numero', parseInt(mesaNumero)).maybeSingle();
    if (!mesaData) {
      const { data: novaMesa } = await supabase.from('mesas').insert({ numero: parseInt(mesaNumero) }).select().single();
      mesaData = novaMesa;
    }
    if (mesaData) {
      let { data: comanda } = await supabase.from('comandas_mesa').select('id').eq('mesa_id', mesaData.id).eq('status', 'aberta').maybeSingle();
      if (!comanda) {
        const { data: novaComanda } = await supabase.from('comandas_mesa').insert({ mesa_id: mesaData.id, restaurante_id: 'a0000000-0000-0000-0000-000000000001' }).select().single();
        comanda = novaComanda;
      }
      if (comanda) setComandaId(comanda.id);
    }
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    let clienteData = null;
    const cpfLimpo = cpf.trim();
    
    if (cpfLimpo) {
      const { data } = await supabase.from('clientes').upsert({ nome, cpf: cpfLimpo, whatsapp }, { onConflict: 'cpf' }).select().single();
      clienteData = data;
    } else {
      const { data } = await supabase.from('clientes').insert({ nome, whatsapp }).select().single();
      clienteData = data;
    }

    if (clienteData) {
      setCliente({ id: clienteData.id, nome: clienteData.nome });
      localStorage.setItem('jao_kim_customer', JSON.stringify({ id: clienteData.id, nome, cpf, whatsapp }));
      buscarOuCriarComanda(clienteData.id);
    }
  };

  const abrirConfigurador = (item: CardapioItem) => {
    setItemSelecionado(item);
    setObservacaoItem('');
    setAdicionaisSelecionados({});
  };

  const fecharConfigurador = () => {
    setItemSelecionado(null);
  };

  const confirmarPedido = async () => {
    if (!comandaId || !cliente || !itemSelecionado) return;

    // Constrói a string de observações (Ex: "+ 1x Carne, + 2x Queijo | Obs: Sem cebola")
    const strAdicionais = Object.entries(adicionaisSelecionados)
      .filter(([_, qty]) => qty > 0)
      .map(([nome, qty]) => `+ ${qty}x ${nome}`)
      .join(', ');

    const observacaoFinal = [strAdicionais, observacaoItem ? `Obs: ${observacaoItem}` : ''].filter(Boolean).join(' | ');

    const destinoFinal = itemSelecionado.destino;

    await supabase.from('pedidos_itens').insert({
      comanda_mesa_id: comandaId,
      cliente_id: cliente.id,
      cardapio_item_id: itemSelecionado.id,
      quantidade: 1,
      preco_unitario: calcularTotalItem(), // Preço base + opcionais
      destino: destinoFinal,
      status: 'aguardando',
      observacoes: observacaoFinal || null
    });

    fecharConfigurador();
    setPedidoEnviado(true);
    setTimeout(() => setPedidoEnviado(false), 2500);
  };

  const cancelarPedido = async (id: string) => {
    if (confirm('Tem certeza que deseja cancelar este pedido?')) {
      await supabase.from('pedidos_itens').update({ status: 'cancelado' }).eq('id', id);
    }
  };

  const alterarQuantidadePedido = async (id: string, qtdAtual: number, delta: number) => {
    const novaQtd = qtdAtual + delta;
    if (novaQtd < 1) return;
    await supabase.from('pedidos_itens').update({ quantidade: novaQtd }).eq('id', id);
  };

  const abrirModalConta = async () => {
    if (!comandaId || !cliente) return;
    
    const { data } = await supabase
      .from('pedidos_itens')
      .select('cliente_id, quantidade, preco_unitario, clientes(nome)')
      .eq('comanda_mesa_id', comandaId)
      .eq('pago', false)
      .neq('status', 'cancelado');

    if (data) {
      const consumos: Record<string, { nome: string, total: number }> = {};
      
      data.forEach((item: any) => {
        const cid = item.cliente_id;
        const cNome = item.clientes?.nome || 'Desconhecido';
        const valorItem = item.quantidade * item.preco_unitario;
        
        if (!consumos[cid]) {
          consumos[cid] = { nome: cNome, total: 0 };
        }
        consumos[cid].total += valorItem;
      });

      const arrConsumo = Object.keys(consumos).map(k => ({
        cliente_id: k,
        nome: consumos[k].nome,
        total: consumos[k].total
      }));

      // Garante que o cliente logado esteja na lista, mesmo que o total dele seja 0
      if (!arrConsumo.find(c => c.cliente_id === cliente.id)) {
        arrConsumo.unshift({ cliente_id: cliente.id, nome: cliente.nome, total: 0 });
      }

      setConsumoMesa(arrConsumo);
      setClientesSelecionadosPagamento([cliente.id]); // Começa selecionando apenas a si mesmo
      setMostrarModalConta(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C1810] pb-24 relative">
      {/* Modal de Check-in */}
      {!cliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-[#EADBCE]">
            <h1 className="text-2xl font-serif font-black text-center text-[#8B261E]">CANTINA DO JÃO KIM</h1>
            <p className="text-center font-bold text-xs uppercase bg-[#8B261E]/10 text-[#8B261E] py-1 rounded-full mt-2">
              Check-in • Mesa {mesaNumero}
            </p>

            <form onSubmit={handleCheckin} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Seu Nome *</label>
                <input
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase flex justify-between">
                  <span>CPF</span>
                  <span className="text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  value={cpf}
                  maxLength={14}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase flex justify-between">
                  <span>WhatsApp</span>
                  <span className="text-gray-400 font-normal">Opcional</span>
                </label>
                <input
                  value={whatsapp}
                  maxLength={15}
                  onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                  placeholder="(11) 90000-0000"
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#8B261E] hover:bg-[#721f18] text-white font-bold py-3 rounded-xl shadow-lg transition text-sm uppercase tracking-wide mt-2"
              >
                Acessar Cardápio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configurador de Item (Adicionais e Observações) */}
      {itemSelecionado && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {itemSelecionado.imagem_url && (
              <div className="relative h-48 w-full bg-gray-200 shrink-0">
                <img src={itemSelecionado.imagem_url} alt={itemSelecionado.nome} className="w-full h-full object-cover" />
                <button onClick={fecharConfigurador} className="absolute top-4 right-4 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">X</button>
              </div>
            )}
            
            <div className="p-5 overflow-y-auto no-scrollbar pb-32">
              {!itemSelecionado.imagem_url && (
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-black text-[#8B261E]">{itemSelecionado.nome}</h2>
                  <button onClick={fecharConfigurador} className="text-gray-400 font-bold">X</button>
                </div>
              )}
              {itemSelecionado.imagem_url && <h2 className="text-xl font-black text-[#8B261E] mb-1">{itemSelecionado.nome}</h2>}
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">{itemSelecionado.descricao}</p>

              {/* Lista de Adicionais */}
              {ADICIONAIS_POR_CATEGORIA[itemSelecionado.categoria] && ADICIONAIS_POR_CATEGORIA[itemSelecionado.categoria].length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm bg-gray-100 p-2 rounded-md uppercase tracking-wider text-gray-700 mb-3">Turbine seu pedido</h3>
                  <div className="space-y-3">
                    {ADICIONAIS_POR_CATEGORIA[itemSelecionado.categoria].map((adic) => {
                      const qty = adicionaisSelecionados[adic.nome] || 0;
                      return (
                        <div key={adic.nome} className="flex justify-between items-center border-b border-gray-100 pb-3">
                          <div>
                            <span className="font-semibold text-sm text-gray-800 block">{adic.nome}</span>
                            <span className="text-xs text-[#8B261E] font-bold">{adic.preco > 0 ? `+ R$ ${adic.preco.toFixed(2).replace('.', ',')}` : 'Grátis'}</span>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                            <button 
                              onClick={() => setAdicionaisSelecionados(prev => ({ ...prev, [adic.nome]: Math.max(0, qty - 1) }))}
                              className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm font-black text-gray-600 active:bg-gray-200"
                            >-</button>
                            <span className="font-bold text-sm w-4 text-center">{qty}</span>
                            <button 
                              onClick={() => setAdicionaisSelecionados(prev => ({ ...prev, [adic.nome]: qty + 1 }))}
                              className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm font-black text-[#8B261E] active:bg-gray-200"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Observações de preparo */}
              <div>
                <h3 className="font-bold text-sm bg-gray-100 p-2 rounded-md uppercase tracking-wider text-gray-700 mb-3">Alguma observação?</h3>
                <textarea
                  value={observacaoItem}
                  onChange={(e) => setObservacaoItem(e.target.value)}
                  placeholder="Ex: Tirar a cebola, ponto da carne mal passado, copo com gelo..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#8B261E] outline-none min-h-[80px]"
                />
              </div>
            </div>

            {/* Rodapé fixo do Modal */}
            <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <button
                onClick={confirmarPedido}
                className="w-full bg-[#8B261E] text-white font-black py-4 rounded-xl flex justify-between items-center px-6 active:scale-[0.98] transition-transform"
              >
                <span>Adicionar</span>
                <span>R$ {calcularTotalItem().toFixed(2).replace('.', ',')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Taxa de Serviço */}
      <div className="bg-[#2C1810] text-amber-200 text-center py-2 px-4 text-xs font-bold tracking-widest uppercase">
        Taxa de Serviço de 10% (Opcional)
      </div>

      <header className="bg-white border-b border-[#EADBCE] sticky top-0 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="font-serif font-black text-lg text-[#8B261E]">JÃO KIM</h2>
          <span className="text-[11px] font-bold text-gray-500">Mesa {mesaNumero} {cliente ? `• Olá, ${cliente.nome.split(' ')[0]}` : ''}</span>
        </div>
        {pedidoEnviado && (
          <div className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-bold animate-pulse">
            <Check className="w-3.5 h-3.5" /> Pedido Enviado!
          </div>
        )}
      </header>

      {/* Meus Pedidos / Minha Comanda */}
      {/* Meus Pedidos / Minha Comanda */}
      {cliente && meusPedidos.length > 0 && (
        <div className="bg-[#8B261E] text-white shadow-md flex flex-col">
          <div className="px-4 py-3 flex justify-between items-center border-b border-white/10">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1.5 mb-0.5"><ShoppingBag className="w-4 h-4"/> Minha Comanda</h3>
              <p className="text-[10px] text-white/70 leading-tight">
                Subtotal: R$ {meusPedidos.reduce((acc, p) => acc + (p.quantidade * p.preco_unitario), 0).toFixed(2).replace('.', ',')}<br/>
                <span className="font-bold text-amber-300">+ 10% taxa de serviço (opcional)</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase text-white/70 font-bold tracking-wider block leading-none mb-0.5">Sugestão Total</span>
              <span className="font-black text-lg leading-none text-emerald-300">
                R$ {(meusPedidos.reduce((acc, p) => acc + (p.quantidade * p.preco_unitario), 0) * 1.1).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto px-4 py-3 no-scrollbar">
            {meusPedidos.map(p => {
              const segundosTotais = Math.floor((agora - new Date(p.solicitado_em).getTime()) / 1000);
              const mins = Math.floor(segundosTotais / 60);
              const secs = segundosTotais % 60;
              const tempoFormat = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
              return (
                <div key={p.id} className="flex flex-col gap-2 bg-white/10 p-2 rounded-lg text-xs">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-amber-400">{p.quantidade}x</span> {p.cardapio_itens?.nome}
                      <div className="text-[10px] font-mono text-amber-200 mt-0.5 tracking-wider">⏱ {tempoFormat}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-md font-bold text-[9px] uppercase tracking-wider shrink-0 ${
                      p.status === 'aguardando' ? 'bg-amber-500/20 text-amber-300' :
                      p.status === 'em_preparo' ? 'bg-orange-500/30 text-orange-300' :
                      p.status === 'pronto' ? 'bg-emerald-500/30 text-emerald-300' :
                      p.status === 'a_caminho' ? 'bg-blue-500/30 text-blue-300 animate-pulse' :
                      p.status === 'servido' ? 'bg-zinc-500/30 text-zinc-300' : 'bg-gray-500/30 text-gray-300'
                    }`}>
                      {p.status.replace('_', ' ')}
                    </div>
                  </div>
                  
                  {p.status === 'aguardando' && (
                    <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-1">
                      <div className="flex items-center gap-3 bg-white/5 rounded-md px-2 py-1">
                        <button onClick={() => alterarQuantidadePedido(p.id, p.quantidade, -1)} disabled={p.quantidade <= 1} className="text-white/70 hover:text-white disabled:opacity-30"><Minus className="w-3 h-3"/></button>
                        <span className="font-bold w-3 text-center">{p.quantidade}</span>
                        <button onClick={() => alterarQuantidadePedido(p.id, p.quantidade, 1)} className="text-white/70 hover:text-white"><Plus className="w-3 h-3"/></button>
                      </div>
                      <button onClick={() => cancelarPedido(p.id)} className="flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded-md font-bold text-[10px] uppercase">
                        <Trash2 className="w-3 h-3"/> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t border-white/10 bg-black/20">
            <button 
              onClick={abrirModalConta} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider text-sm shadow-lg transition"
            >
              <Receipt className="w-5 h-5"/> Pedir Conta
            </button>
          </div>
        </div>
      )}

      {/* Modal de Pedir Conta */}
      {mostrarModalConta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#EADBCE] max-h-[90vh] flex flex-col">
            <div className="bg-[#8B261E] py-4 px-6 text-center relative shrink-0">
              <h2 className="text-lg font-black text-white uppercase tracking-widest flex justify-center items-center gap-2">
                <Receipt className="w-5 h-5"/> Fechar Conta
              </h2>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
               <p className="text-xs text-center text-zinc-500 font-bold mb-2">
                 Selecione de quem você deseja pagar a conta:
               </p>

               <div className="space-y-2">
                 {consumoMesa.map(c => {
                    const isEu = c.cliente_id === cliente?.id;
                    const isSelecionado = clientesSelecionadosPagamento.includes(c.cliente_id);
                    return (
                      <label key={c.cliente_id} className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${isSelecionado ? 'bg-emerald-50 border-emerald-500' : 'bg-zinc-50 border-zinc-200'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                            checked={isSelecionado}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setClientesSelecionadosPagamento(prev => [...prev, c.cliente_id]);
                              } else {
                                setClientesSelecionadosPagamento(prev => prev.filter(id => id !== c.cliente_id));
                              }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className={`font-bold text-sm ${isSelecionado ? 'text-emerald-800' : 'text-zinc-700'}`}>
                              {isEu ? 'Meu Consumo' : c.nome}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col">
                           <span className={`font-black ${isSelecionado ? 'text-emerald-700' : 'text-zinc-500'}`}>
                             R$ {c.total.toFixed(2).replace('.', ',')}
                           </span>
                        </div>
                      </label>
                    )
                 })}
               </div>
               
               {(() => {
                  const totalSelecionado = consumoMesa
                    .filter(c => clientesSelecionadosPagamento.includes(c.cliente_id))
                    .reduce((acc, curr) => acc + curr.total, 0);
                  const totalMesaCompleta = consumoMesa.reduce((acc, curr) => acc + curr.total, 0);

                  return (
                    <div className="mt-4 pt-4 border-t border-zinc-200">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-zinc-500">Total Selecionado:</span>
                        <div className="text-right">
                          <span className="text-3xl font-black text-[#8B261E]">R$ {totalSelecionado.toFixed(2).replace('.', ',')}</span>
                          <div className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
                            Com taxa (10%): R$ {(totalSelecionado * 1.1).toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      </div>
                      {clientesSelecionadosPagamento.length !== consumoMesa.length && (
                        <div className="text-[10px] text-right text-zinc-400 font-bold">
                          Ainda faltarão R$ {(totalMesaCompleta - totalSelecionado).toFixed(2).replace('.', ',')} da mesa.
                        </div>
                      )}
                    </div>
                  );
               })()}

              <p className="text-xs text-center text-zinc-500 mt-4 font-bold px-4 leading-relaxed">
                Dirija-se ao caixa ou chame o garçom para efetuar o pagamento.
              </p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setMostrarModalConta(false)}
                  className="w-1/3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-black py-3 rounded-xl uppercase tracking-widest transition text-xs"
                >
                  Voltar
                </button>
                <button
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl uppercase tracking-widest transition text-xs shadow-lg"
                  onClick={() => {
                     alert("Por enquanto, informe ao garçom de quem você está pagando a conta. Em breve o pagamento poderá ser feito por aqui!");
                     setMostrarModalConta(false);
                  }}
                >
                  Pagar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navegação por Categorias */}
      <div className={`flex overflow-x-auto no-scrollbar gap-2 bg-white/80 backdrop-blur border-b border-[#EADBCE] p-3 sticky z-20 ${cliente && meusPedidos.length > 0 ? 'top-[57px]' : 'top-[57px]'}`}>
        {(['lanches', 'pratos', 'porcoes', 'bebidas', 'sobremesas'] as const)
          .filter(cat => {
            if (cat === 'pratos') {
              const d = new Date();
              const tempoAtual = d.getHours() + (d.getMinutes() / 60);
              // Pratos apenas entre 11:00 e 15:30
              return tempoAtual >= 11 && tempoAtual <= 15.5;
            }
            return true;
          })
          .map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaAtiva(cat)}
            className={`whitespace-nowrap text-xs font-bold capitalize px-4 py-2 rounded-full transition ${
              categoriaAtiva === cat ? 'bg-[#8B261E] text-white shadow' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista de Itens */}
      <main className="p-4 space-y-4">
        {itensCardapio
          .filter((i) => i.categoria === categoriaAtiva)
          .map((item) => (
            <div key={item.id} className="bg-white border border-[#EADBCE] rounded-2xl p-4 flex gap-4 items-center shadow-sm">
              {item.imagem_url && (
                <img 
                  src={item.imagem_url} 
                  alt={item.nome} 
                  className="w-24 h-24 object-cover rounded-xl shadow-sm"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-[#2C1810] truncate">{item.nome}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-snug">{item.descricao}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-black text-[#8B261E]">
                    R$ {item.preco.toFixed(2).replace('.', ',')}
                  </span>
                  <button
                    onClick={() => abrirConfigurador(item)}
                    disabled={!cliente}
                    className={`p-2 rounded-lg transition shadow flex items-center justify-center ${
                      !cliente ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#8B261E] hover:bg-[#721f18] text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </main>
    </div>
  );
}
