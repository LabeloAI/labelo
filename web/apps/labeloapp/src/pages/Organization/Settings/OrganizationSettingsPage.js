import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { Block } from 'apps/labeloapp/src/utils/bem';
import { Space, Input, message, Table, Tag, Button as AntButton, Card } from 'antd';
import { useAPI } from 'apps/labeloapp/src/providers/ApiProvider';
import { useConfig } from 'apps/labeloapp/src/providers/ConfigProvider';
import { Button } from 'apps/labeloapp/src/components';
import './OrganizationSettings.scss';
import { OrganizationModal } from 'apps/labeloapp/src/components';
import DeleteOrganizationModal from 'apps/labeloapp/src/components/Organization/OrganizationDeleteModal';
import LeaveOrganizationModal from 'apps/labeloapp/src/components/Organization/OrganizationLeaveModal';
import { OrganizationEditModal } from 'apps/labeloapp/src/components/Organization/OrganizationEditModal';

const columns = (currentOrganizationId, handleEdit) => [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <span>
        {text}
        {record.id === currentOrganizationId && (
          <>
            <Tag color="green" style={{ marginLeft: 8 }}>Current</Tag>
          </>
        )}
      </span>
    ),
  },
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
    title: 'Owner',
    dataIndex: 'owner',
    key: 'owner',
  },
  {
    title: 'Created At',
    dataIndex: 'created_at',
    key: 'created_at',
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
  },
];

