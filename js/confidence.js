// Example: https://d3-graph-gallery.com/graph/choropleth_basic.html
// Colours: https://observablehq.com/@d3/color-schemes
const colorScale = d3.scaleThreshold()
    .domain(Array.from(Array(11).keys()))
    .range(d3.schemeOrRd[9])

const marginC = { top: 50, right: 30, bottom: 80, left: 60 },
    widthC = document.getElementById('confidence').offsetWidth - marginC.left - marginC.right - 0.04 * document.getElementById('confidence').offsetWidth,
    heightC = document.getElementById('confidence').offsetHeight - marginC.top - marginC.bottom

const svgC = d3.select('#confidence')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .append('g')
    .attr('transform',
        'translate(' + marginC.left + ',' + marginC.top + ')')

function drawConfidence(data, regions, category) {
    svgC.selectAll('*').remove()

    const sumstats = d3.nest()
        .key(d => d.properties.name)
        .rollup(d => {
            const filteredData = data.filter(i => i.location === d[0].id)
            const standardDeviation = d3.deviation(filteredData, i => i[category])
            const confidence99 = 2.58 * standardDeviation / Math.sqrt(filteredData.length) // 2.58 comes from N(0,1) and 99% confidence interval
            const confidence95 = 1.96 * standardDeviation / Math.sqrt(filteredData.length) // 1.96 comes from N(0,1) and 95% confidence interval
            const confidence80 = 1.28 * standardDeviation / Math.sqrt(filteredData.length) // 1.28 comes from N(0,1) and 80% confidence interval
            const mean = filteredData.length > 0 ? d3.mean(filteredData, i => i[category]) : 0
            const currentMin = filteredData.length > 0 ? d3.min(filteredData, i => parseFloat(i[category])) : 0
            const currentMax = filteredData.length > 0 ? d3.max(filteredData, i => parseFloat(i[category])) : 0


            const sortedFilteredData = filteredData.map(g => parseFloat(g[category]))
                .map(g => isNaN(g) ? 0 : g)
                .sort(d3.ascending)

            const q1 = d3.quantile(sortedFilteredData, 0.25)
            const median = d3.quantile(sortedFilteredData, 0.5)
            const q3 = d3.quantile(sortedFilteredData, 0.75)

            const interQuantileRange = q3 - q1
            const min = Math.max(currentMin, q1 - 1.5 * interQuantileRange)
            const max = Math.min(currentMax, q3 + 1.5 * interQuantileRange)
            const outliers = filteredData.filter(g => g[category] < min || g[category] > max) //.map(g => g[category])

            return ({ id: d[0].id, mean: mean, std: standardDeviation, confidence95: confidence95, confidence80: confidence80, confidence99: confidence99, q1: q1, q3: q3, median: median, min: min, max: max, outliers: outliers })
        })
        .entries(regions.features)
        .sort((a, b) => d3.ascending(a.value.mean, b.value.mean))

    const regionNames = sumstats.map(d => d.key)

    const x = d3.scaleBand()
        .range([0, widthC])
        .domain(regionNames)
        .paddingInner(1)
        .paddingOuter(.5)
    svgC.append('g')
        .attr('transform', 'translate(0,' + heightC + ')')
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end')

    const y = d3.scaleLinear()
        .range([heightC, 0])
        .domain([d3.min(sumstats, d => d.value.min) - 0.5, d3.max(sumstats, d => d.value.max)])
    svgC.append('g')
        .call(d3.axisLeft(y))

    svgC.selectAll('vertLines')
        .data(sumstats)
        .enter()
        .append('line')
        .attr('y1', d => y(d.value.min ? d.value.min : 0))
        .attr('y2', d => y(d.value.max ? d.value.max : 0))
        .attr('x1', d => x(d.key))
        .attr('x2', d => x(d.key))
        .attr('stroke', 'black')
        .style('stroke-width', 1)

    // Rectangle for the main box
    const boxWidth = 30
    svgC.selectAll('boxes')
        .data(sumstats)
        .enter()
        .append('rect')
        .attr('x', d => x(d.key) - boxWidth / 2)
        .attr('y', d => y(d.value.q3 ? d.value.q3 : 0))
        .attr('height', d => Math.abs(y(d.value.q1) - y(d.value.q3)) ? Math.abs(y(d.value.q1) - y(d.value.q3)) : 0)
        .attr('width', boxWidth)
        .attr('stroke', 'black')
        .attr('class', d => 'box region' + d.value.id)
        .style('fill', d => colorScale(d.value.mean))
        .style('opacity', 0.8)

    const tooltip = d3.select('#confidence')
        .append('div')
        .style('opacity', 0)
        .attr('class', 'tooltip')
        .style('width', 100)
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '2px')
        .style('border-radius', '5px')
        .style('padding', '5px')

    const mouseover = (d) => {
        d3.selectAll('.region' + d.value.id)
            .style('fill', 'lightblue')

        tooltip.style('opacity', 1)
            .style('z-index', 10)
    }

    function mousemove(d) {
        const currentHeight = document.getElementById('confidence').offsetHeight
        tooltip.html(d.value.id + ' ' + d.key + '<br />Median: ' + d.value.median + '<br />Q1: ' + d.value.q1 + '<br />Q3: ' + d.value.q3)
            .style('left', (d3.mouse(this)[0] + 78) + 'px')
            .style('top', (-currentHeight + 15 + d3.mouse(this)[1] + 45) + 'px')
    }

    const mouseleave = (d) => {
        tooltip.style('opacity', 0)
            .style('z-index', -1)
    }

    const mouseout = (d) => {
        d3.selectAll('.region' + d.value.id)
            .style('fill', d => {
                if (d.value) {
                    const filteredData = data.filter(i => i.location === d.value.id)
                    return colorScale(d3.mean(filteredData, i => i[category]))
                }

                const filteredData = data.filter(i => i.location === d.id)
                return colorScale(d3.mean(filteredData, i => i[category]))
            })
    }

    d3.selectAll('.box')
        .on('click', d => {
            selectedRegion = d.value.id
            drawCharts(data, d.value.id.replace(/^0+/, ''), category, regions)
        })
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .on('mousemove', mousemove)
        .on('mouseleave', mouseleave)

    // Show the median
    svgC.selectAll('medianLines')
        .data(sumstats)
        .enter()
        .append('line')
        .attr('x1', d => (x(d.key) - boxWidth / 2))
        .attr('x2', d => (x(d.key) + boxWidth / 2))
        .attr('y1', d => y(d.value.median ? d.value.median : 0))
        .attr('y2', d => y(d.value.median ? d.value.median : 0))
        .attr('stroke', 'black')
        .style('width', 80)



    // Plot the outliers
    const outliers = sumstats.map(d => {
        return d.value.outliers
    }).flat(1)

    svgC.append('g')
        .selectAll('dot')
        .data(outliers)
        .enter()
        .append('circle')
        .attr('cx', d => x(regions.features[d.location - 1].properties.name) + (Math.random() - 0.5) * 25)
        .attr('cy', d => y(d[category]))
        .attr('r', 2.5)
        .style('fill', 'lightgray')
        .style('opacity', 0.2)
}