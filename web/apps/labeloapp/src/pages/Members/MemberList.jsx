import React, { useState, useEffect } from 'react';
import { Modal, Select, Button, message, Space, Empty } from 'antd'; 
import { ApiContext } from '../../providers/ApiProvider';
import { useProject } from '../../providers/ProjectProvider';
import { Block } from '../../utils/bem';
import './MemberList.scss';
import { Description } from '../../components/Description/Description';

const { Option } = Select;

export function MemberList({ onSave, onClose }) {
  const api = React.useContext(ApiContext);
  const [selectedUserId, setSelectedUserId] = useState(undefined);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(false);
  const { project } = useProject();

  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoading(true);
      try {
        const response = await api.callApi('getSelectedUsers', {
          params: {
            pk: project.id,
          },
        });
        if (response) {
          setUserList(response);
        }
      } catch (error) {
        console.error('Error fetching Users', error);
      } finally {
        setLoading(false);
      }
    };

    if (!userList.length) {
      fetchAllUsers();
    }
  }, [api, userList.length]);

  const handleSave = async () => {
    if (selectedUserId) {
      try {
        const res = await api.callApi('createMembers', {
          params: {
            pk: project.id,
          },
          body: {
            user: selectedUserId,
          },
        });
        const selectedUser = userList.find(user => user.id === selectedUserId);
        if (selectedUser) {
          onSave(selectedUser);
          message.success('User added Successfully!');
        }
      } catch (error) {
        console.error('Error creating user', error);
        message.error('Failed to add User');
      }
      onClose();
    }
  };

  return (
    <Modal
      visible
      title="Organisation Members"
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} disabled={!selectedUserId}>
          Save
        </Button>,
      ]}
    >
      <Description style={{ width: '100%', marginTop: 8 }}>
        Here's a list of all users. You can add members to the projects
      </Description>
      <Block name="role-select">
        <Select
          placeholder="Choose a member"
          value={selectedUserId}
          onChange={(value) => setSelectedUserId(value)}
          style={{ width: '100%' }}
          notFoundContent={!loading && userList.length === 0 ? <Empty description="No user exists in the organisation" /> : null}
        >
          {userList.map(user => (
            <Option key={user.id} value={user.id}>
              {user.email}
            </Option>
          ))}
        </Select>
      </Block>
    </Modal>
  );
}
