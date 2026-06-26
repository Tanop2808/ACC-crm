import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });


// Wait, we can test basic domain check logic here:
function checkEmailDomain(email) {
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail.endsWith('@datastraw.in');
}

console.log("--- Testing Auth Logic & Email Constraints ---");
console.log("parthavi.gaikwad@datastraw.in -> valid domain?", checkEmailDomain("parthavi.gaikwad@datastraw.in"));
console.log("operator@recovery-term.com -> valid domain?", checkEmailDomain("operator@recovery-term.com"));
console.log("some.other@gmail.com -> valid domain?", checkEmailDomain("some.other@gmail.com"));

// Helper function to simulate naming token logic
function simulateNamingToken(brandName, providerName, existingTokens) {
  const cleanBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanProvider = providerName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const prefix = `${cleanBrand}_${cleanProvider}_`;

  let maxNum = 0;
  for (const token of existingTokens) {
    if (token.startsWith(prefix)) {
      const parts = token.split('_');
      const numStr = parts[parts.length - 1];
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  const suffix = String(nextNum).padStart(3, '0');
  return `${prefix}${suffix}`;
}

console.log("\n--- Testing Sequential Integration Token Generator ---");
const testCartsStack = ["stack_shopify_001", "stack_shopify_002"];
console.log("Existing tokens for Stack + Shopify:", testCartsStack);
console.log("Next token generated:", simulateNamingToken("Stack", "Shopify", testCartsStack)); // Expected stack_shopify_003

const testCartsHabit = [];
console.log("Existing tokens for Creatures of Habit + Shopify:", testCartsHabit);
console.log("Next token generated:", simulateNamingToken("Creatures of Habit", "Shopify", testCartsHabit)); // Expected creaturesofhabit_shopify_001

const testCartsFreshcon = ["freshcon_shiprocket_001"];
console.log("Existing tokens for Freshcon + Shiprocket:", testCartsFreshcon);
console.log("Next token generated:", simulateNamingToken("Freshcon", "Shiprocket", testCartsFreshcon)); // Expected freshcon_shiprocket_002
