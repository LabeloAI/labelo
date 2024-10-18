import { format, parseISO } from 'date-fns';
import React, { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
// import { LsBulb, LsCheck, LsEllipsis, LsMinus } from '../../assets/icons';
import { Pagination, Userpic } from '../../components';
import { Block, Elem } from '../../utils/bem';
import { absoluteURL } from '../../utils/helpers';
import { useState } from 'react';
import { useAPI } from '../../providers/ApiProvider';
import { useConfig } from '../../providers/ConfigProvider';
import { Tooltip } from '../../components/Tooltip/Tooltip';
// import { FaRibbon } from 'react-icons/fa';
import {
  Avatar,
  Card,
  Divider,
  Flex,
  Progress,
  Space,
  Tag,
  // Tooltip,
  Button,
  Dropdown,
  message,
  Modal,
  Empty,
  Table,
  Badge,
  // Ribbon
} from 'antd';
import { FaCheck, FaEllipsisV } from 'react-icons/fa';
import {
  PiBoundingBox,
  PiFileAudioThin,
  PiFileImageThin,
  PiFileText,
  PiFileTextThin,
  PiFileVideoThin,
  PiPushPinDuotone,
  PiSealCheckDuotone,
  PiTagBold,
} from 'react-icons/pi';
import { IconContext } from 'react-icons/lib';
import chroma from 'chroma-js';
import LazyLoad from 'react-lazyload';
import ProjectDuplicateModel from './Modal/ProjectDuplicateModal';

export const ProjectsList = ({
  projects,
  currentPage,
  totalItems,
  loadNextPage,
  pageSize,
  onPin,
  onProject,
  workspaces,
  viewType,
}) => {
  const gridView = useMemo(
    () => (
      <Elem name="list">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onPin={onPin}
            onProject={onProject}
            workspaces={workspaces}
          />
        ))}
      </Elem>
    ),
    [projects, workspaces]
  );

  const tableView = useMemo(
    () => (
      <Elem name="table">
        <ProjectTable
          projects={projects}
          workspaces={workspaces}
          onProject={onProject}
        />
      </Elem>
    ),
    [projects, workspaces]
  );
  return (
    <>
      {viewType === 'Grid' ? gridView : tableView}
      <Elem name="pages">
        <Pagination
          name="projects-list"
          label="Projects"
          page={currentPage}
          totalItems={totalItems}
          urlParamName="page"
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 30, 50, 100]}
          onPageLoad={(page, pageSize) => loadNextPage(page, pageSize)}
        />
      </Elem>
    </>
  );
};

export const EmptyProjectsList = ({ openModal }) => {
  const config = useConfig();
  const userGroup = config.user.group;
  const isValidUser =
    userGroup !== 'pending' &&
    userGroup !== 'reviewer' &&
    userGroup !== 'annotater';

  return (
    <Block name="empty-projects-page">
      <Elem
        name="heidi"
        tag="img"
        src={absoluteURL('/static/images/logo_loadings.png')}
        style={{
          width: '100px',
          height: 'auto',
          marginBottom: '63px',
          marginTop: '196px',
        }}
      />
      <Elem name="header" tag="h1">
        You doesn’t see any projects here
      </Elem>
      {/* <p>Create one and start labeling your data</p> */}
      {/* <Elem name="action" tag={Button} onClick={openModal} look="primary">
        Create Project
      </Elem> */}
      {isValidUser && (
          <div>
            <p>Create one and start labeling your data</p>
            <Button
              type="primary"
              onClick={openModal}
              style={{ margin: '72px 0 32px' }}
            >
              Create Project
            </Button>
          </div>
        )}
    </Block>
  );
};

const colors = [
  '#FFFFFF',
  '#F52B4F',
  '#FA8C16',
  '#F6C549',
  '#9ACA4F',
  '#51AAFD',
  '#7F64FF',
  '#D55C9D',
];

const getIconByExtension = (src) => {
  const extension = src ? src.split('/')[0].toLowerCase() : '';
  switch (extension) {
    case 'video':
      return <PiFileVideoThin />;
    case 'audio':
      return <PiFileAudioThin />;
    case 'image':
      return <PiFileImageThin />;
    default:
      return <PiFileTextThin />;
  }
};

