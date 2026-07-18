/**
 * Seed Pipeline Data Utility
 * Generates sample data for the Unified Project Pipeline
 */

import { projectId, publicAnonKey } from './supabase/info';
import { generateDemoQuote } from '../lib/demoQuoteGenerator';

export async function seedPipelineData(): Promise<number> {
  console.log('🌱 Starting pipeline data seed...');

  try {
    // Generate quote for Deck Construction
    const deckQuote = generateDemoQuote({
      id: `PROJ-${Date.now()}-1`,
      title: 'Outdoor Deck Installation',
      description: 'New 400 sq ft composite deck with built-in seating and pergola',
      serviceType: 'Deck Construction',
      estimatedValue: 18500
    });

    const sampleProjects = [
      // QUOTE DRAFT STAGE
      {
        id: `PROJ-${Date.now()}-1`,
        itemNumber: `WR-2026-001`,
        stage: 'quote-draft',
        customerName: 'Emma Thompson',
        customerEmail: 'emma.t@example.com',
        customerPhone: '(555) 111-2222',
        location: '456 Maple Drive, Austin, TX',
        serviceType: 'Deck Construction',
        title: 'Outdoor Deck Installation',
        description: 'New 400 sq ft composite deck with built-in seating and pergola',
        estimatedValue: deckQuote.totalCost,
        priority: 'medium',
        createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        lastModified: new Date().toISOString(),
        assignedTo: 'Tom Wilson',
        quote: {
          quoteNumber: 'Q-2026-001',
          status: 'draft',
          laborCost: deckQuote.laborSubtotal,
          materialCost: deckQuote.materialsSubtotal,
          totalCost: deckQuote.totalCost,
          laborSubtotal: deckQuote.laborSubtotal,
          materialsSubtotal: deckQuote.materialsSubtotal,
          materials: deckQuote.materials,
          labor: deckQuote.labor,
          processSteps: deckQuote.processSteps,
          generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          approvalStatus: 'draft',
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      },
      (() => {
        const roofQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-2`,
          title: 'Emergency Roof Leak Repair',
          description: 'Repair storm damage and replace damaged shingles on south side',
          serviceType: 'Roof Repair',
          estimatedValue: 5800
        });
        return {
          id: `PROJ-${Date.now()}-2`,
          itemNumber: `WR-2026-002`,
          stage: 'quote-draft',
          customerName: 'David Park',
          customerEmail: 'david.park@example.com',
          customerPhone: '(555) 222-3333',
          location: '789 Pine Street, Seattle, WA',
          serviceType: 'Roof Repair',
          title: 'Emergency Roof Leak Repair',
          description: 'Repair storm damage and replace damaged shingles on south side',
          estimatedValue: roofQuote.totalCost,
          priority: 'high',
          createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Sarah Miller',
          quote: {
            quoteNumber: 'Q-2026-002',
            status: 'draft',
            laborCost: roofQuote.laborSubtotal,
            materialCost: roofQuote.materialsSubtotal,
            totalCost: roofQuote.totalCost,
            laborSubtotal: roofQuote.laborSubtotal,
            materialsSubtotal: roofQuote.materialsSubtotal,
            materials: roofQuote.materials,
            labor: roofQuote.labor,
            processSteps: roofQuote.processSteps,
            generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'draft',
            validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        };
      })(),

      // QUOTE SENT STAGE
      (() => {
        const basementQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-3`,
          title: 'Basement Renovation & Finishing',
          description: 'Complete basement finish with family room, bedroom, bathroom, and wet bar',
          serviceType: 'Basement Finishing',
          estimatedValue: 55000
        });
        return {
          id: `PROJ-${Date.now()}-3`,
          itemNumber: `WR-2026-003`,
          stage: 'quote-sent',
          customerName: 'Jennifer Lee',
          customerEmail: 'jennifer.lee@example.com',
          customerPhone: '(555) 333-4444',
          location: '321 Cedar Avenue, Denver, CO',
          serviceType: 'Basement Finishing',
          title: 'Basement Renovation & Finishing',
          description: 'Complete basement finish with family room, bedroom, bathroom, and wet bar',
          estimatedValue: basementQuote.totalCost,
          priority: 'medium',
          createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Mike Chen',
          quote: {
            quoteNumber: 'Q-2026-003',
            status: 'sent',
            sentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: basementQuote.laborSubtotal,
            materialCost: basementQuote.materialsSubtotal,
            totalCost: basementQuote.totalCost,
            laborSubtotal: basementQuote.laborSubtotal,
            materialsSubtotal: basementQuote.materialsSubtotal,
            materials: basementQuote.materials,
            labor: basementQuote.labor,
            processSteps: basementQuote.processSteps,
            generatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'sent',
            validUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        };
      })(),
      (() => {
        const hvacQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-4`,
          title: 'Central AC System Replacement',
          description: 'Replace old HVAC system with new high-efficiency central air conditioning',
          serviceType: 'HVAC Installation',
          estimatedValue: 12500
        });
        return {
          id: `PROJ-${Date.now()}-4`,
          itemNumber: `WR-2026-004`,
          stage: 'quote-sent',
          customerName: 'Robert Martinez',
          customerEmail: 'robert.m@example.com',
          customerPhone: '(555) 444-5555',
          location: '654 Birch Lane, Phoenix, AZ',
          serviceType: 'HVAC Installation',
          title: 'Central AC System Replacement',
          description: 'Replace old HVAC system with new high-efficiency central air conditioning',
          estimatedValue: hvacQuote.totalCost,
          priority: 'high',
          createdDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Lisa Park',
          quote: {
            quoteNumber: 'Q-2026-004',
            status: 'sent',
            sentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: hvacQuote.laborSubtotal,
            materialCost: hvacQuote.materialsSubtotal,
            totalCost: hvacQuote.totalCost,
            laborSubtotal: hvacQuote.laborSubtotal,
            materialsSubtotal: hvacQuote.materialsSubtotal,
            materials: hvacQuote.materials,
            labor: hvacQuote.labor,
            processSteps: hvacQuote.processSteps,
            generatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'sent',
            validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        };
      })(),

      // QUOTE APPROVED STAGE
      (() => {
        const windowQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-5`,
          title: 'Energy-Efficient Window Installation',
          description: 'Replace 12 windows with double-pane energy-efficient windows',
          serviceType: 'Window Replacement',
          estimatedValue: 24000
        });
        return {
          id: `PROJ-${Date.now()}-5`,
          itemNumber: `WR-2026-005`,
          stage: 'quote-approved',
          customerName: 'Amanda White',
          customerEmail: 'amanda.white@example.com',
          customerPhone: '(555) 555-6666',
          location: '987 Willow Court, Boston, MA',
          serviceType: 'Window Replacement',
          title: 'Energy-Efficient Window Installation',
          description: 'Replace 12 windows with double-pane energy-efficient windows',
          estimatedValue: windowQuote.totalCost,
          priority: 'medium',
          createdDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Tom Wilson',
          quote: {
            quoteNumber: 'Q-2026-005',
            status: 'approved',
            sentDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            approvedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: windowQuote.laborSubtotal,
            materialCost: windowQuote.materialsSubtotal,
            totalCost: windowQuote.totalCost,
            laborSubtotal: windowQuote.laborSubtotal,
            materialsSubtotal: windowQuote.materialsSubtotal,
            materials: windowQuote.materials,
            labor: windowQuote.labor,
            processSteps: windowQuote.processSteps,
            generatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'approved',
            validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          }
        };
      })(),

      // CONTRACT STAGE
      (() => {
        const kitchenQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-6`,
          title: 'Complete Kitchen Renovation',
          description: 'Full kitchen remodel including new cabinets, countertops, appliances, and flooring',
          serviceType: 'Kitchen Remodel',
          estimatedValue: 45000
        });
        return {
          id: `PROJ-${Date.now()}-6`,
          itemNumber: `WR-2026-006`,
          stage: 'contract',
          customerName: 'Sarah Johnson',
          customerEmail: 'sarah.j@example.com',
          customerPhone: '(555) 123-4567',
          location: '742 Evergreen Terrace, Springfield',
          serviceType: 'Kitchen Remodel',
          title: 'Complete Kitchen Renovation',
          description: 'Full kitchen remodel including new cabinets, countertops, appliances, and flooring',
          estimatedValue: kitchenQuote.totalCost,
          priority: 'high',
          createdDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Mike Chen',
          quote: {
            quoteNumber: 'Q-2026-006',
            status: 'approved',
            sentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            approvedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: kitchenQuote.laborSubtotal,
            materialCost: kitchenQuote.materialsSubtotal,
            totalCost: kitchenQuote.totalCost,
            laborSubtotal: kitchenQuote.laborSubtotal,
            materialsSubtotal: kitchenQuote.materialsSubtotal,
            materials: kitchenQuote.materials,
            labor: kitchenQuote.labor,
            processSteps: kitchenQuote.processSteps,
            generatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'approved',
            validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        contract: {
          id: `CT-${Date.now()}-1`,
          contractNumber: `CT-2026-001`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Sarah Johnson',
          customerSignature: 'Sarah Johnson',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'signed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (30%)',
              percentage: 30,
              amount: 13500,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'progress',
              description: 'Progress Payment (40%)',
              percentage: 40,
              amount: 18000,
              milestone: '50% project completion',
              status: 'pending'
            },
            {
              id: 'PS-3',
              type: 'completion',
              description: 'Final Payment (30%)',
              percentage: 30,
              amount: 13500,
              milestone: 'Project completion and approval',
              status: 'pending'
            }
          ]
        }
      };
      })(),
      (() => {
        const bathroomQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-7`,
          title: 'Master Bathroom Upgrade',
          description: 'Complete master bathroom renovation with walk-in shower, dual vanity, and heated floors',
          serviceType: 'Bathroom Remodel',
          estimatedValue: 68000
        });
        return {
          id: `PROJ-${Date.now()}-7`,
          itemNumber: `WR-2026-007`,
          stage: 'contract',
          customerName: 'Michael Rodriguez',
          customerEmail: 'michael.r@example.com',
          customerPhone: '(555) 234-5678',
          location: '123 Oak Street, Portland, OR',
          serviceType: 'Bathroom Remodel',
          title: 'Master Bathroom Upgrade',
          description: 'Complete master bathroom renovation with walk-in shower, dual vanity, and heated floors',
          estimatedValue: bathroomQuote.totalCost,
          priority: 'high',
          createdDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Lisa Park',
          quote: {
            quoteNumber: 'Q-2026-007',
            status: 'approved',
            sentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            approvedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: bathroomQuote.laborSubtotal,
            materialCost: bathroomQuote.materialsSubtotal,
            totalCost: bathroomQuote.totalCost,
            laborSubtotal: bathroomQuote.laborSubtotal,
            materialsSubtotal: bathroomQuote.materialsSubtotal,
            materials: bathroomQuote.materials,
            labor: bathroomQuote.labor,
            processSteps: bathroomQuote.processSteps,
            generatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'approved',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        contract: {
          id: `CT-${Date.now()}-2`,
          contractNumber: `CT-2026-002`,
          contractType: 'soroban-smart-contract',
          signedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Michael Rodriguez',
          customerSignature: 'Michael Rodriguez',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Soroban Smart Contract terms and conditions...',
          status: 'active',
          sorobanContractId: 'CDQWERTYUIOPASDFGHJKLZXCVBNM1234567890QWERTYUI',
          sorobanTransactionHash: '9876543210abcdefghijklmnopqrstuvwxyz0123456789',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Smart Contract Deposit (25%)',
              percentage: 25,
              amount: 17000,
              dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'milestone',
              description: 'Milestone 1 - Demolition Complete (15%)',
              percentage: 15,
              amount: 10200,
              milestone: 'Demolition and site prep verified',
              status: 'paid'
            },
            {
              id: 'PS-3',
              type: 'milestone',
              description: 'Milestone 2 - Rough-In Complete (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Electrical and plumbing rough-in inspected',
              status: 'pending'
            },
            {
              id: 'PS-4',
              type: 'milestone',
              description: 'Milestone 3 - Installation Complete (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Cabinets, counters, fixtures installed',
              status: 'pending'
            },
            {
              id: 'PS-5',
              type: 'completion',
              description: 'Final Payment (20%)',
              percentage: 20,
              amount: 13600,
              milestone: 'Final inspection passed and customer approval',
              status: 'pending'
            }
          ]
        }
      };
      })(),

      // INVOICE STAGE
      (() => {
        const fenceQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-8`,
          title: 'Privacy Fence Installation',
          description: 'Install 200ft cedar privacy fence with two gates',
          serviceType: 'Fence Installation',
          estimatedValue: 8500
        });
        return {
          id: `PROJ-${Date.now()}-8`,
          itemNumber: `WR-2026-008`,
          stage: 'invoice',
          customerName: 'Patricia Davis',
          customerEmail: 'patricia.d@example.com',
          customerPhone: '(555) 777-8888',
          location: '159 Spruce Road, Nashville, TN',
          serviceType: 'Fence Installation',
          title: 'Privacy Fence Installation',
          description: 'Install 200ft cedar privacy fence with two gates',
          estimatedValue: fenceQuote.totalCost,
          priority: 'medium',
          createdDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Tom Wilson',
          quote: {
            quoteNumber: 'Q-2026-008',
            status: 'approved',
            sentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
            approvedDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: fenceQuote.laborSubtotal,
            materialCost: fenceQuote.materialsSubtotal,
            totalCost: fenceQuote.totalCost,
            laborSubtotal: fenceQuote.laborSubtotal,
            materialsSubtotal: fenceQuote.materialsSubtotal,
            materials: fenceQuote.materials,
            labor: fenceQuote.labor,
            processSteps: fenceQuote.processSteps,
            generatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'approved',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        contract: {
          id: `CT-${Date.now()}-3`,
          contractNumber: `CT-2026-003`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'Patricia Davis',
          customerSignature: 'Patricia Davis',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'completed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (50%)',
              percentage: 50,
              amount: 4250,
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'completion',
              description: 'Final Payment (50%)',
              percentage: 50,
              amount: 4250,
              milestone: 'Project completion',
              status: 'invoiced'
            }
          ]
        },
        invoice: {
          invoiceNumber: 'INV-2026-001',
          invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalAmount: 8500,
          amountPaid: 4250,
          amountDue: 4250,
          status: 'sent'
        }
      };
      })(),
      (() => {
        const flooringQuote = generateDemoQuote({
          id: `PROJ-${Date.now()}-9`,
          title: 'Hardwood Floor Installation',
          description: 'Install oak hardwood flooring throughout main level (1,200 sq ft)',
          serviceType: 'Flooring Installation',
          estimatedValue: 15000
        });
        return {
          id: `PROJ-${Date.now()}-9`,
          itemNumber: `WR-2026-009`,
          stage: 'invoice',
          customerName: 'James Cooper',
          customerEmail: 'james.cooper@example.com',
          customerPhone: '(555) 888-9999',
          location: '753 Elm Street, Chicago, IL',
          serviceType: 'Flooring Installation',
          title: 'Hardwood Floor Installation',
          description: 'Install oak hardwood flooring throughout main level (1,200 sq ft)',
          estimatedValue: flooringQuote.totalCost,
          priority: 'low',
          createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          lastModified: new Date().toISOString(),
          assignedTo: 'Sarah Miller',
          quote: {
            quoteNumber: 'Q-2026-009',
            status: 'approved',
            sentDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
            approvedDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
            laborCost: flooringQuote.laborSubtotal,
            materialCost: flooringQuote.materialsSubtotal,
            totalCost: flooringQuote.totalCost,
            laborSubtotal: flooringQuote.laborSubtotal,
            materialsSubtotal: flooringQuote.materialsSubtotal,
            materials: flooringQuote.materials,
            labor: flooringQuote.labor,
            processSteps: flooringQuote.processSteps,
            generatedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
            approvalStatus: 'approved',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        contract: {
          id: `CT-${Date.now()}-4`,
          contractNumber: `CT-2026-004`,
          contractType: 'standard',
          signedDate: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString(),
          signedBy: 'James Cooper',
          customerSignature: 'James Cooper',
          companySignature: 'Authorized Representative',
          startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terms: 'Standard construction contract terms and conditions...',
          status: 'completed',
          paymentSchedule: [
            {
              id: 'PS-1',
              type: 'deposit',
              description: 'Initial Deposit (40%)',
              percentage: 40,
              amount: 6000,
              status: 'paid'
            },
            {
              id: 'PS-2',
              type: 'completion',
              description: 'Final Payment (60%)',
              percentage: 60,
              amount: 9000,
              milestone: 'Installation complete and approved',
              status: 'invoiced'
            }
          ]
        },
        invoice: {
          invoiceNumber: 'INV-2026-002',
          invoiceDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          totalAmount: 15000,
          amountPaid: 6000,
          amountDue: 9000,
          status: 'sent'
        }
      };
      })()
    ];

    // Save projects to localStorage (pipeline reads from here)
    try {
      localStorage.setItem('pipeline-items-demo', JSON.stringify(sampleProjects));
      console.log(`✅ Saved ${sampleProjects.length} sample projects to localStorage`);
      return sampleProjects.length;
    } catch (err) {
      console.error('❌ Error saving to localStorage:', err);
      throw err;
    }
  } catch (error) {
    console.error('❌ Error seeding pipeline data:', error);
    throw error;
  }
}
