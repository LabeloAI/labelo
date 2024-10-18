import { Block, Elem } from 'apps/labeloapp/src/utils/bem';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, DataBlock, Header, Progress } from '../components';
import './Performance.scss';
import ReactECharts from 'echarts-for-react';
import { annoteOption, reviewOption, taskOption } from './ChartOptions';
import { useProject } from 'apps/labeloapp/src/providers/ProjectProvider';
import { useAPI } from 'apps/labeloapp/src/providers/ApiProvider';
import { Button, DatePicker, Select, Space, Tooltip, message } from 'antd';
import {
  PiPencilSimpleDuotone,
  PiArrowCounterClockwise,
  PiFloppyDiskBack,
} from 'react-icons/pi';
import GridStackLayout, { performanceDefault } from '../GridStackLayout';

const Performance = ({ project, layoutData }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  // const { project } = useProject();
  const api = useAPI();
  const echartRef = useRef();
  const annotatechartRef = useRef();
  const reviewchartRef = useRef();
  const [custom, setCustom] = useState(false);
  const { RangePicker } = DatePicker;

  const [layoutEdit, setLayoutEdit] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(layoutData);
  const [gridKey, setGridKey] = useState(0);
  const layoutRef = useRef(layoutData);

  const fetchPerformance = async (filter = {}) => {
    setLoading(true);
    setChartLoading(true);
    const response = await api.callApi('dashboardChart', {
      params: { pk: project.id, ...filter },
    });
    setData({
      total_time: response.total_lead_time,
      avg_task_time: response.average_lead_time,
      task_performance: response.task_performance,
      annotator_performance: response.annotator_performance,
      label_distribution: response.label_distribution,
      avg_label_time: response.average_time_per_label,
    });
    updateTaskChart(response.task_performance);
    updateAnnotatorChart(response.annotator_performance);
    updateReviewerChart(response.reviewer_performance);
    setLoading(false);
    setChartLoading(false);
  };

  useEffect(() => {
    if (project.id && !loading) {
      fetchPerformance();
    }
  }, [project.id]);

  const currentTaskChart = useRef(taskOption)
  const currentAnnotateChart = useRef(annoteOption)
  const currentReviewChart = useRef(reviewOption)

  // updating the xaxis, yaxis and series data
  // function to update the task chart options
  const updateTaskChart = (taskData = {}) => {
    const newTaskOption = { ...taskOption };
    newTaskOption.xAxis.data = taskData?.x_axis || taskOption.xAxis[0].data;
    newTaskOption.series[0].data = taskData.annotated || [];
    newTaskOption.series[1].data = taskData.reviewed || [];
    const allValues = [...taskData.annotated, ...taskData.reviewed];
    const maxValue = allValues.length ? Math.max(...allValues) : 0;
    if (maxValue > 10) newTaskOption.yAxis.max = undefined;
    currentTaskChart.current = newTaskOption

    echartRef?.current?.getEchartsInstance().setOption(newTaskOption);
    echartRef?.current?.getEchartsInstance().resize();
  };

  // function to update the annotator line chart
  const updateAnnotatorChart = (lineData = {}) => {
    const newLineChart = { ...annoteOption };
    newLineChart.xAxis.data = lineData?.x_axis || annoteOption.xAxis.data;
    const seriesData = lineData?.annotators?.map((item) => ({
      name: item.name,
      type: 'line',
      emphasis: {
        focus: 'series',
      },
      data: item.data,
    }));
    const legendData = lineData?.annotators?.map((annotator) => annotator.name);
    newLineChart.series = seriesData;
    newLineChart.legend.data = legendData;
    const allValues = lineData?.annotators?.flatMap((item) => item.data) || [];
    const maxValue = allValues.length ? Math.max(...allValues) : 0;
    if (maxValue > 10) newLineChart.yAxis.max = undefined;
    currentAnnotateChart.current = newLineChart

    annotatechartRef?.current?.getEchartsInstance().setOption(newLineChart);
    annotatechartRef?.current?.getEchartsInstance().resize();
  };

  // function to update the reviewer line chart
  const updateReviewerChart = (lineData = {}) => {
    const newLineChart = { ...reviewOption };
    newLineChart.xAxis.data = lineData?.x_axis || reviewOption.xAxis.data;
    const seriesData = lineData?.reviewers?.map((item) => ({
      name: item.name,
      type: 'line',
      emphasis: {
        focus: 'series',
      },
      data: item.data,
    }));
    const legendData = lineData?.reviewers?.map((reviewer) => reviewer.name);
    newLineChart.series = seriesData;
    newLineChart.legend.data = legendData;
    const allValues = lineData?.reviewers?.flatMap((item) => item.data) || [];
    const maxValue = allValues.length ? Math.max(...allValues) : 0;
    if (maxValue > 10) newLineChart.yAxis.max = undefined;
    currentReviewChart.current = newLineChart

    reviewchartRef?.current?.getEchartsInstance().setOption(newLineChart);
    reviewchartRef?.current?.getEchartsInstance().resize();
  };

  const handleFilterChange = (value) => {
    const params = { range: value };
    if (value === 'custom') {
      setCustom(true);
    } else {
      setCustom(false);
      fetchPerformance(params);
    }
  };

  const handlePickerChange = (date, dateString) => {
    const params = {
      range: 'custom',
      start: dateString[0],
      end: dateString[1],
    };
    if (params.start != '' && params.end != '') {
      fetchPerformance(params);
    }
  };

  // componentsMap object for the grid-stack-item content
  const performanceCardmap = {
    totalTime: (
      <DataBlock
        title="Total time"
        data={data.total_time || 0}
        unit="hrs"
        tooltip="Total time taken for the project"
      />
    ),
    avgTasktime: (
      <DataBlock
        title="Avg time per task"
        data={data.avg_task_time || 0}
        unit="min"
        tooltip="Average time taken to annotate a task"
      />
    ),
    avgReviewtime: (
      <DataBlock
        title="Avg review time"
        data={data.avg_review_time || 0}
        unit="min"
        tooltip="Average time taken to review a task"
      />
    ),
    avgLabeltime: (
      <DataBlock
        title="Avg time per label"
        data={data.avg_label_time || 0}
        unit="min"
        tooltip="Average time taken to label an item"
      />
    ),
    taskPerformance: (
      <ReactECharts
        option={currentTaskChart.current}
        showLoading={chartLoading}
        ref={echartRef}
        style={{ height: '100%', width: '100%', minWidth: 327, minHeight: 340 }}
      />
    ),
    annotatePerformance: (
      <ReactECharts
        option={currentAnnotateChart.current}
        showLoading={chartLoading}
        ref={annotatechartRef}
        style={{ height: '100%', width: '100%', minWidth: 327, minHeight: 340 }}
      />
    ),
    reviewPerformance: (
      <ReactECharts
        option={currentReviewChart.current}
        showLoading={chartLoading}
        ref={reviewchartRef}
        style={{ height: '100%', width: '100%', minWidth: 327, minHeight: 340 }}
      />
    ),
    labelDistribution: (
      <Block name="dashboard-label-distribution">
        <Elem name="title">Label distribution</Elem>

        <Elem name="row" mix="header">
          <Elem name="cell">#</Elem>
          <Elem name="cell">Name</Elem>
          <Elem name="cell">Count</Elem>
          {/* <Elem name="cell">Avg time (min)</Elem> */}
          <Elem name="cell" mix="span">
            Share
          </Elem>
        </Elem>

        {data?.label_distribution && data?.label_distribution?.length > 0 ? (
          data.label_distribution.map((item, index) => (
            <Elem name="row" key={index}>
              <Elem name="cell">{index + 1}</Elem>
              <Elem name="cell">{item.name}</Elem>
              <Elem name="cell">{item.count}</Elem>
              {/* <Elem name="cell">0</Elem> */}
              <Elem name="cell" mix="span">
                <Progress percentage={item.label_share} color="#007bff" />
                <Elem name="percentage">{item.label_share}%</Elem>
              </Elem>
            </Elem>
          ))
        ) : loading ? (
          <Elem name="row">
            <Elem name="cell" mix="text">
              Loading...
            </Elem>
          </Elem>
        ) : (
          <Elem name="row">
            <Elem name="cell" mix="text">
              No labels found!
            </Elem>
          </Elem>
        )}
      </Block>
    ),
  };

  const resetCharts = () => {
    echartRef?.current?.getEchartsInstance().resize();
    annotatechartRef?.current?.getEchartsInstance().resize();
    reviewchartRef?.current?.getEchartsInstance().resize();
  }

  const updateLayout = async (newLayout) => {
    setLoading(true);
    try {
      const response = await api.callApi('editDashboardLayout', {
        params: { pk: project.id },
        body: { performance_layout: newLayout || performanceDefault },
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
    resetCharts()
  };

  // function to handle the performance layout changes
  const layoutChange = useCallback((layout) => {
    layoutRef.current = layout;
  }, []);

  const handleLayoutSave = () => {
    setCurrentLayout(layoutRef.current);
    const newLayout = layoutRef?.current.map(({ content, ...rest }) => rest);
    updateLayout(newLayout);
  };

  const handleLayoutReset = () => {
    layoutRef.current = performanceDefault
    setCurrentLayout(performanceDefault);
    updateLayout([]);
  };

  const handleLayoutCancel = () => {
    // layoutRef.current = layoutData
    // setCurrentLayout(layoutRef.current);
    // setGridKey((prev) => prev + 1);
    setLayoutEdit(false);
  };

  return (
    <Block name="dashboard-performance">
      <Elem name="space">
        <Header>
          Performance
          {!layoutEdit && (
            <Elem name="performance-edit" block="dashboard-performance">
              <Tooltip title="Edit layout">
                <PiPencilSimpleDuotone
                  size={18}
                  onClick={() => setLayoutEdit(true)}
                />
              </Tooltip>
            </Elem>
          )}
        </Header>
        <Elem name="filter">
          {layoutEdit ? (
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
          ) : (
            <Space wrap>
              {custom && <RangePicker onChange={handlePickerChange} />}
              <Select
                defaultValue="Daily"
                style={{ width: 100 }}
                onChange={handleFilterChange}
                loading={loading}
                options={[
                  { value: '', label: 'Days' },
                  { value: 'week', label: 'Weeks' },
                  { value: 'month', label: 'Months' },
                  { value: 'year', label: 'Years' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </Space>
          )}
        </Elem>
      </Elem>

      <GridStackLayout
        items={currentLayout}
        componentsMap={performanceCardmap}
        onLayoutChange={layoutChange}
        isEdit={layoutEdit}
        key={gridKey}
      />
    </Block>
  );
};

export default Performance;
