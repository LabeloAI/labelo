import React from 'react';
import './Progress.scss';
import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import chroma from 'chroma-js';

export const Progress = ({ percentage = 10, color = '#76c7c0' }) => {
  // create a light color using chroma-js
  const lighterColor = chroma.mix(color, 'white', 0.7).hex();

  const containerStyle = {
    backgroundColor: lighterColor,
  };
  const fillStyle = {
    width: `${percentage}%`,
    backgroundColor: color,
  };
  return (
    <Block name="dashboard-progress" style={containerStyle}>
      <Elem name="fill" style={fillStyle}></Elem>
    </Block>
  );
};
