/**
 * The portal upgrade prices, as they stand today.
 *
 * WHY THIS IS ITS OWN FILE NOW
 *
 * It used to sit in `index.tsx`, which made it unreadable from anywhere that
 * `index.tsx` imports — including the plan catalogue, which needs it to import
 * these rows into `plan_tier:` and `plan_addon:` records. Moving it here is the
 * smallest change that breaks the cycle; nothing about its contents changed.
 *
 * WHAT IT IS FOR, AND FOR HOW LONG
 *
 * This is the map portal checkout validates a posted amount against, so it is
 * load-bearing until U4 of `tasks/plan-catalogue-unification.md` points that
 * check at the catalogue instead. It is scheduled for deletion, not for
 * extension: a new plan belongs in the catalogue, where it can carry a Stripe
 * price. Adding a row here creates a plan that can be validated and never
 * bought.
 *
 * The `*_maintenance` rows were always a separate product sold alongside the
 * portal plan rather than a rung on the ladder. They are the first thing the
 * importer turns into add-ons.
 */
export const PORTAL_UPGRADE_PRICES: Record<string, number> = {
  'customer:customer pro': 29, 'customer:customer premium': 79,
  'vendor:vendor basic': 99, 'vendor:vendor professional': 199, 'vendor:vendor premium': 399, 'vendor:vendor elite': 799,
  'subcontractor:subcontractor basic': 49, 'subcontractor:subcontractor pro': 99, 'subcontractor:subcontractor enterprise': 199,
  'advertiser:advertiser starter': 199, 'advertiser:advertiser growth': 499, 'advertiser:advertiser enterprise': 999,
  'investor:investor premium': 299, 'employee:employee pro': 5,
  'property_manager:property_manager basic': 149, 'property_manager:property_manager professional': 299, 'property_manager:property_manager enterprise': 599,
  'landlord:landlord basic': 29, 'landlord:landlord premium': 79, 'condo_manager:condo_manager basic': 199, 'condo_manager:condo_manager premium': 399,
  'customer_maintenance:customer standard maintenance': 99, 'customer_maintenance:customer priority maintenance': 199, 'customer_maintenance:customer premium maintenance': 399,
  'vendor_maintenance:vendor standard maintenance': 99, 'vendor_maintenance:vendor priority maintenance': 199, 'vendor_maintenance:vendor premium maintenance': 399,
  'subcontractor_maintenance:subcontractor standard maintenance': 99, 'subcontractor_maintenance:subcontractor priority maintenance': 199, 'subcontractor_maintenance:subcontractor premium maintenance': 399,
  'advertiser_maintenance:advertiser standard maintenance': 99, 'advertiser_maintenance:advertiser priority maintenance': 199, 'advertiser_maintenance:advertiser premium maintenance': 399,
  'investor_maintenance:investor standard maintenance': 99, 'investor_maintenance:investor priority maintenance': 199, 'investor_maintenance:investor premium maintenance': 399,
  'employee_maintenance:employee standard maintenance': 99, 'employee_maintenance:employee priority maintenance': 199, 'employee_maintenance:employee premium maintenance': 399,
  'property_manager_maintenance:property_manager standard maintenance': 99, 'property_manager_maintenance:property_manager priority maintenance': 199, 'property_manager_maintenance:property_manager premium maintenance': 399,
  'landlord_maintenance:landlord standard maintenance': 99, 'landlord_maintenance:landlord priority maintenance': 199, 'landlord_maintenance:landlord premium maintenance': 399,
  'condo_manager_maintenance:condo_manager standard maintenance': 99, 'condo_manager_maintenance:condo_manager priority maintenance': 199, 'condo_manager_maintenance:condo_manager premium maintenance': 399,
};
