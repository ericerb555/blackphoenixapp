/**
 * Portal Applications API Routes
 * 
 * Handles applications for all portal types:
 * - Vendor/Handyman
 * - Subcontractor
 * - Customer
 * - Business Customer
 * - Supplier
 * - Partner
 * 
 * Features:
 * - Geographic validation (50/75 mile radius)
 * - Document storage in Supabase Storage
 * - AI-driven application review
 * - Auto-approval for qualified applicants
 * - Creates user with "Pending" status
 */

import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// AI-driven application review
async function reviewApplication(portalType: string, formData: any): Promise<{
  status: 'auto-approved' | 'pending' | 'needs-review';
  score: number;
  reasoning: string;
}> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    return { status: 'pending', score: 50, reasoning: 'Manual review required' };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI application reviewer for a construction/handyman platform. Review applications and provide:
1. A score (0-100)
2. Recommendation: "auto-approved" (90+), "pending" (60-89), or "needs-review" (<60)
3. Brief reasoning

Respond in JSON format: { "score": number, "status": string, "reasoning": string }`
          },
          {
            role: 'user',
            content: `Review this ${portalType} application:\n${JSON.stringify(formData, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error('AI review failed');
    }

    const result = await response.json();
    const aiReview = JSON.parse(result.choices[0].message.content);
    
    return {
      status: aiReview.status,
      score: aiReview.score,
      reasoning: aiReview.reasoning
    };
  } catch (error) {
    console.error('AI review error:', error);
    return { status: 'pending', score: 50, reasoning: 'AI review failed, manual review required' };
  }
}

// Validate geographic radius (simplified - would need geocoding API in production)
function validateRadius(address: string, radiusLimit?: number): boolean {
  // In production, use Google Maps Geocoding API or similar
  // For now, just validate that address is provided
  return !!address && address.length > 10;
}

// Create subcontractor company record for SubcontractorEnterpriseHub
async function createSubcontractorCompany(formData: any, userId: string) {
  try {
    const companyId = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate coding prefix from business name or name
    const name = formData.businessName || `${formData.firstName} ${formData.lastName}`;
    const codingPrefix = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
    
    const subcontractorCompany = {
      id: companyId,
      name: formData.businessName || `${formData.firstName} ${formData.lastName}`,
      businessName: formData.businessName || `${formData.firstName} ${formData.lastName}`,
      contactName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      // License & Insurance
      licenseNumber: formData.licenseNumber || '',
      insuranceProvider: formData.insuranceProvider || '',
      bondingAmount: formData.bondingAmount || '',
      
      // Skills & Certifications
      primaryTrade: formData.skills?.[0] || '',
      secondaryTrades: formData.skills?.slice(1) || [],
      yearsExperience: formData.yearsExperience || '',
      serviceArea: formData.serviceAreas || [],
      
      portalSetup: {
        mobilePortalCreated: false,
        timeTrackingEnabled: false,
        schedulingEnabled: false,
        codingSystemEnabled: true,
        invoicingEnabled: false,
        paymentsEnabled: false,
        projectsEnabled: false,
        messagingEnabled: false,
        fullSetupComplete: false,
        qrCodeGenerated: false
      },
      
      access: {
        portalId: userId,
        codingPrefix: codingPrefix,
        folderPath: `/subcontractors/${codingPrefix}`
      },
      
      stats: {
        activeProjects: 0,
        totalRevenue: 0,
        hoursTracked: 0,
        invoicesSent: 0,
        completionRate: 0,
        rating: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId
      }
    };
    
    // Store in KV
    await kv.set(`subcontractor-company:${companyId}`, subcontractorCompany);
    
    // Add to list of subcontractor companies
    const existingCompanies = await kv.get('subcontractor-companies:list') || [];
    await kv.set('subcontractor-companies:list', [...existingCompanies, companyId]);
    
    console.log(`✅ Created subcontractor company: ${companyId} (${subcontractorCompany.name})`);
    
    return companyId;
  } catch (error) {
    console.error('Error creating subcontractor company:', error);
    throw error;
  }
}

