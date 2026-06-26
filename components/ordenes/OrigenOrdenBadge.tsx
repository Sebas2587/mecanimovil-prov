import React from 'react';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import type { OrigenOrden } from '@/utils/ordenProveedorUnificada';

type Props = {
  origen: OrigenOrden;
};

export function OrigenOrdenBadge({ origen }: Props) {
  const esPersonal = origen === 'personal';

  return (
    <InstitutionalTag
      label={esPersonal ? 'Personal' : 'Mecanimovil'}
      variant={esPersonal ? 'primary' : 'success'}
      size="sm"
    />
  );
}
