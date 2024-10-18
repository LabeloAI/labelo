export const taskOption = {
  color: ['#80FFA5', '#37A2FF', '#FF0087', '#FFBF00', '#FF5733', '#33FF57', '#8D33FF', '#FF33B8', '#00FFD1', '#FFD700'],
  title: {
    text: 'Tasks performance',
    padding: 15,
  },
  tooltip: {
    trigger: 'item',
    // formatter: function (params) {
    //   let result = params.name + '<br/>';
    //   if (params.seriesName === 'Annotated') {
    //     result +=
    //       params.marker + params.seriesName + ': ' + params.value + '<br/>';
    //     result +=
    //       '<span style="color:#39E33E;">Submitted</span>: ' +
    //       annotatedSubmitted[params.dataIndex] +
    //       '<br/>';
    //     result +=
    //       '<span style="color:#E33939;">Skipped</span>: ' +
    //       annotatedSkipped[params.dataIndex] +
    //       '<br/>';
    //   } else if (params.seriesName === 'Reviewed') {
    //     result +=
    //       params.marker + params.seriesName + ': ' + params.value + '<br/>';
    //     result +=
    //       '<span style="color:#39E33E; padding: 2px 0;">Approved</span>: ' +
    //       reviewedApproved[params.dataIndex] +
    //       '<br/>';
    //     result +=
    //       '<span style="color:#E33939;">Rejected</span>: ' +
    //       reviewedRejected[params.dataIndex] +
    //       '<br/>';
    //   }
    //   return result;
    // },
  },
  toolbox: {
    feature: {
      magicType: {
        type: ['stack'],
      },
      saveAsImage: {},
    },
    padding: 15,
  },
  legend: {
    bottom: 0,
    padding: 8,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },

  yAxis: {
    type: 'value',
    min: 0,
    max: 10,
  },

  series: [
    {
      name: 'Annotated',
      type: 'bar',
      stack: 'Annotate',
      barWidth: 15,
      emphasis: {
        focus: 'series',
      },
      data: [],
    },
    {
      name: 'Reviewed',
      type: 'bar',
      stack: 'Review',
      barWidth: 15,
      emphasis: {
        focus: 'series',
      },
      data: [],
    },
  ],
  media: [],
};

// Custom data arrays for the tooltip
// var annotatedSubmitted = [300, 380, 750, 430, 800, 250, 650];
// var annotatedSkipped = [20, 22, 30, 20, 50, 20, 30];
// var reviewedApproved = [480, 670, 610, 720, 950, 870, 900];
// var reviewedRejected = [20, 20, 20, 20, 20, 20, 20];

export const annoteOption = {
  color: ['#80FFA5', '#37A2FF', '#FF0087', '#FFBF00', '#FF5733', '#33FF57', '#8D33FF', '#FF33B8', '#00FFD1', '#FFD700'],
  title: {
    text: 'Annotator Performance',
    padding: 15,
  },

  toolbox: {
    feature: {
      magicType: { type: ['line', 'bar'] },
      saveAsImage: {},
    },
    padding: 15,
  },

  tooltip: {
    trigger: 'axis',
  },

  legend: {
    data: [],
    bottom: 0,
    padding: 8,
  },

  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    containLabel: true,
    show: false,
  },

  xAxis: {
    type: 'category',
    // boundaryGap: false,
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },

  yAxis: {
    type: 'value',
    min: 0, 
    max: 10
  },

  series: [],
  media: [],
};
export const reviewOption = {
  color: ['#80FFA5', '#37A2FF', '#FF0087', '#FFBF00', '#FF5733', '#33FF57', '#8D33FF', '#FF33B8', '#00FFD1', '#FFD700'],
  title: {
    text: 'Reviewer Performance',
    padding: 15,
  },

  toolbox: {
    feature: {
      magicType: { type: ['line', 'bar'] },
      saveAsImage: {},
    },
    padding: 15,
  },

  tooltip: {
    trigger: 'axis',
  },

  legend: {
    data: [],
    bottom: 0,
    padding: 8,
  },

  grid: {
    left: '3%',
    right: '4%',
    bottom: '10%',
    containLabel: true,
    show: false,
  },

  xAxis: {
    type: 'category',
    // boundaryGap: false,
    data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },

  yAxis: {
    type: 'value',
    min: 0,
    max: 10
  },

  series: [],
  media: [],
};
