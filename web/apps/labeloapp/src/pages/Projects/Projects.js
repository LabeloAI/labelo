import React, { useEffect, useRef, useState } from 'react';
import {
  useHistory,
  useLocation,
  useParams as useRouterParams,
} from 'react-router';
import { useAPI } from '../../providers/ApiProvider';
import { Redirect } from 'react-router-dom';
// import { Button, Dropdown, Menu } from '../../components';
import { Oneof } from '../../components/Oneof/Oneof';
import { Spinner } from '../../components/Spinner/Spinner';
// import { Modal } from '../../components/Modal/ModalPopup';
import { ApiContext } from '../../providers/ApiProvider';
import { useContextProps } from '../../providers/RoutesProvider';
import { useAbortController } from '../../hooks/useAbortController';
import { Block, Elem } from '../../utils/bem';
import { FF_DEV_2575, isFF } from '../../utils/feature-flags';
import { CreateProject } from '../CreateProject/CreateProject';
import { DataManagerPage } from '../DataManager/DataManager';
import { SettingsPage } from '../Settings';
import './Projects.scss';
import { EmptyProjectsList, ProjectsList } from './ProjectsList';
import { WorkspaceMembersModal } from './Modal/WorkspaceMembersModal';
// import { Space } from '../../components/Space/Space';
// import { Input } from '../../components/Form';
import { useConfig } from '../../providers/ConfigProvider';
import { Dashboard } from '../Dashboard/Dashboard';
import { Members } from '../Members/Members';
// import { Workspace } from '../../components';
// import { WorkspaceEditModal } from '../../components/Workspace/WorkspaceEdit';
import { LsEllipsis, IconFolder, LsPlus } from '../../assets/icons';
import {
  Select,
  Space,
  Input,
  Cascader,
  Flex,
  Button,
  Segmented,
  Divider,
  Tooltip,
  Result,
} from 'antd';
import { FaPlus } from 'react-icons/fa';
import { IoArchiveOutline, IoSettingsOutline } from 'react-icons/io5';
import { WorkspaceEditModal } from './Modal/WorkspaceEditModal';
import TemplateModal from './Modal/TemplateModal';
const { Search } = Input;

const getCurrentPage = () => {
  const pageNumberFromURL = new URLSearchParams(location.search).get('page');

  return pageNumberFromURL ? parseInt(pageNumberFromURL) : 1;
};

// Render component for the workspace select
const SelectRender = ({ label, value }) => {
  let workspaceTitle = label;
  if (typeof label !== 'string') {
    workspaceTitle = label?.props?.children[0];
  }
  return <span>{workspaceTitle}</span>;
};

const convertFilterParams = (isPinned, ordering) => {
  let filterVal = [];

  if (isPinned !== null) {
    filterVal = isPinned === 'true' ? ['pin'] : ['unpin'];
  } else if (ordering) {
    if (ordering.startsWith('-')) {
      filterVal = [ordering.substring(1), 'des'];
    } else {
      filterVal = [ordering, 'asc'];
    }
  }

  return filterVal;
};

const AddWorkspaceInput = ({ onWorkspaceAdd, workspaceLoading }) => {
  const [workspaceName, setWorkspaceName] = useState('');

  const handleCreateWorkspace = () => {
    if (!workspaceName || workspaceName === '') return;
    onWorkspaceAdd(workspaceName);
    setWorkspaceName('');
  };

  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <Input
        placeholder="New workspace"
        allowClear
        value={workspaceName}
        onChange={(e) => setWorkspaceName(e.target.value)}
        onPressEnter={handleCreateWorkspace}
      />
      <Button
        type="primary"
        ghost
        icon={<FaPlus />}
        onClick={handleCreateWorkspace}
        loading={workspaceLoading}
      >
        Add
      </Button>
    </div>
  );
};

