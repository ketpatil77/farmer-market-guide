// =============================================================================
// OFFER LIFECYCLE VALIDATION SCRIPT
// Copy and paste into browser console on any dashboard page
// This will validate that all functions are wired correctly
// =============================================================================

console.clear();
console.log('%c🔧 OFFER LIFECYCLE VALIDATION', 'color: #2196F3; font-size: 16px; font-weight: bold;');
console.log('%c================================================', 'color: #2196F3;');

const validationResults = [];

function validateComponent(name, test) {
  try {
    const result = test();
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    validationResults.push({ name, passed: result });
    return result;
  } catch (e) {
    console.error(`❌ ERROR - ${name}: ${e.message}`);
    validationResults.push({ name, passed: false, error: e.message });
    return false;
  }
}

console.log('\n%c📋 CHECKING FUNCTION EXISTENCE', 'color: #4CAF50; font-weight: bold;');
console.log('================================================\n');

// Core functions
validateComponent('acceptOffer()', () => typeof acceptOffer === 'function');
validateComponent('rejectOffer()', () => typeof rejectOffer === 'function');
validateComponent('counterOfferPrice()', () => typeof counterOfferPrice === 'function');
validateComponent('finalizeTransaction()', () => typeof finalizeTransaction === 'function');

// Farmer functions
validateComponent('acceptOfferAction()', () => typeof acceptOfferAction === 'function');
validateComponent('rejectOfferAction()', () => typeof rejectOfferAction === 'function');
validateComponent('counterOfferAction()', () => typeof counterOfferAction === 'function');
validateComponent('acceptCounterOffer()', () => typeof acceptCounterOffer === 'function');
validateComponent('bindOfferActions()', () => typeof bindOfferActions === 'function');

// Buyer functions
validateComponent('acceptCounteredOffer()', () => typeof acceptCounteredOffer === 'function');
validateComponent('bindOfferButtons()', () => typeof bindOfferButtons === 'function');

// Data functions
validateComponent('getOffers()', () => typeof getOffers === 'function');
validateComponent('getListings()', () => typeof getListings === 'function');
validateComponent('getNotifications()', () => typeof getNotifications === 'function');
validateComponent('saveOffers()', () => typeof saveOffers === 'function');
validateComponent('saveListings()', () => typeof saveListings === 'function');
validateComponent('saveNotifications()', () => typeof saveNotifications === 'function');

console.log('\n%c🧪 CHECKING STATE TRANSITIONS', 'color: #4CAF50; font-weight: bold;');
console.log('================================================\n');

// Test state transitions
validateComponent('acceptOffer validates status', () => {
  const invalidOffer = { offerId: 'TEST-1', status: 'InvalidStatus' };
  getOffers().push(invalidOffer);
  const result = acceptOffer('TEST-1') === null;
  const offers = getOffers().filter(o => o.offerId !== 'TEST-1');
  saveOffers(offers);
  return result;
});

validateComponent('counterOfferPrice validates status', () => {
  const invalidOffer = { offerId: 'TEST-2', status: 'Accepted', farmerId: 'F1', buyerId: 'B1' };
  getOffers().push(invalidOffer);
  const result = counterOfferPrice('TEST-2', 1000) === null;
  const offers = getOffers().filter(o => o.offerId !== 'TEST-2');
  saveOffers(offers);
  return result;
});

validateComponent('rejectOffer updates status', () => {
  const testOffer = { offerId: 'TEST-3', status: 'OfferPlaced' };
  getOffers().push(testOffer);
  const result = rejectOffer('TEST-3');
  const offers = getOffers().filter(o => o.offerId !== 'TEST-3');
  saveOffers(offers);
  return result && result.status === 'Rejected';
});

console.log('\n%c📊 CHECKING DATA PERSISTENCE', 'color: #4CAF50; font-weight: bold;');
console.log('================================================\n');

validateComponent('Offers persist to localStorage', () => {
  const before = getOffers().length;
  const testOffer = { offerId: 'PERSIST-TEST', status: 'OfferPlaced', offeredPrice: 100 };
  const offers = getOffers();
  offers.push(testOffer);
  saveOffers(offers);
  const after = getOffers().length;
  const found = getOffers().find(o => o.offerId === 'PERSIST-TEST');
  const cleaned = getOffers().filter(o => o.offerId !== 'PERSIST-TEST');
  saveOffers(cleaned);
  return found && after > before;
});

validateComponent('Listings persist to localStorage', () => {
  const before = getListings().length;
  const testListing = { 
    listingId: 'LIST-PERSIST-TEST', 
    status: 'Approved', 
    farmerId: 'FARM-1',
    city: 'Pune'
  };
  const listings = getListings();
  listings.push(testListing);
  saveListings(listings);
  const after = getListings().length;
  const found = getListings().find(l => l.listingId === 'LIST-PERSIST-TEST');
  const cleaned = getListings().filter(l => l.listingId !== 'LIST-PERSIST-TEST');
  saveListings(cleaned);
  return found && after > before;
});

console.log('\n%c🎯 CHECKING VALIDATION RULES', 'color: #4CAF50; font-weight: bold;');
console.log('================================================\n');

validateComponent('acceptOffer requires valid offer', () => {
  const result = acceptOffer('NONEXISTENT-OFFER') === null;
  return result;
});

validateComponent('counterOfferPrice requires positive price', () => {
  const testOffer = { 
    offerId: 'COUNTER-NEGATIVE', 
    status: 'OfferPlaced', 
    farmerId: 'F1',
    buyerId: 'B1'
  };
  getOffers().push(testOffer);
  const result = counterOfferPrice('COUNTER-NEGATIVE', -100) === null;
  const offers = getOffers().filter(o => o.offerId !== 'COUNTER-NEGATIVE');
  saveOffers(offers);
  return result;
});

console.log('\n%c📈 SUMMARY', 'color: #FF9800; font-weight: bold; font-size: 14px;');
console.log('================================================');

const passed = validationResults.filter(r => r.passed).length;
const failed = validationResults.filter(r => !r.passed).length;
const total = validationResults.length;

console.log(`\n✅ PASSED: ${passed}/${total}`);
console.log(`❌ FAILED: ${failed}/${total}`);

if (failed === 0) {
  console.log('\n%c🎉 ALL VALIDATIONS PASSED!', 'color: #4CAF50; font-weight: bold; font-size: 16px;');
  console.log('%cThe offer lifecycle system is fully operational.', 'color: #4CAF50;');
} else {
  console.log(`\n%c⚠️ ${failed} validation(s) failed. Review errors above.`, 'color: #FF6B6B; font-weight: bold;');
  validationResults.filter(r => !r.passed).forEach(r => {
    console.error(`  - ${r.name}${r.error ? ': ' + r.error : ''}`);
  });
}

console.log('\n%c📝 NEXT STEPS', 'color: #2196F3; font-weight: bold;');
console.log('1. Test in farmer-dashboard.html: Create and accept offers');
console.log('2. Test in buyer-dashboard.html: Send and respond to counters');
console.log('3. Test in middleman-dashboard.html: Finalize transactions');
console.log('\n================================================');
