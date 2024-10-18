import React from 'react';
import { Block, Elem, cn } from 'apps/labeloapp/src/utils/bem';
import './DataBlock.scss';
import { Tooltip } from 'apps/labeloapp/src/components/Tooltip/Tooltip';
import { IconInfoOutline } from 'apps/labeloapp/src/assets/icons';

export const DataBlock = ({ title, data, unit, tooltip, ...rest }) => {
  return (
    <Block name="dashboard-datablock" {...rest}>
      <Elem name="title">
        {title}

        {tooltip && (
          <Tooltip title={tooltip}>
            <IconInfoOutline
              className={cn('help-icon')}
              width="14"
              height="14"
            />
          </Tooltip>
        )}
      </Elem>
      <Elem name="value">
        <Elem name="data">{data}</Elem>
        {unit && <Elem name="unit">{unit}</Elem>}
      </Elem>
      <Elem name="progress" />
    </Block>
  );
};
