import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeGrid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Block, Elem } from '../../../utils/bem';
// import { Checkbox } from '../../Common/Checkbox/Checkbox';
// import { Space } from '../../Common/Space/Space';
import { getProperty, prepareColumns } from '../../Common/Table/utils';
import * as DataGroups from '../../DataGroups';
import './GridView.scss';
import { FF_LOPS_E_3, isFF } from '../../../utils/feature-flags';
import { SkeletonLoader } from '../../Common/SkeletonLoader';
import { absoluteURL, filename } from '../../../utils/helpers';
import debounce from 'lodash.debounce';
import { Button } from '../../Common/Button/Button';
import { Avatar, Checkbox, Dropdown, Tag, Tooltip } from 'antd';
import {
  PiBoundingBox,
  PiCalendarCheckBold,
  PiCaretDownBold,
  PiClipboardText,
  PiFileTextThin,
  PiNoteBold,
  PiPenBold,
  PiPlayFill,
  PiThumbsDownBold,
  PiThumbsUpBold,
} from 'react-icons/pi';
import { Userpic } from '../../Common/Userpic/Userpic';
import { LsCheckAlt, LsCrossAlt } from '../../../assets/icons';

const colors = ['#FFD54F', '#4DB6AC', '#BA68C8', '#87d068', '#7986CB'];
function getRandomColor() {
  return colors[Math.floor(Math.random() * 5)];
}

const getFileType = (fileUrl) => {
  const imageExtensions = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'svg',
  ]);
  const videoExtensions = new Set([
    'mp4',
    'avi',
    'mov',
    'wmv',
    'flv',
    'mkv',
    'webm',
  ]);
  const audioExtensions = new Set(['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac']);
  const textExtensions = new Set([
    'txt',
    'md',
    'json',
    'xml',
    'html',
    'css',
    'js',
  ]);

  const extension = fileUrl?.split('.')?.pop()?.toLowerCase();
  if (imageExtensions.has(extension)) {
    return 'image';
  } else if (videoExtensions.has(extension)) {
    return 'video';
  } else if (audioExtensions.has(extension)) {
    return 'audio';
  } else {
    return 'text';
  }
};

// const GridHeader = observer(({ row, selected }) => {
//   return (
//     <Elem name="cell-header">
//       <Space>
//         <Checkbox checked={selected.isSelected(row.id)} />
//         <span>{row.id}</span>
//       </Space>
//     </Elem>
//   );
// });

const TaskImage = React.memo(({ value, type }) => {
  const [play, setPlay] = useState(false);
  if (type === 'image') {
    return (
      <Elem
        tag="img"
        name="image"
        src={absoluteURL(value)}
        height="100%"
        width="100%"
        loading="lazy"
      />
    );
  } else if (play && type === 'video') {
    return (
      <Elem
        tag="video"
        name="video"
        src={absoluteURL(value)}
        height="100%"
        width="100%"
        controls
      />
    );
  } else if (play && type === 'audio') {
    return (
      <Elem
        tag="audio"
        name="video"
        src={absoluteURL(value)}
        height="100%"
        width="100%"
        controls
      />
    );
  } else {
    return (
      <Elem name="file">
        <PiFileTextThin size={50} />
        {type} file
        {(type === 'audio' || type === 'video') && (
          <Elem name="file_play" onClick={() => setPlay(true)}>
            <PiPlayFill size={30} color="rgba(0, 91, 167, 0.8)" />
            Click to load
          </Elem>
        )}
      </Elem>
    );
  }
});

