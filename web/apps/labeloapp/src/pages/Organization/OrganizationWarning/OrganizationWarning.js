import React from 'react';
import { Button } from 'apps/labeloapp/src/components';
import { Block } from 'apps/labeloapp/src/utils/bem';
import './OrganizationWarning.scss';

export const OrganizationWarning = () => {
  return (
    <Block name="organization-warning">
      <h1>No Organization Assigned!!!</h1>
      <p>You are not assigned to any organization. Please contact your administrator to be assigned to an organization.</p>
    </Block>
  );
}

OrganizationWarning.title = "Organization Warning";
OrganizationWarning.path = "/warning/organization";
OrganizationWarning.exact = true;   