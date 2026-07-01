export async function initiateCall(cartId: string, agentId: string, brandId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch("/api/call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cartId, agentId, brandId })
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error("Telephony Service Error:", err);
    return { success: false, error: err.message || "Network error" };
  }
}
