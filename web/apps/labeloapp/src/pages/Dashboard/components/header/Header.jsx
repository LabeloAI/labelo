import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import React from 'react';
import "./Header.scss"

export const Header = ({children}) => {
  return (
    <Block name="dashboard-header">
      <Elem name="name">{children}</Elem>
    </Block>
  );
};
