import React from 'react';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { origenOrdenPresentation, type OrigenOrden } from '@/utils/ordenProveedorUnificada';

type Props = {
  origen: OrigenOrden;
};

export function OrigenOrdenBadge({ origen }: Props) {
  const { label, tagVariant } = origenOrdenPresentation(origen);

  return (
    <InstitutionalTag
      label={label}
      variant={tagVariant}
      size="sm"
    />
  );
}
