let allData = [];
let charts = {};

async function loadData() {
  try {
    let response = await fetch('../data.json');
    let data = await response.json();
    allData = data.timeline || [];
    return allData;
  } catch (error) {
    console.error('加载数据失败:', error);
    return [];
  }
}

function parseDate(dateStr) {
  return new Date(dateStr.replace(' ', 'T'));
}

function getDurationMinutes(startTime, endTime) {
  let start = parseDate(startTime);
  let end = parseDate(endTime);
  return (end - start) / (1000 * 60);
}

function formatDate(date) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function filterDataByDateRange(data, startDate, endDate) {

  if (!startDate && !endDate) return data;

  return data.filter(item => {
    let itemDate = parseDate(item.startTime);
    if (startDate && itemDate < new Date(startDate)) return false;
    if (endDate && itemDate > new Date(endDate + 'T23:59:59')) return false;
    return true;
  });

}

function extractContentItems(content) {
  if (!content) return [];
  return content.split('/').map(item => item.trim()).filter(item => item);
}

function analyzeContent(data) {

  let contentStats = {};
  let dailyStats = {};
  let hourlyStats = {};

  data.forEach(item => {

    let duration = getDurationMinutes(item.startTime, item.endTime);
    let startDate = parseDate(item.startTime);
    let endDate = parseDate(item.endTime);
    let startHour = startDate.getHours();

    let startDay = formatDate(startDate);
    let endDay = formatDate(endDate);

    if (!dailyStats[startDay]) {
      dailyStats[startDay] = { duration: 0, count: 0 };
    }

    dailyStats[startDay].count += 1;

    if (startDay === endDay) {
      dailyStats[startDay].duration += duration;
    } else {

      let endOfDay = new Date(startDate);

      endOfDay.setHours(23, 59, 59, 999);

      let firstDayDuration = (endOfDay - startDate) / (1000 * 60);
      dailyStats[startDay].duration += firstDayDuration;

      if (!dailyStats[endDay]) {
        dailyStats[endDay] = { duration: 0, count: 0 };
      }

      dailyStats[endDay].count += 1;

      let startOfNextDay = new Date(startDate);

      startOfNextDay.setDate(startOfNextDay.getDate() + 1);
      startOfNextDay.setHours(0, 0, 0, 0);

      let secondDayDuration = (endDate - startOfNextDay) / (1000 * 60);

      dailyStats[endDay].duration += secondDayDuration;

    }

    if (!hourlyStats[startHour]) {
      hourlyStats[startHour] = { duration: 0, count: 0 };
    }

    hourlyStats[startHour].duration += duration;
    hourlyStats[startHour].count += 1;

    let contentItems = extractContentItems(item.content);

    contentItems.forEach(content => {
      if (!contentStats[content]) {
        contentStats[content] = { duration: 0, count: 0 };
      }
      contentStats[content].duration += duration;
      contentStats[content].count += 1;
    });

  });

  return { contentStats, dailyStats, hourlyStats };
}

function initCharts() {

  charts.contentChart = echarts.init(document.getElementById('contentChart'));
  charts.dailyChart = echarts.init(document.getElementById('dailyChart'));
  charts.hourlyChart = echarts.init(document.getElementById('hourlyChart'));
  charts.trendChart = echarts.init(document.getElementById('trendChart'));

  window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart.resize());
  });

}

function renderContentChart(contentStats) {

  let sortedData = Object.entries(contentStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15);

  let option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        let item = params[0];
        return `${item.name}<br/>次数: ${item.value}`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '次数',
      axisLabel: {
        formatter: '{value} 次'
      }
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(d => d[0]),
      inverse: true,
      axisLabel: {
        interval: 0,
        width: 200,
        overflow: 'truncate'
      }
    },
    series: [{
      name: '次数',
      type: 'bar',
      data: sortedData.map(d => d[1].count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: '#66BB6A' },
          { offset: 1, color: '#43A047' }
        ])
      }
    }]
  };

  charts.contentChart.setOption(option);

}

function renderDailyChart(dailyStats) {

  let sortedDates = Object.keys(dailyStats).sort();
  let counts = sortedDates.map(date => dailyStats[date].count);

  let option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function (params) {
        let date = params[0].name;
        let count = params[0].value;
        return `${date}<br/>次数: ${count}`;
      }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: [0]
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedDates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '次数',
      axisLabel: {
        formatter: '{value} 次'
      }
    },
    series: [
      {
        name: '次数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#66BB6A' },
            { offset: 1, color: '#43A047' }
          ])
        }
      }
    ]
  };

  charts.dailyChart.setOption(option);

}