// Create vendor profile
async function createVendorProfile(formData: any, userId: string) {
  try {
    const profileId = `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const vendorProfile = {
      id: profileId,
      userId: userId,
      name: `${formData.firstName} ${formData.lastName}`,
      businessName: formData.businessName || `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      // Service info
      skills: formData.skills || [],
      serviceAreas: formData.serviceAreas || [],
      yearsExperience: formData.yearsExperience || '',
      
      // Insurance
      insuranceProvider: formData.insuranceProvider || '',
      insurancePolicyNumber: formData.insurancePolicyNumber || '',
      
      stats: {
        activeJobs: 0,
        completedJobs: 0,
        totalRevenue: 0,
        rating: 0,
        reviewCount: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId,
        badge: 'PORTAL APP'
      }
    };
    
    await kv.set(`vendor-profile:${profileId}`, vendorProfile);
    
    const existingVendors = await kv.get('vendor-profiles:list') || [];
    await kv.set('vendor-profiles:list', [...existingVendors, profileId]);
    
    console.log(`✅ Created vendor profile: ${profileId} (${vendorProfile.name})`);
    return profileId;
  } catch (error) {
    console.error('Error creating vendor profile:', error);
    throw error;
  }
}

// Create customer profile
async function createCustomerProfile(formData: any, userId: string) {
  try {
    const profileId = `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const customerProfile = {
      id: profileId,
      userId: userId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      preferences: {
        communicationMethod: formData.communicationPreference || 'email',
        projectTypes: formData.projectTypes || [],
        budgetRange: formData.budgetRange || ''
      },
      
      stats: {
        activeProjects: 0,
        completedProjects: 0,
        totalSpent: 0,
        accountBalance: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId,
        badge: 'PORTAL APP'
      }
    };
    
    await kv.set(`customer-profile:${profileId}`, customerProfile);
    
    const existingCustomers = await kv.get('customer-profiles:list') || [];
    await kv.set('customer-profiles:list', [...existingCustomers, profileId]);
    
    console.log(`✅ Created customer profile: ${profileId} (${customerProfile.firstName} ${customerProfile.lastName})`);
    return profileId;
  } catch (error) {
    console.error('Error creating customer profile:', error);
    throw error;
  }
}

// Create business customer profile
async function createBusinessCustomerProfile(formData: any, userId: string) {
  try {
    const profileId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const businessProfile = {
      id: profileId,
      userId: userId,
      businessName: formData.businessName,
      contactName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.officeAddress || formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      // Business info
      businessType: formData.businessType || '',
      licenseNumber: formData.businessLicense || '',
      taxId: formData.taxId || '',
      
      servicesNeeded: formData.servicesNeeded || [],
      projectVolume: formData.projectVolume || '',
      
      radiusLimit: 75, // Business customers get 75-mile radius
      
      stats: {
        activeProjects: 0,
        completedProjects: 0,
        totalSpent: 0,
        annualVolume: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId,
        badge: 'PORTAL APP'
      }
    };
    
    await kv.set(`business-customer-profile:${profileId}`, businessProfile);
    
    const existingBusinesses = await kv.get('business-customer-profiles:list') || [];
    await kv.set('business-customer-profiles:list', [...existingBusinesses, profileId]);
    
    console.log(`✅ Created business customer profile: ${profileId} (${businessProfile.businessName})`);
    return profileId;
  } catch (error) {
    console.error('Error creating business customer profile:', error);
    throw error;
  }
}

// Create supplier profile
async function createSupplierProfile(formData: any, userId: string) {
  try {
    const profileId = `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const supplierProfile = {
      id: profileId,
      userId: userId,
      businessName: formData.businessName,
      contactName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      // Supplier specifics
      productCategories: formData.productCategories || [],
      deliveryRadius: formData.deliveryRadius || 50,
      minimumOrder: formData.minimumOrder || '',
      
      certifications: formData.certifications || [],
      paymentTerms: formData.paymentTerms || 'Net 30',
      
      stats: {
        activeOrders: 0,
        totalOrders: 0,
        totalRevenue: 0,
        rating: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId,
        badge: 'PORTAL APP'
      }
    };
    
    await kv.set(`supplier-profile:${profileId}`, supplierProfile);
    
    const existingSuppliers = await kv.get('supplier-profiles:list') || [];
    await kv.set('supplier-profiles:list', [...existingSuppliers, profileId]);
    
    console.log(`✅ Created supplier profile: ${profileId} (${supplierProfile.businessName})`);
    return profileId;
  } catch (error) {
    console.error('Error creating supplier profile:', error);
    throw error;
  }
}

