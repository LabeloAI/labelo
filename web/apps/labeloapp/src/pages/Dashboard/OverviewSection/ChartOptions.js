export const labelOption = {
  color: ['#ffcc00', '#99cc00', '#ff6600'],
  tooltip: {
    trigger: 'item',
    formatter: function (params) {
      return `${params.marker} ${params.name}:&nbsp;&nbsp;${params.value}`;
    },
  },
  series: [
    {
      name: 'Progress',
      type: 'pie',
      radius: ['70%', '80%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 7,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
        position: 'center',
      },

      labelLine: {
        show: false,
      },
      data: [
        { value: 0, name: 'To label' },
        { value: 0, name: 'Annotated' },
        { value: 0, name: 'Skipped' },
      ],
    },
  ],
  graphic: {
    type: 'text',
    left: 'center',
    top: 'center',
    style: {
      text: `0%`,
      textAlign: 'center',
      fill: '#000',
      fontSize: 30,
    },
  },
};

export const reviewOption = {
  color: ['#ffcc00', '#99cc00', '#ff6600'],
  tooltip: {
    trigger: 'item',
    formatter: function (params) {
      return `${params.marker} ${params.name}:&nbsp;&nbsp;${params.value}`;
    },
  },
  series: [
    {
      name: 'Progress',
      type: 'pie',
      radius: ['70%', '80%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 7,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
        position: 'center',
      },

      labelLine: {
        show: false,
      },
      data: [
        { value: 0, name: 'In review' },
        { value: 0, name: 'Approved' },
        { value: 0, name: 'Rejected' },
      ],
    },
  ],
  graphic: {
    type: 'text',
    left: 'center',
    top: 'center',
    style: {
      text: `0%`,
      textAlign: 'center',
      fill: '#000',
      fontSize: 30,
    },
  },
};