const getImageUrl = (src) => {
  const validImageExtensions = [
    'png',
    'jpeg',
    'jpg',
    'gif',
    'bmp',
    'webp',
    'tiff',
    'svg',
  ];
  const extension = src.split('.').pop().toLowerCase();
  if (validImageExtensions.includes(extension)) {
    return absoluteURL(src);
  } else {
    // console.log(extension);
    return '';
  }
};

const ProjectThumbnail = React.memo(({ src, index, onError }) => (
  <LazyLoad height={100} once>
    <img
      src={getImageUrl(src)}
      alt={`Image ${index + 1}`}
      onError={onError}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
      loading="lazy"
    />
  </LazyLoad>
));

export const ProjectCard = React.memo(
  ({ project, onPin, onProject, workspaces = [] }) => {
    const api = useAPI();
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [projectColor, setProjectColor] = useState(project.color);
    const [duplicateModal, setDuplicateModal] = useState(false);
    const config = useConfig();
    const userGroup = config.user.group;
    const isValidUser =
    userGroup !== 'pending' &&
    userGroup !== 'reviewer' &&
    userGroup !== 'annotater';
    const show_dm_to_annotators = project.show_dm_to_annotators;
    const show_dm_to_reviewers = project.show_dm_to_reviewers;

    const date = parseISO(project?.created_at);
    const createDate = format(date, 'd MMMM yy');
    const projectProgress =
      (project?.finished_task_number / project?.task_number) * 100;
    const labelCount = project?.labels ? project?.labels?.length : 0;
    const thumbnailImages = project.thumbnail_image
      ? Array(3)
          .fill(null)
          .map((_, i) => project?.thumbnail_image[i] || null)
      : [null, null, null];
    const workspace = workspaces.find((item) => item.id === project?.workspace);
    const workspaceName = workspace ? workspace.title : 'Private';
    const membersList = project?.members || [];
    // console.log(workspaces);

    const [errorIndices, setErrorIndices] = useState({});
    const handleProjectPin = async () => {
      message.open({
        key: 'pin',
        type: 'loading',
        content: 'Loading...',
      });
      try {
        const response = await api.callApi('updateProject', {
          params: {
            pk: project.id,
          },
          body: {
            is_pinned: !project.is_pinned,
          },
        });

        if (response) {
          onPin({ ...project, is_pinned: response.is_pinned });
          message.open({
            key: 'pin',
            type: 'success',
            content: project.is_pinned ? 'Unpinned' : 'Pinned',
          });
        }
      } catch (error) {
        // console.log('err', error);
        message.open({
          key: 'pin',
          type: 'error',
          content: 'Failed to connect',
        });
      }
    };

    const handleProjectDelete = async () => {
      setDeleteLoading(true);
      await api.callApi('deleteProject', {
        params: {
          pk: project.id,
        },
      });
      setDeleteLoading(false);
      setDeleteModal(false);
      onProject();
    };

    const handleProjectColor = async (color) => {
      message.open({
        key: 'color',
        type: 'loading',
        content: 'Loading...',
      });
      try {
        const response = await api.callApi('updateProject', {
          params: {
            pk: project.id,
          },
          body: {
            color: color,
          },
        });

        if (response) {
          setProjectColor(color);
          // onPin({ ...project, is_pinned: response.is_pinned });
          message.open({
            key: 'color',
            type: 'success',
            content: 'Updated',
          });
        }
      } catch (error) {
        // console.log('err', error);
        message.open({
          key: 'color',
          type: 'error',
          content: 'Failed to connect',
        });
      }
    };

    const handleMenuClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };

    const menuItems = {
      items: [
        {
          key: '1',
          label: 'Color',
          children: [
            {
              key: '1-1',
              label: (
                <div
                  style={{ display: 'flex', gap: 5 }}
                  onClick={handleMenuClick}
                >
                  {colors.map((color, index) => (
                    <div
                      key={index}
                      style={{
                        height: 20,
                        width: 20,
                        backgroundColor: color,
                        borderRadius: 5,
                        border: '1px solid #f0f0f0',
                        position: 'relative',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleProjectColor(color)}
                    >
                      {projectColor === color && (
                        <FaCheck
                          style={{
                            color:
                              projectColor === '#FFFFFF' ? 'black' : 'white', // Color of the tick mark
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)', // Center the icon
                            fontSize: '12px', // Size of the icon
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ),
            },
          ],
        },
        {
          key: '2',
          label: (
            <NavLink to={`/projects/${project.id}/settings`}>Settings</NavLink>
          ),
        },
        {
          key: '3',
          label: (
            <div onClick={() => setDuplicateModal(true)}>Duplicate project</div>
          ),
        },
        {
          key: '4',
          label: (
            <div onClick={handleProjectPin}>
              {project.is_pinned ? 'Unpin project' : 'Pin project'}
            </div>
          ),
        },
        {
          key: '5',
          danger: true,
          label: <div onClick={() => setDeleteModal(true)}>Delete</div>,
        },
      ],
    };

    const handleImageError = (index) => {
      setErrorIndices((prevState) => ({ ...prevState, [index]: true }));
    };

    const redirectUrl =
      userGroup === 'annotater' && !show_dm_to_annotators
        ? `/projects/${project.id}/data?labeling=1`
        : userGroup === 'reviewer' && !show_dm_to_reviewers
        ? `/projects/${project.id}/data`
        : `/projects/${project.id}/data`;

    const isReadOnly =
      (userGroup === 'annotater' || userGroup === 'reviewer') &&
      project.is_published === false;

    return (
      <>
        <Elem
          tag={isReadOnly ? 'div' : NavLink}
          name="project-link"
          to={redirectUrl}
          data-external={isReadOnly ? null : 'true'}
          style={{ cursor: isReadOnly ? 'pointer' : 'default' }}
        >
          <Block name="project_card">
            {/* <Badge color='red' text='Not Published' visible={isReadOnly}> */}
            {/* <Tooltip
          title={
            project.queue_done === project.queue_total
              ? 'Project queue is complete!'
              : 'Project is not completed yet.'
          }></Tooltip> */}
            <Tooltip
              title={'Project is not published yet.'}
              disabled={!isReadOnly}
            >
              {/* <Tooltip title={'Tasks finished'} disabled={project.queue_done !== project.queue_total}> */}
              <Card
                hoverable
                size="small"
                style={{
                  width: '100%',
                  border: `1px solid ${
                    projectColor && projectColor !== '#FFFFFF'
                      ? projectColor
                      : '#f0f0f0'
                  }`,
                  backgroundColor: projectColor
                    ? chroma.mix(projectColor, 'white', 0.8).hex()
                    : '#fff',
                }}
              >
                <Space.Compact
                  style={{
                    width: '100%',
                    boxShadow:
                      'rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgb(209, 213, 219) 0px 0px 0px 1px inset',
                    borderRadius: 10,
                    position: 'relative',
                    marginBottom: 6,
                  }}
                >
                  {thumbnailImages.map((src, index) => (
                    <div
                      key={index}
                      style={{
                        width: '33.33%',
                        height: 100,
                        borderRadius:
                          index === 0
                            ? '10px 0 0 10px'
                            : index === 2
                            ? '0 10px 10px 0'
                            : '0',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: index === 1 ? '#eee' : '#e7e7e7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {src &&
                        (!errorIndices[index] ? (
                          <ProjectThumbnail
                            index={index}
                            src={src}
                            onError={() => handleImageError(index)}
                          />
                        ) : (
                          errorIndices[index] && (
                            <IconContext.Provider
                              value={{ size: '3em', color: 'gray' }}
                            >
                              {getIconByExtension(src)}
                            </IconContext.Provider>
                          )
                        ))}
                    </div>
                  ))}
                  {thumbnailImages[0] === null && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'gray',
                      }}
                    >
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                  )}
                </Space.Compact>
                <Flex justify="space-between">
                  <Elem name="title-text">
                    {project.title ?? 'New project'}
                  </Elem>
                  <Flex gap={4} align="center">
                    {project.is_published && (
                      <PiSealCheckDuotone size={18} title="Published" />
                    )}
                    {project.is_pinned && <PiPushPinDuotone size={15} />}
                  </Flex>
                </Flex>
                <Flex justify="space-between" style={{ paddingBottom: 10 }}>
                  <Elem name="workspace-text">
                    {workspaceName ?? 'Private'}
                  </Elem>
                  <Elem name="date-text">{createDate}</Elem>
                  {/* <Tag color="purple">purple</Tag> */}
                </Flex>
                {/* <Divider style={{margin: "0 0 5px 0"}} /> */}
                <Progress percent={Math.round(projectProgress) || 0} />
                <Flex justify="space-between" align="end">
                  <Avatar.Group
                    size="small"
                    max={{
                      style: {
                        color: '#5e6472',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #5e6472',
                      },
                      count: 2,
                    }}
                  >
                    {membersList.map((item, index) => (
                      <Tooltip title={item.email} placement="top" key={index}>
                        <Avatar
                          src={item?.avatar ? absoluteURL(item.avatar) : ''}
                        >
                          {item.email.slice(0, 2).toUpperCase()}
                        </Avatar>
                      </Tooltip>
                    ))}
                    {/* <Avatar style={{ backgroundColor: '#87d068' }}>A</Avatar>
                  <Avatar style={{ backgroundColor: '#1677aa' }}>M</Avatar> */}
                  </Avatar.Group>
                  <Flex align="end" justify="space-between" gap={10}>
                    <Tooltip placement="bottom" title="Total number of tasks">
                      <Elem name="footer-icon">
                        <PiFileText size={15} />
                        <Elem name="icon-count">
                          {project?.task_number || 0}
                        </Elem>
                      </Elem>
                    </Tooltip>
                    <Tooltip placement="bottom" title="Number of labels">
                      <Elem name="footer-icon">
                        <PiTagBold size={15} />
                        <Elem name="icon-count">{labelCount}</Elem>
                      </Elem>
                    </Tooltip>
                    <Tooltip placement="bottom" title="Number of labeled tasks">
                      <Elem name="footer-icon">
                        <PiBoundingBox size={17} />
                        <Elem name="icon-count">
                          {project?.finished_task_number || 0}
                        </Elem>
                      </Elem>
                    </Tooltip>
                    {userGroup !== 'reviewer' && userGroup !== 'annotater' && (
                      <Elem name="footer-menu" onClick={handleMenuClick}>
                        <Dropdown menu={menuItems} trigger={['click']}>
                          <FaEllipsisV />
                        </Dropdown>
                      </Elem>
                    )}
                  </Flex>
                </Flex>
                {userGroup === 'annotater' && (
                  <Button
                    type="primary"
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: project.task_distribution === 'AUTO' ? 'blue' : '',
                      backgroundColor:
                        project.task_distribution === 'AUTO' ? 'white' : '',
                      borderColor:
                        project.task_distribution === 'AUTO' ? 'blue' : '',
                    }}
                    disabled={isReadOnly}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/projects/${project.id}/data?labeling=1`;
                    }}
                  >
                    <span>
                      {project.task_distribution === 'AUTO'
                        ? 'Label All Tasks'
                        : 'Label my Tasks'}
                    </span>
                    <span>
                      {project.queue_done} of {project.queue_total}
                    </span>
                  </Button>
                )}
                {userGroup === 'reviewer' && (
                  <Button
                    type="primary"
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color:
                        project.review_distribution === 'AUTO' ? 'blue' : '',
                      backgroundColor:
                        project.review_distribution === 'AUTO' ? 'white' : '',
                      borderColor:
                        project.review_distribution === 'AUTO' ? 'blue' : '',
                    }}
                    disabled={isReadOnly}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/projects/${project.id}/data`;
                    }}
                  >
                    <span>
                      {project.review_distribution === 'AUTO'
                        ? 'Review All Annotations'
                        : 'Review Annotaions'}
                    </span>
                    <span>
                      {project.review_queue_done} of{' '}
                      {project.review_queue_total}
                    </span>
                  </Button>
                )}
              </Card>
              {/* </FaRibbon> */}
              {/* </Badge> */}
              {/* </Tooltip> */}
            </Tooltip>
          </Block>
        </Elem>
        {deleteModal && (
          <Modal
            title="Action confirmation"
            open={deleteModal}
            onOk={handleProjectDelete}
            confirmLoading={deleteLoading}
            onCancel={() => setDeleteModal(false)}
            okText="Delete"
            okType="danger"
          >
            <p>
              You're about to delete this project. This action cannot be undone.
            </p>
          </Modal>
        )}
        {duplicateModal && (
          <ProjectDuplicateModel
            open={duplicateModal}
            onClose={() => setDuplicateModal(false)}
            data={project}
            workspaces={workspaces}
            onSave={onProject}
          />
        )}
      </>
    );
  }
);

