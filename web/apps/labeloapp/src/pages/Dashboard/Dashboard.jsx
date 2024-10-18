import React, { useEffect, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import './Dashboard.scss';
import Overview from './OverviewSection/Overview';
import Performance from './PerformanceSection/Performance';
import { useAPI } from '../../providers/ApiProvider';
import { useProject } from '../../providers/ProjectProvider';
import { overviewDefault, performanceDefault } from './GridStackLayout';
import { Spinner } from '../../components';

export const Dashboard = () => {
  const { project } = useProject();
  const api = useAPI();
  const [loading, setLoading] = useState();
  const [layout, setLayout] = useState();

  // function to fetch the overview data
  const fetchLayout = async () => {
    setLoading(true);
    try {
      const response = await api.callApi('dashboardLayout', {
        params: { pk: project.id },
      });
      // console.log(response);
      setLayout({
        overview_layout:
          response?.overview_layout && response.overview_layout.length > 0
            ? response.overview_layout
            : overviewDefault,
        performance_layout:
          response?.performance_layout && response.performance_layout.length > 0
            ? response.performance_layout
            : performanceDefault,
      });
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (project.id && !loading) {
      fetchLayout();
    }
  }, [project.id]);

  return (
    <Block name="project-dashboard">
      {project.id && !loading && layout ? (
        <>
          <Overview layoutData={layout.overview_layout} project={project} />
          <Performance
            layoutData={layout.performance_layout}
            project={project}
          />
        </>
      ) : (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
          <Spinner style={{justifyContent:'center'}} size={54}/>
        {/* <Spinner style={{ width: '100%', height: '20vh', display:'flex', justifyContent:'center', alignItem:'center' }} size={30} /> */}
        </div>
      )}
    </Block>
  );
};

Dashboard.title = 'Dashboard';
Dashboard.path = '/dashboard';
Dashboard.exact = true;
