/**
 * Seed Pipeline Data Utility
 * Generates sample data for the Unified Project Pipeline
 */

import { projectId, publicAnonKey } from './supabase/info';

export async function seedPipelineData(): Promise<number> {
  console.log('🌱 Starting pipeline data seed...');
  
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/seed-pipeline-data`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Seed data failed:', errorText);
      throw new Error(`Failed to seed data: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Seed data response:', data);
    
    return data.count || 0;
  } catch (error) {
    console.error('❌ Error seeding pipeline data:', error);
    throw error;
  }
}
