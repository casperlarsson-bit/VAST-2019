// set the dimensions and margins of the graph
const margin = { top: 50, right: 0, bottom: 30, left: 60 },
  width = document.getElementById('lineplot-canvas').offsetWidth - margin.left - margin.right,
  height = document.getElementById('lineplot-canvas').offsetHeight - margin.top - margin.bottom

// append the svg object to the body of the page
const svgChart = d3.select('#lineplot-canvas')
  .append('svg')
  .attr('width', '100%')
  .attr('height', '100%')
  .append('g')
  .attr('transform',
    'translate(' + margin.left + ',' + margin.top + ')')

const numCharts = 3.5

function drawAxes(data, spacing) {
  const categories = ['Shake Data', 'Power Data', document.getElementById('select-category').value]
  for (let i = 0; i < 3; ++i) {
    // Add X axis --> it is a time format
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.time))
      .range([0, width])
    svgChart.append('g')
      .attr('transform', 'translate(0,' + ((i + 1) * height / numCharts + i * spacing) + ')')
      .call(d3.axisBottom(x))

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, 10])
      .range([((i + 1) * height / numCharts + i * spacing), ((i + 1) * height / numCharts + i * spacing) - height / numCharts])
    svgChart.append('g')
      .call(d3.axisLeft(y))

    //Label
    svgChart.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left)
      .attr('x', -(((i + 1) * height / numCharts + i * spacing) - height / (numCharts * 2)))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .classed('axis-label', true)
      .text(categories[i])
  }

  // Add legend
  const legend = svgChart.append('g')
    .attr('class', 'legend')
    .attr('transform', 'translate(' + (width - 100) + ', 20)')

  // label 1
  legend.append('rect')
    .attr('x', -25)
    .attr('y', -45)
    .attr('width', 10)
    .attr('height', 10)
    .attr('fill', 'steelblue')

  legend.append('text')
    .attr('x', -10)
    .attr('y', -40)
    .attr('dy', '0.35em')
    .text('Reports')

  // label 2
  legend.append('rect')
    .attr('x', -25)
    .attr('y', -25)
    .attr('width', 10)
    .attr('height', 10)
    .attr('fill', 'red')

  legend.append('text')
    .attr('x', -10)
    .attr('y', -20)
    .attr('dy', '0.35em')
    .text('Moving avg')

  // label 3
  legend.append('rect')
    .attr('x', -25)
    .attr('y', -5)
    .attr('width', 10)
    .attr('height', 10)
    .attr('fill', 'lightgray')

  legend.append('text')
    .attr('x', -10)
    .attr('y', 0)
    .attr('dy', '0.35em')
    .text('95% CI')
}

function drawIndividualChart(yPosition, data, color, stroke, label) {
  // Add X axis --> it is a time format
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.time))
    .range([0, width])

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, 10])
    .range([yPosition, yPosition - height / numCharts])

  // add line
  svgChart.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', stroke)
    .attr('d', d3.line()
      .x(d => x(d.time))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX) // Smooth curve 
    )
}

// Define the movingAverage function
function movingAverage(data, windowSize, category) {
  const averagedData = []

  for (let i = 0; i < data.length; i++) {
    const startIndex = Math.max(0, i - windowSize + 1)
    const endIndex = i + 1
    const windowData = data.slice(startIndex, endIndex)
    const avg1 = d3.mean(windowData, d => d.shake_intensity)
    const avg2 = d3.mean(windowData, d => d.power)
    const avg3 = d3.mean(windowData, d => d[category])

    const standardDeviationShake = d3.deviation(windowData, d => d.shake_intensity)
    const standardDeviationPower = d3.deviation(windowData, d => d.power)
    const standardDeviationChosen = d3.deviation(windowData, d => d[category])

    const confidenceShake = standardDeviationShake ? 1.96 * standardDeviationShake / Math.sqrt(windowData.length) : 0
    const confidencePower = standardDeviationPower ? 1.96 * standardDeviationPower / Math.sqrt(windowData.length) : 0
    const confidenceChosen = standardDeviationChosen ? 1.96 * standardDeviationChosen / Math.sqrt(windowData.length) : 0

    averagedData.push({
      time: data[i].time,
      shake_intensity: avg1,
      power: avg2,
      [category]: avg3,
      CI_left_shake: avg1 - confidenceShake,
      CI_right_shake: avg1 + confidenceShake,
      CI_left_power: avg2 - confidencePower,
      CI_right_power: avg2 + confidencePower,
      CI_left_chosen: avg3 - confidenceChosen,
      CI_right_chosen: avg3 + confidenceChosen,
      CI: confidenceChosen
    })
  }

  return averagedData
}