const ProjectTable = React.memo(({ projects, workspaces, onProject }) => {
  const api = useAPI();
  const [selectedProject, setSelectedProject] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const config = useConfig();
  const userGroup = config.user.group;
  const isValidUser =
    userGroup !== 'pending' &&
    userGroup !== 'reviewer' &&
    userGroup !== 'annotater';

  const onSelectChange = (newSelectedProject) => {
    setSelectedProject(newSelectedProject);
  };
  const hasSelected = selectedProject.length > 0;
  // console.log(projects);
  const projectData = projects.map((item) => ({
    key: item.id,
    title: item.title,
    description: item.description,
    created_by: item?.created_by?.email,
    created_at: item.created_at?.split('T')[0],
    task_number: item.task_number,
    finished_task_number: item.finished_task_number,
    skipped_annotations_number: item.skipped_annotations_number,
    show_dm_to_annotators: item.show_dm_to_annotators,
    show_dm_to_reviewers: item.show_dm_to_reviewers,
    workspace:
      workspaces.find((workspace) => workspace.id === item.workspace)?.title ||
      'Private',
    label_count: item?.labels ? item?.labels?.length : 0,
  }));
  const projectColumns = [
    {
      title: 'Name',
      dataIndex: 'title',
      key: 'name',
      render: (text, record) => (
        <NavLink
          to={
            userGroup === 'annotater' && !record.show_dm_to_annotators
              ? `/projects/${record.key}/data?labeling=1`
              : userGroup === 'reviewer' && !record.show_dm_to_reviewers
              ? `/projects/${record.key}/data`
              : `/projects/${record.key}/data`
          }
        >
          {text}
        </NavLink>
      ),
    },
    // {
    //   title: 'Description',
    //   dataIndex: 'description',
    //   key: 'description',
    //   // width: 200,
    //   // ellipsis: true,
    //   render: (text) => <div title={text} style={{
    //     // maxWidth: 200,
    //     // whiteSpace: "nowrap",
    //     // overflow: "hidden",
    //     // textOverflow: "ellipsis"
    //   }}>{text}</div>
    // },
    {
      title: 'Created by',
      dataIndex: 'created_by',
      key: 'created_by',
    },
    {
      title: 'Created at',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: 'Workspace',
      dataIndex: 'workspace',
      key: 'workspace',
    },
    {
      title: 'Label count',
      dataIndex: 'label_count',
      key: 'label_count',
    },
    {
      title: 'Total tasks',
      dataIndex: 'task_number',
      key: 'task_number',
    },
    {
      title: 'Completed tasks',
      dataIndex: 'finished_task_number',
      key: 'finished_task_number',
    },
    {
      title: 'Skipped tasks',
      dataIndex: 'skipped_annotations_number',
      key: 'skipped_annotations_number',
    },
  ];

  const handleProjectsDelete = async () => {
    try {
      const response = await api.callApi('bulkDelete', {
        body: {
          ids: selectedProject,
        },
      });

      if (response) {
        message.success('Projects deleted');
        onProject();
      }
    } catch (error) {
      // console.log('err', error);
      message.error('Failed to delete');
    }
  };
  return (
    <>
      <div
        style={{ minHeight: 40, display: 'flex', alignItems: 'center', gap: 5 }}
      >
        {hasSelected && isValidUser && (
          <div style={{ padding: '10px 0' }}>
            <Button danger onClick={() => setDeleteModal(true)}>
              Delete
            </Button>
            <span
              style={{ marginLeft: 8, color: '#1677FF' }}
            >{`Selected ${selectedProject.length} items`}</span>
          </div>
        )}
      </div>
      <Table
        rowSelection={{
          selectedRowKeys: selectedProject,
          onChange: onSelectChange,
        }}
        dataSource={projectData}
        columns={projectColumns}
        // bordered
        pagination={false}
        className="ls-project_table_header"
      />

      {deleteModal && (
        <Modal
          title="Action confirmation"
          open={deleteModal}
          onOk={handleProjectsDelete}
          // confirmLoading={deleteLoading}
          onCancel={() => setDeleteModal(false)}
          okText="Delete"
          okType="danger"
        >
          <p>
            You're about to delete {selectedProject.length} projects. This
            action cannot be undone.
          </p>
        </Modal>
      )}
    </>
  );
});