// Create partner profile
async function createPartnerProfile(formData: any, userId: string) {
  try {
    const profileId = `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const partnerProfile = {
      id: profileId,
      userId: userId,
      organizationName: formData.organizationName || formData.businessName,
      contactName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      address: formData.address || '',
      city: formData.city || '',
      state: formData.state || '',
      zip: formData.zipCode || '',
      
      status: 'active',
      
      // Partnership details
      partnershipType: formData.partnershipType || '',
      servicesOffered: formData.servicesOffered || [],
      targetMarket: formData.targetMarket || '',
      
      agreementType: formData.agreementType || 'standard',
      commissionRate: formData.commissionRate || 0,
      
      stats: {
        activeReferrals: 0,
        totalReferrals: 0,
        revenue: 0,
        commissionEarned: 0
      },
      
      metadata: {
        createdAt: new Date().toISOString(),
        createdViaPortalApplication: true,
        applicationId: userId,
        badge: 'PORTAL APP'
      }
    };
    
    await kv.set(`partner-profile:${profileId}`, partnerProfile);
    
    const existingPartners = await kv.get('partner-profiles:list') || [];
    await kv.set('partner-profiles:list', [...existingPartners, profileId]);
    
    console.log(`✅ Created partner profile: ${profileId} (${partnerProfile.organizationName})`);
    return profileId;
  } catch (error) {
    console.error('Error creating partner profile:', error);
    throw error;
  }
}

// Get application fee from portal config
async function getApplicationFee(portalType: string): Promise<number> {
  try {
    const portalConfig = await kv.get(`portal-type:${portalType}`);
    if (portalConfig && portalConfig.applicationFee !== undefined) {
      return portalConfig.applicationFee;
    }
  } catch (error) {
    console.error('Error fetching portal config for fee:', error);
  }
  
  // Fallback fees if portal config not found
  const fees: Record<string, number> = {
    'vendor': 49.99,
    'subcontractor': 99.99,
    'customer': 0,
    'business': 199.99,
    'supplier': 149.99,
    'partner': 299.99,
    'advertiser': 199.99
  };
  
  return fees[portalType] || 99.99;
}

// Submit portal application
app.post('/submit', async (c) => {
  try {
    const body = await c.req.json();
    const { portalType, formData, radiusLimit } = body;

    console.log(`Processing ${portalType} application for ${formData.email}`);

    // Validate required fields
    if (!formData.firstName || !formData.email || !formData.phone) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate geographic radius for vendor/subcontractor/business portals
    if (radiusLimit) {
      const validAddress = validateRadius(formData.address, radiusLimit);
      if (!validAddress) {
        return c.json({ 
          error: 'Invalid address. Please provide a complete street address.' 
        }, 400);
      }
    }

    // Run AI review
    const aiReview = await reviewApplication(portalType, formData);
    console.log('AI Review Result:', aiReview);

    // Generate unique application ID
    const applicationId = `${portalType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Validate payment method if provided
    if (!formData.paymentMethodId) {
      return c.json({ 
        error: 'Payment method is required to complete your application.' 
      }, 400);
    }

    // Store application in KV store
    const applicationData = {
      id: applicationId,
      portalType,
      formData,
      aiReview,
      status: aiReview.status,
      submittedAt: new Date().toISOString(),
      radiusLimit,
      paymentInfo: {
        paymentMethodId: formData.paymentMethodId,
        last4: formData.paymentLast4,
        brand: formData.paymentBrand,
        charged: false,
        chargedAt: null,
        amount: null
      }
    };

    await kv.set(`portal-app:${applicationId}`, applicationData);
    await kv.set(`portal-app:email:${formData.email}`, applicationId);

    // If auto-approved, create user account with access
    if (aiReview.status === 'auto-approved') {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: Math.random().toString(36).slice(-12) + 'A1!', // Random password
          email_confirm: true,
          user_metadata: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            portalType,
            applicationId,
            status: 'active',
            radiusLimit
          }
        });

        if (userError) {
          console.error('Error creating user:', userError);
          // Continue anyway - admin can manually create account
        } else {
          console.log('User account created:', userData.user?.id);
          
          // Store user-portal mapping
          await kv.set(`user:${userData.user?.id}:portal`, portalType);
          
          // If subcontractor, create company record in SubcontractorEnterpriseHub
          if (portalType === 'subcontractor') {
            await createSubcontractorCompany(formData, userData.user?.id);
          }
          
          // Send welcome email (would integrate with email service)
          console.log(`Welcome email should be sent to ${formData.email}`);
        }
      } catch (error) {
        console.error('Error in auto-approval process:', error);
      }
    }

    // For pending applications, create with pending status
    if (aiReview.status === 'pending') {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: Math.random().toString(36).slice(-12) + 'A1!',
          email_confirm: true,
          user_metadata: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            portalType,
            applicationId,
            status: 'pending',
            radiusLimit
          }
        });

        if (!userError && userData.user) {
          await kv.set(`user:${userData.user.id}:portal`, portalType);
          await kv.set(`user:${userData.user.id}:status`, 'pending');
        }
      } catch (error) {
        console.error('Error creating pending user:', error);
      }
    }

    return c.json({
      success: true,
      applicationId,
      status: aiReview.status,
      message: aiReview.status === 'auto-approved' 
        ? 'Application auto-approved! Check your email for login details.'
        : 'Application received. We\'ll review and notify you within 24-48 hours.'
    });

  } catch (error: any) {
    console.error('Error submitting portal application:', error);
    return c.json({ 
      error: 'Failed to submit application',
      message: error.message 
    }, 500);
  }
});

