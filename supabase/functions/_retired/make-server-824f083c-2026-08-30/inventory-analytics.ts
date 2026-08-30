/**
 * Inventory Analytics Routes
 * 
 * Server routes for inventory analytics and reporting.
 */

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', user: null };
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return { error: 'Unauthorized', user: null };
  }

  return { error: null, user };
}

// Get company ID from user metadata
function getCompanyId(user: any): string {
  return user.user_metadata?.company_id || user.id;
}

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// GET /make-server-824f083c/inventory/analytics/inventory - Inventory analytics
app.get('/make-server-824f083c/inventory/analytics/inventory', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);
    const { start_date, end_date } = c.req.query();

    // Get all inventory items
    const itemsList = await kv.getByPrefix(`inventory_list:${companyId}:`);
    const items = itemsList.map((item: any) => item.value);

    // Calculate totals
    const totalItems = items.length;
    const totalValue = items.reduce((sum: number, item: any) => 
      sum + (item.quantity_on_hand * item.average_cost), 0
    );

    // Count status
    const lowStockItems = items.filter((item: any) => 
      item.quantity_on_hand > 0 && item.quantity_on_hand <= item.reorder_point
    ).length;

    const outOfStockItems = items.filter((item: any) => 
      item.quantity_on_hand <= 0
    ).length;

    const itemsOnOrder = items.filter((item: any) => 
      item.quantity_on_order > 0
    ).length;

    // Group by category
    const byCategory: Record<string, any> = {};
    items.forEach((item: any) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { count: 0, value: 0 };
      }
      byCategory[item.category].count++;
      byCategory[item.category].value += item.quantity_on_hand * item.average_cost;
    });

    // Group by status
    const byStatus: Record<string, number> = {};
    items.forEach((item: any) => {
      const status = item.status || 'in_stock';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // Calculate turnover (simplified - would need sales data)
    const turnoverRate = 4.5; // Placeholder
    const daysOfInventory = 365 / turnoverRate;

    // Top items by value
    const topItems = items
      .map((item: any) => ({
        item_id: item.id,
        name: item.name,
        quantity: item.quantity_on_hand,
        value: item.quantity_on_hand * item.average_cost,
      }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10);

    // Items needing reorder
    const reorderNeeded = items
      .filter((item: any) => item.quantity_on_hand <= item.reorder_point && item.auto_reorder)
      .map((item: any) => ({
        item_id: item.id,
        name: item.name,
        current_quantity: item.quantity_on_hand,
        reorder_point: item.reorder_point,
      }));

    return c.json({
      total_items: totalItems,
      total_value: totalValue,
      low_stock_items: lowStockItems,
      out_of_stock_items: outOfStockItems,
      items_on_order: itemsOnOrder,
      by_category: byCategory,
      by_status: byStatus,
      turnover_rate: turnoverRate,
      days_of_inventory: daysOfInventory,
      top_items: topItems,
      reorder_needed: reorderNeeded,
    });
  } catch (error: any) {
    console.error('Error fetching inventory analytics:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/analytics/equipment - Equipment analytics
app.get('/make-server-824f083c/inventory/analytics/equipment', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);

    // Get all equipment
    const equipmentList = await kv.getByPrefix(`equipment_list:${companyId}:`);
    const equipment = equipmentList.map((eq: any) => eq.value);

    // Calculate totals
    const totalEquipment = equipment.length;
    const totalValue = equipment.reduce((sum: number, eq: any) => 
      sum + (eq.purchase_price || 0), 0
    );

    // Calculate depreciated value
    const depreciatedValue = equipment.reduce((sum: number, eq: any) => {
      if (!eq.purchase_price || !eq.purchase_date) return sum;

      const purchaseDate = new Date(eq.purchase_date);
      const now = new Date();
      const monthsOwned = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                         (now.getMonth() - purchaseDate.getMonth());

      let depreciation = 0;
      
      if (eq.depreciation_method === 'straight_line') {
        const usefulLife = 5;
        const annualDepreciation = (eq.purchase_price - (eq.salvage_value || 0)) / usefulLife;
        depreciation = (annualDepreciation / 12) * monthsOwned;
      } else if (eq.depreciation_method === 'declining_balance') {
        const rate = (eq.depreciation_rate || 20) / 100;
        const years = monthsOwned / 12;
        depreciation = eq.purchase_price * (1 - Math.pow(1 - rate, years));
      }

      const currentValue = Math.max(
        eq.purchase_price - depreciation,
        eq.salvage_value || 0
      );

      return sum + currentValue;
    }, 0);

    // Group by type
    const byType: Record<string, number> = {};
    equipment.forEach((eq: any) => {
      const type = eq.type || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Group by status
    const byStatus: Record<string, number> = {};
    equipment.forEach((eq: any) => {
      const status = eq.status || 'available';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // Group by condition
    const byCondition: Record<string, number> = {};
    equipment.forEach((eq: any) => {
      const condition = eq.condition || 'good';
      byCondition[condition] = (byCondition[condition] || 0) + 1;
    });

    // Calculate utilization rate
    const inUse = byStatus.in_use || 0;
    const utilizationRate = totalEquipment > 0 ? (inUse / totalEquipment) * 100 : 0;

    // Calculate average age
    const totalMonths = equipment.reduce((sum: number, eq: any) => {
      if (!eq.purchase_date) return sum;
      const purchaseDate = new Date(eq.purchase_date);
      const now = new Date();
      const months = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + 
                    (now.getMonth() - purchaseDate.getMonth());
      return sum + months;
    }, 0);
    const averageAgeMonths = totalEquipment > 0 ? totalMonths / totalEquipment : 0;

    // Maintenance tracking
    const today = new Date();
    const maintenanceDue = equipment.filter((eq: any) => {
      if (!eq.next_maintenance_date) return false;
      return new Date(eq.next_maintenance_date) <= today;
    }).length;

    const overdueMaintenance = equipment.filter((eq: any) => {
      if (!eq.next_maintenance_date) return false;
      const nextDate = new Date(eq.next_maintenance_date);
      const daysDiff = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > 0;
    }).length;

    // Total hours
    const totalHoursUsed = equipment.reduce((sum: number, eq: any) => 
      sum + (eq.total_hours_used || 0), 0
    );
    const averageHoursPerEquipment = totalEquipment > 0 ? totalHoursUsed / totalEquipment : 0;

    return c.json({
      total_equipment: totalEquipment,
      total_value: totalValue,
      depreciated_value: depreciatedValue,
      by_type: byType,
      by_status: byStatus,
      by_condition: byCondition,
      utilization_rate: utilizationRate,
      average_age_months: averageAgeMonths,
      maintenance_due: maintenanceDue,
      overdue_maintenance: overdueMaintenance,
      total_hours_used: totalHoursUsed,
      average_hours_per_equipment: averageHoursPerEquipment,
    });
  } catch (error: any) {
    console.error('Error fetching equipment analytics:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/analytics/valuation - Inventory valuation
app.get('/make-server-824f083c/inventory/analytics/valuation', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const companyId = getCompanyId(user);

    // Get all inventory items
    const itemsList = await kv.getByPrefix(`inventory_list:${companyId}:`);
    const items = itemsList.map((item: any) => item.value);

    // Total value
    const totalValue = items.reduce((sum: number, item: any) => 
      sum + (item.quantity_on_hand * item.average_cost), 0
    );

    // By category
    const byCategory: Record<string, number> = {};
    items.forEach((item: any) => {
      const category = item.category || 'other';
      const value = item.quantity_on_hand * item.average_cost;
      byCategory[category] = (byCategory[category] || 0) + value;
    });

    // By location
    const byLocation: Record<string, number> = {};
    items.forEach((item: any) => {
      const location = item.warehouse_location || 'Unknown';
      const value = item.quantity_on_hand * item.average_cost;
      byLocation[location] = (byLocation[location] || 0) + value;
    });

    return c.json({
      total_value: totalValue,
      by_category: byCategory,
      by_location: byLocation,
    });
  } catch (error: any) {
    console.error('Error fetching inventory valuation:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /make-server-824f083c/inventory/analytics/stock-movement/:itemId - Stock movement
app.get('/make-server-824f083c/inventory/analytics/stock-movement/:itemId', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { error: authError, user } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: authError }, 401);
    }

    const itemId = c.req.param('itemId');
    const { start_date, end_date } = c.req.query();

    // Get transactions for item
    const transactionsList = await kv.getByPrefix(`stock_transactions:${itemId}:`);
    let transactions = transactionsList.map((tx: any) => tx.value);

    // Filter by date range
    if (start_date) {
      transactions = transactions.filter((tx: any) => tx.performed_at >= start_date);
    }
    if (end_date) {
      transactions = transactions.filter((tx: any) => tx.performed_at <= end_date);
    }

    // Calculate summary
    const totalIn = transactions
      .filter((tx: any) => tx.quantity > 0)
      .reduce((sum: number, tx: any) => sum + tx.quantity, 0);

    const totalOut = transactions
      .filter((tx: any) => tx.quantity < 0)
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.quantity), 0);

    const netChange = totalIn - totalOut;

    return c.json({
      transactions,
      summary: {
        total_in: totalIn,
        total_out: totalOut,
        net_change: netChange,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock movement:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
