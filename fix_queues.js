const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
  const { data: pedidos, error } = await supabase
    .from('pedidos_itens')
    .select('id, cardapio_itens(categoria)');
  
  if (error) {
    console.error(error);
    return;
  }

  let updated = 0;
  for (const p of pedidos) {
    const categoria = p.cardapio_itens?.categoria;
    if (categoria === 'sobremesas') {
      await supabase.from('pedidos_itens').update({ destino: 'bar_garcom' }).eq('id', p.id);
      updated++;
    } else if (categoria === 'bebidas') {
      await supabase.from('pedidos_itens').update({ destino: 'cozinha' }).eq('id', p.id);
      updated++;
    }
  }
  console.log(`Updated ${updated} orders in the wrong queues.`);
}

fix();