export const OrganizationSettingsPage = () => {
  const [organizationName, setOrganizationName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationOwner, setOrganizationOwner] = useState('');
  const [organizationCreatedAt, setOrganizationCreatedAt] = useState('');
  const [organizationRole, setOrganizationRole] = useState('');
  const [dataSource, setDataSource] = useState([]);
  const api = useAPI();
  const config = useConfig();
  const organization = config.user.active_organization;
  const currentUser = config.user.email;
  const orgId = config.user.active_organization;
  const userId = config.user.id;
  const history = useHistory();

  const [orgCreateModal, setOrgCreateModal] = useState(false);
  const [orgEditModal, setOrgEditModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState(null);

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [organizationToLeave, setOrganizationToLeave] = useState(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const organizationData = await api.callApi('getOrganizations');
        const userOrganization = organizationData.find(org => org.id === organization);
        setOrganizationName(userOrganization.title);
        setOrganizationId(userOrganization.id);
        setOrganizationOwner(userOrganization.created_by.email);
        setOrganizationCreatedAt(userOrganization.created_at);
        setOrganizationRole(userOrganization.current_user_role);

        const formattedData = organizationData.map((org, index) => ({
          key: index.toString(),
          name: org.title,
          id: org.id,
          owner: org.created_by.email,
          created_at: org.created_at,
          role: org.current_user_role,
        }));
        setDataSource(formattedData);

      } catch (error) {
        console.error('Error fetching current organization:', error);
      }
    };

    fetchOrganization();
  }, [api, organization]);

  const handleOrgModalSave = async () => {
    message.success('Organization created successfully!');
    setOrgCreateModal(false);

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleLeave = () => {
    setLeaveModalVisible(true);
  };

  const handleLeaveConfirmation = async (orgId) => {
    try {
      const orgId = config.user.active_organization;
      const userPk = config.user.id;

      await api.callApi('deleteUserOrganisation', { params: { pk: orgId, user_pk: userPk } });
      message.success('Successfully left the organization.');
      setDataSource(prev => prev.filter(org => org.id !== orgId));
      setLeaveModalVisible(false);
      // window.location.reload();
      history.push('/projects');
    } catch (error) {
      console.error('Error leaving organization:', error);
      message.error('Failed to leave the organization.');
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirmation = async () => {
    try {
      await api.callApi('deleteOrganization', { params: { pk: orgId } });
      message.success('Organization deleted successfully!');
      setDeleteModalVisible(false);
      history.push('/projects');

      // setTimeout(() => {
      //   window.location.reload();
      // }, 1000);
    } catch (error) {
      console.error('Error deleting organization:', error);
      message.error('Failed to delete the organization.');
    }
  };

  const handleEdit = (record) => {
    setEditingOrg(record);
    setOrgEditModal(true);
  };

  const handleOrgEditSave = async (updatedOrg) => {
    try {
      await api.callApi('editOrganization', { params: { pk: updatedOrg.id }, body: { title: updatedOrg.name } });
      message.success('Organization updated successfully!');
      setOrgEditModal(false);
  
      setDataSource(prev =>
        prev.map(org => (org.id === updatedOrg.id ? { ...org, ...updatedOrg } : org))
      );
  
      if (updatedOrg.id === organizationId) {
        setOrganizationName(updatedOrg.name);
      }
  
      window.location.reload();
     
    } catch (error) {
      console.error('Error updating organization:', error);
      message.error('Failed to update the organization.');
    }
  };

  const handleSaveOrganizationName = async () => {
    if(organizationName && organizationName !== ''){
      try {
        await api.callApi('editOrganization', { params: { pk: organizationId }, body: { title: organizationName } });
        message.success('Organization name updated successfully!');
      } catch (error) {
        console.error('Error updating organization name:', error);
        message.error('Failed to update the organization name.');
      }
    }
  };

  const isOwner = organizationRole.toLowerCase() === 'owner';

  return (
    <Block name="organization-settings">
      <div className="ls-organization-settings">
        <Card title="Current Organization Info" className="ls-card ls-current-organization-card">
          <div className="ls-input-container">
            <label>Organization Name:</label>
            <Input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} disabled={!isOwner}/>
          </div>
          <div className="ls-input-container">
            <label>Organization ID:</label>
            <Input value={organizationId} disabled />
          </div>
          <div className="ls-input-container">
            <label>Organization Owner:</label>
            <Input value={organizationOwner} disabled />
          </div>
          <div className="ls-input-container">
            <label>Organization Created At:</label>
            <Input value={organizationCreatedAt} disabled />
          </div>
          <div className="ls-input-container">
            <label>Role:</label>
            <Input value={organizationRole} disabled />
          </div>
          <div className="button-group">
            <Space>
              {organizationRole.toLocaleLowerCase() === 'owner' ? (
                <AntButton type="danger" onClick={handleDelete}>
                  Delete Organization
                </AntButton>
              ) : (
                <AntButton type="danger" onClick={handleLeave}>
                  Leave Organization
                </AntButton>
              )}
              <AntButton type="primary" onClick={handleSaveOrganizationName} disabled={!isOwner}>
                Save Changes
              </AntButton>
            </Space>
          </div>

        </Card>

        <Card title="Organization Details" className="ls-card ls-organization-details-card">
          <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '30px',
            }}>
          <Button look="primary" className="ls-create-org-btn" onClick={() => setOrgCreateModal(true)}>
                Create New Organization
          </Button>
        </div>
          <Table
            className="ls-organization-settings-table"
            columns={columns(organizationId, handleEdit)}
            dataSource={dataSource}
            pagination={false}
            locale={{ emptyText: 'No organizations found' }}
          />
        </Card>

        {orgCreateModal && (
          <OrganizationModal
            visible={orgCreateModal}
            onClose={() => setOrgCreateModal(false)}
            onSave={handleOrgModalSave}
          />
        )}

        {orgEditModal && (
          <OrganizationEditModal
            visible={orgEditModal}
            onClose={() => setOrgEditModal(false)}
            onSave={handleOrgEditSave}
            organization={editingOrg}
          />
        )}

        {deleteModalVisible && (
          <DeleteOrganizationModal
            visible={deleteModalVisible}
            onCancel={() => setDeleteModalVisible(false)}
            onConfirm={handleDeleteConfirmation}
          />
        )}

        {leaveModalVisible && (
          <LeaveOrganizationModal
            visible={leaveModalVisible}
            onCancel={() => setLeaveModalVisible(false)}
            onConfirm={handleLeaveConfirmation}
            organization={organizationToLeave}
          />
        )}
      </div>
    </Block>
  );
};

OrganizationSettingsPage.title = "Organization & Settings";
OrganizationSettingsPage.path = "/settings/organization";
OrganizationSettingsPage.exact = true;
