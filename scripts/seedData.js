// ==================== COMPREHENSIVE SEED DATA ====================
// Maharashtra Agricultural Marketplace - Realistic Demo Data
// All prices in INR per quintal (100 kg) unless unit is 'kg'
// Covers: Alphonso Mango, Wheat, Onion, Soybean, Pomegranate,
//         Cotton, Sugarcane, Jowar
// Cities: Pune, Nashik, Nagpur, Aurangabad, Kolhapur, Solapur, Amravati, Latur

(function () {

    // Price lookup table: INR per quintal (realistic Maharashtra APMC rates 2025-26)
    const BASE_PRICES = {
        'Alphonso Mango': 8000,
        'Mango': 8000,
        'Wheat': 2300,
        'Onion': 1800,
        'Soybean': 4600,
        'Pomegranate': 12000,
        'Cotton': 6500,
        'Sugarcane': 380,  // per quintal
        'Jowar': 2800,
        'Tomato': 2200,
        'Potato': 1400,
        'Grapes': 7000,
        'Turmeric': 9500,
        'Gram': 5200,
        'Tur': 7200,
        'Rice': 3200,
        'Bajra': 2400
    };

    // --- AI Price Recommendation Helper (exposed globally) ---
    // Calculates suggestion from seeded approved listings for the given crop/city
    function getAIPriceRecommendation(crop, city) {
        try {
            const listings = typeof getListings === 'function' ? getListings() : [];
            const relevant = listings.filter(l =>
                (l.name === crop || l.commodity === crop) &&
                l.status === 'Approved' &&
                (!city || l.city === city)
            );
            if (!relevant.length) {
                // Fall back to general crop average
                const any = listings.filter(l => l.name === crop || l.commodity === crop);
                if (!any.length) return BASE_PRICES[crop] || 5000;
                const avg = any.reduce((s, l) => s + (Number(l.price) || 0), 0) / any.length;
                return Math.round(avg);
            }
            const avg = relevant.reduce((s, l) => s + (Number(l.price) || 0), 0) / relevant.length;
            return Math.round(avg);
        } catch (e) {
            return BASE_PRICES[crop] || 5000;
        }
    }
    window.getAIPriceRecommendation = getAIPriceRecommendation;

    // Normalize offer object for storage
    function _normalizeOfferSeed(o) {
        const base = {
            offerId: o.offerId || `OFF-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            listingId: o.listingId || '',
            buyerId: o.buyerId || '',
            farmerId: o.farmerId || '',
            offeredPrice: Number(o.offeredPrice) || 0,
            quantity: Number(o.quantity) || 0,
            status: o.status || 'OfferPlaced',
            createdAt: o.createdAt || o.timestamp || new Date().toISOString(),
            timestamp: o.timestamp || o.createdAt || new Date().toISOString()
        };
        if (o.counteredPrice) base.counteredPrice = Number(o.counteredPrice);
        if (o.counteredQty) base.counteredQty = Number(o.counteredQty);
        if (o.acceptedPrice) base.acceptedPrice = Number(o.acceptedPrice);
        if (o.acceptedQty) base.acceptedQty = Number(o.acceptedQty);
        if (o.finalRate) base.finalRate = Number(o.finalRate);
        if (o.finalQty) base.finalQty = Number(o.finalQty);
        if (o.finalizedAt) base.finalizedAt = o.finalizedAt;
        if (o.transactionId) base.transactionId = o.transactionId;
        if (o.middlemanId) base.middlemanId = o.middlemanId;
        if (o.cropName) base.cropName = o.cropName;
        if (o.city) base.city = o.city;
        return base;
    }

    // ===================== MAIN SEED FUNCTION =====================
    window.seedComprehensiveDemoData = function (opts = {}) {
        if (typeof resetAppDataForUser !== 'function' || typeof saveListings !== 'function') {
            console.error('[SeedData] Required functions not available yet');
            return { error: 'Required functions not loaded' };
        }

        // Reset fresh
        const resetResult = resetAppDataForUser();
        const farmerId = resetResult.farmerId || ensureRole('farmer');
        const buyerId = resetResult.buyerId || ensureRole('buyer');
        const middlemanId = resetResult.middlemanId || ensureRole('middleman');

        // Secondary users for richer ecosystem
        const farmer2Id = 'FARM-0002';
        const buyer2Id = 'BUY-0002';
        const farmer3Id = 'FARM-0003';
        const buyer3Id = 'BUY-0003';
        const middleman2Id = 'MID-0002';

        // Register secondary farmer/buyer profiles
        const farmers = readJson ? readJson(STORAGE_KEYS.farmers, []) : [];
        [[farmer2Id, 'Ramesh Patil', 'Nashik'], [farmer3Id, 'Suresh Deshmukh', 'Amravati']].forEach(([id, name, city]) => {
            if (!farmers.find(f => f.farmerId === id)) {
                farmers.push({ farmerId: id, name, city, createdAt: new Date().toISOString() });
            }
        });
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.farmers, farmers);

        const buyers = readJson ? readJson(STORAGE_KEYS.buyers, []) : [];
        [[buyer2Id, 'Vijay Merchants Pvt Ltd', 'Pune'], [buyer3Id, 'Sai Foods & Exports', 'Nagpur']].forEach(([id, name, city]) => {
            if (!buyers.find(b => b.buyerId === id)) {
                buyers.push({ buyerId: id, name, city, createdAt: new Date().toISOString() });
            }
        });
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.buyers, buyers);

        const now = Date.now();
        const D = (days) => new Date(now - days * 86400000).toISOString();
        const H = (hours) => new Date(now - hours * 3600000).toISOString();

        // ==================== 15+ ACTIVE LISTINGS ====================
        // Price is per quintal (₹/quintal). The UI may display per kg in some views (divide by 100).
        const rawListings = [
            // ---- APPROVED (visible to buyers) ----
            {
                listingId: 'LST-2001', name: 'Alphonso Mango', commodity: 'Alphonso Mango',
                category: 'Fruits', city: 'Nashik', quantity: 500, price: 8000,
                unit: 'quintal', quality: 'Excellent', status: 'Approved',
                farmerId, approvedPrice: 8000,
                description: 'Premium Grade A Alphonso Mango, Geographical Indication certified. Sweet aroma, vibrant yellow colour. Harvested 2 days ago. Ideal for premium retail and export.',
                createdAt: D(6), reviewedAt: D(5), approvedAt: D(5), reviewedBy: middlemanId, views: 142
            },
            {
                listingId: 'LST-2002', name: 'Wheat', commodity: 'Wheat',
                category: 'Food Grains', city: 'Pune', quantity: 1500, price: 2300,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId: farmer2Id, approvedPrice: 2300,
                description: 'HD-2967 variety. Moisture 11.5%. Clean, well-graded wheat suitable for flour mills. Stored in dry warehouse.',
                createdAt: D(8), reviewedAt: D(7), approvedAt: D(7), reviewedBy: middlemanId, views: 87
            },
            {
                listingId: 'LST-2003', name: 'Onion', commodity: 'Onion',
                category: 'Vegetables', city: 'Nashik', quantity: 2000, price: 1800,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId: farmer2Id, approvedPrice: 1800,
                description: 'Red Nasik onion. Diameter 40-60mm. Low moisture, suitable for export. Storage life of 90 days.',
                createdAt: D(4), reviewedAt: D(3), approvedAt: D(3), reviewedBy: middlemanId, views: 213
            },
            {
                listingId: 'LST-2004', name: 'Soybean', commodity: 'Soybean',
                category: 'Cash Crops', city: 'Latur', quantity: 800, price: 4600,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId, approvedPrice: 4600,
                description: 'JS-335 variety. Protein content 42%. Cleaned and graded. Suitable for crushing and edible use.',
                createdAt: D(5), reviewedAt: D(4), approvedAt: D(4), reviewedBy: middlemanId, views: 65
            },
            {
                listingId: 'LST-2005', name: 'Pomegranate', commodity: 'Pomegranate',
                category: 'Fruits', city: 'Solapur', quantity: 300, price: 12000,
                unit: 'quintal', quality: 'Excellent', status: 'Approved',
                farmerId: farmer3Id, approvedPrice: 12000,
                description: 'Bhagwa variety pomegranate from Solapur belt. Sweet-sour taste, deep red arils. Export quality with SGS certificate.',
                createdAt: D(3), reviewedAt: D(2), approvedAt: D(2), reviewedBy: middlemanId, views: 98
            },
            {
                listingId: 'LST-2006', name: 'Cotton', commodity: 'Cotton',
                category: 'Cash Crops', city: 'Nagpur', quantity: 600, price: 6500,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId: farmer3Id, approvedPrice: 6500,
                description: 'Bt Cotton. Upper half mean length 28mm+. Ready for ginning. CCI approved quality.',
                createdAt: D(7), reviewedAt: D(6), approvedAt: D(6), reviewedBy: middlemanId, views: 54
            },
            {
                listingId: 'LST-2007', name: 'Sugarcane', commodity: 'Sugarcane',
                category: 'Cash Crops', city: 'Kolhapur', quantity: 5000, price: 380,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId, approvedPrice: 380,
                description: 'Co-86032 variety. Sucrose content 11.5%. Freshly harvested. Direct supply to Datta Shetkari SSK.',
                createdAt: D(2), reviewedAt: D(1), approvedAt: D(1), reviewedBy: middlemanId, views: 33
            },
            {
                listingId: 'LST-2008', name: 'Jowar', commodity: 'Jowar',
                category: 'Food Grains', city: 'Solapur', quantity: 1200, price: 2800,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId: farmer2Id, approvedPrice: 2800,
                description: 'Rabi Jowar (M-35-1). Bold grain, clean. Suitable for consumer packs and flour mills.',
                createdAt: D(9), reviewedAt: D(8), approvedAt: D(8), reviewedBy: middlemanId, views: 47
            },
            {
                listingId: 'LST-2009', name: 'Tomato', commodity: 'Tomato',
                category: 'Vegetables', city: 'Aurangabad', quantity: 400, price: 2200,
                unit: 'quintal', quality: 'Good', status: 'Approved',
                farmerId, approvedPrice: 2200,
                description: 'Hybrid Tomato. Grade A+. Uniform size 60-70g. Suitable for processing and fresh market.',
                createdAt: D(1), reviewedAt: H(18), approvedAt: H(18), reviewedBy: middlemanId, views: 29
            },
            {
                listingId: 'LST-2010', name: 'Grapes', commodity: 'Grapes',
                category: 'Fruits', city: 'Nashik', quantity: 200, price: 7000,
                unit: 'quintal', quality: 'Excellent', status: 'Approved',
                farmerId: farmer3Id, approvedPrice: 7000,
                description: 'Thompson Seedless. Berry weight 4g+. European export quality with EurepGAP certification.',
                createdAt: D(4), reviewedAt: D(3), approvedAt: D(3), reviewedBy: middlemanId, views: 76
            },

            // ---- PENDING (waiting middleman approval) ----
            {
                listingId: 'LST-2011', name: 'Alphonso Mango', commodity: 'Alphonso Mango',
                category: 'Fruits', city: 'Ratnagiri', quantity: 300, price: 8500,
                unit: 'quintal', quality: 'Excellent', status: 'Pending',
                farmerId: farmer3Id,
                description: 'GI-tagged Hapus from Ratnagiri. Naturally ripened, no carbide used. 60-70% recovery.',
                createdAt: H(3), views: 0
            },
            {
                listingId: 'LST-2012', name: 'Onion', commodity: 'Onion',
                category: 'Vegetables', city: 'Pune', quantity: 800, price: 1900,
                unit: 'quintal', quality: 'Good', status: 'Pending',
                farmerId,
                description: 'Yellow onion - Agripada variety. Medium size. Good shelf life.',
                createdAt: H(6), views: 0
            },
            {
                listingId: 'LST-2013', name: 'Soybean', commodity: 'Soybean',
                category: 'Cash Crops', city: 'Amravati', quantity: 1000, price: 4700,
                unit: 'quintal', quality: 'Good', status: 'Pending',
                farmerId: farmer2Id,
                description: 'MACS-1281 variety. High protein. Clean; no foreign matter.',
                createdAt: H(2), views: 0
            },
            {
                listingId: 'LST-2014', name: 'Cotton', commodity: 'Cotton',
                category: 'Cash Crops', city: 'Amravati', quantity: 400, price: 6600,
                unit: 'quintal', quality: 'Good', status: 'Pending',
                farmerId: farmer3Id,
                description: 'Fully developed bolls. Manual picking. Low trash content.',
                createdAt: H(1), views: 0
            },

            // ---- PURCHASE REQUESTED (offer accepted, awaiting finalization) ----
            {
                listingId: 'LST-2015', name: 'Pomegranate', commodity: 'Pomegranate',
                category: 'Fruits', city: 'Solapur', quantity: 150, price: 12500,
                unit: 'quintal', quality: 'Excellent', status: 'PurchaseRequested',
                farmerId, approvedPrice: 11800,
                description: 'Bhagwa variety. Export documentation ready. SGS certified.',
                createdAt: D(5), reviewedAt: D(4), approvedAt: D(4), approvedPrice: 11800, views: 61
            },
            {
                listingId: 'LST-2016', name: 'Wheat', commodity: 'Wheat',
                category: 'Food Grains', city: 'Nagpur', quantity: 1000, price: 2350,
                unit: 'quintal', quality: 'Good', status: 'PurchaseRequested',
                farmerId: farmer2Id, approvedPrice: 2280,
                description: 'Lok-1 variety. Suitable for chapati flour. Average grain weight 42g/1000 seeds.',
                createdAt: D(6), reviewedAt: D(5), approvedAt: D(5), approvedPrice: 2280, views: 55
            }
        ];

        const demoListings = rawListings.map((l, idx) => {
            const normalized = typeof normalizeListing === 'function'
                ? normalizeListing({
                    ...l,
                    id: now + idx,
                    createdAt: l.createdAt || D(idx),
                    approvedPrice: l.approvedPrice || (l.status === 'Approved' || l.status === 'PurchaseRequested' ? l.price : 0),
                    verifiedQuality: l.quality || 'Good'
                }, idx, { farmerId: l.farmerId || farmerId })
                : l;
            return normalized;
        }).filter(Boolean);
        saveListings(demoListings);

        // ==================== 8+ PENDING/ACTIVE OFFERS ====================
        const rawOffers = [
            // Active offers on approved listings
            {
                offerId: 'OFF-2001', listingId: 'LST-2001', buyerId, farmerId,
                offeredPrice: 7500, quantity: 500, status: 'OfferPlaced',
                cropName: 'Alphonso Mango', city: 'Nashik',
                createdAt: H(4), timestamp: H(4)
            },
            {
                offerId: 'OFF-2002', listingId: 'LST-2003', buyerId: buyer2Id, farmerId: farmer2Id,
                offeredPrice: 1600, quantity: 1000, status: 'OfferPlaced',
                cropName: 'Onion', city: 'Nashik',
                createdAt: H(2), timestamp: H(2)
            },
            {
                offerId: 'OFF-2003', listingId: 'LST-2004', buyerId: buyer3Id, farmerId,
                offeredPrice: 4400, quantity: 400, status: 'Countered',
                counteredPrice: 4550, counteredQty: 400, counteredAt: H(3),
                cropName: 'Soybean', city: 'Latur',
                createdAt: H(8), timestamp: H(8)
            },
            {
                offerId: 'OFF-2004', listingId: 'LST-2002', buyerId, farmerId: farmer2Id,
                offeredPrice: 2200, quantity: 800, status: 'Countered',
                counteredPrice: 2280, counteredQty: 800, counteredAt: H(5),
                cropName: 'Wheat', city: 'Pune',
                createdAt: H(10), timestamp: H(10)
            },
            {
                offerId: 'OFF-2005', listingId: 'LST-2005', buyerId: buyer2Id, farmerId: farmer3Id,
                offeredPrice: 11500, quantity: 200, status: 'OfferPlaced',
                cropName: 'Pomegranate', city: 'Solapur',
                createdAt: H(1), timestamp: H(1)
            },
            {
                offerId: 'OFF-2006', listingId: 'LST-2006', buyerId: buyer3Id, farmerId: farmer3Id,
                offeredPrice: 6300, quantity: 300, status: 'OfferPlaced',
                cropName: 'Cotton', city: 'Nagpur',
                createdAt: H(6), timestamp: H(6)
            },
            {
                offerId: 'OFF-2007', listingId: 'LST-2007', buyerId, farmerId,
                offeredPrice: 370, quantity: 3000, status: 'OfferPlaced',
                cropName: 'Sugarcane', city: 'Kolhapur',
                createdAt: H(3), timestamp: H(3)
            },
            {
                offerId: 'OFF-2008', listingId: 'LST-2008', buyerId: buyer2Id, farmerId: farmer2Id,
                offeredPrice: 2650, quantity: 600, status: 'OfferPlaced',
                cropName: 'Jowar', city: 'Solapur',
                createdAt: H(7), timestamp: H(7)
            },
            // Finalized offers (linked to transactions below)
            {
                offerId: 'OFF-2009', listingId: 'LST-2015', buyerId, farmerId,
                offeredPrice: 11500, quantity: 150, status: 'Accepted',
                acceptedPrice: 11800, acceptedQty: 150, acceptedAt: D(2),
                cropName: 'Pomegranate', city: 'Solapur',
                createdAt: D(3), timestamp: D(3)
            },
            {
                offerId: 'OFF-2010', listingId: 'LST-2016', buyerId: buyer3Id, farmerId: farmer2Id,
                offeredPrice: 2200, quantity: 1000, status: 'Accepted',
                acceptedPrice: 2280, acceptedQty: 1000, acceptedAt: D(3),
                cropName: 'Wheat', city: 'Nagpur',
                createdAt: D(4), timestamp: D(4)
            },
            // Historical finalized offers
            {
                offerId: 'OFF-2011', listingId: 'LST-TXN-3', buyerId: buyer2Id, farmerId: farmer2Id,
                offeredPrice: 1700, quantity: 800, status: 'Finalized',
                acceptedPrice: 1750, acceptedQty: 800,
                finalRate: 1750, finalQty: 800,
                transactionId: 'TXN-2003',
                cropName: 'Onion', city: 'Nashik',
                createdAt: D(15), timestamp: D(15), finalizedAt: D(14)
            },
            {
                offerId: 'OFF-2012', listingId: 'LST-TXN-4', buyerId: buyer3Id, farmerId: farmer3Id,
                offeredPrice: 5800, quantity: 400, status: 'Finalized',
                acceptedPrice: 5900, acceptedQty: 400,
                finalRate: 5900, finalQty: 400,
                transactionId: 'TXN-2004',
                cropName: 'Cotton', city: 'Amravati',
                createdAt: D(20), timestamp: D(20), finalizedAt: D(19)
            },
            {
                offerId: 'OFF-2013', listingId: 'LST-TXN-5', buyerId, farmerId: farmer2Id,
                offeredPrice: 4200, quantity: 600, status: 'Finalized',
                acceptedPrice: 4350, acceptedQty: 600,
                finalRate: 4350, finalQty: 600,
                transactionId: 'TXN-2005',
                cropName: 'Soybean', city: 'Latur',
                createdAt: D(25), timestamp: D(25), finalizedAt: D(24)
            },
            // Rejected offer
            {
                offerId: 'OFF-2014', listingId: 'LST-2001', buyerId: buyer3Id, farmerId,
                offeredPrice: 6000, quantity: 200, status: 'Rejected',
                cropName: 'Alphonso Mango', city: 'Nashik',
                createdAt: D(2), timestamp: D(2), rejectedAt: D(2)
            },
        ];

        const offersList = rawOffers.map(o => _normalizeOfferSeed(o));
        saveOffers(offersList);

        // ==================== 5+ COMPLETED TRANSACTIONS ====================
        // COMMISSION: 5% total = 3% platform + 2% facilitator
        const computeTxnAmounts = (qty, rate) => {
            const total = qty * rate;
            const commissionAmt = total * 0.05;
            const farmerPayout = total - commissionAmt;
            const platformFee = total * 0.03;
            const facilitatorFee = total * 0.02;
            return { total, commissionAmt, farmerPayout, platformFee, facilitatorFee };
        };

        const txn1 = computeTxnAmounts(300, 7800); // Alphonso Mango - the demo flow
        const txn2 = computeTxnAmounts(800, 1750); // Onion
        const txn3 = computeTxnAmounts(400, 5900); // Cotton
        const txn4 = computeTxnAmounts(600, 4350); // Soybean
        const txn5 = computeTxnAmounts(1200, 2300); // Wheat
        const txn6 = computeTxnAmounts(200, 11200); // Pomegranate
        const txn7 = computeTxnAmounts(500, 2800);  // Jowar

        const rawTransactions = [
            // TXN-2001: the key demo flow - Alphonso Mango 500kg @ ₹7800
            {
                transactionId: 'TXN-2001', offerId: 'OFF-DEMO', listingId: 'LST-DEMO-MANGO',
                farmerId, buyerId: buyer2Id, middlemanId,
                cropName: 'Alphonso Mango', city: 'Nashik',
                quantity: 300, finalRate: 7800, finalPrice: 7800,
                totalAmount: txn1.total,
                commissionRate: 0.05, commissionAmount: txn1.commissionAmt,
                platformFee: txn1.platformFee, facilitatorFee: txn1.facilitatorFee,
                farmerPayout: txn1.farmerPayout,
                status: 'Finalized', timestamp: D(10)
            },
            // TXN-2002: Onion Nashik
            {
                transactionId: 'TXN-2002', offerId: 'OFF-2011', listingId: 'LST-TXN-3',
                farmerId: farmer2Id, buyerId: buyer2Id, middlemanId,
                cropName: 'Onion', city: 'Nashik',
                quantity: 800, finalRate: 1750, finalPrice: 1750,
                totalAmount: txn2.total,
                commissionRate: 0.05, commissionAmount: txn2.commissionAmt,
                platformFee: txn2.platformFee, facilitatorFee: txn2.facilitatorFee,
                farmerPayout: txn2.farmerPayout,
                status: 'Finalized', timestamp: D(14)
            },
            // TXN-2003: Cotton Amravati
            {
                transactionId: 'TXN-2003', offerId: 'OFF-2012', listingId: 'LST-TXN-4',
                farmerId: farmer3Id, buyerId: buyer3Id, middlemanId,
                cropName: 'Cotton', city: 'Amravati',
                quantity: 400, finalRate: 5900, finalPrice: 5900,
                totalAmount: txn3.total,
                commissionRate: 0.05, commissionAmount: txn3.commissionAmt,
                platformFee: txn3.platformFee, facilitatorFee: txn3.facilitatorFee,
                farmerPayout: txn3.farmerPayout,
                status: 'Finalized', timestamp: D(19)
            },
            // TXN-2004: Soybean Latur
            {
                transactionId: 'TXN-2004', offerId: 'OFF-2013', listingId: 'LST-TXN-5',
                farmerId: farmer2Id, buyerId, middlemanId: middleman2Id,
                cropName: 'Soybean', city: 'Latur',
                quantity: 600, finalRate: 4350, finalPrice: 4350,
                totalAmount: txn4.total,
                commissionRate: 0.05, commissionAmount: txn4.commissionAmt,
                platformFee: txn4.platformFee, facilitatorFee: txn4.facilitatorFee,
                farmerPayout: txn4.farmerPayout,
                status: 'Finalized', timestamp: D(24)
            },
            // TXN-2005: Wheat Nagpur – large volume
            {
                transactionId: 'TXN-2005', offerId: 'OFF-TXN-5', listingId: 'LST-TXN-6',
                farmerId: farmer3Id, buyerId: buyer2Id, middlemanId,
                cropName: 'Wheat', city: 'Nagpur',
                quantity: 1200, finalRate: 2300, finalPrice: 2300,
                totalAmount: txn5.total,
                commissionRate: 0.05, commissionAmount: txn5.commissionAmt,
                platformFee: txn5.platformFee, facilitatorFee: txn5.facilitatorFee,
                farmerPayout: txn5.farmerPayout,
                status: 'Finalized', timestamp: D(5)
            },
            // TXN-2006: Pomegranate Solapur – premium crop
            {
                transactionId: 'TXN-2006', offerId: 'OFF-TXN-6', listingId: 'LST-TXN-7',
                farmerId, buyerId: buyer3Id, middlemanId: middleman2Id,
                cropName: 'Pomegranate', city: 'Solapur',
                quantity: 200, finalRate: 11200, finalPrice: 11200,
                totalAmount: txn6.total,
                commissionRate: 0.05, commissionAmount: txn6.commissionAmt,
                platformFee: txn6.platformFee, facilitatorFee: txn6.facilitatorFee,
                farmerPayout: txn6.farmerPayout,
                status: 'Finalized', timestamp: D(3)
            },
            // TXN-2007: Jowar Solapur
            {
                transactionId: 'TXN-2007', offerId: 'OFF-TXN-7', listingId: 'LST-TXN-8',
                farmerId: farmer2Id, buyerId, middlemanId,
                cropName: 'Jowar', city: 'Solapur',
                quantity: 500, finalRate: 2800, finalPrice: 2800,
                totalAmount: txn7.total,
                commissionRate: 0.05, commissionAmount: txn7.commissionAmt,
                platformFee: txn7.platformFee, facilitatorFee: txn7.facilitatorFee,
                farmerPayout: txn7.farmerPayout,
                status: 'Finalized', timestamp: D(8)
            }
        ];
        saveTransactions(rawTransactions);

        // Mark relevant listings as Sold (for past transactions)
        // We add ghost listings for old transactions so history renders correctly
        const currentListings = getListings();
        const ghostListings = [
            {
                listingId: 'LST-TXN-3', name: 'Onion', commodity: 'Onion', category: 'Vegetables',
                city: 'Nashik', quantity: 800, price: 1800, approvedPrice: 1750, unit: 'quintal',
                quality: 'Good', status: 'Sold', farmerId: farmer2Id,
                soldAt: D(14), soldQty: 800, soldRate: 1750, soldTotal: txn2.total,
                buyerId: buyer2Id, createdAt: D(16), id: now + 500
            },
            {
                listingId: 'LST-TXN-4', name: 'Cotton', commodity: 'Cotton', category: 'Cash Crops',
                city: 'Amravati', quantity: 400, price: 6200, approvedPrice: 5900, unit: 'quintal',
                quality: 'Good', status: 'Sold', farmerId: farmer3Id,
                soldAt: D(19), soldQty: 400, soldRate: 5900, soldTotal: txn3.total,
                buyerId: buyer3Id, createdAt: D(21), id: now + 501
            },
            {
                listingId: 'LST-TXN-5', name: 'Soybean', commodity: 'Soybean', category: 'Cash Crops',
                city: 'Latur', quantity: 600, price: 4500, approvedPrice: 4350, unit: 'quintal',
                quality: 'Good', status: 'Sold', farmerId: farmer2Id,
                soldAt: D(24), soldQty: 600, soldRate: 4350, soldTotal: txn4.total,
                buyerId, createdAt: D(26), id: now + 502
            },
            {
                listingId: 'LST-TXN-6', name: 'Wheat', commodity: 'Wheat', category: 'Food Grains',
                city: 'Nagpur', quantity: 1200, price: 2400, approvedPrice: 2300, unit: 'quintal',
                quality: 'Good', status: 'Sold', farmerId: farmer3Id,
                soldAt: D(5), soldQty: 1200, soldRate: 2300, soldTotal: txn5.total,
                buyerId: buyer2Id, createdAt: D(7), id: now + 503
            },
            {
                listingId: 'LST-TXN-7', name: 'Pomegranate', commodity: 'Pomegranate', category: 'Fruits',
                city: 'Solapur', quantity: 200, price: 12000, approvedPrice: 11200, unit: 'quintal',
                quality: 'Excellent', status: 'Sold', farmerId,
                soldAt: D(3), soldQty: 200, soldRate: 11200, soldTotal: txn6.total,
                buyerId: buyer3Id, createdAt: D(4), id: now + 504
            },
            {
                listingId: 'LST-TXN-8', name: 'Jowar', commodity: 'Jowar', category: 'Food Grains',
                city: 'Solapur', quantity: 500, price: 2900, approvedPrice: 2800, unit: 'quintal',
                quality: 'Good', status: 'Sold', farmerId: farmer2Id,
                soldAt: D(8), soldQty: 500, soldRate: 2800, soldTotal: txn7.total,
                buyerId, createdAt: D(10), id: now + 505
            },
            {
                listingId: 'LST-DEMO-MANGO', name: 'Alphonso Mango', commodity: 'Alphonso Mango', category: 'Fruits',
                city: 'Nashik', quantity: 300, price: 8000, approvedPrice: 7800, unit: 'quintal',
                quality: 'Excellent', status: 'Sold', farmerId,
                soldAt: D(10), soldQty: 300, soldRate: 7800, soldTotal: txn1.total,
                buyerId: buyer2Id, createdAt: D(12), id: now + 506
            }
        ];

        const allListings = currentListings.concat(ghostListings.map((l, idx) => {
            return typeof normalizeListing === 'function'
                ? normalizeListing({ ...l }, idx + 50, { farmerId: l.farmerId })
                : l;
        }));
        saveListings(allListings);

        // ==================== COMPREHENSIVE NOTIFICATIONS ====================
        const notifications = [
            // Farmer notifications
            {
                id: 'NTF-S001', audience: 'farmer', type: 'offer', priority: 'ActionRequired',
                farmerId, buyerId, offeredPrice: 7500, quantity: 500,
                listingId: 'LST-2001', offerId: 'OFF-2001',
                message: 'New offer ₹7,500/quintal for Alphonso Mango from buyer',
                messageKey: 'New offer received', cropName: 'Alphonso Mango', city: 'Nashik',
                read: false, timestamp: H(4)
            },
            {
                id: 'NTF-S002', audience: 'farmer', type: 'approval', priority: 'Info',
                farmerId, listingId: 'LST-2001', cropName: 'Alphonso Mango', city: 'Nashik',
                message: 'Your listing for Alphonso Mango (LST-2001) has been approved.',
                messageKey: 'Your listing was approved', read: true, timestamp: D(5)
            },
            {
                id: 'NTF-S003', audience: 'farmer', type: 'deal_finalized', priority: 'Finalized',
                farmerId, buyerId: buyer2Id, cropName: 'Alphonso Mango', city: 'Nashik',
                listingId: 'LST-DEMO-MANGO', transactionId: 'TXN-2001',
                quantity: 300, finalPrice: 7800, totalAmount: txn1.total,
                farmerPayout: txn1.farmerPayout, commissionAmount: txn1.commissionAmt,
                message: `Deal finalized! Alphonso Mango - Total ₹${txn1.total.toLocaleString('en-IN')}. Payout: ₹${Math.round(txn1.farmerPayout).toLocaleString('en-IN')}`,
                messageKey: 'Deal finalized', read: true, timestamp: D(10)
            },
            {
                id: 'NTF-S004', audience: 'farmer', type: 'counter_offer', priority: 'ActionRequired',
                farmerId, buyerId: buyer3Id, offerId: 'OFF-2003',
                listingId: 'LST-2004', cropName: 'Soybean', city: 'Latur',
                counteredPrice: 4550, message: 'Buyer has countered your offer at ₹4,550/quintal for Soybean.',
                messageKey: 'Offer countered', read: false, timestamp: H(3)
            },
            // Buyer notifications
            {
                id: 'NTF-S005', audience: 'buyer', type: 'counter_offer', priority: 'ActionRequired',
                buyerId, farmerId, offerId: 'OFF-2004',
                listingId: 'LST-2002', cropName: 'Wheat', city: 'Pune',
                counteredPrice: 2280, message: 'Farmer has countered your offer at ₹2,280/quintal for Wheat.',
                messageKey: 'Offer countered', read: false, timestamp: H(5)
            },
            {
                id: 'NTF-S006', audience: 'buyer', type: 'purchase_completed', priority: 'Finalized',
                buyerId, farmerId, transactionId: 'TXN-2004',
                cropName: 'Soybean', city: 'Latur',
                quantity: 600, finalPrice: 4350, totalAmount: txn4.total,
                message: `Purchase complete! Soybean 600 qtl × ₹4,350 = ₹${txn4.total.toLocaleString('en-IN')}`,
                messageKey: 'Purchase completed', read: true, timestamp: D(24)
            },
            // Middleman notifications
            {
                id: 'NTF-S007', audience: 'middleman', type: 'new_listing', priority: 'Info',
                middlemanId, listingId: 'LST-2011', farmerId: farmer3Id,
                cropName: 'Alphonso Mango', city: 'Ratnagiri',
                message: 'New listing pending approval: Alphonso Mango from Ratnagiri.',
                messageKey: 'New listing pending', read: false, timestamp: H(3)
            },
            {
                id: 'NTF-S008', audience: 'middleman', type: 'new_listing', priority: 'Info',
                middlemanId, listingId: 'LST-2012', farmerId,
                cropName: 'Onion', city: 'Pune',
                message: 'New listing pending approval: Onion from Pune.',
                messageKey: 'New listing pending', read: false, timestamp: H(6)
            },
            {
                id: 'NTF-S009', audience: 'middleman', type: 'offer_accepted', priority: 'ActionRequired',
                middlemanId, offerId: 'OFF-2009', listingId: 'LST-2015',
                farmerId, buyerId, cropName: 'Pomegranate', city: 'Solapur',
                acceptedPrice: 11800, quantity: 150,
                message: 'Offer accepted for Pomegranate (LST-2015) — Finalize the transaction.',
                messageKey: 'Offer accepted – finalize', read: false, timestamp: D(2)
            },
            {
                id: 'NTF-S010', audience: 'middleman', type: 'deal_finalized', priority: 'Finalized',
                middlemanId, transactionId: 'TXN-2005',
                cropName: 'Wheat', city: 'Nagpur', quantity: 1200, finalPrice: 2300, totalAmount: txn5.total,
                commissionAmount: txn5.commissionAmt,
                message: `Transaction finalized: Wheat ₹${txn5.total.toLocaleString('en-IN')}. Commission: ₹${Math.round(txn5.commissionAmt).toLocaleString('en-IN')}`,
                messageKey: 'Deal finalized', read: true, timestamp: D(5)
            }
        ];
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.notifications, notifications);

        // ==================== COMMUNITY MARKET RATES ====================
        const today = new Date().toISOString().split('T')[0];
        const communityRates = [];
        const rateSeeds = [
            { city: 'Nashik', crop: 'Alphonso Mango', rates: [8200, 7900, 8100, 8050, 7950] },
            { city: 'Nashik', crop: 'Onion', rates: [1850, 1820, 1780, 1900, 1760] },
            { city: 'Latur', crop: 'Soybean', rates: [4580, 4620, 4550, 4600, 4570] },
            { city: 'Nagpur', crop: 'Cotton', rates: [6480, 6520, 6550, 6490, 6510] },
            { city: 'Solapur', crop: 'Pomegranate', rates: [12100, 11900, 12000, 12200, 11850] },
            { city: 'Kolhapur', crop: 'Sugarcane', rates: [385, 375, 390, 380, 388] },
        ];
        let cmrId = 1;
        rateSeeds.forEach(({ city, crop, rates }) => {
            rates.forEach((rate, i) => {
                communityRates.push({
                    id: `CMR-S${String(cmrId++).padStart(3, '0')}`,
                    buyerId: [buyerId, buyer2Id, buyer3Id][i % 3],
                    city, crop, rate,
                    timestamp: today + `T${String(6 + i).padStart(2, '0')}:00:00.000Z`
                });
            });
        });
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.communityMarketRates, communityRates);

        // ==================== 30-DAY PRICE TREND DATA ====================
        // For chart: historical daily avg prices for top crops
        const trendCrops = ['Alphonso Mango', 'Onion', 'Soybean', 'Cotton', 'Pomegranate'];
        const trendCities = ['Nashik', 'Nashik', 'Latur', 'Nagpur', 'Solapur'];
        const trendBase = [8000, 1800, 4600, 6500, 12000];
        const trendVolatility = [400, 150, 200, 300, 500];
        const dailyRatesStore = {};

        for (let d = 29; d >= 0; d--) {
            const dateObj = new Date(now - d * 86400000);
            const dateStr = dateObj.toISOString().split('T')[0];

            trendCrops.forEach((crop, ci) => {
                const city = trendCities[ci];
                const key = `${city}|${crop}`;
                const seed = Math.sin(d * 0.23 + ci * 1.7) * trendVolatility[ci];
                const weekTrend = d < 7 ? trendVolatility[ci] * 0.2 * (Math.random() - 0.3) : 0;
                const avg = Math.round(trendBase[ci] + seed + weekTrend);
                const variance = Math.round(trendVolatility[ci] * 0.3);
                if (!dailyRatesStore[key]) dailyRatesStore[key] = {};
                dailyRatesStore[key][dateStr] = {
                    city, crop, avg: Math.max(avg, trendBase[ci] * 0.7),
                    min: Math.max(avg - variance, trendBase[ci] * 0.6),
                    max: avg + variance, date: dateStr, source: 'Historical Seed', count: 5
                };
            });
        }
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.dailyMarketRates, dailyRatesStore);

        // ==================== RECENT ACTIVITY ====================
        if (typeof writeJson === 'function') {
            writeJson(STORAGE_KEYS.recentCities, ['Nashik', 'Pune', 'Nagpur', 'Solapur', 'Latur']);
            writeJson(STORAGE_KEYS.recentCrops, ['Alphonso Mango', 'Onion', 'Soybean', 'Cotton', 'Pomegranate', 'Wheat', 'Jowar', 'Sugarcane']);
            writeJson(STORAGE_KEYS.buyerSavedCrops, ['Alphonso Mango', 'Onion', 'Soybean', 'Pomegranate', 'Cotton']);
        }

        // Set buyer city preference
        if (typeof setStoreValue === 'function') {
            setStoreValue(STORAGE_KEYS.buyerCity, 'Nashik');
        }

        // Audit log
        const auditLogs = [
            { id: 'AUD-S001', action: 'LISTING_APPROVED', details: 'LST-2001 Alphonso Mango approved', timestamp: D(5), actorId: middlemanId },
            { id: 'AUD-S002', action: 'OFFER_PLACED', details: 'OFF-2001 ₹7500/qtl placed for Alphonso Mango', timestamp: H(4), actorId: buyerId },
            { id: 'AUD-S003', action: 'TRANSACTION_FINALIZED', details: 'TXN-2005 Wheat ₹27,60,000 finalized', timestamp: D(5), actorId: middlemanId },
            { id: 'AUD-S004', action: 'LISTING_APPROVED', details: 'LST-2003 Onion approved', timestamp: D(3), actorId: middlemanId },
            { id: 'AUD-S005', action: 'TRANSACTION_FINALIZED', details: 'TXN-2006 Pomegranate ₹22,40,000 finalized', timestamp: D(3), actorId: middlemanId }
        ];
        if (typeof writeJson === 'function') writeJson(STORAGE_KEYS.auditLog, auditLogs);

        const result = {
            seeded: true,
            listings: allListings.length,
            offers: offersList.length,
            transactions: rawTransactions.length,
            notifications: notifications.length,
            communityRates: communityRates.length
        };
        console.log('[SeedData] Comprehensive demo data seeded:', result);

        // Dispatch event so dashboards re-render
        try { window.dispatchEvent(new Event('farmaDemoSetupReady')); } catch (e) { }
        try { window.dispatchEvent(new Event('farmaDataReset')); } catch (e) { }

        return result;
    };

    // ==================== AI PRICE RECOMMENDATION UI ====================
    // Injects the suggestion box into the listing modal when crop/city are selected
    window.injectAIPriceRecommendation = function () {
        // Remove existing suggestion if present
        const existing = document.getElementById('aiPriceRecommendationBox');
        if (existing) existing.remove();

        const priceInput = document.getElementById('productPrice');
        if (!priceInput) return;

        // Get current crop and city selection
        let crop = '';
        let city = '';
        try {
            const cropInput = document.querySelector('[data-search-id="farmerCropSearch"] input, #farmerCropSearch input');
            if (cropInput && cropInput.value) crop = cropInput.value.trim();
        } catch (e) { }
        try {
            const cityInput = document.querySelector('[data-search-id="farmerCitySearch"] input, #farmerCitySearch input');
            if (cityInput && cityInput.value) city = cityInput.value.trim();
        } catch (e) { }

        if (!crop) return;

        const suggested = window.getAIPriceRecommendation(crop, city);
        if (!suggested || suggested <= 0) return;

        const box = document.createElement('div');
        box.id = 'aiPriceRecommendationBox';
        box.style.cssText = `
      background: linear-gradient(135deg, #d4edda 0%, #c8f0d8 100%);
      border: 1px solid #28a745;
      border-radius: 10px;
      padding: 12px 16px;
      margin: 8px 0 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.15);
      animation: fadeInDown 0.3s ease;
    `;
        box.innerHTML = `
      <span style="font-size:20px;flex-shrink:0;" title="AI Recommendation">💡</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#155724;margin-bottom:2px;">AI Recommendation</div>
        <div style="color:#1d6030;">
          <strong>₹${suggested.toLocaleString('en-IN')}/quintal</strong>
          based on current ${city || 'market'} rates for ${crop}
        </div>
        ${city ? `<div style="font-size:11px;color:#4a7c59;margin-top:2px;">${city} market average (last 7 days)</div>` : ''}
      </div>
      <button id="acceptAiSuggestionBtn" type="button" style="
        background: #28a745; color: white; border: none;
        border-radius: 6px; padding: 6px 14px; cursor: pointer;
        font-size: 12px; font-weight: 600; white-space: nowrap;
        transition: background 0.2s;
      " title="Accept this price suggestion">Accept Suggestion</button>
    `;

        // Insert before the price input
        const priceLabel = priceInput.closest('label') || priceInput.parentElement;
        if (priceLabel && priceLabel.parentElement) {
            priceLabel.parentElement.insertBefore(box, priceLabel);
        }

        // Accept button logic
        const acceptBtn = box.querySelector('#acceptAiSuggestionBtn');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                priceInput.value = suggested;
                priceInput.focus();
                acceptBtn.textContent = '✓ Applied';
                acceptBtn.style.background = '#155724';
                setTimeout(() => {
                    acceptBtn.textContent = 'Accept Suggestion';
                    acceptBtn.style.background = '#28a745';
                }, 2000);
                // Trigger input event for any listeners
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
            });
            acceptBtn.addEventListener('mouseover', () => { acceptBtn.style.background = '#218838'; });
            acceptBtn.addEventListener('mouseout', () => { acceptBtn.style.background = '#28a745'; });
        }
    };

    // Hook into listing modal open events
    document.addEventListener('DOMContentLoaded', () => {
        // Delay to ensure other scripts initialize
        setTimeout(() => {
            // Watch for modal open
            const modal = document.getElementById('listingModal');
            if (modal) {
                const observer = new MutationObserver(() => {
                    if (modal.classList.contains('is-open') || modal.getAttribute('aria-hidden') === 'false') {
                        setTimeout(window.injectAIPriceRecommendation, 50);
                    }
                });
                observer.observe(modal, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
            }

            // Also hook into crop search selection events
            document.addEventListener('farmaSearchSelected', (e) => {
                if (e.detail && (e.detail.searchId === 'farmerCropSearch' || e.detail.searchId === 'farmerCitySearch')) {
                    setTimeout(window.injectAIPriceRecommendation, 100);
                }
            });
        }, 500);
    });

    // Auto-seed if no data exists and we're on a dashboard page
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            try {
                const isDashboard = document.body.classList.contains('dashboard-page');
                if (!isDashboard) return;
                const listings = typeof getListings === 'function' ? getListings() : [];
                const approvedCount = listings.filter(l => l.status === 'Approved').length;
                // Only auto-seed if we have fewer than 5 approved listings
                if (approvedCount < 5) {
                    console.log('[SeedData] Auto-seeding comprehensive demo data...');
                    window.seedComprehensiveDemoData();
                    // Refresh UI after seeding
                    setTimeout(() => {
                        const fns = ['renderMyListings', 'renderBuyerListings', 'renderListings',
                            'renderNotifications', 'renderBuyerNotifications', 'renderMiddlemanNotifications',
                            'renderSoldDeals', 'renderPurchaseHistory', 'renderEarningsTable',
                            'renderFarmerInsights', 'renderBuyerInsights', 'renderMiddlemanInsights'];
                        fns.forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) { } });
                    }, 200);
                }
            } catch (e) {
                console.warn('[SeedData] Auto-seed check failed:', e.message);
            }
        }, 800);
    });

})();
