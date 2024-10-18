import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import { Header } from '../components';
import './Overview.scss';
import { useAPI } from 'apps/labeloapp/src/providers/ApiProvider';
import ReactECharts from 'echarts-for-react';
import { useProject } from 'apps/labeloapp/src/providers/ProjectProvider';
import { labelOption, reviewOption } from './ChartOptions';
import ProgressPie from './ProgressPie';
import ProgressBar from './ProgressBar';
import { Button, Space, Tooltip, message } from 'antd';
import {
  PiArrowCounterClockwise,
  PiFloppyDiskBack,
  PiPencilSimpleDuotone,
} from 'react-icons/pi';
import GridStackLayout, { overviewDefault } from '../GridStackLayout';

const Overview = ({ layoutData, project }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(layoutData);
  const [gridKey, setGridKey] = useState(0);

  const layoutRef = useRef(layoutData);
  const labelchartRef = useRef();
  const reviewchartRef = useRef();

  // const { project } = useProject();
  const api = useAPI();

  const fetchOverview = async () => {
    setLoading(true);
    const response = await api.callApi('dashboard', {
      params: { pk: project.id },
    });
    setData({
      overall_progress: Math.round(response.overall_progress),
      total_tasks: response.total_tasks,
      in_progress: response.in_progress,
      completed_task: response.completed_task,
      annotation_progress: response.overview_task,
    });
    updateLabelOption(response.overview_task);
    updateReviewOption(response.overview_task);
    setLoading(false);
  };

  useEffect(() => {
    if (project.id && !loading) {
      fetchOverview();
    }
  }, [project.id]);

  const updateLabelOption = (optionData = {}) => {
    const newOption = { ...labelOption };
    const annotatePercentage =
      (optionData.annotated / (optionData.to_label + optionData.annotated)) *
        100 || 0;
    newOption.series[0].data = [
      { value: optionData.to_label || 0, name: 'To label' },
      { value: optionData.annotated || 0, name: 'Annotated' },
      { value: optionData.skipped_tasks || 0, name: 'Skipped' },
    ];
    newOption.graphic.style.text = `${Math.round(annotatePercentage)}%`;

    labelchartRef?.current?.getEchartsInstance().setOption(newOption);
  };

  const updateReviewOption = (optionData = {}) => {
    const newOption = { ...reviewOption };
    const reviewPercentage = optionData?.review_progress || 0
      // (optionData.reviewed / (optionData.to_review + optionData.reviewed)) *
      //   100 || 0;
    newOption.series[0].data = [
      { value: optionData.in_review || 0, name: 'In review' },
      { value: optionData.approved || 0, name: 'Approved' },
      { value: optionData.rejected || 0, name: 'Rejected' },
    ];
    newOption.graphic.style.text = `${Math.round(reviewPercentage)}%`;

    reviewchartRef?.current?.getEchartsInstance().setOption(newOption);
  };

  const overallPercentage =
    data.overall_progress <= 100 ? data.overall_progress : 100;
  const overallData = [
    { name: 'Total files', value: data.total_tasks, color: '#00CFFF' },
    { name: 'Completed', value: data.completed_task, color: '#007bff' },
    { name: 'Remaining', value: data.in_progress, color: '#d5e0ff' },
    // { name: 'Issues', value: 0, color: '#D3D3D3' },
  ];
  const annotateData = [
    {
      name: 'To label',
      value: data.annotation_progress?.to_label || 0,
      color: '#ffcc00',
    },
    {
      name: 'Annotated',
      value: data.annotation_progress?.annotated || 0,
      color: '#99cc00',
    },
    {
      name: 'Skipped',
      value: data.annotation_progress?.skipped_tasks || 0,
      color: '#ff6600',
    },
  ];
  const reviewData = [
    { name: 'In review', value: data.annotation_progress?.in_review || 0, color: '#ffcc00' },
    { name: 'Approved', value: data.annotation_progress?.approved || 0, color: '#99cc00' },
    { name: 'Rejected', value: data.annotation_progress?.rejected || 0, color: '#ff6600' },
  ];

  // componentsMap object for the grid-stack-item content
  const overviewCardmap = {
    overallProgress: (
      <ProgressBar percentage={overallPercentage} data={overallData} />
    ),
    annotateProgress: (
      <ProgressPie title="Annotation progress" data={annotateData}>
        <ReactECharts
          style={{ height: 180, width: 180 }}
          option={labelOption}
          ref={labelchartRef}
        />
      </ProgressPie>
    ),
    reviewProgress: (
      <ProgressPie title="Review progress" data={reviewData}>
        <ReactECharts
          style={{ height: 180, width: 180 }}
          option={reviewOption}
          ref={reviewchartRef}
        />
      </ProgressPie>
    ),
  };

  const updateLayout = async (newLayout) => {
    setLoading(true);
    try {
      const response = await api.callApi('editDashboardLayout', {
        params: { pk: project.id },
        body: { overview_layout: newLayout || overviewDefault },
      });
      // console.log(response);
      if (response) {
        message.success('Layout saved');
      }
    } catch (error) {
      console.log(error);
      message.error('Failed to save');
    }
    setLoading(false);
    setGridKey((prev) => prev + 1);
    setLayoutEdit(false);
  };

  const layoutChange = useCallback((layout) => {
    layoutRef.current = layout;
  }, []);

  const handleLayoutSave = () => {
    setCurrentLayout(layoutRef.current);
    const newLayout = layoutRef?.current.map(({ content, ...rest }) => rest);
    updateLayout(newLayout);
  };

  const handleLayoutReset = () => {
    setCurrentLayout(overviewDefault);
    updateLayout(overviewDefault)
  };

  const handleLayoutCancel = () => {
    setCurrentLayout(layoutData);
    setGridKey((prev) => prev + 1);
    setLayoutEdit(false);
  };

  return (
    <Block name="dashboard-overview">
      <Elem name="space">
        <Header>
          Overview
          {!layoutEdit && (
            <Elem name="overview-edit" block="dashboard-overview">
              <Tooltip title="Edit layout">
                <PiPencilSimpleDuotone
                  size={18}
                  onClick={() => setLayoutEdit(true)}
                />
              </Tooltip>
            </Elem>
          )}
        </Header>
        {layoutEdit && (
          <Space wrap>
            <Button
              icon={<PiFloppyDiskBack />}
              type="primary"
              ghost
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={handleLayoutSave}
              loading={loading}
            >
              Save
            </Button>
            <Button
              icon={<PiArrowCounterClockwise />}
              style={{ display: 'flex', alignItems: 'center' }}
              onClick={handleLayoutReset}
              disabled={loading}
            >
              Reset
            </Button>
            <Button onClick={handleLayoutCancel}>Cancel</Button>
          </Space>
        )}
      </Elem>

      <GridStackLayout
        items={currentLayout}
        componentsMap={overviewCardmap}
        column={3}
        cellHeight={200}
        onLayoutChange={layoutChange}
        isEdit={layoutEdit}
        key={gridKey}
      />
    </Block>
  );
};

export default Overview;
