import React, { useState } from 'react';
import { Button } from '../Button/Button';
import { Input } from '../Form';
import { useAPI } from '../../providers/ApiProvider';
import { Space } from '../Space/Space';
import { Modal } from 'antd';
// import{ Divider }from"antd";
import {Divider} from 'antd';
import { useConfig } from '../../providers/ConfigProvider';
// import{ Button }from"antd";

export function OrganizationSettings({ onSave, onClose }) {
    const api = useAPI();
    const config = useConfig();
    const organization = config.user.active_organization
    // console.log('config',config)

    const [orgName, setOrgName] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);

    React.useEffect(() => {
        const fetchOrganizations = async () => {
          try {
            const response = await api.callApi('getOrganizations');
            setOrgName(response);
      
            const currentUserOrganization = response.find(org => org.id === organization);
            if (currentUserOrganization) {
              setSelectedOrg(currentUserOrganization);
            }
          } catch (error) {
            console.error('Error fetching organizations:', error);
          }
        };
      
        fetchOrganizations();
      }, [api, organization]);


  return (
    <Modal
    open
    // onOk={handleSave}
    onCancel={onClose}  
    >
    <div className="workspace-modal">
      <div className="workspace-modal-content">
        <h2>Organization Settings</h2>
        <span>Change the settings for your current organization here.</span>
        <Divider/>
        <Input 
          type="text" 
          label="Organization Name"
          value={selectedOrg ? selectedOrg.title : 'Select Organization'}
        />
        {/* <span>Organization created at</span> */}
        <Divider/>
        <h3>Leave Organization</h3>
        <span>This will unassign any tasks or datasets associated to your account and you will no longer have the access to this organization</span>
        <Button>Leave Organization</Button>
      </div>
    </div>
    <Divider/>
    </Modal> 
  );
}