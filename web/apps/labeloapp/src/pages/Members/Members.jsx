import React, { useState, useEffect, useContext } from 'react';
import { Block, Elem } from '../../utils/bem';
import { LsPlus, LsCross, LsCheck } from '../../assets/icons';
import { Spinner } from '../../components/Spinner/Spinner';
import { Userpic } from '../../components';
import { ApiContext } from '../../providers/ApiProvider';
import './Members.scss';
import { useProject } from '../../providers/ProjectProvider';
import { Button, Table, Popconfirm, message, Card } from 'antd'; 
import { DeleteOutlined } from '@ant-design/icons';
import { MemberList } from './MemberList';
import { useConfig } from '../../providers/ConfigProvider';
import { Space } from '../../components/Space/Space';
import { NavLink } from 'react-router-dom';
import { LoginOutlined } from '@ant-design/icons';

export const Members = () => {
  const api = useContext(ApiContext);
  const [members, setMembers] = useState([]);
  const [networkState, setNetworkState] = useState('loading');
  const [error, setError] = useState(null);
  const { project } = useProject();
  const [membersModal, setMembersModal] = useState(false);
  const config = useConfig();
  const [publish, setPublish] = useState(project.is_published);
  const [showPublish, setShowPublish] = useState(!project.is_published);
  const projectID = project.id;

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.callApi('members', {
          params: {
            pk: project.id,
            deleted: true,
          },
        });
        setMembers(response);
        setNetworkState('loaded');
      } catch (error) {
        setError(error);
        setNetworkState('error');
      }
    };

    if (project.id) {
      setPublish(project.is_published);
      setShowPublish(!project.is_published);

      fetchMembers();
    }
  }, [api, project]);

  const saveMembers = async (selectedUser) => {
    const newMember = { user: selectedUser, annotations: {} };
    setMembers([...members, newMember]);
    closeMembersModal();
  };

  const openMembersModal = () => {
    setMembersModal(true);
  };

  const closeMembersModal = () => {
    setMembersModal(false);
  };

  const handleRemove = async (userId) => {
    try {
      await api.callApi('removeMember', {
        params: {
          pk: project.id,
        },
        body: {
          user: userId,
        },
      });
      setMembers((prevMembers) => prevMembers.filter((member) => member.user.id !== userId));
      message.success('User removed successfully');
    } catch (error) {
      message.error('Failed to remove user');
    }
  };

  const handlePublishToggle = async () => {
    try {
      const newPublishState = !publish; 

      const response = await api.callApi('updateProject', {
        method: 'PATCH',
        params: {
          pk: project.id,
        },
        body: {
          is_published: newPublishState, 
        },
      });

      setPublish(response.is_published);
      setShowPublish(!response.is_published);

      message.success(response.is_published ? 'Published successfully' : 'Unpublished successfully');
    } catch (error) {
      message.error('Failed to update project status');
    }
  };

  const columns = [
    {
      title: 'Email',
      dataIndex: 'user',
      key: 'email',
      render: (user) => (
        <div style={{ display: 'flex', alignItems: 'center', color: user.email === 'Deleted' ? 'red' : 'inherit' }}>
          <Userpic user={user} style={{ width: 28, height: 28, marginRight: 8 }} />
          {user.email || 'N/A'}
        </div>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'user',
      key: 'name',
      render: (user) => <span style={{ color: user.username === 'Deleted' ? 'red' : 'inherit' }}>{user?.username || ''}</span>,
    },
    {
      title: 'Finished Annotation',
      dataIndex: 'annotations',
      key: 'finished_annotations',
      render: (annotations) => annotations?.finished_annotations || 0,
    },
    {
      title: 'Skipped Annotation',
      dataIndex: 'annotations',
      key: 'skipped_annotations',
      render: (annotations) => annotations?.skipped_annotations || 0,
    },
    {
      title: 'Total Annotation',
      dataIndex: 'annotations',
      key: 'total_annotations',
      render: (annotations) => annotations?.total_annotations || 0,
    },
    
    {
      title: 'Mean Time (Sec)',
      dataIndex: 'annotations',
      key: 'mean_time',
      render: (annotations) => annotations?.mean_time
      || 0,
    },
    {
      title: 'Review score %',
      dataIndex: 'annotations',
      key: 'review_score',
      render: (annotations) => annotations?.review_score
      || 0,
    },
    {
      title: 'Accepted',
      dataIndex: 'annotations',
      key: 'accepted_annotations',
      render: (annotations) => annotations?.accepted_annotations || 0,
    },
    {
      title: 'Rejected',
      dataIndex: 'annotations',
      key: 'rejected_annotations',
      render: (annotations) => annotations?.rejected_annotations || 0,
    },
    {
      title: '',
      key: 'remove',
      render: (text, record) => (
        (record.user.groups[0].name === 'annotater' || record.user.groups[0].name === 'reviewer') ? (
          <Popconfirm
            title="Remove the User"
            description="Are you sure to remove this user?"
            onConfirm={() => handleRemove(record.user.id)}
            okText="Yes"
            cancelText="No"
          >
            <DeleteOutlined style={{ color: 'red', cursor: 'pointer' }} />
          </Popconfirm>
        ) : null
      ),
    },
  ];

  const isWorkspaceSet = project.workspace !== null;
  const isDataImported = project.task_number !== 0;
  const isLabelingInterfaceSet = project.label_config !== '<View></View>';

  return (
    <>
      <Block name="member-top">
        <Elem name="item">{project.title}</Elem>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            onClick={handlePublishToggle}
            size="compact"
            type="primary"
            icon={<LoginOutlined style={{ marginBottom: '2px' }} />}
            disabled={!isWorkspaceSet || !isDataImported || !isLabelingInterfaceSet}
          >
            {publish ? 'Unpublish' : 'Publish'}
          </Button>
          <Button icon={<LsPlus />} onClick={openMembersModal} type="primary" size="compact">
            Add Members
          </Button>
        </div>
      </Block>
      {/* <Card > */}
        {showPublish && (
          <Block name="project-publish">
            <span style={{ marginLeft: '30px', marginBottom: '0px', fontWeight: '450', fontSize: '16px' }}>
              The project isn't published yet. Annotators and Reviewers can't work on the project until it is published. Before publishing, check the following:
            </span>
            <br />
            <br />
            <div style={{ display: 'flex', alignItems: 'center', color: isLabelingInterfaceSet ? 'green' : 'red', marginLeft: '30px', marginBottom: '10px' }}>
              {isLabelingInterfaceSet ? <LsCheck /> : <LsCross />} {isLabelingInterfaceSet ? 'Labeling interface is set up' : 'Set up labeling interface'}
              {!isLabelingInterfaceSet && (
                <div style={{ color: 'black', marginLeft: '105px' }}>
                  <NavLink to={`/projects/${projectID}/settings/labeling`}>Setup Labelling Configuration</NavLink>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: isDataImported ? 'green' : 'red', marginLeft: '30px', marginBottom: '10px' }}>
              {isDataImported ? <LsCheck /> : <LsCross />} {isDataImported ? 'Data imported' : 'No data imported'}
              {!isDataImported && (
                <div style={{ color: 'black', marginLeft: '150px' }}>
                  <NavLink to={`/projects/${projectID}/data/import`}>Import Data</NavLink>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', color: isWorkspaceSet ? 'green' : 'red', marginLeft: '30px', marginBottom: '10px' }}>
              {isWorkspaceSet ? <LsCheck /> : <LsCross />} {isWorkspaceSet ? 'Project in workspace' : 'Move project to a workspace'}
              {!isWorkspaceSet && (
                <div style={{ color: 'black', marginLeft: '70px' }}>
                  <NavLink to={`/projects/${projectID}/settings`}>Change workspace</NavLink>
                </div>
              )}
            </div>
            {/* <div style={{ display: 'flex', alignItems: 'center', color: 'red', marginLeft: '30px' }}>
              {<LsCross />} Publish project for annotators
              <div style={{ color: 'black', marginLeft: '10px' }}></div>
            </div> */}
          </Block>
        )}
        <div className="member-list">
          {networkState === 'loading' && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center',height:'100vh'}}>
              <Spinner size={'50'} />
            </div>
          )}
          {networkState === 'error' && (
            <div className="member-list__error">
              <p>{error.message}</p>
            </div>
          )}
          {networkState === 'loaded' && (
            <div className="ls-member-table-container"> 
            <Table
              className="ls-members-list-table"
              columns={columns}
              dataSource={members}
              rowKey={(record) => record.user.id}
              pagination={false}
              size="middle"
            />
            </div>
          )}
        </div>
      {/* </Card> */}
      {membersModal && (
        <MemberList
          projectId={project.id}
          onSave={saveMembers}
          onClose={closeMembersModal}
        />
      )}
    </>
  );
};
Members.title = 'Members';
Members.path = '/members';
Members.exact = true;
