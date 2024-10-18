import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { NavLink } from 'react-router-dom';
import { LsCross } from '../../../assets/icons';
import { Userpic } from '../../../components';
import { Block, Elem } from '../../../utils/bem';
import { Collapse, Divider, Select, Button,Modal, Empty, message, Popconfirm } from 'antd';
import './SelectedUser.scss';
import { useAPI } from '../../../providers/ApiProvider';
import { useConfig } from 'apps/labeloapp/src/providers/ConfigProvider';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserAddOutlined} from '@ant-design/icons';

// const { Option } = Select;

const UserProjectsLinks = ({ projects }) => {
  return (
    <Elem name="links-list">
      {projects.map((project) => (
        <Elem tag={NavLink} name="project-link" key={`project-${project.id}`} to={`/projects/${project.id}`} data-external>
          {project.title}
        </Elem>
      ))}
    </Elem>
  );
};

// const roleOptions = [
//   { value: 'administrator', label: 'Administrator' },
//   { value: 'manager', label: 'Manager' },
//   { value: 'annotater', label: 'Annotator' },
//   { value: 'reviewer', label: 'Reviewer' },
// ];

export const SelectedUser = ({ user, onClose }) => {
  // const [selectedRole, setSelectedRole] = useState({});
  const api = useAPI();
  const config = useConfig();
  const organization = config.user.active_organization;
  const [visible,setVisible] = useState(true);

  // const updateUserRole = useCallback(async (userId, newRole) => {
  //   const res = await api.callApi('updatememberships', {
  //     params: {
  //       pk: organization,
  //       user_id: userId,
  //     },
  //     body: {
  //       group: newRole,
  //     },
  //   });
  // }, [api, organization]);

  // const handleRoleChange = (userId, role) => {
  //   setSelectedRole(prevRoles => ({
  //     ...prevRoles,
  //     [userId]: role,
  //   }));  
  //   updateUserRole(userId, role).then(() => {
  //     window.location.reload();
  //   });
  // };

  // const renderRoleDropdown = (userId, userRole) => {
  //   if (userRole === 'Owner') {
  //     return 'Owner';
  //   } else {
  //     return (
  //       <Select
  //         value={selectedRole[userId] || user.active_org_role}
  //         onChange={(value) => handleRoleChange(userId, value)}
  //         bordered={false}
  //         style={{ width: 150 }}
  //       >
  //         {roleOptions.map((option) => (
  //           <Option key={option.value} value={option.value}>
  //             {option.label}
  //           </Option>
  //         ))}
  //       </Select>
  //     );
  //   }
  // };


  const revokeInvitation = useCallback(async () => {
    try {
      const response = await api.callApi('revokeInvitation', {
        body: {
          user: user.id,
        },
      });
      message.success({
        title:'Success',
        content:'Invitation has been revoked successfully.',
      });
      window.location.reload();
      
    } catch (error) {
      console.error('Error Revoking Invitation', error);
    }
  }, [api, user.id]);

  const resendInvitation = useCallback(async () => {
    try {
      const res = await api.callApi('resendInvitation', {
        body: {
          user: user.id,
        },
      });
      message.success({
        title:'Success',
        content:'Invitation has been resent successfully.',
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
    }
  }, [api, user.id]);

  const getStatusText = (status) => {
    switch (status) {
      case 'Active':
        return { text: 'Active', icon: <CheckCircleOutlined style={{ color: 'green' }} /> };
      case 'In Active':
        return { text: 'In Active', icon: <CloseCircleOutlined style={{ color: 'red' }} /> };
      case 'Invited':
        return { text: 'Invited', icon: <UserAddOutlined style={{ color: 'orange' }} /> };
      default:
        return { text: 'Unknown', icon: <ClockCircleOutlined /> }; 
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'green';
      case 'In Active':
        return 'red';
      case 'Invited':
        return 'orange';
      default:
        return 'black'; 
    }
  };
  
  const statusInfo = getStatusText(user.active_org_status);

  const handleClose = ()=> {
    setVisible(false);
    onClose();
  }

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={null}
      end
      width={500}
      className='user-inf0-modal'
    >
    <Block name="user-info">
      {/* <Elem name="close" tag={Button} type="link" onClick={onClose}>
        <LsCross />
      </Elem> */}
      <Elem name="header">
        <Userpic user={user} style={{ width: 64, height: 64, fontSize: 28 }} />
        {user.username && (
          <Elem tag="p" name="full-name">
            {user.username}
          </Elem>
        )}
        <Elem name="active-status" style={{ color: getStatusColor(user.active_org_status) }}>
          {statusInfo.icon} {statusInfo.text}
        </Elem>
        <Elem name="details-user">
          <Elem tag="p" name="email">
            <span>Email: </span>{user.email}
          </Elem>
          {user.phone && (
            <Elem tag="p" name="phone">
              Phone: <a href={`tel:${user.phone}`}>{user.phone}</a>
            </Elem>
          )}
          {user.active_org_role && (
            <Elem tag="p" name="role">
              <span>Role: </span>{user.active_org_role.toLowerCase()=== 'annotater' ? 'Annotator' :user.active_org_role}
              {/* <span>Role:</span> {renderRoleDropdown(user.id, user.active_org_role)} */}
            </Elem>
          )}
          <hr className="divider" />
        </Elem>
      </Elem>
      {(user.active_org_status === 'Active' || user.active_org_status === 'In Active') && (
        <Elem name="section">
          <Collapse>
            <Collapse.Panel header="CREATED PROJECTS" key="1">
              {user.created_projects.length > 0 ? (
                <UserProjectsLinks projects={user.created_projects} />
              ) : (
                <Empty description="No Created Projects"/>
              )}
            </Collapse.Panel>
          </Collapse>
        </Elem>
      )}
    
      {(user.active_org_status === 'Active' || user.active_org_status === 'In Active') && (
        <Elem name="section">
          <Collapse>
            <Collapse.Panel header="CONTRIBUTED TO" key="2">
              {user.contributed_to_projects.length > 0 ? (
                <UserProjectsLinks projects={user.contributed_to_projects} />
              ) : (
                <Empty description="No contributed projects" />
              )}
            </Collapse.Panel>
          </Collapse>
        </Elem>
      )}
    
      {user.active_org_status === 'Invited'  && (
        <Elem name="actions">
          <Popconfirm
            title="Are you sure want to resend this invitation?"
            onConfirm={resendInvitation}
            okText="Yes"
            cancelText="No"
          >
            <Button style={{ backgroundColor: 'green', color: 'white' }}>
              Resend Invitation
            </Button>
          </Popconfirm>
          <Popconfirm
            title="Are you sure you want to revoke this invitation?"
            onConfirm={revokeInvitation}
            okText="Yes"
            cancelText="No"
          >
            <Button style={{ backgroundColor: 'red', color: 'white' }}>
              Revoke Invitation
            </Button>
          </Popconfirm>
        </Elem>
      )}
    </Block>
    </Modal>
  );
};
