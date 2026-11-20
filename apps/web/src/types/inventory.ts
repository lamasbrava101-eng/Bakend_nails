export interface InventoryItemRecord {
  id: string;
  name: string;
  brand: string | null;
  quantity: number;
  unit: string;
  cost: number;
  purchasedAt: string | null;
  notes: string | null;
  criticalThreshold: number | null;
  createdAt: string;
  deletedAt: string | null;
}
