import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {useHistory} from 'react-router-dom';
import { StaticContent } from '../../app/StaticContent/StaticContent';
import { IconBook, IconFolder, IconModel, IconPersonInCircle, IconPin, IconTerminal, LsDoor, LsGitHub, LsSettings, LsSlack } from '../../assets/icons';
import { useConfig } from '../../providers/ConfigProvider';
import { useContextComponent, useFixedLocation } from '../../providers/RoutesProvider';
import { cn } from '../../utils/bem';
import { absoluteURL, isDefined } from '../../utils/helpers';
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs';
import { Dropdown } from "../Dropdown/Dropdown";
import { Hamburger } from "../Hamburger/Hamburger";
import { Menu } from '../Menu/Menu';
import { Userpic } from '../Userpic/Userpic';
import { Space } from '../Space/Space';
import { VersionNotifier, VersionProvider } from '../VersionNotifier/VersionNotifier';
import './Menubar.styl';
import './MenuContent.styl';
import './MenuSidebar.styl';
import { ModelsPage } from '../../pages/Organization/Models/ModelsPage';
import { FF_DIA_835, isFF } from '../../utils/feature-flags';
import { useAPI } from '../../providers/ApiProvider';
import { Modal, Dropdown as AntDropdown, Menu as AntMenu } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { OrganizationModal } from '../Organization/OrganizationModal';
import { OrganizationSettingsPage } from '../../pages/Organization/Settings/OrganizationSettingsPage';
import Notification from '../Notifications/Notification';

export const MenubarContext = createContext();

const LeftContextMenu = ({ className }) => (
  <StaticContent
    id="context-menu-left"
    className={className}
  >{(template) => <Breadcrumbs fromTemplate={template} />}</StaticContent>
);

const RightContextMenu = ({ className, ...props }) => {
  const { ContextComponent, contextProps } = useContextComponent();

  return ContextComponent ? (
    <div className={className}>
      <ContextComponent {...props} {...(contextProps ?? {})}/>
    </div>
  ) : (
    <StaticContent
      id="context-menu-right"
      className={className}
    />
  );
};

