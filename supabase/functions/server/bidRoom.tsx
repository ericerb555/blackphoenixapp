/**
 * bidRoom — server routes backing BidRoomV2.tsx.
 *
 * Persists jobs (with their embedded contractor bids) so bid review actions —
 * editing an amount, approving/sending, rejecting — actually survive refreshes
 * instead of only firing a toast. On first read a small realistic starter set is
 * seeded (idempotent) so the room isn't empty.
 *
 * KV keys:
 *   bid_room_job:{id} → job record (includes bids[])
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const bidRoomRouter = new Hono();
const PREFIX = "/make-server-57095a78";

bidRoomRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

const SEED_JOBS = [
  {
    id: "j1",
    title: "Commercial HVAC System Installation",
    description: "Full HVAC replacement for 5,000 sq ft office building",
    type: "quote",
    jobCategory: "HVAC",
    status: "bidding",
    customerName: "Acme Corp",
    customerLocation: "123 Business Blvd",
    postedDate: "2024-01-15",
    deadline: "2024-01-25",
    budget: { min: 15000, max: 25000 },
    priority: "high",
    requirements: ["Licensed HVAC contractor", "5+ years experience", "Commercial insurance"],
    attachments: ["blueprint.pdf", "specs.pdf"],
    quoteNumber: "Q-2024-001",
    viewCount: 24,
    bids: [
      {
        id: "b1", contractorId: "c1", amount: 18500, estimatedDuration: "2 weeks",
        proposedStartDate: "2024-02-01",
        notes: "Includes premium Carrier units with 10-year warranty. We can start immediately.",
        submittedAt: "2024-01-16T10:30:00", status: "pending_owner", ownerStatus: "pending",
        materials: [
          { name: "Carrier HVAC Unit", cost: 12000 },
          { name: "Ductwork & Fittings", cost: 2500 },
          { name: "Controls & Sensors", cost: 1500 },
        ],
        labor: 2500, warranty: "10 years parts, 2 years labor",
      },
      {
        id: "b2", contractorId: "c2", amount: 22000, estimatedDuration: "3 weeks",
        proposedStartDate: "2024-02-05",
        notes: "Premium Trane system with advanced climate control. Energy efficient.",
        submittedAt: "2024-01-16T14:20:00", status: "pending_owner", ownerStatus: "pending",
        materials: [
          { name: "Trane HVAC System", cost: 14000 },
          { name: "Smart Thermostat", cost: 800 },
          { name: "Installation Materials", cost: 3200 },
        ],
        labor: 4000, warranty: "12 years parts, 3 years labor",
      },
    ],
  },
  {
    id: "j2",
    title: "Emergency Electrical Panel Upgrade",
    description: "Urgent electrical panel replacement due to safety concerns",
    type: "emergency",
    jobCategory: "Electrical",
    status: "bidding",
    customerName: "Smith Residence",
    customerLocation: "456 Oak Street",
    postedDate: "2024-01-16",
    deadline: "2024-01-18",
    budget: { min: 2000, max: 4000 },
    priority: "urgent",
    requirements: ["Licensed electrician", "Same-day availability", "City permits"],
    attachments: ["current_panel.jpg"],
    quoteNumber: "Q-2024-002",
    viewCount: 18,
    bids: [
      {
        id: "b3", contractorId: "c2", amount: 3200, estimatedDuration: "1 day",
        proposedStartDate: "2024-01-17",
        notes: "Can start tomorrow morning. Will handle all permits.",
        submittedAt: "2024-01-16T16:45:00", status: "pending_owner", ownerStatus: "pending",
        materials: [
          { name: "200A Panel", cost: 800 },
          { name: "Breakers & Wiring", cost: 600 },
          { name: "Permits", cost: 300 },
        ],
        labor: 1500, warranty: "5 years",
      },
    ],
  },
  {
    id: "j3",
    title: "Office Renovation - Complete Remodel",
    description: "Full office renovation including walls, flooring, and paint",
    type: "work-request",
    jobCategory: "General Contracting",
    status: "bidding",
    customerName: "Tech Startup Inc",
    customerLocation: "789 Innovation Way",
    postedDate: "2024-01-14",
    deadline: "2024-01-28",
    budget: { min: 30000, max: 45000 },
    priority: "medium",
    requirements: ["General contractor license", "Portfolio of similar work", "References"],
    attachments: ["floor_plan.pdf", "inspiration.jpg"],
    quoteNumber: "Q-2024-003",
    viewCount: 31,
    bids: [
      {
        id: "b4", contractorId: "c3", amount: 38500, estimatedDuration: "4 weeks",
        proposedStartDate: "2024-02-10",
        notes: "Experienced in modern office design. Portfolio available.",
        submittedAt: "2024-01-15T09:15:00", status: "pending_owner", ownerStatus: "pending",
        materials: [
          { name: "Flooring Materials", cost: 8000 },
          { name: "Drywall & Paint", cost: 5000 },
          { name: "Fixtures & Hardware", cost: 4500 },
        ],
        labor: 21000, warranty: "2 years workmanship",
      },
    ],
  },
];

bidRoomRouter.get(`${PREFIX}/bid-room/jobs`, async (c) => {
  try {
    let jobs = await kv.getByPrefix("bid_room_job:");
    if (!jobs || jobs.length === 0) {
      await kv.mset(SEED_JOBS.map((j) => ({ key: `bid_room_job:${j.id}`, value: j })));
      jobs = SEED_JOBS;
    }
    return c.json({ jobs });
  } catch (error) {
    console.error("[BidRoom] Error fetching jobs:", error);
    return c.json({ error: "Failed to load bid room jobs", details: String(error) }, 500);
  }
});

bidRoomRouter.post(`${PREFIX}/bid-room/jobs`, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `job-${Date.now()}`;
    const record = { status: "bidding", bids: [], viewCount: 0, ...body, id };
    await kv.set(`bid_room_job:${id}`, record);
    return c.json({ success: true, job: record });
  } catch (error) {
    console.error("[BidRoom] Error creating job:", error);
    return c.json({ error: "Failed to create job", details: String(error) }, 500);
  }
});

// Update a whole job (used to persist bid edits / approvals / rejections, since
// bids are embedded in the job record).
bidRoomRouter.put(`${PREFIX}/bid-room/jobs/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`bid_room_job:${id}`);
    if (!existing) return c.json({ error: "Job not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`bid_room_job:${id}`, updated);
    return c.json({ success: true, job: updated });
  } catch (error) {
    console.error("[BidRoom] Error updating job:", error);
    return c.json({ error: "Failed to update job", details: String(error) }, 500);
  }
});

bidRoomRouter.delete(`${PREFIX}/bid-room/jobs/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`bid_room_job:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[BidRoom] Error deleting job:", error);
    return c.json({ error: "Failed to delete job", details: String(error) }, 500);
  }
});

export default bidRoomRouter;
