import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LsPlus } from "../../../assets/icons";
import { Description } from "../../../components/Description/Description";
import { Input, TextArea } from "../../../components/Form";
import { HeidiTips } from "../../../components/HeidiTips/HeidiTips";
import { modal } from "../../../components/Modal/Modal";
import { useAPI } from "../../../providers/ApiProvider";
import { useConfig } from "../../../providers/ConfigProvider";
import { Block, Elem } from "../../../utils/bem";
import { FF_LSDV_E_297, isFF } from "../../../utils/feature-flags";
import { copyText } from "../../../utils/helpers";
import "./PeopleInvitation.styl";
import { PeopleList } from "./PeopleList";
import "./PeoplePage.scss";
import { Spinner } from "../../../components";
import { SelectedUser } from "./SelectedUser";
import { Modal } from 'antd';
import { Input as AntdInput, Select,Typography, Space, Flex, Button } from 'antd'; 

const { Search } = AntdInput; 
const { Text } = Typography;
const { Option,OptGroup } = Select;

const InvitationModal = ({ visible,onCancel,link, updateLink, userList }) => {
  const api = useAPI();
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [roleError, setRoleError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const roleOptions = [
    { value: "administrator", label: "Administrator" },
    { value: "manager", label: "Manager" },
    { value: "annotater", label: "Annotator" },
    { value: "reviewer", label: "Reviewer" }
  ];

  const handleEmailChange = (e) => {
    const { value } = e.target;
    setEmail(value);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)){
      setEmailError('Invalid email format');
    } else {
      setEmailError('');
    }
  };

  const handleRoleChange = (value) => {
    setSelectedRole(value);
    if (value === '') {
      setRoleError('Please select a role');
    } else {
      setRoleError('');
    }
  };

  const sendInvitation = async () => {
    let valid = true;
    if (!email) {
      setEmailError('Please provide your email address');
      valid = false;
    }
    if (!selectedRole) {
      setRoleError('Select a role');
      valid = false;
    }
    if (!valid) {
      return;
    }
    setLoading(true);
    try {
      const emailExists = userList.some(({user}) => user.email === email);

      if (emailExists) {
        setEmailError('Email already exists');
        setLoading(false);

        setTimeout(() => {
          setEmailError('');
        }, 3000);

        return;
      }

      const response = await api.callApi('inviteMemberbyEmail', {
        body: {
          email: email,
          role: selectedRole
        }
      });
      setInviteSent(true);
      setSuccessMessage("Email sent Successfully");
      setTimeout(() => {
        setInviteSent(false);
        setSuccessMessage('');
      }, 3000);
      window.location.reload();
    } catch (error) {
      console.error("Error sending Invitation", error);
      setSuccessMessage('');
      setEmailError('Error sending invitation');
    } finally {
      setEmail('');
      setSelectedRole('');
      setRoleError('');
      setLoading(false);
    }
  };

  const copyLink = useCallback(() => {
    setCopied(true);
    copyText(link);
    setTimeout(() => setCopied(false), 1500);
  }, [link]);

  return (
    <Modal
      title="Invite People"
      open={visible}
      onCancel={onCancel}
      footer={null}
    >
      <Block name="invite">
        <Input
          value={link}
          style={{ width: '100%' }}
          readOnly
        />
        <Description style={{ width: '100%', marginTop: 8 }}>
          Invite people to join your Labelo instance. People that you invite have full access to all of your projects.
        </Description>
        <Flex justify="space-between" style={{ marginTop: 16 }}>
          <Button style={{ width: 170 }} onClick={() => updateLink()}>
            Reset Link
          </Button>
          <Button type="primary" style={{ width: 170 }} onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </Flex>
        <Description style={{ width: '100%', marginTop: 20, margin:0,paddingTop: 64 }}>
          You can Invite people to your Organisations. Give Email
        </Description>
        <Input
          placeholder="Enter Email here..."
          value={email}
          onChange={handleEmailChange}
          disabled={loading}
          style={{ marginBottom: 8 }}
        />
        {emailError && <span style={{ color: 'red' }}>{emailError}</span>}
        {/* <Block name="role-select"> */}   
        <Description style={{ margin:0}}> 
          Select your Role 
        </Description> 
        <Flex justify="space-between" align="center" style={{ padding: '10px 0' }}>   
        <Select
            value={selectedRole}
            onChange={handleRoleChange}
            disabled={loading}
            placeholder="Select a Role"
            style={{ width: '54%', marginTop: 0 }}
          >
            {roleOptions.map(option => (
              <Option key={option.value} value={option.value}>{option.label}</Option>
            ))}
          </Select>
          {roleError && <span style={{ color: 'red'}}>{roleError}</span>}
          <Button type="primary" style={{ width: 70, marginLeft: 10}} onClick={sendInvitation} disabled={loading}>
            {loading ? <Spinner size={16}/> : "Send"}
          </Button>
          </Flex> 
        {/* </Block> */}
        {inviteSent && <span style={{ color: 'green', marginTop: 16 }}>{successMessage}</span>}
      </Block>
    </Modal>
  );
};