export const Menubar = ({
  enabled,
  defaultOpened,
  defaultPinned,
  children,
  onSidebarToggle,
  onSidebarPin,
}) => {
  const history = useHistory();
  const menuDropdownRef = useRef();
  const useMenuRef = useRef();
  const location = useFixedLocation();
  const config = useConfig();
  const api = useAPI();
  const organization = config.user.active_organization;
  const [sidebarOpened, setSidebarOpened] = useState(defaultOpened ?? false);
  const [sidebarPinned, setSidebarPinned] = useState(defaultPinned ?? false);
  const [PageContext, setPageContext] = useState({ Component: null, props: {} });

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [orgCreateModal, setOrgCreateModal] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await api.callApi('getOrganizations');
      setOrganizations(response);

      const currentUserOrganization = response.find(org => org.id === organization);
      if (currentUserOrganization) {
        setSelectedOrganization(currentUserOrganization);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  }, [api, organization]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleOrganizationSelect = async (org) => {
    try {
      const userId = config.user.id;
      console.log('Switching organization for userId:', userId, 'to organizationId:', org.id);

      await api.callApi('switchOrganizations', {
        params: {
          pk: userId,
        },
        body: {
          organization_id: org.id
        },
      });

      setSelectedOrganization(org);
      config.user.active_organization = org.id;

      // window.location.reload();
      history.push('/projects')
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  const organizationMenu = (
    <AntMenu>
      {organizations.filter(org => org.id !== selectedOrganization?.id).map(org => (
        <AntMenu.Item key={org.id} onClick={() => handleOrganizationSelect(org)}>{org.title}</AntMenu.Item>
      ))}
    </AntMenu>
  );

  const handleCreateOrganization = () => {
    setOrgCreateModal(true);
  };

  const handleOrgModalSave = async () => {
    setOrgCreateModal(false);
    await fetchOrganizations();
  };

  const menubarClass = cn('menu-header');
  const menubarContext = menubarClass.elem('context');
  const sidebarClass = cn('sidebar');
  const contentClass = cn('content-wrapper');
  const contextItem = menubarClass.elem('context-item');
  const showNewsletterDot = !isDefined(config.user.allow_newsletters);

  const sidebarPin = useCallback((e) => {
    e.preventDefault();
    const newState = !sidebarPinned;
    setSidebarPinned(newState);
    onSidebarPin?.(newState);
  }, [sidebarPinned, onSidebarPin]);

  const sidebarToggle = useCallback((visible) => {
    const newState = visible;
    setSidebarOpened(newState);
    onSidebarToggle?.(newState);
  }, [sidebarOpened, onSidebarToggle]);

  const providerValue = useMemo(() => ({
    PageContext,
    setContext(ctx){
      setTimeout(() => {
        setPageContext({
          ...PageContext,
          Component: ctx,
        });
      });
    },
    setProps(props) {
      setTimeout(() => {
        setPageContext({
          ...PageContext,
          props,
        });
      });
    },
    contextIsSet(ctx) {
      return PageContext.Component === ctx;
    },
  }), [PageContext]);

  useEffect(() => {
    if (!sidebarPinned) {
      menuDropdownRef?.current?.close();
    }
    useMenuRef?.current?.close();
  }, [location, sidebarPinned]);

  return (
    <div className={contentClass}>
      {enabled && (
        <div className={menubarClass}>
           { organization !== null && (
          <Dropdown.Trigger
            dropdown={menuDropdownRef}
            closeOnClickOutside={!sidebarPinned}  
          >
            <div className={`${menubarClass.elem('trigger')} main-menu-trigger`}>
              <img src={absoluteURL("/static/icons/logo-label.svg")} alt="Labelo Logo" height="22" style={{ marginLeft:"16px" }}/>           
              <Hamburger opened={sidebarOpened}/>
            </div>
          </Dropdown.Trigger>
           )}

          <div className={menubarContext}>
            <LeftContextMenu className={contextItem.mod({ left: true })}/>
            <RightContextMenu className={contextItem.mod({ right: true })}/>
          </div>
          <Notification api={api}/>
          <Dropdown.Trigger ref={useMenuRef} align="right" content={(
            <Menu>
              <Menu.Item
                icon={<LsSettings/>}
                label="Account &amp; Settings"
                href="/user/account"
                data-external
              />
              <Menu.Item
                icon={<IconPersonInCircle/>}
                label="Organization &amp; Settings"
                href="/settings/organization"
                data-external
              />
              <Menu.Item
                icon={<LsDoor/>}
                label="Log Out"
                href={absoluteURL("/logout")}
                data-external
              />
              {/* {showNewsletterDot && (
                <>
                  <Menu.Divider />
                  <Menu.Item
                    className={cn("newsletter-menu-item")}
                    href="/user/account"
                    data-external
                  >
                    <span>Please check new notification settings in the Account & Settings page</span>
                    <span className={cn("newsletter-menu-badge")} />
                  </Menu.Item>
                </>
              )} */}
            </Menu>
          )}>
            <div title={config.user.email} className={menubarClass.elem('user')}>
              <Userpic user={config.user}/>
              {/* {showNewsletterDot && (
                <div className={menubarClass.elem('userpic-badge')} />
              )} */}
            </div>
          </Dropdown.Trigger>
        </div>
      )}

      <VersionProvider>
        <div className={contentClass.elem('body')}>
          {enabled && (
            <Dropdown
              ref={menuDropdownRef}
              onToggle={sidebarToggle}
              onVisibilityChanged={() => window.dispatchEvent(new Event('resize'))}
              visible={sidebarOpened}
              className={[sidebarClass, sidebarClass.mod({ floating: !sidebarPinned })].join(" ")}
              style={{ width: 240 }}
            >
              <Menu>
                <Menu.Item
                  label="Organization"
                  className={sidebarClass.elem('organization')}
                >
                  {organizations.length > 1 ? (
                    <AntDropdown overlay={organizationMenu} trigger={['click']}>
                      <div style={{ cursor: 'pointer' }}>
                        <span style={{ fontSize: '15px', marginBottom: 2, display: 'inline-block', marginTop: 6 }}>Organizations</span><br/>
                        <Space>
                          <span style={{ fontWeight: 'bold', fontSize: '19px', marginBottom: 2 }}>
                            {selectedOrganization ? selectedOrganization.title : 'Select Organization'}
                          </span>
                          {organizations.length > 1 && (
                            <DownOutlined style={{ fontSize: '12px', marginLeft: '4px' }} />
                          )}
                        </Space>
                      </div>
                    </AntDropdown>
                  ) : (
                    <div>
                      <span style={{ fontSize: '15px', marginBottom: 2, display: 'inline-block', marginTop: 6 }}>Organizations</span><br/>
                      <Space>
                        <span style={{ fontWeight: 'bold', fontSize: '19px', marginBottom: 2 }}>
                          {selectedOrganization ? selectedOrganization.title : 'No Organizations Available'}
                        </span>
                      </Space>
                    </div>
                  )}
                </Menu.Item>

                <Menu.Divider/>

                <Menu.Item
                  label="Projects"
                  to="/projects"
                  icon={<IconFolder/>}
                  data-external
                  exact
                />
                {config.user && config.user.group && (config.user.group.includes("reviewer") || config.user.group.includes("annotater") || config.user.group.includes("manager") || config.user.group.includes("pending")) ? null : (
                  <Menu.Item
                    label="Team"
                    to="/organization"
                    icon={<IconPersonInCircle/>}
                    data-external
                    exact
                  />
                )}
                {isFF(FF_DIA_835) && (
                  <Menu.Item
                    label="Models"
                    to={ModelsPage.path}
                    icon={<IconModel/>}
                    exact
                  />
                )}

                <Menu.Spacer/>

                {/* <Menu.Item
                  label="API"
                  href="/docs/api"
                  icon={<IconTerminal/>}
                  target="_blank"
                />
                <Menu.Item
                  label="Docs"
                  href="https://docs.labelo.ai/"
                  icon={<IconBook/>}
                  target="_blank"
                />
                <Menu.Item
                  label="GitHub"
                  href="https://github.com/LabeloAI/labelo"
                  icon={<LsGitHub/>}
                  target="_blank"
                />
                <Menu.Item
                  label="Slack Community"
                  href="https://slack.labelo.ai/"
                  icon={<LsSlack/>}
                  target="_blank"
                /> */}

                {/* <VersionNotifier showCurrentVersion/> */}

                <Menu.Divider/>

                <Menu.Item
                  icon={<IconPin/>}
                  className={sidebarClass.elem('pin')}
                  onClick={sidebarPin}
                  active={sidebarPinned}
                >
                  {sidebarPinned ? "Unpin menu" : "Pin menu"}
                </Menu.Item>

              </Menu>
            </Dropdown>
          )}

          <MenubarContext.Provider value={providerValue}>
            <div className={contentClass.elem('content').mod({ withSidebar: sidebarPinned && sidebarOpened })}>
              {children}
            </div>
          </MenubarContext.Provider>
        </div>
      </VersionProvider>

      {orgCreateModal && <OrganizationModal onClose={() => setOrgCreateModal(false)} onSave={handleOrgModalSave} />}

    </div>
  );
};