// Get application by ID
app.get('/:applicationId', async (c) => {
  try {
    const applicationId = c.req.param('applicationId');
    const application = await kv.get(`portal-app:${applicationId}`);

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    return c.json({ application });
  } catch (error: any) {
    console.error('Error fetching application:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get application by email
app.get('/email/:email', async (c) => {
  try {
    const email = c.req.param('email');
    const applicationId = await kv.get(`portal-app:email:${email}`);

    if (!applicationId) {
      return c.json({ error: 'No application found for this email' }, 404);
    }

    const application = await kv.get(`portal-app:${applicationId}`);
    return c.json({ application });
  } catch (error: any) {
    console.error('Error fetching application by email:', error);
    return c.json({ error: error.message }, 500);
  }
});

// List all applications (for admin)
app.get('/list/all', async (c) => {
  try {
    const applications = await kv.getByPrefix('portal-app:');
    
    // Filter out email mappings
    const actualApps = applications.filter(app => 
      !app.key.includes(':email:')
    );

    return c.json({ 
      applications: actualApps,
      count: actualApps.length 
    });
  } catch (error: any) {
    console.error('Error listing applications:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Process payment (mock - in production use Stripe)
async function processPayment(paymentMethodId: string, amount: number, description: string): Promise<{
  success: boolean;
  chargeId?: string;
  error?: string;
}> {
  try {
    // In production, this would call Stripe:
    // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    // const charge = await stripe.charges.create({
    //   amount: amount * 100, // Convert to cents
    //   currency: 'usd',
    //   payment_method: paymentMethodId,
    //   description: description
    // });
    
    // Mock successful payment
    console.log(`Processing payment: $${amount} for ${description}`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    
    return {
      success: true,
      chargeId: `ch_mock_${Date.now()}`
    };
  } catch (error: any) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error.message || 'Payment failed'
    };
  }
}

// Update application status (for admin approval)
app.post('/:applicationId/approve', async (c) => {
  try {
    const applicationId = c.req.param('applicationId');
    const application = await kv.get(`portal-app:${applicationId}`);

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Process payment if not already charged
    let paymentResult = null;
    if (application.paymentInfo && !application.paymentInfo.charged) {
      const amount = await getApplicationFee(application.portalType); // Get fee based on portal type
      paymentResult = await processPayment(
        application.paymentInfo.paymentMethodId,
        amount,
        `${application.portalType} portal application - ${application.formData.email}`
      );

      if (!paymentResult.success) {
        return c.json({ 
          error: `Application approved but payment failed: ${paymentResult.error}. Please contact applicant for alternative payment.`,
          paymentError: true
        }, 400);
      }

      // Update payment info
      application.paymentInfo.charged = true;
      application.paymentInfo.chargedAt = new Date().toISOString();
      application.paymentInfo.amount = amount;
      application.paymentInfo.chargeId = paymentResult.chargeId;
    }

    // Update application status
    application.status = 'approved';
    application.approvedAt = new Date().toISOString();
    await kv.set(`portal-app:${applicationId}`, application);

    // Create or update user account
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: application.formData.email,
      password: Math.random().toString(36).slice(-12) + 'A1!',
      email_confirm: true,
      user_metadata: {
        firstName: application.formData.firstName,
        lastName: application.formData.lastName,
        phone: application.formData.phone,
        portalType: application.portalType,
        applicationId,
        status: 'active',
        radiusLimit: application.radiusLimit
      }
    });

    if (userError && !userError.message.includes('already registered')) {
      console.error('Error creating user on approval:', userError);
      return c.json({ error: 'Failed to create user account' }, 500);
    }

    // Create portal-specific records based on portal type
    let portalRecordId = null;
    let portalRecordType = '';
    
    if (userData.user) {
      try {
        switch (application.portalType) {
          case 'subcontractor':
            portalRecordId = await createSubcontractorCompany(application.formData, userData.user.id);
            portalRecordType = 'subcontractor-company';
            console.log(`✅ Subcontractor company created: ${portalRecordId}`);
            break;
            
          case 'vendor':
            portalRecordId = await createVendorProfile(application.formData, userData.user.id);
            portalRecordType = 'vendor-profile';
            console.log(`✅ Vendor profile created: ${portalRecordId}`);
            break;
            
          case 'customer':
            portalRecordId = await createCustomerProfile(application.formData, userData.user.id);
            portalRecordType = 'customer-profile';
            console.log(`✅ Customer profile created: ${portalRecordId}`);
            break;
            
          case 'business':
            portalRecordId = await createBusinessCustomerProfile(application.formData, userData.user.id);
            portalRecordType = 'business-customer-profile';
            console.log(`✅ Business customer profile created: ${portalRecordId}`);
            break;
            
          case 'supplier':
            portalRecordId = await createSupplierProfile(application.formData, userData.user.id);
            portalRecordType = 'supplier-profile';
            console.log(`✅ Supplier profile created: ${portalRecordId}`);
            break;
            
          case 'partner':
            portalRecordId = await createPartnerProfile(application.formData, userData.user.id);
            portalRecordType = 'partner-profile';
            console.log(`✅ Partner profile created: ${portalRecordId}`);
            break;
            
          default:
            console.log(`ℹ️  No portal-specific record creation for type: ${application.portalType}`);
        }
      } catch (error) {
        console.error(`Error creating ${application.portalType} record:`, error);
        // Continue - admin can manually create record later
      }
    }

    return c.json({ 
      success: true,
      message: 'Application approved and user account created',
      portalRecordId,
      portalRecordType
    });

  } catch (error: any) {
    console.error('Error approving application:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Reject application
app.post('/:applicationId/reject', async (c) => {
  try {
    const applicationId = c.req.param('applicationId');
    const { reason } = await c.req.json();
    
    const application = await kv.get(`portal-app:${applicationId}`);

    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    application.status = 'rejected';
    application.rejectedAt = new Date().toISOString();
    application.rejectionReason = reason;
    await kv.set(`portal-app:${applicationId}`, application);

    return c.json({ 
      success: true,
      message: 'Application rejected'
    });

  } catch (error: any) {
    console.error('Error rejecting application:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
