import { readFileSync } from 'fs';
import { join } from 'path';

export type FixturePerson = {
  username: string;
  email: string;
  miembro_id?: number;
  nombre?: string;
};

export type FixtureChecklistItem = {
  key: string;
  label: string;
  tipo: string;
  item_template_id: number;
  answer: string | null;
  option_test_id?: string;
};

export type FixtureManifest = {
  servicio_nombre: string;
  select_label: string;
  schedule_date: string;
  oferta_id: number;
  database_name: string;
  owner: FixturePerson;
  mechanic_checklist: FixturePerson;
  mechanic_visita: FixturePerson;
  mechanic_ocupado: FixturePerson;
  order_checklist: {
    id: number;
    instance_id: number;
    select_item_template_id: number;
  };
  order_open: { id: number };
  order_busy: { id: number };
  checklist: {
    template_id: number;
    template_nombre: string;
    item_count: number;
    items: FixtureChecklistItem[];
  };
};

function checklistReady(items: FixtureChecklistItem[] | undefined): items is FixtureChecklistItem[] {
  if (!items || items.length < 4) return false;
  const has = (key: string, tipo: string) => items.some((item) => {
    if (item.key !== key || item.tipo !== tipo || !item.label || !item.item_template_id) return false;
    if (tipo === 'TEXT') return true;
    if (!item.answer) return false;
    return tipo !== 'SELECT' || Boolean(item.option_test_id);
  });
  return has('hallazgo', 'TEXT') && has('aceite', 'SELECT') && has('frenos', 'SELECT') && has('neumaticos', 'NUMBER');
}

function isManifest(value: unknown): value is FixtureManifest {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<FixtureManifest>;
  return Boolean(
    row.owner?.email
    && row.mechanic_checklist?.email
    && row.mechanic_visita?.nombre
    && row.mechanic_ocupado?.nombre
    && row.order_checklist?.id
    && row.order_checklist.instance_id
    && row.order_checklist.select_item_template_id
    && row.order_open?.id
    && row.oferta_id
    && row.servicio_nombre
    && row.select_label
    && typeof row.schedule_date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(row.schedule_date)
    && typeof row.database_name === 'string'
    && row.database_name.length > 0
    && row.checklist?.template_id
    && row.checklist.template_nombre
    && row.checklist.item_count === row.checklist.items?.length
    && checklistReady(row.checklist.items)
  );
}

export function loadFixtureManifest(): FixtureManifest {
  const path = join(__dirname, 'fixture-manifest.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error(`No fixture manifest at ${path}. Run bash scripts/setup-backend-test.sh`);
  }
  if (!isManifest(parsed)) {
    throw new Error(`Fixture manifest at ${path} is missing ids. Re-run bash scripts/setup-backend-test.sh`);
  }
  return parsed;
}