const DropdownButton = ({ onLabel = () => {}, onReview = () => {} }) => {
  const triggerRef = useRef();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = useCallback(() => setIsOpen((isOpen) => !isOpen), []);

  const handleClickOutside = useCallback((e) => {
    const el = triggerRef.current;

    if (el && !el.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside, { capture: true });

    return () => {
      document.removeEventListener('click', handleClickOutside, {
        capture: true,
      });
    };
  }, []);

  const triggerStyle = {
    // width: 20,
    padding: '0 5px 0 0',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: isOpen ? 0 : undefined,
    boxShadow: 'none',
  };

  const primaryStyle = {
    // width: 160,
    padding: '0 8px',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: isOpen ? 0 : undefined,
  };

  const secondStyle = {
    // width: 180,
    padding: '0 12px',
    display: isOpen ? 'flex' : 'none',
    position: 'absolute',
    zIndex: 10,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  };

  return (
    <div>
      <div style={{ display: 'flex' }}>
        <Button
          size="small"
          look="primary"
          className="label_button"
          style={primaryStyle}
          onClick={onLabel}
        >
          Label
        </Button>
        <Button
          ref={triggerRef}
          size="small"
          look="primary"
          className="label_button"
          style={triggerStyle}
          onClick={toggleOpen}
        >
          <PiCaretDownBold
            style={{
              transform: isOpen ? 'rotate(180deg)' : undefined,
              transition: 'transform 0.3s ease',
            }}
          />
        </Button>
      </div>
      <Button
        size="small"
        style={secondStyle}
        className="label_button"
        onClick={onReview}
      >
        Review
      </Button>
    </div>
  );
};

