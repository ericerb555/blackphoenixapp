/**
 * Database Initialization
 * Seeds the database with sample data for demonstration
 * 
 * NOTE: This requires the Supabase Edge Function to be deployed.
 * If the server is not available, initialization will be skipped gracefully.
 */

import * as SupabaseData from './supabase-data';

export async function initializeDatabase() {
  // Wrap entire initialization in one try-catch to handle all server errors
  try {
    // Check if data already exists
    const existingSubs = await SupabaseData.getSubscriptions();
    if (existingSubs.length > 0) {
      console.log('✅ Database already initialized');
      return true;
    }

    console.log('📊 Initializing database with sample data...');

    // Create sample customers
    const customers = await Promise.all([
      SupabaseData.createCustomer({
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        status: 'active',
        tags: ['premium', 'maintenance'],
        notes: 'VIP customer with premium maintenance plan'
      }),
      SupabaseData.createCustomer({
        name: 'Michael Chen',
        email: 'mchen@email.com',
        phone: '(555) 234-5678',
        address: '456 Oak Ave',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        status: 'active',
        tags: ['basic'],
        notes: 'Regular maintenance customer'
      }),
      SupabaseData.createCustomer({
        name: 'Emily Davis',
        email: 'emily.d@email.com',
        phone: '(555) 345-6789',
        address: '789 Pine Rd',
        city: 'San Diego',
        state: 'CA',
        zip: '92101',
        status: 'potential',
        tags: ['referral'],
        notes: 'Referred by Sarah Johnson'
      })
    ]);

    // Create sample subscriptions
    await Promise.all([
      SupabaseData.createSubscription({
        type: 'customer',
        stakeholderId: customers[0].id,
        stakeholderName: customers[0].name,
        stakeholderEmail: customers[0].email,
        plan: 'Premium Maintenance Plan',
        status: 'active',
        billingCycle: 'monthly',
        amount: 299,
        startDate: '2024-01-15',
        renewalDate: '2024-02-15',
        hoursIncluded: 8,
        hoursUsed: 3.5,
        hoursRollover: 2,
        hoursGifted: 1,
        autoRenew: true,
        paymentMethod: 'Credit Card ****1234'
      }),
      SupabaseData.createSubscription({
        type: 'customer',
        stakeholderId: customers[1].id,
        stakeholderName: customers[1].name,
        stakeholderEmail: customers[1].email,
        plan: 'Basic Maintenance Plan',
        status: 'active',
        billingCycle: 'monthly',
        amount: 149,
        startDate: '2023-11-01',
        renewalDate: '2024-02-01',
        hoursIncluded: 4,
        hoursUsed: 4,
        hoursRollover: 0,
        hoursGifted: 0,
        autoRenew: true,
        paymentMethod: 'Credit Card ****5678'
      })
    ]);

    // Create sample subcontractors
    const subcontractor = await SupabaseData.createSubcontractor({
      name: 'John Smith',
      company: 'Elite Plumbing Co',
      email: 'contact@eliteplumbing.com',
      phone: '(555) 456-7890',
      specialty: ['Plumbing', 'Water Heaters', 'Pipe Repair'],
      rating: 4.8,
      status: 'active',
      certifications: ['Licensed Plumber', 'Gas Line Certified'],
      insuranceExpiry: '2025-12-31'
    });

    await SupabaseData.createSubscription({
      type: 'subcontractor',
      stakeholderId: subcontractor.id,
      stakeholderName: subcontractor.company,
      stakeholderEmail: subcontractor.email,
      plan: 'Pro Subcontractor Plan',
      status: 'active',
      billingCycle: 'monthly',
      amount: 99,
      startDate: '2024-01-01',
      renewalDate: '2024-02-01',
      autoRenew: true,
      paymentMethod: 'ACH Bank Transfer'
    });

    // Create sample vendor
    const vendor = await SupabaseData.createVendor({
      name: 'HomeDepot Supply',
      contactName: 'Robert Martinez',
      email: 'partnerships@homedepot.com',
      phone: '(555) 567-8901',
      category: 'Building Materials',
      website: 'https://homedepot.com',
      status: 'active',
      paymentTerms: 'Net 30'
    });

    await SupabaseData.createSubscription({
      type: 'vendor',
      stakeholderId: vendor.id,
      stakeholderName: vendor.name,
      stakeholderEmail: vendor.email,
      plan: 'Featured Vendor Directory',
      status: 'active',
      billingCycle: 'annual',
      amount: 1200,
      startDate: '2023-06-01',
      renewalDate: '2024-06-01',
      autoRenew: true,
      paymentMethod: 'Invoice'
    });

    // Create sample advertiser
    const advertiser = await SupabaseData.createAdvertiser({
      name: 'Green Energy Solutions',
      contactName: 'Lisa Anderson',
      email: 'ads@greenenergy.com',
      phone: '(555) 678-9012',
      status: 'active',
      adPlacements: [
        {
          location: 'Homepage Banner',
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        }
      ],
      budget: 3000,
      spent: 750
    });

    await SupabaseData.createSubscription({
      type: 'advertiser',
      stakeholderId: advertiser.id,
      stakeholderName: advertiser.name,
      stakeholderEmail: advertiser.email,
      plan: 'Premium Ad Placement',
      status: 'active',
      billingCycle: 'quarterly',
      amount: 750,
      startDate: '2024-01-01',
      renewalDate: '2024-04-01',
      autoRenew: false,
      paymentMethod: 'Credit Card ****9012'
    });

    // Create sample referrals
    await Promise.all([
      SupabaseData.createReferral({
        referrerId: customers[0].id,
        referrerType: 'Customer',
        referrerName: customers[0].name,
        referredId: customers[2].id,
        referredType: 'Customer',
        referredName: customers[2].name,
        status: 'completed',
        rewardAmount: 100,
        dateReferred: '2024-01-10',
        dateCompleted: '2024-01-15',
        conversionValue: 299
      }),
      SupabaseData.createReferral({
        referrerId: subcontractor.id,
        referrerType: 'Subcontractor',
        referrerName: subcontractor.company,
        referredId: 'SUB-002',
        referredType: 'Subcontractor',
        referredName: 'Quick Fix HVAC',
        status: 'paid',
        rewardAmount: 150,
        dateReferred: '2023-12-20',
        dateCompleted: '2024-01-05',
        conversionValue: 99
      })
    ]);

    // Create sample gift cards
    await Promise.all([
      SupabaseData.createGiftCard({
        type: 'dollar',
        value: 500,
        purchasedBy: 'Corporate Account',
        recipientEmail: 'winner@email.com',
        recipientName: 'Contest Winner',
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }),
      SupabaseData.createGiftCard({
        type: 'hours',
        value: 10,
        purchasedBy: customers[0].name,
        recipientEmail: 'mom@email.com',
        recipientName: 'Mom',
        purchaseDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
      })
    ]);

    // Create sample work orders
    await Promise.all([
      SupabaseData.createWorkOrder({
        customerId: customers[0].id,
        customerName: customers[0].name,
        title: 'Kitchen Sink Repair',
        description: 'Fix leaking kitchen sink and replace faucet',
        status: 'in-progress',
        priority: 'high',
        assignedTo: subcontractor.id,
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 3,
        actualHours: 2.5,
        materials: [
          { name: 'Faucet', quantity: 1, cost: 89.99 },
          { name: 'Pipe Sealant', quantity: 1, cost: 12.99 }
        ],
        totalCost: 252.97
      }),
      SupabaseData.createWorkOrder({
        customerId: customers[1].id,
        customerName: customers[1].name,
        title: 'Water Heater Maintenance',
        description: 'Annual water heater inspection and flush',
        status: 'completed',
        priority: 'medium',
        assignedTo: subcontractor.id,
        scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        completedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedHours: 2,
        actualHours: 1.5,
        materials: [
          { name: 'Anode Rod', quantity: 1, cost: 45.00 }
        ],
        totalCost: 195.00
      })
    ]);

    // Create sample invoices
    await Promise.all([
      SupabaseData.createInvoice({
        customerId: customers[0].id,
        customerName: customers[0].name,
        workOrderId: 'WO-001',
        amount: 250.00,
        tax: 22.50,
        total: 272.50,
        status: 'sent',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { description: 'Labor - Kitchen Sink Repair', quantity: 2.5, rate: 80, amount: 200 },
          { description: 'New Faucet', quantity: 1, rate: 50, amount: 50 }
        ],
        notes: 'Payment due within 30 days'
      }),
      SupabaseData.createInvoice({
        customerId: customers[1].id,
        customerName: customers[1].name,
        workOrderId: 'WO-002',
        amount: 150.00,
        tax: 13.50,
        total: 163.50,
        status: 'paid',
        dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        paidDate: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          { description: 'Water Heater Maintenance', quantity: 1.5, rate: 100, amount: 150 }
        ],
        notes: 'Thank you for your business!'
      })
    ]);

    console.log('✅ Database initialized with sample data');
    return true;
  } catch (error: any) {
    // If we get a 404 or connection error, the server might not be deployed yet
    const errorMessage = error?.message || String(error);
    
    if (errorMessage.includes('404') || errorMessage.includes('Failed to fetch') || errorMessage.includes('Not Found')) {
      console.log('ℹ️ Running in demo mode - Supabase backend not connected');
      console.log('   All features work with local data. To enable backend:');
      console.log('   Run: supabase functions deploy server');
      return false;
    }
    
    // For other unexpected errors, log them but don't crash
    console.error('⚠️ Error initializing database:', errorMessage);
    console.log('   App will continue in demo mode with local data');
    return false;
  }
}
