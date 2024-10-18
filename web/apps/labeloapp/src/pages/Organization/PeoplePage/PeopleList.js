import React, { useCallback, useEffect, useState } from 'react';
import './PeopleList.scss';
import { CopyableTooltip } from '../../../components/CopyableTooltip/CopyableTooltip';
import { Button, Tag, Popconfirm, Select, Pagination, message, Empty, Table, Modal } from 'antd';
import { DeleteOutlined, ZoomInOutlined } from '@ant-design/icons';
import { useAPI } from "apps/labeloapp/src/providers/ApiProvider";
import { useConfig } from "apps/labeloapp/src/providers/ConfigProvider";
import { formatDistance } from "date-fns";
import { Userpic } from "../../../components";
import { Spinner } from '../../../components';
import { InfoCircleOutlined } from '@ant-design/icons';
import { title } from 'process';
import { render } from 'react-dom';
import { RiInformationFill } from 'react-icons/ri';

const { Option } = Select;

const roleOptions = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'annotater', label: 'Annotator' },
  { value: 'reviewer', label: 'Reviewer' },
];

const roleMapping = {
  'administrator':'Administrator',
  'manager':'Manager',
  'annotater':'Annotator',
  'reviewer':'Reviewer'
};

const getRoleLabel = (role) => roleMapping[role.toLowerCase()] || role;