export const PeoplePage = () => {
  const api = useAPI();
  const [inviteModalVisible,setInviteModalVisible]=useState(false);
  // const inviteModal = useRef();
  const config = useConfig();
  const userGroup = config.user.group;
  const organization = config.user.active_organization;
  const [selectedUser, setSelectedUser] = useState(null);
  const [userList, setUserList] = useState([]);
  const [link, setLink] = useState();
  const [search, setSearch] = useState('');
  const [chosenRole, setChosenRole] = useState('');
  const [chosenStatus, setChosenStatus] = useState('');
  const [currentUserOrganization, setCurrentUserOrganization] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalItems, setTotalItems] = useState(0);

  const selectUser = useCallback((user) => {
    setSelectedUser(user);
    localStorage.setItem('selectedUser', user?.id);
  }, [setSelectedUser]);

  const setInviteLink = useCallback((link) => {
    const hostname = config.hostname || location.origin;
    setLink(`${hostname}${link}`);
  }, [config, setLink]);

  const updateLink = useCallback(() => {
    api.callApi('resetInviteLink').then(({ invite_url }) => {
      setInviteLink(invite_url);
    });
  }, [setInviteLink]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.callApi('memberships', {
        params: {
          pk: organization,
          contributed_to_projects: 1,
          status: chosenStatus,
          role: chosenRole,
          page: currentPage,
          page_size: pageSize,
          search: search,
        },
      });
      if (response.results) {
        setUserList(response.results);
        setTotalItems(response.count); 
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [organization, chosenStatus, chosenRole, currentPage, pageSize, search]);

  // const inviteModalProps = useCallback((link) => ({
  //   title: "Invite people",
  //   style: { width: 640, height: 472 },
  //   body: () => (
  //     <InvitationModal link={link} updateLink={updateLink} userList={userList} />
  //   ),
    // footer: () => {
    //   const [copied, setCopied] = useState(false);

    //   const copyLink = useCallback(() => {
    //     setCopied(true);
    //     copyText(link);
    //     setTimeout(() => setCopied(false), 1500);
    //   }, []);

    //   return (
    //     <Space spread>
    //       <Space>
    //         <Button style={{ width: 170 }} onClick={() => updateLink()}>
    //           Reset Link
    //         </Button>
    //       </Space>
    //       <Space>
    //         <Button primary style={{ width: 170 }} onClick={copyLink}>
    //           {copied ? "Copied!" : " linkCopy"}
    //         </Button>
    //       </Space>
    //     </Space>
    //   );
    // },
  //   bareFooter: true,Text
  // }), [updateLink, link, userList]);

  // const showInvitationModal = useCallback(() => {
  //   inviteModal.current = modal(inviteModalProps(link));
  // }, [inviteModalProps, link]);

  const defaultSelected = useMemo(() => {
    return localStorage.getItem('selectedUser');
  }, []);

  useEffect(() => {
    api.callApi("inviteLink").then(({ invite_url }) => {
      setInviteLink(invite_url);
    });

    fetchUsers();
  }, [fetchUsers]);

  // useEffect(() => {
  //   inviteModal.current?.update(inviteModalProps(link));
  // }, [link, inviteModalProps]);

  const onSearch = (value) => {
    setSearch(value);
  };

  const onRoleChange = (value) => {
    setChosenRole(value);
  };
  
  const onStatusChange = (value) => {
    setChosenStatus(value);
  };

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const organizationData = await api.callApi('getOrganizations');
        const userOrganization = organizationData.find(org => org.id === organization);
        setCurrentUserOrganization(userOrganization);
      } catch (error) {
        console.error('Error fetching current organization:', error);
      }
    };

    fetchOrganization();
  }, [organization]);

  return (
    <Block name="people">
      <Elem name="controls">
        {/* <Flex> */}
          <Space>
            <Text style={{ fontSize: '1.7rem', fontWeight: 'bold',marginBottom:'2px'}}>
              {currentUserOrganization ? currentUserOrganization.title : ''}
            </Text>
            <Text type="secondary">{totalItems} Members</Text>
          </Space>
        {/* </Flex> */}
        <Space/>
        <Flex justify="space-between">
          <Space>
            <Search
              placeholder="Search by Email or Name"
              onSearch={onSearch}
              style={{ width: 250 }}
              allowClear
            />
            <Select
              placeholder="Roles"
              onChange={onRoleChange}
              style={{ width: 120 }} 
             
            >
              <Option value="">All</Option>
              <Option value="owner">Owner</Option>
              {/* </OptGroup> */}
              {/* <OptGroup label="Pending Users"> */}
                {/* <Option value="pending">Pending</Option> */}
              {/* </OptGroup> */}
              <Option value="administrator">Administrator</Option>
              <Option value="manager">Manager</Option>
              <Option value="annotater">Annotator</Option>
              <Option value="reviewer">Reviewer</Option> 
              <Option value="pending">Pending</Option> 
            </Select>
            <Select
              placeholder="Status"
              onChange={onStatusChange}
              style={{ width: 120 }}            
            >
              <Option value="">All</Option>
              <Option value="active">Active</Option>
              <Option value="invited">Invited</Option>
              <Option value="in_active">InActive</Option>
            </Select>
          </Space>
          { userGroup !=='manager' && userGroup !=='reviewer' && userGroup !=='annotater' && userGroup !=='pending' && (
            <Space>
              <Button type="primary" icon={<LsPlus />} onClick={() => setInviteModalVisible(true)}>
                Add People
              </Button>
            </Space>
          )}
        </Flex>
      </Elem>  
      <Elem name="content">
        {/* <Space align="start"> */}
        <PeopleList
            selectedUser={selectedUser}
            onSelect={selectUser}
            defaultSelected={localStorage.getItem('selectedUser')}
            userList={userList}
            currentPage={currentPage}
            pageSize={pageSize}
          />
          {selectedUser ? (
            <SelectedUser
              user={selectedUser}
              onClose={() => selectUser(null)}
            />
          ) : null
            // isFF(FF_LSDV_E_297) && <HeidiTips collection="organizationPage" />
          }
          <InvitationModal
            visible={inviteModalVisible}
            onCancel={()=> setInviteModalVisible(false)}
            link={link}
            updateLink={updateLink}
            userList={userList}>
          </InvitationModal>
        {/* </Space> */}
      </Elem>
    </Block>
  );
};

PeoplePage.title = "People";
PeoplePage.path = "/";
