import React from 'react';
import './ProgressBar.scss';
import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import { Progress } from '../components';

const ProgressBar = ({ data = [], percentage = 0 }) => {
  return (
    <Block name="overview-bar">
      <Elem name="content">
        <Elem name="content-title">Overall progress</Elem>
        <Progress percentage={percentage} color="#007bff" />
        <Elem name="content-body">
          {data.map((item, index) => (
            <Elem name="content-row" key={index}>
              <Elem name="label">
                <Elem
                  name="label_color"
                  style={{ backgroundColor: item.color }}
                />
                <Elem name="label_name">{item.name}</Elem>
              </Elem>
              <Elem name="value">{item.value}</Elem>
            </Elem>
          ))}
        </Elem>
      </Elem>
    </Block>
  );
};

export default ProgressBar;
