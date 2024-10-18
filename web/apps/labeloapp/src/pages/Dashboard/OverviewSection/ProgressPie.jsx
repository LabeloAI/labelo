import React from 'react';
import './ProgressPie.scss'
import { Block, Elem } from 'apps/labeloapp/src/utils/bem';

const ProgressPie = ({ title, data = [], children }) => {
  return (
    <Block name="overview-pie">
      <Elem name="content">
        <Elem name="content-title">{title}</Elem>
        <Elem name="content-body">
          <Elem name="content-row">
            {data.map((item, index) => (
              <Elem name="label" key={index}>
                <Elem
                  name="label_color"
                  style={{ backgroundColor: item.color }}
                />
                <Elem name="label_name">{item.name}</Elem>
              </Elem>
            ))}
          </Elem>
          <Elem name="content-row">
            {data.map((item, index) => (
              <Elem name="value" key={index}>{item.value}</Elem>
            ))}
          </Elem>
        </Elem>
      </Elem>
      <div>{children}</div>
    </Block>
  );
};

export default ProgressPie;
