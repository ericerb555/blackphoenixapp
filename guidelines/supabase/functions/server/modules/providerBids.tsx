// Provider Bid & Response System
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const providerBids = new Hono();

// ============================================================================
// PROVIDER BID SUBMISSION & MANAGEMENT
// ============================================================================

// GET /my-opportunities/:providerId - Get all bid opportunities for a provider
providerBids.get('/my-opportunities/:providerId', async (c) => {
  try {
    const providerId = c.req.param('providerId');
    
    // Get all opportunities where this provider was matched
    const allOpportunities = await kv.getByPrefix('bid_opportunity:') || [];
    
    const myOpportunities = allOpportunities.filter(opp => 
      opp.matchedProviders?.some((p: any) => p.id === providerId)
    );

    // Categorize opportunities
    const opportunities = {
      new: myOpportunities.filter((o: any) => !o.responses?.[providerId] && o.status === 'open'),
      responded: myOpportunities.filter((o: any) => o.responses?.[providerId] && o.status === 'open'),
      won: myOpportunities.filter((o: any) => o.responses?.[providerId]?.status === 'accepted'),
      closed: myOpportunities.filter((o: any) => o.status === 'closed' || o.status === 'awarded')
    };

    return c.json({
      success: true,
      opportunities,
      stats: {
        total: myOpportunities.length,
        new: opportunities.new.length,
        responded: opportunities.responded.length,
        won: opportunities.won.length,
        responseRate: myOpportunities.length > 0 
          ? Math.round((opportunities.responded.length / myOpportunities.length) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching provider opportunities:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fetch opportunities',
      opportunities: { new: [], responded: [], won: [], closed: [] }
    }, 500);
  }
});

// POST /submit-bid - Provider submits a bid for a request
providerBids.post('/submit-bid', async (c) => {
  try {
    const {
      opportunityId,
      providerId,
      bidAmount,
      estimatedDuration,
      proposedStartDate,
      notes,
      materials,
      laborCost,
      warranty,
      includesPermits,
      additionalServices
    } = await c.req.json();

    // Validation
    if (!opportunityId || !providerId || !bidAmount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get the opportunity
    const opportunity = await kv.get(`bid_opportunity:${opportunityId}`);
    if (!opportunity) {
      return c.json({ error: 'Opportunity not found' }, 404);
    }

    if (opportunity.status !== 'open') {
      return c.json({ error: 'This opportunity is no longer accepting bids' }, 400);
    }

    // Get provider details
    const provider = await kv.get(`service_provider:${providerId}`) || 
                     await kv.get(`subcontractor:${providerId}`);
    
    if (!provider) {
      return c.json({ error: 'Provider not found' }, 404);
    }

    // Create bid record
    const bid = {
      id: `BID-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      opportunityId,
      providerId,
      providerName: provider.companyName || provider.name,
      providerType: provider.subscriptionTier ? 'service_provider' : 'subcontractor',
      bidAmount: parseFloat(bidAmount),
      estimatedDuration: estimatedDuration || 'TBD',
      proposedStartDate: proposedStartDate || null,
      notes: notes || '',
      materials: materials || [],
      laborCost: laborCost ? parseFloat(laborCost) : null,
      warranty: warranty || 'Standard warranty',
      includesPermits: includesPermits || false,
      additionalServices: additionalServices || [],
      status: 'pending',
      submittedAt: new Date().toISOString(),
      viewedByCustomer: false
    };

    // Update opportunity with this bid
    if (!opportunity.responses) {
      opportunity.responses = {};
    }
    
    opportunity.responses[providerId] = bid;
    opportunity.bidCount = Object.keys(opportunity.responses).length;
    opportunity.lastBidAt = bid.submittedAt;

    await kv.set(`bid_opportunity:${opportunityId}`, opportunity);

    // Store individual bid record for easy querying
    await kv.set(`bid:${bid.id}`, bid);

    // Update provider stats
    provider.totalBidsSubmitted = (provider.totalBidsSubmitted || 0) + 1;
    provider.lastBidDate = bid.submittedAt;
    
    const providerKey = provider.subscriptionTier ? `service_provider:${providerId}` : `subcontractor:${providerId}`;
    await kv.set(providerKey, provider);

    console.log(`✅ Bid submitted: ${provider.companyName || provider.name} bid $${bidAmount} on ${opportunityId}`);

    return c.json({
      success: true,
      message: 'Bid submitted successfully!',
      bid
    });

  } catch (error) {
    console.error('❌ Error submitting bid:', error);
    return c.json({ error: 'Failed to submit bid', details: error.message }, 500);
  }
});

// PUT /update-bid/:bidId - Update an existing bid
providerBids.put('/update-bid/:bidId', async (c) => {
  try {
    const bidId = c.req.param('bidId');
    const updates = await c.req.json();

    const bid = await kv.get(`bid:${bidId}`);
    if (!bid) {
      return c.json({ error: 'Bid not found' }, 404);
    }

    if (bid.status !== 'pending') {
      return c.json({ error: 'Cannot update bid that has been accepted or rejected' }, 400);
    }

    // Update allowed fields
    const allowedUpdates = [
      'bidAmount', 'estimatedDuration', 'proposedStartDate', 'notes',
      'materials', 'laborCost', 'warranty', 'includesPermits', 'additionalServices'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        bid[field] = updates[field];
      }
    });

    bid.updatedAt = new Date().toISOString();

    // Update in both locations
    await kv.set(`bid:${bidId}`, bid);

    const opportunity = await kv.get(`bid_opportunity:${bid.opportunityId}`);
    if (opportunity?.responses?.[bid.providerId]) {
      opportunity.responses[bid.providerId] = bid;
      await kv.set(`bid_opportunity:${bid.opportunityId}`, opportunity);
    }

    return c.json({
      success: true,
      message: 'Bid updated successfully',
      bid
    });

  } catch (error) {
    console.error('❌ Error updating bid:', error);
    return c.json({ error: 'Failed to update bid' }, 500);
  }
});

// POST /decline-opportunity - Provider declines to bid
providerBids.post('/decline-opportunity', async (c) => {
  try {
    const { opportunityId, providerId, reason } = await c.req.json();

    const opportunity = await kv.get(`bid_opportunity:${opportunityId}`);
    if (!opportunity) {
      return c.json({ error: 'Opportunity not found' }, 404);
    }

    if (!opportunity.declinedProviders) {
      opportunity.declinedProviders = [];
    }

    opportunity.declinedProviders.push({
      providerId,
      reason: reason || 'Not interested',
      declinedAt: new Date().toISOString()
    });

    await kv.set(`bid_opportunity:${opportunityId}`, opportunity);

    return c.json({
      success: true,
      message: 'Opportunity declined'
    });

  } catch (error) {
    console.error('❌ Error declining opportunity:', error);
    return c.json({ error: 'Failed to decline opportunity' }, 500);
  }
});

// GET /opportunity/:id - Get detailed opportunity info
providerBids.get('/opportunity/:id', async (c) => {
  try {
    const opportunityId = c.req.param('id');
    
    const opportunity = await kv.get(`bid_opportunity:${opportunityId}`);
    if (!opportunity) {
      return c.json({ error: 'Opportunity not found' }, 404);
    }

    return c.json({
      success: true,
      opportunity
    });

  } catch (error) {
    console.error('❌ Error fetching opportunity:', error);
    return c.json({ error: 'Failed to fetch opportunity' }, 500);
  }
});

// ============================================================================
// CUSTOMER BID REVIEW
// ============================================================================

// GET /request/:requestId/bids - Get all bids for a customer's request
providerBids.get('/request/:requestId/bids', async (c) => {
  try {
    const requestId = c.req.param('requestId');
    
    const opportunity = await kv.get(`bid_opportunity:${requestId}`);
    if (!opportunity) {
      return c.json({ error: 'Request not found' }, 404);
    }

    const bids = Object.values(opportunity.responses || {});
    
    // Sort by bid amount (lowest first)
    bids.sort((a: any, b: any) => a.bidAmount - b.bidAmount);

    return c.json({
      success: true,
      bids,
      stats: {
        total: bids.length,
        pending: bids.filter((b: any) => b.status === 'pending').length,
        accepted: bids.filter((b: any) => b.status === 'accepted').length,
        rejected: bids.filter((b: any) => b.status === 'rejected').length,
        averageBid: bids.length > 0 
          ? bids.reduce((sum: number, b: any) => sum + b.bidAmount, 0) / bids.length 
          : 0,
        lowestBid: bids.length > 0 ? bids[0].bidAmount : null,
        highestBid: bids.length > 0 ? bids[bids.length - 1].bidAmount : null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching bids:', error);
    return c.json({ error: 'Failed to fetch bids' }, 500);
  }
});

// POST /accept-bid/:bidId - Customer accepts a bid
providerBids.post('/accept-bid/:bidId', async (c) => {
  try {
    const bidId = c.req.param('bidId');
    
    const bid = await kv.get(`bid:${bidId}`);
    if (!bid) {
      return c.json({ error: 'Bid not found' }, 404);
    }

    // Update bid status
    bid.status = 'accepted';
    bid.acceptedAt = new Date().toISOString();
    await kv.set(`bid:${bidId}`, bid);

    // Update opportunity
    const opportunity = await kv.get(`bid_opportunity:${bid.opportunityId}`);
    if (opportunity) {
      opportunity.status = 'awarded';
      opportunity.acceptedBidId = bidId;
      opportunity.acceptedProviderId = bid.providerId;
      opportunity.awardedAt = new Date().toISOString();

      // Reject all other bids
      if (opportunity.responses) {
        Object.keys(opportunity.responses).forEach(providerId => {
          if (providerId !== bid.providerId) {
            opportunity.responses[providerId].status = 'rejected';
            opportunity.responses[providerId].rejectedAt = new Date().toISOString();
          } else {
            opportunity.responses[providerId] = bid;
          }
        });
      }

      await kv.set(`bid_opportunity:${bid.opportunityId}`, opportunity);
    }

    // Update provider stats
    const provider = await kv.get(`service_provider:${bid.providerId}`) || 
                     await kv.get(`subcontractor:${bid.providerId}`);
    
    if (provider) {
      provider.bidsAccepted = (provider.bidsAccepted || 0) + 1;
      provider.totalRevenue = (provider.totalRevenue || 0) + bid.bidAmount;
      provider.lastJobDate = new Date().toISOString();
      
      const providerKey = provider.subscriptionTier ? `service_provider:${bid.providerId}` : `subcontractor:${bid.providerId}`;
      await kv.set(providerKey, provider);
    }

    console.log(`✅ Bid accepted: ${bid.providerName} won ${bid.opportunityId} for $${bid.bidAmount}`);

    return c.json({
      success: true,
      message: 'Bid accepted successfully!',
      bid
    });

  } catch (error) {
    console.error('❌ Error accepting bid:', error);
    return c.json({ error: 'Failed to accept bid' }, 500);
  }
});

// POST /reject-bid/:bidId - Customer rejects a bid
providerBids.post('/reject-bid/:bidId', async (c) => {
  try {
    const bidId = c.req.param('bidId');
    const { reason } = await c.req.json();
    
    const bid = await kv.get(`bid:${bidId}`);
    if (!bid) {
      return c.json({ error: 'Bid not found' }, 404);
    }

    bid.status = 'rejected';
    bid.rejectedAt = new Date().toISOString();
    bid.rejectionReason = reason;
    await kv.set(`bid:${bidId}`, bid);

    // Update in opportunity
    const opportunity = await kv.get(`bid_opportunity:${bid.opportunityId}`);
    if (opportunity?.responses?.[bid.providerId]) {
      opportunity.responses[bid.providerId] = bid;
      await kv.set(`bid_opportunity:${bid.opportunityId}`, opportunity);
    }

    return c.json({
      success: true,
      message: 'Bid rejected'
    });

  } catch (error) {
    console.error('❌ Error rejecting bid:', error);
    return c.json({ error: 'Failed to reject bid' }, 500);
  }
});

export default providerBids;
