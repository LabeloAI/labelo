import React from 'react'
import { Block } from 'apps/labeloapp/src/utils/bem'
import "./Card.scss"

export const Card = ({children, classNames, ...rest}) => {
  return (
    <Block name='dashboard-card' {...rest}>{children}</Block>
  )
}
