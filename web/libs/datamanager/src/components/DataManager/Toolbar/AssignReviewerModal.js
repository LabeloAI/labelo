import React, { useEffect, useState } from 'react';
import { Block, Elem } from "../../../utils/bem";
import { Modal, Row, Col, Space, Button, Checkbox, Input } from 'antd';
import { getRoot } from "mobx-state-tree";
import './AssignAnnotatorModal.scss';
import { Userpic } from '../../Common/Userpic/Userpic';

export const AssignReviewerModal = ({ isOpen, onClose, store, projectId, selectedItems }) => {
  const root = getRoot(store);
  const [members, setMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedToBeAssigned, setSelectedToBeAssigned] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [nonReviewers, setNonReviewers] = useState([]);
  const [assignedReviewers, setAssignedReviewers] = useState([]);
  const [initialAssignedReviewers, setInitialAssignedReviewers] = useState([]);
  const [searchTermMembers, setSearchTermMembers] = useState('');
  const [searchTermAssigned, setSearchTermAssigned] = useState('');
  const [selectAllMembers, setSelectAllMembers] = useState(false);
  const [selectAllAssigned, setSelectAllAssigned] = useState(false);

  const selectedItemsData = JSON.stringify(selectedItems);

  useEffect(() => {
    const fetchAssignees = async () => {
      try {
        const assigneeResponse = await root.apiCall('getAssignees', { selectedItemsData, type: 'RV' });
        setAssignees(assigneeResponse);
      } catch (error) {
        console.error("Failed to fetch assignees", error);
      }
    };

    if (isOpen && projectId) {
      fetchAssignees();
    }
  }, [isOpen, projectId, root, selectedItemsData]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersResponse = await root.apiCall('members', { id: projectId, assign: 'reviewer' }, { body: selectedItemsData });
        setMembers(membersResponse);

        const nonReviewers = membersResponse.filter(member => !assignees.some(assignee => assignee.assignee.id === member.user.id));
        setNonReviewers(nonReviewers);

        const assignedReviewers = membersResponse.filter(member => assignees.some(assignee => assignee.assignee.id === member.user.id));
        setAssignedReviewers(assignedReviewers);
        setInitialAssignedReviewers(assignedReviewers);
      } catch (error) {
        console.error("Failed to fetch members", error);
      }
    };

    if (isOpen && projectId) {
      fetchMembers();
    }
  }, [isOpen, projectId, root, selectedItemsData, assignees]);

  const handleAddClick = () => {
    const selectedMembersObjects = nonReviewers.filter(member => selectedMembers.includes(member.user.id));
    setAssignedReviewers([...assignedReviewers, ...selectedMembersObjects]);
    setNonReviewers(nonReviewers.filter(member => !selectedMembers.includes(member.user.id)));
    setSelectedMembers([]);
  };

  const handleRemoveClick = () => {
    const selectedToBeAssignedObjects = assignedReviewers.filter(member => selectedToBeAssigned.includes(member.user.id));
    setNonReviewers([...nonReviewers, ...selectedToBeAssignedObjects]);
    setAssignedReviewers(assignedReviewers.filter(member => !selectedToBeAssigned.includes(member.user.id)));
    setSelectedToBeAssigned([]);
  };

  const handleOkClick = async () => {
    const assigneeIds = assignedReviewers.map(member => member.user.id);
    const selectedItems = selectedItemsData;
    const type = 'RV';

    const bodyWithAssignees = {
      users: assigneeIds,
      selectedItems: selectedItemsData,
      type: type,
    };

    const emptyBody = {
      users: [],
      selectedItems: selectedItemsData,
      type: type,
    };

    try {
      const bodyToSend = assigneeIds.length === 0 ? emptyBody : bodyWithAssignees;
      const res = await root.apiCall('assignees', {}, bodyToSend);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Failed to assign members", error);
    }
  };

  const handleCheckboxChange = (memberId, setSelected) => {
    setSelected(prevSelected =>
      prevSelected.includes(memberId)
        ? prevSelected.filter(id => id !== memberId)
        : [...prevSelected, memberId]
    );
  };

  const handleSelectAllChange = (setSelected, setSelectAll, members) => {
    setSelectAll(prev => {
      const newValue = !prev;
      setSelected(newValue ? members.map(member => member.user.id) : []);
      return newValue;
    });
  };

  const isChanged = () => {
    if (assignedReviewers.length !== initialAssignedReviewers.length) return true;
    const assignedMemberIds = assignedReviewers.map(member => member.user.id);
    const initialAssignedMemberIds = initialAssignedReviewers.map(member => member.user.id);
    return !assignedMemberIds.every(id => initialAssignedMemberIds.includes(id));
  };

  const filteredNonReviewers = nonReviewers.filter(member =>
    member.user.email.toLowerCase().includes(searchTermMembers.toLowerCase())
  );

  const filteredAssignedReviewers = assignedReviewers.filter(member =>
    member.user.email.toLowerCase().includes(searchTermAssigned.toLowerCase())
  );

  return (
    <Modal open={isOpen} onCancel={onClose} onOk={handleOkClick} title="Assign Reviewer" width={800} okButtonProps={{ disabled: !isChanged() }} okText="Assign">
      <Block>
        <Row gutter={[16, 16]}>
          <Col span={12} className="custom-column">
            <h3 style={{ fontWeight: 'bold' }}>Members</h3>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Checkbox
                checked={selectAllMembers}
                onChange={() => handleSelectAllChange(setSelectedMembers, setSelectAllMembers, filteredNonReviewers)}
              >
              </Checkbox>
              <Input
                placeholder="Search Members"
                value={searchTermMembers}
                onChange={e => setSearchTermMembers(e.target.value)}
                style={{ marginLeft: '10px', flexGrow: 1 }}
              />
            </div>
            {filteredNonReviewers.map(member => (
              <Elem key={member.user.id} name="member-item">
                <Checkbox
                  checked={selectedMembers.includes(member.user.id)}
                  onChange={() => handleCheckboxChange(member.user.id, setSelectedMembers)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Userpic user={member.user.avatar} username={member.user.initials} style={{ width: 28, height: 28, marginRight: '10px' }} />
                    <div style={{width: '81px', textWrap: 'nowrap'}}>{member.user.email}</div>
                    <div style={{marginLeft: '150px', color:'gray'}}>{member.user.groups[0]?.name}</div>
                  </div>
                </Checkbox>
              </Elem>
            ))}
            <div>
              <p style={{marginTop:'47px', marginLeft: '2px'}}><strong>Note: Only reviewers are shown here.</strong></p>
            </div>
          </Col>

          <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Space direction="vertical" className="button-space">
              <Button size="large" onClick={handleAddClick} disabled={selectedMembers.length === 0}>
                &gt;
              </Button>
              <Button size="large" onClick={handleRemoveClick} disabled={selectedToBeAssigned.length === 0}>
                &lt;
              </Button>
            </Space>
          </Col>

          <Col span={10} className="custom-column">
            <h3 style={{ fontWeight: 'bold' }}>To Be Assigned</h3>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Checkbox
                checked={selectAllAssigned}
                onChange={() => handleSelectAllChange(setSelectedToBeAssigned, setSelectAllAssigned, filteredAssignedReviewers)}
              >
              </Checkbox>
              <Input
                placeholder="Search Assignees"
                value={searchTermAssigned}
                onChange={e => setSearchTermAssigned(e.target.value)}
                style={{ marginLeft: '10px', flexGrow: 1 }}
              />
            </div>
            {filteredAssignedReviewers.map(member => (
              <Elem key={member.user.id} name="member-item">
                <Checkbox
                  checked={selectedToBeAssigned.includes(member.user.id)}
                  onChange={() => handleCheckboxChange(member.user.id, setSelectedToBeAssigned)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Userpic user={member.user.avatar} username={member.user.initials} style={{ width: 28, height: 28, marginRight: '10px' }} />
                    <div>{member.user.email}</div>
                    {/* <div style={{marginLeft: '90px', color:'gray'}}>{member.user.groups[0]?.name}</div> */}
                  </div>
                </Checkbox>
              </Elem>
            ))}
          </Col>
        </Row>
      </Block>
    </Modal>
  );
};