const GridBody = observer(({ row, fields, view, onClick, onLabel }) => {
  const dataFields = fields.filter((f) => f.parent?.alias === 'data');
  // console.log(fields);
  const currentUserRole = window.APP_SETTINGS?.user?.group;
  const isReviewer = currentUserRole && currentUserRole === 'reviewer'

  return dataFields.map((field, index) => {
    const valuePath = field.id.split(':')[1] ?? field.id;
    const value = getProperty(row, valuePath);
    const name = filename(value);
    const createdDate = new Date(row.created_at);
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const createdAt = createdDate.toLocaleDateString('en-US', dateOptions);
    const updatedDate = new Date(row.updated_at);
    const dateOptions2 = { month: 'long', day: 'numeric' };
    const updatedAt = updatedDate.toLocaleDateString('en-US', dateOptions2);
    const annotators = row?.annotators || [];
    const reviewers = row?.reviewers || [];
    const fileType = getFileType(name);
    const taskData = {
      annotations: row?.total_annotations || 0,
      approved: reviewers?.filter((reviewer) => reviewer.review === 'accepted')
        .length,
      rejected: reviewers?.filter((reviewer) => reviewer.review === 'rejected')
        .length,
    };
    // console.log(row, field);
    // console.log(fileType);

    let taskStatus = '';
    if (taskData.approved > 0 || taskData.rejected > 0) {
      taskStatus = (
        <Tag
          color="cyan"
          className="dm-grid-view_status_tag"
          icon={<PiClipboardText />}
        >
          Reviewed
        </Tag>
      );
    } else if (taskData.annotations > 0) {
      taskStatus = (
        <Tag
          color="geekblue"
          className="dm-grid-view_status_tag"
          icon={<PiBoundingBox />}
        >
          Annotated
        </Tag>
      );
    }

    return (
      <Elem
        name="card"
        style={
          view?.selected?.isSelected(row.id)
            ? { border: '1px solid #51aafd', backgroundColor: '#e7f0ff' }
            : {}
        }
        key={row.id}
      >
        <Elem name="card_media">
          <TaskImage value={value} type={fileType} />
        </Elem>
        {row?.total_annotations > 0 && (
          <Elem name="card_image_footer">
            <Elem name="card_data">
              <Tag
                icon={<PiNoteBold />}
                bordered={false}
                className="dm-grid-view_data_tag"
                title="Annotations"
              >
                {taskData.annotations}
              </Tag>
              <Tag
                icon={<PiThumbsUpBold />}
                bordered={false}
                className="dm-grid-view_data_tag"
                title="Approved"
              >
                {taskData.approved}
              </Tag>
              <Tag
                icon={<PiThumbsDownBold />}
                bordered={false}
                className="dm-grid-view_data_tag"
                title="Rejected"
              >
                {taskData.rejected}
              </Tag>
            </Elem>
            <Elem name="card_updated">
              Updated on <b>{updatedAt}</b>
            </Elem>
          </Elem>
        )}
        <Elem name="card_content">
          <Elem name="card_details">
            <Elem name="card_members">
              <Tooltip
                title={
                  annotators.length > 0 ? (
                    <Elem name="card_avatars">
                      {annotators.map((item, index) => (
                        <Userpic
                          key={index}
                          title={item?.user.fullName || item?.user.email}
                          user={item}
                          // faded={item?.annotated}
                          badge={{
                            bottomRight: item?.annotated && (
                              <Block
                                name="userpic-badge"
                                mod={{ accepted: true }}
                              >
                                <LsCheckAlt />
                              </Block>
                            ),
                          }}
                          style={{ color: '#888' }}
                        />
                      ))}
                    </Elem>
                  ) : (
                    <div style={{ color: 'black' }}>No annotators</div>
                  )
                }
                mouseEnterDelay={0.3}
                mouseLeaveDelay={0.3}
                color="#fff"
              >
                <Tag
                  icon={<PiPenBold size={18} />}
                  bordered={false}
                  className="dm-grid-view_members_tag"
                  color="gold"
                  title="Annotators"
                >
                  {annotators.length}
                </Tag>
              </Tooltip>
              <Tooltip
                title={
                  reviewers.length > 0 ? (
                    <Elem name="card_avatars">
                      {reviewers.map((item, index) => (
                        <Userpic
                          key={index}
                          title={item?.user.fullName || item?.user.email}
                          user={item}
                          // faded={item?.reviewed}
                          badge={{
                            bottomRight: item?.review && (
                              <Block
                                name="userpic-badge"
                                mod={{ [item.review]: true }}
                              >
                                {item.review === 'rejected' ? (
                                  <LsCrossAlt />
                                ) : (
                                  <LsCheckAlt />
                                )}
                              </Block>
                            ),
                          }}
                          style={{ color: '#888' }}
                        />
                      ))}
                    </Elem>
                  ) : (
                    <div style={{ color: 'black' }}>No reviewers</div>
                  )
                }
                mouseEnterDelay={0.3}
                mouseLeaveDelay={0.3}
                color="#fff"
              >
                <Tag
                  icon={<PiCalendarCheckBold size={18} />}
                  bordered={false}
                  className="dm-grid-view_members_tag"
                  color="lime"
                  title="Reviewers"
                >
                  {reviewers.length}
                </Tag>
              </Tooltip>
            </Elem>
            <Elem name="card_created">{createdAt}</Elem>
          </Elem>
          <Elem name="card_file">
            <Elem name="card_name" title={name}>
              {name}
            </Elem>

            {/* {taskData.annotations > 0 ? (
              <DropdownButton
                onLabel={(e) => onLabel?.(row, e)}
                onReview={(e) => console.log('review', e)}
              />
            ) : ( */}
              <Button
                look="primary"
                size="small"
                className="label_button"
                onClick={(e) => onLabel?.(row, e)}
              >
                {isReviewer ? 'Review' : 'Label'}
              </Button>
            {/* )} */}
          </Elem>
        </Elem>
        <Elem
          name="card_selection"
          style={view?.selected?.isSelected(row.id) ? { opacity: 1 } : {}}
        >
          <Checkbox
            checked={view?.selected?.isSelected(row.id)}
            onClick={onClick}
          />
        </Elem>
        {taskStatus}
      </Elem>
    );
  });
});

// const GridDataGroup = observer(({ type, value, field, row }) => {
//   const DataTypeComponent = DataGroups[type];

//   return (isFF(FF_LOPS_E_3) && row.loading === field.alias) ? <SkeletonLoader /> : (
//     DataTypeComponent ? (
//       <DataTypeComponent value={value} field={field} original={row} />
//     ) : (
//       <DataGroups.TextDataGroup value={value} field={field} original={row} />
//     )
//   );
// });

