const url = 'https://uyfihyvmveguiujqlvfk.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZmloeXZtdmVndWl1anFsdmZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2ODY0OTcsImV4cCI6MjA5NzI2MjQ5N30.QoR-XMNGZouCbZ_o-64no326kGAA9VFUiKWIQTB7ZkM';

async function bulkAssign() {
  const headers = { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key };

  console.log("Fetching unassigned Shiprocket carts...");
  const srRes = await fetch(url + '/rest/v1/shiprocket_acc_table?agent_id=is.null&select=id,brand_id', { headers });
  const srCarts = await srRes.json();
  
  console.log(`Found ${srCarts.length} unassigned Shiprocket carts.`);
  for (const cart of srCarts) {
    if (!cart.brand_id) continue;
    const res = await fetch(url + '/rest/v1/rpc/assign_cart_round_robin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_brand_id: cart.brand_id,
        p_cart_id: cart.id,
        p_provider_table: 'shiprocket_acc_table'
      })
    });
    if (res.ok) console.log(`Assigned SR Cart: ${cart.id} -> ${await res.text()}`);
    else console.error(`Error assigning SR Cart ${cart.id}:`, await res.text());
  }

  console.log("Fetching unassigned Shopify carts...");
  const shRes = await fetch(url + '/rest/v1/shopify_acc_table?agent_id=is.null&select=id,brand_id', { headers });
  const shCarts = await shRes.json();

  console.log(`Found ${shCarts.length} unassigned Shopify carts.`);
  for (const cart of shCarts) {
    if (!cart.brand_id) continue;
    const res = await fetch(url + '/rest/v1/rpc/assign_cart_round_robin', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_brand_id: cart.brand_id,
        p_cart_id: cart.id,
        p_provider_table: 'shopify_acc_table'
      })
    });
    if (res.ok) console.log(`Assigned Shopify Cart: ${cart.id} -> ${await res.text()}`);
    else console.error(`Error assigning Shopify Cart ${cart.id}:`, await res.text());
  }
  
  console.log("Bulk assignment complete!");
}

bulkAssign();