function drawConfidenceInterval(yPosition, data) {
  // Add X axis --> it is a time format
  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.time))
    .range([0, width])

  // Add Y axis
  const y = d3.scaleLinear()
    .domain([0, 10])
    .range([yPosition, yPosition - height / numCharts])

  svgChart.append('path')
    .datum(data)
    .attr('fill', 'lightgray')
    .attr('stroke', 'none')
    .attr('d', d3.area()
      .x(d => x(d.time))
      .y0(d => y(Math.min(10, d.CI_right)))
      .y1(d => y(Math.max(0, d.CI_left)))
    )
}

function drawCharts(data, regionID, category, regions) {
  if (regionID == null) return
  document.getElementById('linechart-heading').innerText = 'Line chart for ' + regions.features[regionID - 1].properties.name
  svgChart.selectAll('*').remove()
  data = data.sort((a, b) => d3.ascending(a.time, b.time))
  const filteredData = data.filter(d => d.location === regionID)



  const movAvgData = movingAverage(filteredData, 50, category)

  const shakeDataMavg = movAvgData.map(d => ({ time: d.time, value: d.shake_intensity }))
  const shakeData = filteredData.map(d => ({ time: d.time, value: d.shake_intensity }))

  const choosenMavg = movAvgData.map(d => ({ time: d.time, value: d[category] }))
  const chosenData = filteredData.map(d => ({ time: d.time, value: d[category] }))

  const powerDataMavg = movAvgData.map(d => ({ time: d.time, value: d.power }))
  const powerData = filteredData.map(d => ({ time: d.time, value: d.power }))

  const shakeConfidence = movAvgData.map(d => ({ time: d.time, CI_left: d.CI_left_shake, CI_right: d.CI_right_shake }))
  const powerConfidence = movAvgData.map(d => ({ time: d.time, CI_left: d.CI_left_power, CI_right: d.CI_right_power }))
  const chosenConfidence = movAvgData.map(d => ({ time: d.time, value: d[category], CI_left: d.CI_left_chosen, CI_right: d.CI_right_chosen, CI: d.CI }))

  const spacing = 30
  drawAxes(data, spacing)

  if (document.getElementById('confidence-interval').checked) {
    drawConfidenceInterval(height / numCharts, shakeConfidence)
    drawConfidenceInterval(2 * height / numCharts + 1 * spacing, powerConfidence)
    drawConfidenceInterval(3 * height / numCharts + 2 * spacing, chosenConfidence)
  }

  if (document.getElementById('all-reports').checked) {
    // Number of reports, regular lines
    drawIndividualChart(height / numCharts, shakeData, 'steelblue', 0.5, 'Shake Data')
    drawIndividualChart(2 * height / numCharts + 1 * spacing, powerData, 'steelblue', 0.5, 'Power Data')
    drawIndividualChart(3 * height / numCharts + 2 * spacing, chosenData, 'steelblue', 0.5, document.getElementById('select-category').value)
  }

  if (document.getElementById('moving-average').checked) {
    drawIndividualChart(height / numCharts, shakeDataMavg, 'red', 1)
    drawIndividualChart(2 * height / numCharts + 1 * spacing, powerDataMavg, 'red', 1)
    drawIndividualChart(3 * height / numCharts + 2 * spacing, choosenMavg, 'red', 1)
  }

}