function renderHourlyChart(hourlyStats) {

  let hours = Array.from({ length: 24 }, (_, i) => i);
  let durations = hours.map(h => hourlyStats[h] ? hourlyStats[h].duration : 0);
  let counts = hours.map(h => hourlyStats[h] ? hourlyStats[h].count : 0);

  let option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: function (params) {

        let item0 = params[0];
        let item1 = params[1];
        let hour = item0 ? item0.name : '';
        let duration = item0 ? item0.value : 0;
        let count = item1 ? item1.value : 0;
        let returns = `${hour}:00 - ${hour}:59<br/>时长: ${duration} 小时`;

        if (count) {
          returns += `<br/>次数: ${count}`;
        }

        return returns;

      }
    },
    legend: {
      data: ['时长（小时）', '次数'],
      top: '8%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: hours.map(h => `${h}:00`),
      boundaryGap: false
    },
    yAxis: [
      {
        type: 'value',
        name: '时长（小时）',
        position: 'left',
        axisLabel: {
          formatter: '{value}h'
        }
      },
      {
        type: 'value',
        name: '次数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '时长（小时）',
        type: 'line',
        smooth: true,
        data: durations.map(d => (d / 60).toFixed(2)),
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 187, 106, 0.5)' },
            { offset: 1, color: 'rgba(102, 187, 106, 0.1)' }
          ])
        },
        itemStyle: {
          color: '#4CAF50'
        }
      },
      {
        name: '次数',
        type: 'bar',
        yAxisIndex: 1,
        data: counts,
        itemStyle: {
          color: '#81C784'
        }
      }
    ]
  };

  charts.hourlyChart.setOption(option);

}

function renderTrendChart(dailyStats) {

  let sortedDates = Object.keys(dailyStats).sort();
  let durations = sortedDates.map(date => dailyStats[date].duration);

  let option = {
    title: {
      text: '直播时长趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        let date = params[0].name;
        let duration = params[0].value;
        return `${date}<br/>时长: ${duration} 小时`;
      }
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: [0],
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: [0]
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedDates,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      name: '时长（小时）',
      axisLabel: {
        formatter: '{value}h'
      }
    },
    series: [{
      name: '时长',
      type: 'line',
      smooth: true,
      data: durations.map(d => (d / 60).toFixed(2)),
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102, 187, 106, 0.5)' },
          { offset: 1, color: 'rgba(102, 187, 106, 0.1)' }
        ])
      },
      itemStyle: {
        color: '#4CAF50'
      },
    }]
  };

  charts.trendChart.setOption(option);

}

function updateStats(data) {

  let totalDuration = data.reduce((sum, item) => sum + getDurationMinutes(item.startTime, item.endTime), 0);
  let totalHours = (totalDuration / 60).toFixed(1);
  let totalCount = data.length;

  let uniqueContents = new Set();

  data.forEach(item => {
    extractContentItems(item.content).forEach(content => uniqueContents.add(content));
  });

  let avgDuration = totalCount > 0 ? (totalDuration / totalCount / 60).toFixed(1) : 0;

  document.getElementById('totalHours').textContent = totalHours;
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('uniqueContent').textContent = uniqueContents.size;
  document.getElementById('avgDuration').textContent = avgDuration;

}

function updateCharts(data) {

  let { contentStats, dailyStats, hourlyStats } = analyzeContent(data);

  renderContentChart(contentStats);
  renderDailyChart(dailyStats);
  renderHourlyChart(hourlyStats);
  renderTrendChart(dailyStats);
  updateStats(data);

}

async function init() {

  await loadData();
  initCharts();
  updateCharts(allData);

  let startDateInput = document.getElementById('startDate');
  let endDateInput = document.getElementById('endDate');
  let filterBtn = document.getElementById('filterBtn');

  filterBtn.addEventListener('click', () => {
    let startDate = startDateInput.value;
    let endDate = endDateInput.value;
    let filteredData = filterDataByDateRange(allData, startDate, endDate);
    updateCharts(filteredData);
  });

}

document.addEventListener('DOMContentLoaded', init);
