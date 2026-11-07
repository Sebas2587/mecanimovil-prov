import { readFileSync } from 'fs';
import { join } from 'path';

export type FixturePerson = {
  username: string;
  email: string;
  miembro_id?: number;
  nombre?: string;
};

export type FixtureManifest = {
  servicio_nombre: string;
  select_label: string;
  schedule_date: string;
  oferta_id: number;
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
};

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