export const PeopleList = ({ onSelect, selectedUser, defaultSelected, userList }) => {
  const api = useAPI();
  const config = useConfig();
  const organization = config.user.active_organization;

  const [userListState, setUserListState] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState({});
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    if (userList) {
      setUserListState(userList);
      setTotalItems(userList.length);
    }
  }, [userList]);

  useEffect(() => {
    fetchUsers(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const fetchUsers = useCallback(async (page, size) => {
    setLoading(true);
    try {
      const response = await api.callApi('memberships', {
        params: {
          pk: organization,
          contributed_to_projects: 1,
          page,
          page_size: size,
        },
      });
      if (response.results) {
        setUserListState(response.results);
        setTotalItems(response.count);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }, [api, organization]);

  const selectUser = useCallback((user) => {
    if (selectedUser?.id === user.id) {
      onSelect?.(null);
    } else {
      onSelect?.(user);
    }
  }, [onSelect, selectedUser]);

  const updateUserRole = useCallback(async (userId, newRole) => {
    try {
      const res = await api.callApi('updatememberships', {
        params: {
          pk: organization,
          user_id: userId,
        },
        body: {
          group: newRole,
        },
      });
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  }, [api, organization]);

  const handleRoleChange = (userId, role) => {
    setSelectedRole(prevRoles => ({
      ...prevRoles,
      [userId]: role,
    }));
    updateUserRole(userId, role);
  };

  const renderRoleDropdown = (userId, userRole) => {
    const displayRole = getRoleLabel(userRole);

    if (userRole === 'Owner') {
      return <span style={{ padding: '0 11px', fontSize: '14px' }}>Owner</span>;
    } else {
      return (
        <Select
          value={selectedRole[userId] || displayRole}
          onChange={(value) => handleRoleChange(userId, value)}
          // bordered={false}
          style={{ width: 150 }}
        >
          {roleOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      );
    }
  };

  const deleteUserOrganisation = useCallback(async (userId) => {
    try {
      const response = await api.callApi('deleteUserOrganisation', {
        params: {
          pk: organization,
          user_pk: userId,
        }
      });
      setUserListState(prevUserList => prevUserList.filter(user => user.user.id !== userId));
      setTotalItems(prevTotal => prevTotal - 1);
      message.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to remove user');
    }
  }, [api, organization]);

  const handleDeleteUser = async (userId) => {
    try {
      await deleteUserOrganisation(userId);
      // message.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      // message.error('Failed to delete user');
    }
  };

  const handleDeleteUsers = async () => {
    try {
      for (const userId of selectedUsers) {
        await deleteUserOrganisation(userId);
      }
      setDeleteModal(false);
      setSelectedUsers([]);
      message.success('Selected users deleted successfully');
    } catch (error) {
      console.error('Error deleting selected users:', error);
      message.error('Failed to delete selected users');
    }
  };

  const onSelectChange = (newSelectedUsers) => {
    setSelectedUsers(newSelectedUsers);
  };

  const columns = [
    {
      title: 'User Name',
      key: 'avatar',
      render: (_, record) => (
        <div style={{display:'flex', alignItems:'center'}}>
        <CopyableTooltip title={`User ID: ${record.user.id}`} textForCopy={String(record.user.id)}>
          <Userpic user={record.user} style={{ width: 28, height: 28 }} />
        </CopyableTooltip>
        <span style={{ marginLeft: '8px'}}>{record.user.username}</span>
        </div>
      ),
    },
    // {
    //   title: 'User Name',
    //   dataIndex: ['user', 'username'],
    //   key: 'username',
    // },
    {
      title: 'Email',
      dataIndex: ['user', 'email'],
      key: 'email',
    },
    {
      title: 'Role',  
      dataIndex: ['user', 'active_org_role'],
      key: 'role',
      render: (role, record) => renderRoleDropdown(record.user.id, getRoleLabel(role)),
    },
    {
      title: 'Status',
      dataIndex: ['user', 'active_org_status'],
      key: 'status',
      render: (status) => (
        <Tag color={status === "Active" ? "green" : status === "Invited" ? "orange" : status === "In Active" ? "red" : "default"}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Last Activity',
      dataIndex: ['user', 'last_activity'],
      key: 'last_activity',
      render: (lastActivity) => formatDistance(new Date(lastActivity), new Date(), { addSuffix: true }),
    },
    {
      title:'',
      key:'viewDetails',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center',marginLeft:'12px'}}>
        <RiInformationFill
          style={{ color: '#1890ff', cursor: 'pointer', marginRight: 8, fontSize: '24px' }} 
          onClick={() => selectUser(record.user)}
        />
        <span style={{ marginLeft: '18px'}}>
        {record.user.active_org_role !== 'Owner' && record.user.active_org_status !== 'Invited' && (
            <Popconfirm
              title="Are you sure you want to delete this user?"
              onConfirm={() => handleDeleteUser(record.user.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger style={{ padding: 0 }}>
                <DeleteOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
              </Button>
            </Popconfirm>
          )}
          </span>
      </div>
      )
    },
    // {
    //   title: '',
    //   key: 'delete',
    //   render: (_, record) => (
    //     <div>
    //       {record.user.active_org_role !== 'Owner' && record.user.active_org_status !== 'Invited' && (
    //         <Popconfirm
    //           title="Are you sure you want to delete this user?"
    //           onConfirm={() => handleDeleteUser(record.user.id)}
    //           okText="Yes"
    //           cancelText="No"
    //         >
    //           <Button type="text" danger style={{ padding: 0 }}>
    //             <DeleteOutlined style={{ fontSize: '16px', color: '#ff4d4f' }} />
    //           </Button>
    //         </Popconfirm>
    //       )}
    //     </div>
    //   ),
    // },
  ];

  return (
    <div className="people-list">
      {loading ? (
        <div className="people-list__loading">
          <div style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
          <Spinner size={54} />
          </div>
        </div>
      ) : (
        <>
          {/* <div className="people-list-table"> */}
            <Table
              dataSource={userListState}
              columns={columns}
              rowKey={(record) => record.user.id}
              pagination={false}
              className="ls-people-list-table"
            />
          {/* </div> */}
          <Pagination
            current={currentPage}
            total={totalItems}
            pageSize={pageSize}
            pageSizeOptions={['30', '50', '100']}
            onChange={(page, pageSize) => {
              setCurrentPage(page);
              setPageSize(pageSize);
            }}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} Users`}
            style={{ paddingTop: 16 }}
          />
          <Modal
            title="Action confirmation"
            visible={deleteModal}
            onOk={handleDeleteUsers}
            onCancel={() => setDeleteModal(false)}
            okText="Delete"
            okType="danger"
          >
            <p>You're about to delete {selectedUsers.length} users. This action cannot be undone.</p>
          </Modal>
        </>
      )}
    </div>
  );
};
