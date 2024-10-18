import { useState, useEffect } from 'react';
import { Modal, Row, Col, Button, Input, Checkbox } from 'antd';
import { useAPI } from 'apps/labeloapp/src/providers/ApiProvider';
import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import { useConfig } from 'apps/labeloapp/src/providers/ConfigProvider';
import { Userpic } from 'apps/labeloapp/src/components';
import { CopyableTooltip } from 'apps/labeloapp/src/components/CopyableTooltip/CopyableTooltip';
import { Space } from 'apps/labeloapp/src/components/Space/Space';
import { MemberDeleteModal } from './MemberDeleteModal';

export const WorkspaceMembersModal = ({
  visible,
  onClose,
  selectedWorkspaceId,
}) => {
  const [orgMembers, setOrgMembers] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [searchOrgMembers, setSearchOrgMembers] = useState('');
  const [searchWorkspaceMembers, setSearchWorkspaceMembers] = useState('');
  const [selectedOrgMembers, setSelectedOrgMembers] = useState([]);
  const [selectedWorkspaceMembers, setSelectedWorkspaceMembers] = useState([]);
  const [assignedWorkspaceMembers, setAssignedWorkspaceMembers] = useState([]);
  const [unassignedWorkspaceMembers, setUnassignedWorkspaceMembers] = useState(
    []
  );
  const [initialAssignedMembers, setInitialAssignedMembers] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState(null); // Store the delete choice

  const api = useAPI();
  const config = useConfig();
  const organizationID = config.user.active_organization;

  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      try {
        const response = await api.callApi(`getWorkspaceMembers`, {
          params: {
            pk: selectedWorkspaceId,
          },
        });
        if (response) {
          setWorkspaceMembers(response);
          setAssignedWorkspaceMembers(response);
          setInitialAssignedMembers(response);
        }
      } catch (error) {
        console.error('Error fetching workspace members', error);
        // setWorkspaceMembers([])
      }
    };

    if (selectedWorkspaceId && !isNaN(selectedWorkspaceId) && visible) {
      fetchWorkspaceMembers();
    }
  }, [selectedWorkspaceId, visible]);

  useEffect(() => {
    const fetchOrgMembers = async () => {
      try {
        const response = await api.callApi(`memberships`, {
          params: {
            pk: organizationID,
          },
        });
        setOrgMembers(response.results);

        // if (workspaceMembers && workspaceMembers.length > 0) {
        const unassigned = response.results.filter(
          (member) =>
            !workspaceMembers.some(
              (assignee) => assignee.user.id === member.user.id
            )
        );
        setUnassignedWorkspaceMembers(unassigned);

        const assigned = response.results.filter((member) =>
          workspaceMembers.some(
            (assignee) => assignee.user.id === member.user.id
          )
        );
        setAssignedWorkspaceMembers(assigned);
        // }
      } catch (error) {
        console.error('Error fetching the members', error);
      }
    };

    if (organizationID && visible) {
      fetchOrgMembers();
    }
  }, [organizationID, workspaceMembers, visible]);

  const handleCheckboxChange = (memberId, setSelected) => {
    setSelected((prevSelected) =>
      prevSelected.includes(memberId)
        ? prevSelected.filter((id) => id !== memberId)
        : [...prevSelected, memberId]
    );
  };

  const handleAddClick = () => {
    const selectedOrgMembersObjects = unassignedWorkspaceMembers.filter(
      (member) => selectedOrgMembers.includes(member.user.id)
    );
    setAssignedWorkspaceMembers([
      ...assignedWorkspaceMembers,
      ...selectedOrgMembersObjects,
    ]);
    setUnassignedWorkspaceMembers(
      unassignedWorkspaceMembers.filter(
        (member) => !selectedOrgMembers.includes(member.user.id)
      )
    );
    setSelectedOrgMembers([]);
  };

  const handleRemoveClick = () => {
    const selectedWorkspaceMembersObjects = assignedWorkspaceMembers.filter(
      (member) => selectedWorkspaceMembers.includes(member.user.id)
    );
    setUnassignedWorkspaceMembers([
      ...unassignedWorkspaceMembers,
      ...selectedWorkspaceMembersObjects,
    ]);
    setAssignedWorkspaceMembers(
      assignedWorkspaceMembers.filter(
        (member) => !selectedWorkspaceMembers.includes(member.user.id)
      )
    );
    setSelectedWorkspaceMembers([]);
  };

  const isChanged = () => {
    if (assignedWorkspaceMembers.length !== initialAssignedMembers.length)
      return true;
    const assignedMemberIds = assignedWorkspaceMembers.map(
      (member) => member.user.id
    );
    const initialAssignedMemberIds = initialAssignedMembers.map(
      (member) => member.user.id
    );
    return !assignedMemberIds.every((id) =>
      initialAssignedMemberIds.includes(id)
    );
  };

  const handleOkClick = async () => {
    const removedMembers = initialAssignedMembers.filter(
      (member) =>
        !assignedWorkspaceMembers.some(
          (assigned) => assigned.user.id === member.user.id
        )
    );

    if (removedMembers.length > 0) {
      setDeleteModalVisible(true);
    } else {
      await postAssignment();
    }
  };

  const postAssignment = async () => {
    try {
      const selectedUserIds = assignedWorkspaceMembers.map(
        (member) => member.user.id
      );
      // console.log('Posting user IDs:', selectedUserIds);

      const response = await api.callApi('workspaceMembers', {
        params: {
          pk: selectedWorkspaceId, // use the selectedWorkspaceId
        },
        body: {
          users: selectedUserIds,
          delete_choice: deleteChoice, // Include the delete choice in the request body
        },
      });

      // console.log('API Response:', response);

      // Update initialAssignedMembers to the current state of assignedWorkspaceMembers
      setInitialAssignedMembers(assignedWorkspaceMembers);

      setDeleteModalVisible(false); // Close the delete modal
      onClose();
    } catch (error) {
      console.error(
        'Error assigning workspace members:',
        error.response || error.message || error
      );
    }
  };

  return (
    <>
      <Modal
        open={visible}
        onCancel={onClose}
        title="Manage Members"
        width={900}
        onOk={handleOkClick}
        okText="Assign"
        okButtonProps={{ disabled: !isChanged() }}
      >
        <Block name="workspace-member">
          <Row gutter={[16, 16]}>
            <Col
              span={10}
              className="custom-column"
              style={{ paddingRight: '23px' }}
            >
              <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>
                Organization Members
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <Input
                  placeholder="Search Members"
                  value={searchOrgMembers}
                  onChange={(e) => setSearchOrgMembers(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
              </div>
              {unassignedWorkspaceMembers.map((member) => (
                <Elem
                  key={member.user.id}
                  name="member-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={selectedOrgMembers.includes(member.user.id)}
                      onChange={() =>
                        handleCheckboxChange(
                          member.user.id,
                          setSelectedOrgMembers
                        )
                      }
                      style={{ marginRight: '10px' }}
                    />
                    <CopyableTooltip
                      title={`User ID: ${member.user.id}`}
                      textForCopy={String(member.user.id)}
                    >
                      <Userpic
                        user={member.user}
                        style={{ width: 28, height: 28, marginRight: '10px' }}
                      />
                    </CopyableTooltip>
                    <div style={{ flex: 1 }}>{member.user.email}</div>
                  </div>
                  <div style={{ color: 'gray', marginLeft: '20px' }}>
                    {member.user.groups[0]?.name}
                  </div>
                </Elem>
              ))}
            </Col>

            <Col
              span={4}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Space direction="vertical" className="button-space" size="large">
                <Button
                  size="large"
                  onClick={handleAddClick}
                  disabled={selectedOrgMembers.length === 0}
                >
                  &gt;
                </Button>
                <Button
                  size="large"
                  onClick={handleRemoveClick}
                  disabled={selectedWorkspaceMembers.length === 0}
                >
                  &lt;
                </Button>
              </Space>
            </Col>

            <Col
              span={10}
              className="custom-column"
              style={{ paddingLeft: '23px' }}
            >
              <h3 style={{ fontWeight: 'bold', marginBottom: '16px' }}>
                Workspace Members
              </h3>
              <div style={{ marginBottom: '16px' }}>
                <Input
                  placeholder="Search Members"
                  value={searchWorkspaceMembers}
                  onChange={(e) => setSearchWorkspaceMembers(e.target.value)}
                  style={{ flexGrow: 1 }}
                />
              </div>
              {assignedWorkspaceMembers.map((member) => (
                <Elem
                  key={member.user.id}
                  name="member-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      checked={selectedWorkspaceMembers.includes(
                        member.user.id
                      )}
                      onChange={() =>
                        handleCheckboxChange(
                          member.user.id,
                          setSelectedWorkspaceMembers
                        )
                      }
                      style={{ marginRight: '10px' }}
                    />
                    <CopyableTooltip
                      title={`User ID: ${member.user.id}`}
                      textForCopy={String(member.user.id)}
                    >
                      <Userpic
                        user={member.user}
                        style={{ width: 28, height: 28, marginRight: '10px' }}
                      />
                    </CopyableTooltip>
                    <div style={{ flex: 1 }}>{member.user.email}</div>
                  </div>
                  <div style={{ color: 'gray', marginLeft: '20px' }}>
                    {member.user.groups[0]?.name}
                  </div>
                </Elem>
              ))}
            </Col>
          </Row>
        </Block>
      </Modal>

      <MemberDeleteModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onSelectDeleteChoice={setDeleteChoice} // Capture the delete choice
        onOk={postAssignment}
      />
    </>
  );
};