export const ProjectsPage = () => {
  const api = React.useContext(ApiContext);
  const abortController = useAbortController();
  const [projectsList, setProjectsList] = React.useState([]);
  const [networkState, setNetworkState] = React.useState(null);
  const [currentPage, setCurrentPage] = useState(getCurrentPage());
  const [totalItems, setTotalItems] = useState(1);
  const setContextProps = useContextProps();
  const [queryParams, setQueryParams] = useState({});

  const [filterOption, setFilterOptions] = useState({});
  const [projectView, setProjectView] = useState('Grid');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [filterValue, setFilterValue] = useState();

  const location = useLocation();
  const history = useHistory();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const newParams = {};
    const workspaceId = params.get('workspace');
    const searchQuery = params.get('search') || '';
    newParams.search = searchQuery;
    setSearchValue(searchQuery);
    const isPinned = params.get('is_pinned');
    const ordering = params.get('ordering');
    const viewType =
      params.get('view') && params.get('view') === 'list' ? 'List' : 'Grid';

    if (workspaceId && !isNaN(workspaceId)) {
      newParams.workspace = workspaceId;
      setSelectedWorkspaceId(workspaceId);
    } else {
      setSelectedWorkspaceId('all');
    }

    const filterParams = {};
    if (isPinned !== null) {
      filterParams.is_pinned = isPinned === 'true';
    } else if (ordering) {
      filterParams.ordering = ordering;
    }

    const filterVal = convertFilterParams(isPinned, ordering);

    setQueryParams(newParams);
    setFilterOptions(filterParams);
    setFilterValue(filterVal);
    setProjectView(viewType);
  }, []);

  const defaultPageSize = parseInt(
    localStorage.getItem('pages:projects-list') ?? 20
  );
  const config = useConfig();

  const [modal, setModal] = React.useState(false);
  const openModal = setModal.bind(null, true);
  const closeModal = setModal.bind(null, false);

  const [workspaceModal, setWorkspaceModal] = useState(false);
  const selectRef = useRef(null);
  const [workspaceList, setWorkspaceList] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState();
  const [archiveWorkspace, setArchivedWorkspaces] = useState(false);

  const handleWorkspaceModal = (e, data) => {
    e.preventDefault();
    e.stopPropagation();
    selectRef?.current?.blur();
    setEditWorkspace(data);
    setWorkspaceModal(true);
  };

  const generateWorkspaceOption = () => {
    const options = [
      {
        label: 'Private',
        title: 'private',
        options: [
          // { label: 'Private', value: 'private' },
          { label: 'All projects', value: 'all' },
        ],
      },
    ];

    if (workspaceList.length > 0) {
      options.push({
        label: (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {archiveWorkspace ? 'Archived workspaces' : 'Workspaces'}
            <Tooltip placement="top" title="Archived workspaces">
              <IoArchiveOutline
                onClick={() => setArchivedWorkspaces(!archiveWorkspace)}
              />
            </Tooltip>
          </div>
        ),
        title: 'workspaces',
        options: workspaceList
          .filter((workspace) => workspace.is_archived === archiveWorkspace)
          .map((workspace, index) => ({
            label: (
              <div className="ls-workspace_option">
                {workspace.title}
                <IoSettingsOutline
                  className="ls-workspace_settings"
                  onClick={(e) => handleWorkspaceModal(e, workspace)}
                />
              </div>
            ),
            value: workspace.id,
          })),
      });
    }

    return options;
  };

  const workspaceOptions = generateWorkspaceOption();
  const sortOptions = [
    {
      value: 'created_at',
      label: 'Date created',
      children: [
        {
          value: 'asc',
          label: 'Ascending',
        },
        {
          value: 'des',
          label: 'Descending',
        },
      ],
    },
    {
      value: 'title',
      label: 'Name',
      children: [
        {
          value: 'asc',
          label: 'Ascending',
        },
        {
          value: 'des',
          label: 'Descending',
        },
      ],
    },
    {
      value: 'pin',
      label: 'Pinned',
    },
    {
      value: 'unpin',
      label: 'Unpinned',
    },
    // {
    //   value: 'progress',
    //   label: 'Progress',
    // },
    // {
    //   value: 'status',
    //   label: 'Status',
    //   children: [
    //     {
    //       value: 'new',
    //       label: 'New',
    //     },
    //     {
    //       value: 'progress',
    //       label: 'In progress',
    //     },
    //     {
    //       value: 'complete',
    //       label: 'Completed',
    //     },
    //   ],
    // },
    // {
    //   value: 'tag',
    //   label: 'Tags',
    //   children: [
    //     {
    //       value: 'image',
    //       label: 'Image',
    //     },
    //     {
    //       value: 'video',
    //       label: 'Video',
    //     },
    //     {
    //       value: 'html',
    //       label: 'Html',
    //     },
    //   ],
    // },
  ];

  const fetchWorkspaces = async () => {
    try {
      const response = await api.callApi('getWorkspaces');
      if (response) {
        setWorkspaceList(response);
      }
      // console.log('workspacelist', response);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  // const workspaceID = workspaceList[0].id;
  // console.log('workspaceID',workspaceID)

  React.useEffect(() => {
    fetchWorkspaces();
  }, []);

  const createWorkspace = async (workspaceName) => {
    if (!workspaceName || workspaceName === '') return;
    setWorkspaceLoading(true);
    const response = await api.callApi('createWorkspace', {
      body: {
        title: workspaceName,
      },
    });

    setWorkspaceList([...workspaceList, response]);
    setWorkspaceLoading(false);
  };

  const fetchProjects = async (
    page = currentPage,
    pageSize = defaultPageSize,
    initialQueryParams = queryParams
  ) => {
    setNetworkState('loading');

    abortController.renew(); // Cancel any in-flight requests

    const requestParams = {
      page,
      page_size: pageSize,
      ...initialQueryParams,
      ...filterOption,
    };

    if (isFF(FF_DEV_2575)) {
      requestParams.include = [
        'id',
        'title',
        'created_by',
        'created_at',
        'color',
        'is_published',
        'assignment_settings',
        'is_pinned',
        'parsed_label_config',
        'workspace',
        'thumbnail_image',
        'labels',
        'task_number',
        'finished_task_number',
        'description',
        'num_tasks_with_annotations',
        'skipped_annotations_number',
        'members',
        'show_dm_to_annotators',
        'show_dm_to_reviewers',
        'queue_done',
        'queue_total',
        'review_queue_done',
        'review_queue_total',
        'task_distribution',
      ].join(',');
    }

    try {
      const data = await api.callApi('projects', {
        params: requestParams,
        ...(isFF(FF_DEV_2575)
          ? {
              signal: abortController.controller.current.signal,
              errorFilter: (e) => e.error.includes('aborted'),
            }
          : null),
      });

      setTotalItems(data?.count ?? 1);
      setProjectsList(data.results ?? []);
      if (data.results) {
        setNetworkState('loaded');
      }
    } catch (error) {
      setNetworkState('error');
    }

    // if (isFF(FF_DEV_2575) && data?.results?.length) {
    //   const additionalData = await api.callApi('projects', {
    //     params: {
    //       ids: data?.results?.map(({ id }) => id).join(','),
    //       include: [
    //         'id',
    //         'description',
    //         'num_tasks_with_annotations',
    //         'task_number',
    //         'skipped_annotations_number',
    //         'total_annotations_number',
    //         'total_predictions_number',
    //         'ground_truth_number',
    //         'finished_task_number',
    //       ].join(','),
    //       page_size: pageSize,
    //       ...queryParams,
    //       ...filterOption,
    //     },
    //     signal: abortController.controller.current.signal,
    //     errorFilter: (e) => e.error.includes('aborted'),
    //   });

    //   if (additionalData?.results?.length) {
    //     setProjectsList((prev) =>
    //       additionalData.results.map((project) => {
    //         const prevProject = prev.find(({ id }) => id === project.id);

    //         return {
    //           ...prevProject,
    //           ...project,
    //         };
    //       })
    //     );
    //   }
    // }
  };

  const loadNextPage = async (page, pageSize) => {
    setCurrentPage(page);
    await fetchProjects(page, pageSize);
  };

  const fetchFirstProjects = (initialQueryParams) => {
    setCurrentPage(1);
    fetchProjects(1, defaultPageSize, initialQueryParams);
  };

  // React.useEffect(() => {
  //   const storedWorkspaceId = localStorage.getItem('selectedWorkspace');
  //   const initialQueryParams = storedWorkspaceId
  //     ? { workspace: storedWorkspaceId }
  //     : {};
  //   setQueryParams(initialQueryParams);
  //   setSelectedWorkspaceId(storedWorkspaceId); // Initialize selectedWorkspaceId
  //   fetchFirstProjects(initialQueryParams);
  // }, []);
  // console.log('storedWorkspaceId',storedWorkspaceId)

  React.useEffect(() => {
    fetchFirstProjects();
  }, [queryParams, filterOption]);

  const cleanObject = (obj, keyToKeep, type = true) => {
    if (type) {
      Object.keys(obj).forEach((key) => {
        if (key !== keyToKeep) {
          delete obj[key];
        }
      });
    } else {
      Object.keys(obj).forEach((key) => {
        if (key === keyToKeep) {
          delete obj[key];
        }
      });
    }
  };

  const updateURLParams = (newParams) => {
    // Ensure newParams is not null or undefined
    if (!newParams || typeof newParams !== 'object') {
      console.error('Invalid params passed to updateURLParams:', newParams);
      return;
    }

    try {
      const params = new URLSearchParams(location.search);
      const newSearchParams = { ...queryParams };

      // Handle 'workspace' key
      if (newParams.workspace !== undefined) {
        if (
          newParams.workspace === 'all' ||
          newParams.workspace === 'private' ||
          newParams.workspace === ''
        ) {
          params.delete('workspace');
          cleanObject(newSearchParams, 'workspace', false);
        } else {
          params.set('workspace', newParams.workspace);
          newSearchParams.workspace = newParams.workspace;
        }
      }

      // Handle 'search' key
      if (newParams.search !== undefined) {
        if (newParams.search === '') {
          params.delete('search');
        } else {
          params.set('search', newParams.search);
        }
        newSearchParams.search = newParams.search;
      }

      history.push(`${location.pathname}?${params.toString()}`);
      setQueryParams(newSearchParams);
    } catch (error) {
      console.error('Error updating URL params:', error);
    }
  };

  const handleSearch = (val) => {
    // setQueryParams({ ...queryParams, search: val });
    updateURLParams({ search: val });
  };

  const handleSelectFilter = (val) => {
    const newParams = new URLSearchParams(location.search);
    setFilterValue(val);
    if (val === undefined) {
      setFilterOptions({});
      newParams.delete('is_pinned');
      newParams.delete('ordering');
      history.push(`${location.pathname}?${newParams.toString()}`);
      return;
    }

    let filterOption = {};
    if (val[0] === 'created_at' || val[0] === 'title') {
      filterOption.ordering = val[1] === 'des' ? `-${val[0]}` : val[0];
      newParams.set('ordering', filterOption.ordering);
      newParams.delete('is_pinned');
    } else if (val[0] === 'pin') {
      filterOption.is_pinned = true;
      newParams.set('is_pinned', true);
      newParams.delete('ordering');
    } else if (val[0] === 'unpin') {
      filterOption.is_pinned = false;
      newParams.set('is_pinned', false);
      newParams.delete('ordering');
    }
    setFilterOptions(filterOption);
    history.push(`${location.pathname}?${newParams.toString()}`);
  };

  const handleWorkspaceChange = (val) => {
    updateURLParams({ workspace: val });
    setSelectedWorkspaceId(val);
  };

  const handleViewtype = (val) => {
    setProjectView(val);
    const newParams = new URLSearchParams(location.search);
    if (val === 'List') {
      newParams.set('view', 'list');
    } else {
      newParams.delete('view');
    }
    history.push(`${location.pathname}?${newParams.toString()}`);
  };

  // Define a function to sort projects by pinned status
  const sortByPinned = (a, b) => {
    if (a.is_pinned && !b.is_pinned) {
      return -1;
    } else if (!a.is_pinned && b.is_pinned) {
      return 1;
    } else {
      return 0;
    }
  };

  // Filter and sort projects
  let filteredProject = projectsList.sort(sortByPinned);

  const pinFilter = (data) => {
    setProjectsList((prevData) =>
      prevData.map((item) => (item.id === data.id ? data : item))
    );
  };

  React.useEffect(() => {
    // there is a nice page with Create button when list is empty
    // so don't show the context button in that case
    setContextProps({ openModal, showButton: projectsList.length > 0 });
  }, [projectsList.length]);

  // React.useEffect(() => {
  //   console.log('Selected Workspace ID:', selectedWorkspaceId);
  // }, [selectedWorkspaceId]);

  const userGroup = config.user.group;
  const isPendingUser = userGroup.includes('pending');

  const handleSelectProject = (projectId) => {};

  // const organizationId = config.user.active_organization
  // console.log('id',organizationId)

  return (
    <Block name="projects-page">
      <Elem name="manager">
        {!isPendingUser && (
          <Flex justify="space-between" wrap="wrap" align="flex-start" gap={8}>
            <Flex gap={8} className="ls-filter_option">
              <Select
                variant="filled"
                value={
                  +selectedWorkspaceId
                    ? +selectedWorkspaceId
                    : selectedWorkspaceId
                }
                style={{ minWidth: 250, width: '100%' }}
                ref={selectRef}
                onChange={handleWorkspaceChange}
                options={workspaceOptions}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Space style={{ padding: '0 8px 4px' }}>
                      <AddWorkspaceInput
                        onWorkspaceAdd={createWorkspace}
                        workspaceLoading={workspaceLoading}
                      />
                    </Space>
                  </>
                )}
                labelRender={SelectRender}
              />

              <Search
                placeholder="Search projects"
                onSearch={handleSearch}
                style={{ minWidth: 200, width: '100%' }}
                allowClear
                value={searchValue}
                onChange={(e) => setSearchValue(e.currentTarget.value)}
              />
              <Cascader
                placeholder="Select option"
                style={{ minWidth: 250, width: '100%' }}
                options={sortOptions}
                expandTrigger="hover"
                onChange={handleSelectFilter}
                value={filterValue}
              />
            </Flex>
            <Space style={{ marginBottom: '10px' }} className="ls-view_option">
              {userGroup !== 'pending' &&
                userGroup !== 'reviewer' &&
                userGroup !== 'annotater' && (
                  <>
                    {selectedWorkspaceId && selectedWorkspaceId !== 'all' && (
                      <Button
                        type="primary"
                        onClick={() => setMembersModalVisible(true)}
                        disabled={selectedWorkspaceId === null}
                      >
                        Manage Members
                      </Button>
                    )}
                    <Button type="primary" onClick={openModal}>
                      Create Project
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => setTemplateModalVisible(true)}
                    >
                      Use Template
                    </Button>
                  </>
                )}
              <TemplateModal
                visible={templateModalVisible}
                onClose={() => setTemplateModalVisible(false)}
                onSelectProject={handleSelectProject}
              ></TemplateModal>

              <WorkspaceMembersModal
                visible={membersModalVisible}
                onClose={() => setMembersModalVisible(false)}
                selectedWorkspaceId={selectedWorkspaceId}
                // organizationId={organizationId}
              ></WorkspaceMembersModal>

              <Segmented
                options={['Grid', 'List']}
                onChange={handleViewtype}
                value={projectView}
              />
            </Space>
          </Flex>
        )}
      </Elem>
      {isPendingUser && (
        // <Block name="tab-panel">
        <Block name="warning-message">
          Your account is currently pending approval. You cannot access the
          projects at this time.
        </Block>
        // </Block>
      )}
      {!isPendingUser && (
        <Oneof value={networkState}>
          <Elem name="loading" case="loading">
            <Spinner size={64} />
          </Elem>
          <Elem name="content" case="loaded">
            {filteredProject.length ? (
              <ProjectsList
                projects={filteredProject}
                currentPage={currentPage}
                totalItems={totalItems}
                loadNextPage={loadNextPage}
                pageSize={defaultPageSize}
                onPin={pinFilter}
                onProject={fetchFirstProjects}
                workspaces={workspaceList}
                viewType={projectView}
              />
            ) : (
              <EmptyProjectsList openModal={openModal} />
            )}
            {modal && (
              <CreateProject
                onClose={closeModal}
                selectedWorkspaceId={selectedWorkspaceId}
              />
            )}
          </Elem>
          <Elem name="loading" case="error">
            <Result
              status="error"
              title="Oops! Something went wrong."
              extra={
                <Button
                  type="primary"
                  key="console"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
              }
            />
          </Elem>
        </Oneof>
      )}

      {workspaceModal && (
        <WorkspaceEditModal
          open={workspaceModal}
          onClose={() => setWorkspaceModal(false)}
          onSave={fetchWorkspaces}
          workspace={editWorkspace}
        />
      )}
    </Block>
  );
};

ProjectsPage.title = 'Projects';
ProjectsPage.path = '/projects';
ProjectsPage.exact = true;
ProjectsPage.routes = ({ store }) => [
  {
    title: () => store.project?.title,
    path: '/:id(\\d+)',
    exact: true,
    component: () => {
      const params = useRouterParams();

      return <Redirect to={`/projects/${params.id}/data`} />;
    },
    pages: {
      DataManagerPage,
      SettingsPage,
      Dashboard,
      Members,
    },
  },
];
// ProjectsPage.context = ({ openModal, showButton }) => {
//   const config = useConfig();
//   const userGroup = config.user.group;

//   //Hide Create button if the user is both an annotator and a reviewer
//   if (
//     !showButton ||
//     userGroup.includes('reviewer') ||
//     userGroup.includes('annotater')
//   )
//     return null;
//   return (
//     <Button onClick={openModal} look="primary" size="compact">
//       Create Project
//     </Button>
//   );
// };