const GridCell = observer(
  ({ view, selected, row, fields, onClick, onLabel, ...props }) => {
    return (
      <Elem
        {...props}
        name="cell"
        // onClick={onClick}
        mod={{ selected: selected.isSelected(row.id) }}
      >
        <Elem name="cell-content">
          <GridBody
            view={view}
            row={row}
            fields={fields}
            onClick={onClick}
            onLabel={onLabel}
          />
        </Elem>
      </Elem>
    );
  }
);

export const GridView = observer(
  ({ data, view, loadMore, fields, onChange, hiddenFields, onLabel }) => {
    const [windowWidth, setWindowWidth] = useState();

    // Handle window resize with debounce
    useEffect(() => {
      const handleResize = debounce(
        () => setWindowWidth(window.innerWidth),
        200
      );
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getColumnCount = () => {
      if (windowWidth < 500) return 1;
      if (windowWidth < 900) return 2;
      if (windowWidth < 1200) return 3;
      if (windowWidth < 1500) return 4;
      return 5;
    };

    const columnCount = getColumnCount();

    const getCellIndex = (row, column) => columnCount * row + column;

    const fieldsData = React.useMemo(() => {
      return prepareColumns(fields, hiddenFields);
    }, [fields, hiddenFields]);

    // const rowHeight = fieldsData
    //   .filter((f) => f.parent?.alias === 'data')
    //   .reduce((res, f) => {
    //     const height = (DataGroups[f.currentType] ?? DataGroups.TextDataGroup)
    //       .height;

    //     return res + height;
    //   }, 16);

    const renderItem = React.useCallback(
      ({ style, rowIndex, columnIndex }) => {
        const index = getCellIndex(rowIndex, columnIndex);
        const row = index < data.length && data[index];

        if (!row) return null;

        const props = {
          style: {
            ...style,
            // marginLeft: "1em",
          },
        };

        return (
          <GridCell
            {...props}
            view={view}
            row={row}
            fields={fieldsData}
            selected={view.selected}
            onClick={() => onChange?.(row.id)}
            key={`${rowIndex}-${columnIndex}`}
            onLabel={onLabel}
          />
        );
      },
      [
        // data,
        // fieldsData,
        // view.selected,
        // view,
        // view.selected.list,
        // view.selected.all,
        columnCount,
      ]
    );

    const onItemsRenderedWrap =
      (cb) =>
      ({
        visibleRowStartIndex,
        visibleRowStopIndex,
        overscanRowStopIndex,
        overscanRowStartIndex,
      }) => {
        cb({
          overscanStartIndex: overscanRowStartIndex,
          overscanStopIndex: overscanRowStopIndex,
          visibleStartIndex: visibleRowStartIndex,
          visibleStopIndex: visibleRowStopIndex,
        });
      };

    const itemCount = Math.ceil(data.length / columnCount);

    const isItemLoaded = React.useCallback(
      (index) => {
        const rowIndex = index * columnCount;
        const rowFullfilled =
          data.slice(rowIndex, columnCount).length === columnCount;

        return !view.dataStore.hasNextPage || rowFullfilled;
      },
      [columnCount, data, view.dataStore.hasNextPage]
    );

    return (
      <Block name="grid-view">
        <Elem tag={AutoSizer} name="resize">
          {({ width, height }) => (
            <InfiniteLoader
              itemCount={itemCount}
              isItemLoaded={isItemLoaded}
              loadMoreItems={loadMore}
              threshold={Math.floor(view.dataStore.pageSize / 3)}
              minimumBatchSize={view.dataStore.pageSize / 2}
            >
              {({ onItemsRendered, ref }) => (
                <Elem
                  tag={FixedSizeGrid}
                  ref={ref}
                  width={width}
                  height={height}
                  name="list"
                  rowHeight={width / columnCount - 50}
                  overscanRowCount={view.dataStore.pageSize}
                  columnCount={columnCount}
                  columnWidth={width / columnCount}
                  rowCount={itemCount}
                  onItemsRendered={onItemsRenderedWrap(onItemsRendered)}
                  style={{ overflowX: 'hidden' }}
                >
                  {renderItem}
                </Elem>
              )}
            </InfiniteLoader>
          )}
        </Elem>
      </Block>
    );
  }
);
